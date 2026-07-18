import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { generateEmailDraft } from '../services/email-service';

export function EmailDraftPage() {
  const { id } = useParams();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!id) return;
    setError(null);
    setCopied(false);
    setIsGenerating(true);
    try {
      setEmail(await generateEmailDraft(id));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Unable to generate email.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      setError('Unable to copy the email. Please copy it manually.');
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm font-semibold text-indigo-700 hover:text-indigo-600">← Back to dashboard</Link>
      <p className="mt-6 text-sm font-semibold text-indigo-600">Email draft</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Request help from a vendor</h1>
      <p className="mt-2 text-slate-600">Generate an editable cancellation, dispute, refund, or warranty email. Nothing is sent automatically.</p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700" htmlFor="email-draft">Draft</label>
        <textarea id="email-draft" rows={18} value={email} onChange={(event) => { setEmail(event.target.value); setCopied(false); }} placeholder="Click Generate to create an email draft." className="mt-2 font-mono text-sm leading-6" />
        {error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</div>}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={!email} onClick={handleCopy} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{copied ? 'Copied' : 'Copy to Clipboard'}</button>
          <button type="button" disabled={!id || isGenerating} onClick={() => void handleGenerate()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">{isGenerating && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" aria-hidden="true" />}{isGenerating ? 'Generating…' : 'Generate'}</button>
        </div>
      </div>
    </section>
  );
}
