/**
 * AuthContext — the app's session source of truth.
 *
 * On launch it loads any persisted CashKaro session from secure storage
 * (status: 'loading' → 'authenticated' | 'unauthenticated'), so the app can
 * skip the login flow when a valid token already exists. Screens call
 * `signIn` after a successful OTP verify and `signOut` to end the session.
 *
 * The access token is exposed so data hooks/api calls can attach it as the
 * Bearer for authenticated CashKaro endpoints.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  loadSession,
  saveSession,
  clearSession,
  getDeviceId,
  saveDisplayName,
  loadDisplayName,
  type Session,
} from './tokenStore';
import {
  logout as ckLogout,
  refreshAccessToken as ckRefreshAccessToken,
  getEarnings,
  getProfile,
} from '../api/cashkaro';
import { ApiError } from '../api/client';
import { queryClient } from '../query/queryClient';
import { mapEarnings } from '../api/earningsMapper';
import { analytics, Events } from '../analytics';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: Status;
  session: Session | null;
  accessToken: string | null;
  /** Stable per-install device id (ready after bootstrap). */
  deviceId: string | null;
  /** What to call the user on Home/Profile. A local override of the backend
   *  fullname (there's no profile-update API): captured on the post-OTP
   *  NameInput screen for a fresh signup. */
  displayName: string | null;
  /** Persist a session after a successful login/signup OTP verify. */
  signIn: (session: Session) => Promise<void>;
  /** Save the name the user chose on the post-OTP NameInput screen. */
  setDisplayName: (name: string) => Promise<void>;
  /** End the session (best-effort server logout, then clear local tokens). */
  signOut: () => Promise<void>;
  /** Exchange the refresh token for a fresh access token, persist it, and
   *  return the new token. CashKaro access tokens expire in ~15 min, so
   *  authenticated calls should retry through this on a 401. Concurrent calls
   *  share a single in-flight refresh. Returns null when there's no refresh
   *  token (signed out) or the refresh fails; if the refresh token itself is
   *  rejected (401/403) the session is cleared and status drops to
   *  'unauthenticated' for a clean re-login. */
  refreshSession: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Warm the TanStack Query cache for the authed tabs right after login, so
 * Earnings/Profile render instantly (no first-open fetch flash). Fire-and-
 * forget; keys MUST match useEarnings / useProfile. Failures are ignored
 * (the screens will fetch + refresh-on-401 normally).
 */
function warmUserCache(accessToken: string): void {
  queryClient
    .prefetchQuery({
      queryKey: ['ck', 'earnings', accessToken],
      queryFn: async () => mapEarnings(await getEarnings(accessToken)),
    })
    .catch(() => undefined);
  queryClient
    .prefetchQuery({
      queryKey: ['ck', 'profile', accessToken],
      queryFn: async () => getProfile(accessToken),
    })
    .catch(() => undefined);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  // Holds the single in-flight refresh so that several queries hitting a 401 at
  // once share ONE /refreshtoken call instead of each firing their own (which,
  // with rotating refresh tokens, makes all but the first fail). Cleared when
  // the refresh settles.
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  // Bootstrap: load device id + any persisted session on launch.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [id, saved, name] = await Promise.all([
          getDeviceId(),
          loadSession(),
          loadDisplayName(),
        ]);
        if (!active) return;
        setDeviceId(id);
        setDisplayNameState(name);
        // Tie analytics to the stable per-install device id (NOT PII — never
        // the phone/name). GA4 keeps its own instance id; this just gives us a
        // consistent handle that survives logout/login on the same device.
        analytics.identify(id);
        if (saved) {
          setSession(saved);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      } catch {
        if (active) setStatus('unauthenticated');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Keep the `logged_in` user property in sync with session status so GA can
  // segment authed vs anonymous behaviour. Skipped while still 'loading'.
  useEffect(() => {
    if (status === 'loading') return;
    analytics.setUserProperties({ logged_in: status === 'authenticated' });
  }, [status]);

  const signIn = useCallback(async (next: Session) => {
    await saveSession(next);
    setSession(next);
    setStatus('authenticated');
    // Warm earnings/profile so those tabs open instantly (non-blocking).
    warmUserCache(next.accessToken);
  }, []);

  const setDisplayName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    await saveDisplayName(trimmed);
    setDisplayNameState(trimmed);
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (!session?.refreshToken) return null;
    // De-dupe: if a refresh is already running, await that one instead of
    // starting a second (see refreshInFlight above).
    if (refreshInFlight.current) return refreshInFlight.current;

    const run = (async (): Promise<string | null> => {
      try {
        const accessToken = await ckRefreshAccessToken(session.refreshToken);
        const next: Session = { ...session, accessToken };
        await saveSession(next);
        setSession(next);
        return accessToken;
      } catch (e) {
        // Only force a sign-out when the refresh token itself is rejected
        // (401/403) — that session is genuinely dead, so end it cleanly rather
        // than leaving the user "authenticated" with tokens that 401 forever.
        // A network/timeout error (ApiError status 0) is transient: keep the
        // session and just report failure so the caller can retry later.
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          await clearSession();
          setSession(null);
          setStatus('unauthenticated');
          setDisplayNameState(null);
          if (deviceId) analytics.identify(deviceId);
        }
        return null;
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = run;
    return run;
  }, [session, deviceId]);

  // Upgrade the analytics identity from the device id to the real CashKaro
  // account id once a session exists. The account id is an opaque identifier
  // (NOT the phone/email/name) — exactly what GA4's user_id is meant to hold.
  // Reuses the same query cache key as useProfile, so it dedupes with the
  // profile fetch the tabs already run (usually no extra network call).
  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;
    let active = true;
    queryClient
      .fetchQuery({
        queryKey: ['ck', 'profile', token],
        queryFn: async () => {
          try {
            return await getProfile(token);
          } catch (e) {
            const fresh = await refreshSession();
            if (fresh) return await getProfile(fresh);
            throw e;
          }
        },
      })
      .then((profile) => {
        if (active && profile?.id != null) {
          const accountId = String(profile.id);
          // Canonical GA4 user_id (cross-device stitching, User Explorer).
          analytics.identify(accountId);
          // Also expose it as a user property so it's visible in DebugView and
          // usable as a reporting dimension. Opaque account id — not PII.
          analytics.setUserProperties({ ck_user_id: accountId });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [session?.accessToken, refreshSession]);

  const signOut = useCallback(async () => {
    analytics.track(Events.LOGOUT);
    const token = session?.accessToken;
    // Best-effort server logout; never block local sign-out on it.
    if (token && deviceId) {
      try {
        await ckLogout({ userToken: token, deviceId });
      } catch {
        // ignore — clearing local tokens is what matters
      }
    }
    await clearSession();
    setSession(null);
    setStatus('unauthenticated');
    setDisplayNameState(null);
    // Drop the account-id identity back to the anonymous device id so later
    // events aren't attributed to the user who just logged out.
    if (deviceId) analytics.identify(deviceId);
  }, [session, deviceId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      accessToken: session?.accessToken ?? null,
      deviceId,
      displayName,
      signIn,
      signOut,
      refreshSession,
      setDisplayName,
    }),
    [
      status,
      session,
      deviceId,
      displayName,
      signIn,
      signOut,
      refreshSession,
      setDisplayName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
