import type { JSX, ReactNode } from 'react';
import { authEnabled } from './supabaseClient.js';
import { useAuth } from './AuthProvider.js';
import { SignIn } from './SignIn.js';

/**
 * Gate the app behind Supabase auth. When auth is not configured (no env vars),
 * the app runs freely offline.
 */
export function AuthGate({ children }: { children: ReactNode }): JSX.Element {
  const { session, loading } = useAuth();

  if (!authEnabled) return <>{children}</>;
  if (loading) {
    return (
      <div className="ze-auth">
        <div className="ze-auth-splash">Ziro Designer…</div>
      </div>
    );
  }
  if (!session) return <SignIn />;
  return <>{children}</>;
}
