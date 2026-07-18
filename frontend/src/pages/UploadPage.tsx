import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractFromImage, extractFromText } from '../services/extraction-service';
import { createItem } from '../services/item-service';
import type { ExtractedItem, ItemDraft, ItemStatus, ItemType } from '../types/item';

const allowedTypes: ItemType[] = ['SUBSCRIPTION', 'BILL', 'WARRANTY', 'APPOINTMENT', 'OTHER'];
const allowedStatuses: ItemStatus[] = ['ACTIVE', 'CANCELLED', 'EXPIRED', 'NEEDS_REVIEW'];
const maxBytes = 10 * 1024 * 1024;

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function asDraft(item: ExtractedItem, sourceType: ItemDraft['sourceType'], sourceRawText: string | null): ItemDraft {
  return { ...item, type: item.type ?? 'OTHER', merchant: item.merchant ?? item.vendorName ?? '', subscription: item.subscription ?? '', currency: item.currency ?? '', notes: item.notes ?? '', sourceType, sourceRawText };
}

export function UploadPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'image' | 'text'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (!selected) return setFile(null);
    if (!['image/png', 'image/jpeg'].includes(selected.type)) {
      setFile(null);
      setError('Invalid file type. Please choose a PNG, JPG, or JPEG image.');
      return;
    }
    if (selected.size > maxBytes) {
      setFile(null);
      setError('File is too large. Maximum size is 10 MB.');
      return;
    }
    setFile(selected);
  }

  async function handleExtract(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsExtracting(true);
    try {
      if (mode === 'image') {
        if (!file) throw new Error('Choose a PNG, JPG, or JPEG image first.');
        setDraft(asDraft(await extractFromImage(file), 'PHOTO', null));
      } else {
        if (!text.trim()) throw new Error('Paste email text before extracting.');
        setDraft(asDraft(await extractFromText(text), 'EMAIL', text.trim()));
      }
    } catch (extractionError) {
      setError(extractionError instanceof Error ? extractionError.message : 'Could not extract information. Please enter manually.');
    } finally {
      setIsExtracting(false);
    }
  }

  function updateDraft<K extends keyof ItemDraft>(field: K, value: ItemDraft[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError(null);
    setIsSaving(true);
    try {
      await createItem({
        ...draft,
        amount: draft.amount === null ? null : Number(draft.amount),
        renewalDate: draft.renewalDate ? new Date(`${draft.renewalDate}T00:00:00.000Z`).toISOString() : null,
        cancelByDate: draft.cancelByDate ? new Date(`${draft.cancelByDate}T00:00:00.000Z`).toISOString() : null,
        currency: draft.currency?.trim() || null,
        notes: draft.notes?.trim() || null,
      });
      navigate('/');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this item.');
    } finally {
      setIsSaving(false);
    }
  }

  if (draft) {
    return (
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-indigo-600">Review extraction</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Confirm the item details</h1>
        <p className="mt-2 text-slate-600">Review and edit the extraction before saving it to your dashboard.</p>
        <form onSubmit={handleSave} className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Type"><select value={draft.type ?? 'OTHER'} onChange={(event) => updateDraft('type', event.target.value as ItemType)}>{allowedTypes.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select></Field>
            <Field label="Status"><select value={draft.status} onChange={(event) => updateDraft('status', event.target.value as ItemStatus)}>{allowedStatuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></Field>
            <Field label="Merchant / vendor"><input required value={draft.vendorName ?? ''} onChange={(event) => { updateDraft('vendorName', event.target.value); updateDraft('merchant', event.target.value); }} placeholder="e.g. Spotify" /></Field>
            <Field label="Subscription name"><input value={draft.subscription ?? ''} onChange={(event) => updateDraft('subscription', event.target.value)} placeholder="e.g. Spotify Premium" /></Field>
            <Field label="Amount"><input type="number" min="0" step="0.01" value={draft.amount ?? ''} onChange={(event) => updateDraft('amount', event.target.value === '' ? null : Number(event.target.value))} /></Field>
            <Field label="Currency"><input value={draft.currency ?? ''} onChange={(event) => updateDraft('currency', event.target.value.toUpperCase())} placeholder="e.g. USD" maxLength={3} /></Field>
            <Field label="Billing frequency"><select value={draft.frequency ?? 'unknown'} onChange={(event) => updateDraft('frequency', event.target.value as ItemDraft['frequency'])}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="yearly">Yearly</option><option value="unknown">Unknown</option></select></Field>
            <Field label="Confidence (0–1)"><input type="number" min="0" max="1" step="0.01" value={draft.confidence} onChange={(event) => updateDraft('confidence', Number(event.target.value))} /></Field>
            <Field label="Renewal date"><input type="date" value={toDateInput(draft.renewalDate)} onChange={(event) => updateDraft('renewalDate', event.target.value || null)} /></Field>
            <Field label="Cancel by date"><input type="date" value={toDateInput(draft.cancelByDate)} onChange={(event) => updateDraft('cancelByDate', event.target.value || null)} /></Field>
          </div>
          <Field label="Notes"><textarea rows={4} value={draft.notes ?? ''} onChange={(event) => updateDraft('notes', event.target.value)} /></Field>
          {error && <ErrorNotice message={error} />}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDraft(null)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Start over</button>
            <button disabled={isSaving} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Saving…' : 'Save item'}</button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold text-indigo-600">Add an item</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Extract from a document or email</h1>
      <p className="mt-2 text-slate-600">Upload a PNG/JPG image or paste email text. You will review everything before it is saved.</p>
      <form onSubmit={handleExtract} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button type="button" onClick={() => { setMode('image'); setError(null); }} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${mode === 'image' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>Image upload</button>
          <button type="button" onClick={() => { setMode('text'); setError(null); }} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${mode === 'text' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>Paste email text</button>
        </div>
        {mode === 'image' ? (
          <label className="mt-6 block rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-indigo-400">
            <span className="block font-semibold text-slate-900">Choose a document image</span>
            <span className="mt-1 block text-sm text-slate-500">PNG, JPG, or JPEG · up to 10 MB</span>
            <input className="sr-only" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={handleFileChange} />
            {file && <span className="mt-4 block text-sm font-medium text-indigo-700">Selected: {file.name}</span>}
          </label>
        ) : (
          <Field label="Email text"><textarea required rows={11} value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste the relevant email or receipt text here…" /></Field>
        )}
        {error && <div className="mt-5"><ErrorNotice message={error} /></div>}
        <button disabled={isExtracting} className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">{isExtracting ? 'Extracting details…' : 'Extract details'}</button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function ErrorNotice({ message }: { message: string }) {
  return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{message}</div>;
}
