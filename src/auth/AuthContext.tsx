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
  refreshTokens as ckRefreshTokens,
  getEarnings,
} from '../api/cashkaro';
import { configureUserSession, refreshUserToken, isExpiring } from '../api/http/tokenManager';
import { isApiError } from '../api/http/errors';
import { qk } from '../query/keys';
import { fetchProfile } from '../query/useProfile';
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
      queryKey: qk.user.earnings(),
      queryFn: async ({ signal }) => mapEarnings(await getEarnings(accessToken, signal)),
    })
    .catch(() => undefined);
  queryClient
    .prefetchQuery({
      queryKey: qk.user.profile(),
      queryFn: ({ signal }) => fetchProfile(accessToken, signal),
    })
    .catch(() => undefined);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);

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
          // Validate before trusting it: an expired access token is refreshed
          // first. A rejected refresh token means signed out; a network
          // failure keeps the session (the next call refreshes again).
          let current: Session | null = saved;
          if (isExpiring(saved.accessToken)) {
            try {
              const res = await ckRefreshTokens(saved.refreshToken);
              current = { accessToken: res.accessToken, refreshToken: res.refreshToken || saved.refreshToken };
              await saveSession(current);
            } catch (e) {
              const dead = isApiError(e) && e.kind === 'http' && (e.status === 401 || e.hasCode(2004));
              if (dead) {
                await clearSession();
                current = null;
              }
            }
          }
          if (!active) return;
          if (current) {
            sessionRef.current = current;
            setSession(current);
            setStatus('authenticated');
          } else {
            setStatus('unauthenticated');
          }
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
    // A new login never inherits the previous user's cache.
    queryClient.clear();
    sessionRef.current = next;
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

  // Mirror of `session` for the token manager, which reads it outside React.
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  // End the session locally (no server call): used when the refresh token is
  // rejected. Clears every cached query so the next user never sees this
  // user's data.
  const expireSession = useCallback(async () => {
    await clearSession();
    sessionRef.current = null;
    setSession(null);
    setStatus('unauthenticated');
    setDisplayNameState(null);
    queryClient.clear();
    if (deviceIdRef.current) analytics.identify(deviceIdRef.current);
  }, []);

  const deviceIdRef = useRef<string | null>(null);
  deviceIdRef.current = deviceId;

  // Hand the session to the token manager once. It owns refresh: single-flight
  // across every caller, keeps rotated refresh tokens, and calls onExpired only
  // when the refresh token is genuinely dead (401 / code 2004) — never on a
  // network error.
  useEffect(() => {
    configureUserSession({
      read: () => sessionRef.current,
      write: async (tokens) => {
        const next: Session = { ...(sessionRef.current ?? tokens), ...tokens };
        sessionRef.current = next;
        await saveSession(next);
        setSession(next);
      },
      onExpired: () => {
        void expireSession();
      },
      refresh: (refreshToken) => ckRefreshTokens(refreshToken),
    });
    return () => configureUserSession(null);
  }, [expireSession]);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (!sessionRef.current?.refreshToken) return null;
    try {
      return await refreshUserToken();
    } catch {
      return null;
    }
  }, []);

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
        queryKey: qk.user.profile(),
        queryFn: ({ signal }) => fetchProfile(token, signal),
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
  }, [session?.accessToken]);

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
    sessionRef.current = null;
    setSession(null);
    setStatus('unauthenticated');
    setDisplayNameState(null);
    // Never let the next user see this user's cached earnings/orders/profile.
    queryClient.clear();
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
