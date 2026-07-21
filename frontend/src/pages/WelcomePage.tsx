import { Check, FileUp, Mail, MailCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoFull from '../assets/logo-full.svg';
import { useToast } from '../components/ToastProvider';
import { completeOnboarding } from '../services/auth-service';

const discoveries = ['Read-only Gmail access', 'Never sends email', 'Never deletes email', 'Finds subscriptions and bills'];
const readyFeatures = ['Upload receipts', 'Sync Gmail', 'Review suggestions', 'Draft cancellation emails', 'Explore analytics'];

export function WelcomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { success } = useToast();
  const [step, setStep] = useState(() => new URLSearchParams(location.search).get('step') === '3' ? 3 : 1);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await completeOnboarding();
      success('You’re all set. Welcome to Tendly.');
      navigate('/');
    } finally {
      setBusy(false);
    }
  }

  if (step === 1) return <main className="welcome-page"><section className="welcome-panel onboarding-panel" aria-labelledby="welcome-title"><img className="welcome-logo" src={logoFull} alt="Tendly" /><p className="eyebrow">Step 1 of 3</p><h1 id="welcome-title">Welcome to Tendly</h1><p className="welcome-kicker">Automated Life Admin</p><p className="welcome-description">Tendly automatically discovers subscriptions, bills, warranties and recurring expenses so you never miss an important renewal.</p><button className="button primary welcome-connect" onClick={() => setStep(2)}>Get started</button></section></main>;

  if (step === 2) return <main className="welcome-page"><section className="welcome-panel onboarding-panel" aria-labelledby="connect-title"><div className="onboarding-illustration"><MailCheck size={34} aria-hidden="true" /></div><p className="eyebrow">Step 2 of 3</p><h1 id="connect-title">Connect Gmail</h1><p className="welcome-description">Give Tendly a read-only view of your inbox so it can surface life admin that deserves your attention.</p><div className="welcome-discoveries" aria-label="Gmail privacy assurances">{discoveries.map((discovery) => <span key={discovery}><Check size={14} aria-hidden="true" />{discovery}</span>)}</div><a className="button primary welcome-connect" href="/api/auth/google?onboarding=1"><Mail size={17} aria-hidden="true" />Connect Gmail</a><button className="welcome-skip" onClick={() => setStep(3)}>Skip for now</button></section></main>;

  return <main className="welcome-page"><section className="welcome-panel onboarding-panel" aria-labelledby="ready-title"><div className="onboarding-illustration success"><Sparkles size={34} aria-hidden="true" /></div><p className="eyebrow">Step 3 of 3</p><h1 id="ready-title">You’re ready.</h1><p className="welcome-description">Tendly is ready to bring the important details of everyday life into one calm, useful place.</p><div className="ready-list">{readyFeatures.map((feature, index) => <span key={feature}>{index === 0 ? <FileUp size={15} aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}{feature}</span>)}</div><button className="button primary welcome-connect" disabled={busy} onClick={() => void finish()}>{busy ? 'Finishing…' : 'Go to dashboard'}</button></section></main>;
}
