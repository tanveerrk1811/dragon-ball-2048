import { useEffect, useRef, useState, type FormEvent } from 'react';
import { OWNER } from './constants';
import type { Notice } from './errors';
import { Orb } from './ui';

const MAX_FAILS = 5;
const COOLDOWN_S = 30;

/**
 * Sign-in only. There is deliberately no "register", "forgot password" or "create account" path here:
 * the owner account is created manually in the Firebase Console.
 */
export function Login({ onSignIn, notice, emulator }: { onSignIn: (email: string, password: string, remember: boolean) => Promise<Notice | null>; notice?: Notice; emulator: boolean }) {
  const [email, setEmail] = useState<string>(OWNER.email);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Notice | null>(null);
  const [fails, setFails] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const message = error ?? notice ?? null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || cooldown > 0) return;
    if (!email.trim() || !password) {
      setError({ kind: 'error', code: 'empty', message: 'Enter your e-mail and password.' });
      return;
    }
    setBusy(true);
    setError(null);
    const res = await onSignIn(email, password, remember);
    setBusy(false);
    if (res) {
      setError(res);
      setPassword('');
      pwRef.current?.focus();
      if (res.code === 'invalid-credentials') {
        const n = fails + 1;
        setFails(n);
        if (n >= MAX_FAILS) {
          setCooldown(COOLDOWN_S);
          setFails(0);
        }
      }
    }
    // On success the session hook swaps this screen for the dashboard (after the Firestore authorization check).
  }

  return (
    <main className="login-wrap">
      <div className="login-glow" aria-hidden="true" />
      <form className="login-card" onSubmit={submit} noValidate aria-labelledby="login-title">
        <div className="login-brand">
          <Orb size={52} />
          <div>
            <h1 id="login-title">Owner Console</h1>
            <p>Dragon Ball 2048 · Power Evolution</p>
          </div>
        </div>

        {emulator && <p className="banner banner-info">Using the local Firebase emulator — no real accounts or data.</p>}

        <div aria-live="polite">
          {message && (
            <p className={`banner banner-${message.kind === 'error' ? 'bad' : message.kind === 'warn' ? 'warn' : 'info'}`} role={message.kind === 'error' ? 'alert' : 'status'}>
              {message.message}
            </p>
          )}
          {cooldown > 0 && <p className="banner banner-warn">Too many incorrect attempts. Try again in {cooldown}s.</p>}
        </div>

        <div className="field">
          <label htmlFor="adm-email">E-mail</label>
          <input id="adm-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoCapitalize="none" spellCheck={false} />
        </div>

        <div className="field">
          <label htmlFor="adm-pass">Password</label>
          <div className="pw">
            <input
              id="adm-pass"
              ref={pwRef}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="button" className="ghost sm" onClick={() => setShow((s) => !s)} aria-pressed={show}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <label className="chip chip-plain">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Keep me signed in on this device</span>
        </label>

        <button type="submit" className="primary block" disabled={busy || cooldown > 0}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="login-foot muted">
          Authorized owner only. Accounts cannot be created here. Access is verified against the Firebase admin record for your account — knowing this URL grants nothing.
        </p>
        <p className="login-foot">
          <a href="/">← Back to the game</a>
        </p>
      </form>
    </main>
  );
}
