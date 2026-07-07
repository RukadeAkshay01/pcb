import { useState, type FormEvent, type JSX } from 'react';
import { useAuth } from './AuthProvider.js';

/** Sign-in / sign-up gate shown when no Supabase session is active. */
export function SignIn(): JSX.Element {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else {
        const { error, needsConfirm } = await signUp(email, password);
        if (error) setError(error);
        else if (needsConfirm) setConfirmSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (confirmSent) {
    return (
      <div className="ze-auth">
        <div className="ze-auth-card">
          <div className="ze-auth-brand">Ziro Designer</div>
          <div className="ze-auth-confirm">
            <div className="ze-auth-confirm-title">Check your email</div>
            <p>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
              account, then come back and sign in.
            </p>
            <button
              type="button"
              className="ze-auth-switch"
              onClick={() => {
                setConfirmSent(false);
                setMode('signin');
              }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ze-auth">
      <form className="ze-auth-card" onSubmit={onSubmit}>
        <div className="ze-auth-brand">Ziro Designer</div>
        <div className="ze-auth-sub">
          {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
        </div>

        <label className="ze-auth-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="ze-auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="ze-auth-error">{error}</div>}

        <button type="submit" className="ze-auth-submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>

        <div className="ze-auth-toggle">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            className="ze-auth-switch"
            onClick={() => {
              setError(null);
              setMode(mode === 'signin' ? 'signup' : 'signin');
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
