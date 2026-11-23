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
  clearIdentity,
  getDeviceId,
  saveDisplayName,
  loadDisplayName,
  saveUserId,
  saveSegment,
  loadSegment,
  currentSegment,
  type Session,
} from './tokenStore';
import { endLocalSession, restoreSession } from './sessionEnd';
import {
  logout as ckLogout,
  refreshTokens as ckRefreshTokens,
  configureSegmentSource,
  type AuthIdentity,
} from '../api/cashkaro';
import {
  configureUserSession,
  refreshUserToken,
  bumpSessionGeneration,
  currentSessionGeneration,
} from '../api/http/tokenManager';
import { qk } from '../query/keys';
import { fetchProfile } from '../query/useProfile';
import { fetchEarnings } from '../query/useEarnings';
import { queryClient } from '../query/queryClient';
import { analytics, Events } from '../analytics';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: Status;
  /** Time the session was ended because the refresh token was rejected (not
   *  a manual logout). The login sheet opens itself when this changes. */
  sessionExpiredAt: number | null;
  session: Session | null;
  accessToken: string | null;
  /** Stable per-install device id (ready after bootstrap). */
  deviceId: string | null;
  /** What to call the user on Home/Profile. A local override of the backend
   *  fullname (there's no profile-update API): captured on the post-OTP
   *  NameInput screen for a fresh signup. */
  displayName: string | null;
  /** Persist a session after a successful login/signup OTP verify, with the
   *  CashKaro user id and segment the response carried. */
  signIn: (session: Session & Partial<AuthIdentity>) => Promise<void>;
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
      // The same query function as useEarnings: a body with no amount is an
      // error, never cached as ₹0 (review R-08).
      queryFn: ({ signal }) => fetchEarnings(accessToken, signal),
    })
    .catch(() => undefined);
  queryClient
    .prefetchQuery({
      queryKey: qk.user.profile(),
      queryFn: ({ signal }) => fetchProfile(accessToken, signal),
    })
    .catch(() => undefined);
}

/**
 * Save the CashKaro user id (`ck_user_id`, the click-out `id=`) and the
 * segment of a login, signup or refresh response. A field the response left
 * out keeps its stored value.
 */
async function keepIdentity(identity: Partial<AuthIdentity>): Promise<void> {
  await Promise.all([
    identity.userId ? saveUserId(identity.userId) : undefined,
    identity.segment ? saveSegment(identity.segment) : undefined,
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [sessionExpiredAt, setSessionExpiredAt] = useState<number | null>(null);

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
        // Tie analytics to the stable per-install device id (NOT PII — never
        // the phone/name). GA4 keeps its own instance id; this just gives us a
        // consistent handle that survives logout/login on the same device.
        analytics.identify(id);
        // The stored segment goes to memory first, so a launch refresh
        // updates it instead of being overwritten by it.
        if (saved) await loadSegment().catch(() => null);
        if (!active) return;
        // Validate before trusting it: an expired access token is refreshed
        // first. A rejected refresh token ends the local session (the same
        // clear as a logout); a network failure keeps the session.
        const current = saved ? await restoreSession(saved, id, refreshKeepingIdentity) : null;
        if (!active || current === 'superseded') return;
        if (current) {
          // The name belongs to this session only (AUTH-02).
          setDisplayNameState(name);
          sessionRef.current = current;
          setSession(current);
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

  const signIn = useCallback(async (next: Session & Partial<AuthIdentity>) => {
    // A new session: a refresh still running for an older one must not write.
    bumpSessionGeneration();
    setSessionExpiredAt(null);
    // Never show the previous account's name or keep its stored id (AUTH-02).
    // A signup sets the new name right after signIn.
    setDisplayNameState(null);
    await clearSession().catch(() => undefined);
    // Only the tokens are session state; the id and segment are stored apart.
    const tokens: Session = { accessToken: next.accessToken, refreshToken: next.refreshToken };
    await saveSession(tokens);
    // The new user id (click-out attribution reads it right after) and
    // segment, before the cache clear so refetched offers carry the segment.
    await keepIdentity(next).catch(() => undefined);
    // A new login never inherits the previous user's cache.
    queryClient.clear();
    sessionRef.current = tokens;
    setSession(tokens);
    setStatus('authenticated');
    // Warm earnings/profile so those tabs open instantly (non-blocking).
    warmUserCache(tokens.accessToken);
  }, []);

  const setDisplayName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    await saveDisplayName(trimmed);
    setDisplayNameState(trimmed);
  }, []);

  // Mirror of `session` for the token manager, which reads it outside React.
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  // POST /refreshtoken for the launch check and the token manager. Keeps the
  // user id and segment the response carries (a field it leaves out keeps
  // its stored value). Nothing is kept once the session that asked has ended
  // (AUTH-05).
  const refreshKeepingIdentity = useCallback(async (refreshToken: string) => {
    const gen = currentSessionGeneration();
    const res = await ckRefreshTokens(refreshToken);
    if (gen === currentSessionGeneration()) {
      await keepIdentity(res).catch(() => undefined);
      // The session ended while saving: never bring this user's id or segment back.
      if (gen !== currentSessionGeneration() && !sessionRef.current) {
        await clearIdentity().catch(() => undefined);
      }
    }
    return res;
  }, []);

  // The offers calls send this user's segment (filter[segmentid]); a guest
  // sends none.
  useEffect(() => {
    configureSegmentSource(() => (sessionRef.current ? currentSegment() : null));
    return () => configureSegmentSource(null);
  }, []);

  // The one local session end (no server call) for signOut and expiry; the
  // launch path calls endLocalSession through restoreSession. React state
  // first, then every user-scoped key and store (see sessionEnd.ts).
  const endSession = useCallback(async (devId: string | null) => {
    sessionRef.current = null;
    setSession(null);
    setStatus('unauthenticated');
    setDisplayNameState(null);
    await endLocalSession(devId);
  }, []);

  // The refresh token was rejected: end the session and let the login sheet
  // open itself.
  const expireSession = useCallback(async () => {
    setSessionExpiredAt(Date.now());
    await endSession(deviceIdRef.current);
  }, [endSession]);

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
        const gen = currentSessionGeneration();
        const next: Session = { ...(sessionRef.current ?? tokens), ...tokens };
        sessionRef.current = next;
        await saveSession(next);
        // The session ended while saving: never bring these tokens back (AUTH-05).
        if (gen !== currentSessionGeneration()) {
          if (!sessionRef.current) await clearSession().catch(() => undefined);
          return;
        }
        setSession(next);
      },
      onExpired: () => {
        void expireSession();
      },
      refresh: (refreshToken) => refreshKeepingIdentity(refreshToken),
    });
    return () => configureUserSession(null);
  }, [expireSession, refreshKeepingIdentity]);

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
    setSessionExpiredAt(null);
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
    // Same local end as an expiry: tokens, saved inputs, caches, analytics
    // identity and the Cashback Reminder.
    await endSession(deviceId);
  }, [session, deviceId, endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      sessionExpiredAt,
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
      sessionExpiredAt,
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
