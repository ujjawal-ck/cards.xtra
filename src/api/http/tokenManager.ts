/**
 * tokenManager.ts — the only place that mints, caches and refreshes tokens.
 *
 * Three tokens, one pattern:
 *   - CK app token   GET /token            (pre-login + offers calls)
 *   - BK partner JWT POST /token           (CardGenius calls)
 *   - CK user token  POST /login → /refreshtoken (all /users, /payment calls)
 *
 * Every token is:
 *   - cached until shortly before its JWT `exp` (or a fallback TTL),
 *   - minted single-flight: N concurrent callers share ONE network call,
 *   - invalidated and re-minted exactly once when a call returns 401/403.
 *
 * The user token additionally persists through `UserSessionStore` (secure
 * storage, wired by AuthContext) and keeps any rotated refresh_token.
 */
import { ApiError, isApiError } from './errors';
import { base64Decode } from './client';

/** Refresh this long before a token's real expiry, to absorb clock skew. */
export const EXPIRY_SKEW_MS = 2 * 60 * 1000;

/** Read the `exp` claim (ms since epoch) from a JWT, or null if it has none. */
export function jwtExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64Decode(parts[1])) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

let now = () => Date.now();
/** Test seam for the clock. */
export function __setClock(fn: () => number): void {
  now = fn;
}

/** Is this token unusable at `at` (missing, or within the skew of its exp)? */
export function isExpiring(token: string | null | undefined, fallbackExpiresAt?: number): boolean {
  if (!token) return true;
  const exp = jwtExpiryMs(token) ?? fallbackExpiresAt ?? null;
  return exp !== null && now() >= exp - EXPIRY_SKEW_MS;
}

// ── Cached token (app token, BK partner token) ──────────────────────────────

export interface CachedToken {
  /** Current token, minting one if needed. Concurrent calls share one mint. */
  get(): Promise<string>;
  /** Drop the cached token so the next get() mints a fresh one. */
  invalidate(): void;
  /** Peek without minting (tests / diagnostics). */
  peek(): string | null;
}

/**
 * @param mint      network call that returns a fresh token
 * @param fallbackTtlMs used when the token isn't a JWT with `exp`
 */
export function createCachedToken(mint: () => Promise<string>, fallbackTtlMs: number): CachedToken {
  let value: string | null = null;
  let expiresAt = 0;
  let inFlight: Promise<string> | null = null;

  return {
    async get() {
      if (value && !isExpiring(value, expiresAt)) return value;
      if (inFlight) return inFlight;
      inFlight = (async () => {
        try {
          const token = await mint();
          value = token;
          expiresAt = jwtExpiryMs(token) ?? now() + fallbackTtlMs;
          return token;
        } finally {
          inFlight = null;
        }
      })();
      return inFlight;
    },
    invalidate() {
      value = null;
      expiresAt = 0;
    },
    peek() {
      return value;
    },
  };
}

/**
 * Run `call` with a token from `source`; on 401/403 invalidate, re-mint once
 * and retry. Any other error (or a second auth failure) is thrown as-is.
 */
export async function withCachedToken<T>(source: CachedToken, call: (token: string) => Promise<T>): Promise<T> {
  const first = await source.get();
  try {
    return await call(first);
  } catch (e) {
    if (!(isApiError(e) && e.isAuth)) throw e;
    source.invalidate();
    return call(await source.get());
  }
}

// ── User session (access + refresh token) ───────────────────────────────────

export interface UserTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserSessionStore {
  /** Current tokens (AuthContext state, backed by secure storage). */
  read(): UserTokens | null;
  /** Persist refreshed tokens. */
  write(tokens: UserTokens): Promise<void> | void;
  /** Refresh failed with an auth error → the session is dead; sign out. */
  onExpired(): void;
  /** POST /refreshtoken. Returns the new access token and, if rotated, refresh token. */
  refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }>;
}

let store: UserSessionStore | null = null;
let refreshInFlight: Promise<string> | null = null;

/** Wire the session store (AuthContext does this once on mount). */
export function configureUserSession(s: UserSessionStore | null): void {
  store = s;
  refreshInFlight = null;
}

export class SessionExpiredError extends ApiError {
  constructor() {
    super('Your session has expired. Please log in again.', 401, undefined, { kind: 'http' });
    this.name = 'SessionExpiredError';
  }
}

/**
 * Exchange the refresh token for a new access token. Single-flight: every
 * caller during a refresh awaits the same promise. On an auth failure the
 * session is ended via `onExpired`; on a network failure it is kept (the
 * user is offline, not logged out).
 */
export function refreshUserToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  const s = store;
  const current = s?.read();
  if (!s || !current?.refreshToken) return Promise.reject(new SessionExpiredError());

  refreshInFlight = (async () => {
    try {
      const res = await s.refresh(current.refreshToken);
      const next: UserTokens = {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken || current.refreshToken,
      };
      await s.write(next);
      return next.accessToken;
    } catch (e) {
      // 401, or 400 code 2004 ("Invalid Refresh Token" per the CK doc), means
      // the refresh token is dead. 403 is NOT treated as expiry: the gateway
      // also returns 403 for a bad API key, which must not log the user out.
      if (isApiError(e) && e.kind === 'http' && (e.status === 401 || e.hasCode(2004))) {
        s.onExpired();
        throw new SessionExpiredError();
      }
      throw e;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** A usable access token: refreshed proactively when its JWT is about to expire. */
export async function getUserAccessToken(): Promise<string> {
  const current = store?.read();
  if (!current?.accessToken) throw new SessionExpiredError();
  if (isExpiring(current.accessToken)) return refreshUserToken();
  return current.accessToken;
}

/**
 * Run `call` with the user's access token; on 401/403 refresh once and retry.
 * `token` overrides the stored one (legacy callers that pass it explicitly).
 */
export async function withUserToken<T>(call: (token: string) => Promise<T>, token?: string): Promise<T> {
  const first = store ? await getUserAccessToken().catch((e) => (token ? token : Promise.reject(e))) : token;
  if (!first) throw new SessionExpiredError();
  try {
    return await call(first);
  } catch (e) {
    // Only 401 means "access token expired" for user endpoints.
    if (!(isApiError(e) && e.kind === 'http' && e.status === 401) || !store) throw e;
    const fresh = await refreshUserToken();
    return call(fresh);
  }
}
