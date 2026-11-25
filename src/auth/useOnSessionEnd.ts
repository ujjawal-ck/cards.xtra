/**
 * useOnSessionEnd — run a callback when a signed-in session ends (logout,
 * expiry, or a dead token found at launch).
 *
 * endLocalSession() clears storage and the query cache, but a screen that is
 * already mounted keeps the last user's values in its own state (Home's
 * eligibility prefill, the cross-sell rail's applied set). Logout remounts the
 * stack; expiry only opens the login sheet over the current screen. Screens
 * that hold user-scoped state use this hook to drop it. Audit AUTH-02.
 */
import { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

export function useOnSessionEnd(onEnd: () => void): void {
  const { status } = useAuth();
  const prev = useRef(status);
  const latest = useRef(onEnd);
  latest.current = onEnd;
  useEffect(() => {
    if (prev.current === 'authenticated' && status === 'unauthenticated') latest.current();
    prev.current = status;
  }, [status]);
}
