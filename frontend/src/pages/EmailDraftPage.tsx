import { useState } from 'react';
import { ArrowLeft, Clipboard, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { generateEmailDraft } from '../services/email-service';

export function EmailDraftPage() {
  const { id } = useParams();
  const { success } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setEmail(await generateEmailDraft(id));
      success('Your email draft is ready to edit.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to generate email.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      success('Draft copied to clipboard.');
    } catch {
      setError('Unable to copy. Please copy manually.');
    }
  }

  return <div className="draft-page"><Link to="/" className="back-link"><ArrowLeft size={16} />All records</Link><div className="detail-head"><div><span className="eyebrow">Vendor outreach</span><h1>Draft cancellation email</h1><p>Generate a thoughtful message, then edit it before sending it yourself.</p></div><button className="button primary" disabled={loading} onClick={() => void generate()}><Sparkles size={16} />{loading ? 'Generating…' : 'Generate draft'}</button></div><div className="form-card draft-editor-card"><Field label="Your editable draft"><textarea className="email-editor" rows={19} value={email} onChange={(event) => { setEmail(event.target.value); setCopied(false); }} placeholder="Your editable email draft will appear here." /></Field>{error && <div className="inline-error">{error}</div>}<div className="form-actions sticky-draft-actions"><span className="muted">Nothing is sent automatically.</span><button className="button secondary" disabled={!email} onClick={() => void copy()}><Clipboard size={16} />{copied ? 'Copied' : 'Copy draft'}</button></div></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
