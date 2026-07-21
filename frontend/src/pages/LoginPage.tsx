import { Check, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import logoFull from '../assets/logo-full.svg';

const assurances = [
  'Secure authentication',
  'Read-only Gmail access',
  'Nothing is deleted',
  'Nothing is sent',
  'Your data stays private',
];

export function LoginPage() {
  const [shouldAnimate] = useState(() => {
    const hasSeenWelcome = sessionStorage.getItem('tendly-welcome-seen') === 'true';
    return !hasSeenWelcome;
  });

  useEffect(() => {
    sessionStorage.setItem('tendly-welcome-seen', 'true');
  }, []);

  const entranceClass = shouldAnimate ? 'login-entrance' : '';

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="welcome-heading">
        <img
          className={`login-logo ${entranceClass}`}
          src={logoFull}
          alt="Tendly"
        />

        <div className="login-copy">
          <p className={`login-heading ${entranceClass}`} id="welcome-heading">
            Welcome to Tendly
          </p>
          <p className={`login-subtitle ${entranceClass}`}>Automated Life Admin</p>
          <p className={`login-description ${entranceClass}`}>
            Spend less time managing life—and more time living it. Tendly automatically
            organises subscriptions, bills, warranties and important reminders so nothing
            slips through the cracks.
          </p>
        </div>

        <div className={`login-actions ${entranceClass}`}>
          <a className="login-google-button" href="/api/auth/login/google">
            <LockKeyhole aria-hidden="true" size={17} strokeWidth={1.8} />
            Continue with Google
          </a>

          <ul className="login-assurances" aria-label="Privacy and security assurances">
            {assurances.map((assurance) => (
              <li key={assurance}>
                <Check aria-hidden="true" size={14} strokeWidth={2} />
                {assurance}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="login-footer">Built to simplify modern life.</footer>
    </main>
  );
}
