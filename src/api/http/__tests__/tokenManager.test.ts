import {
  createCachedToken,
  withCachedToken,
  configureUserSession,
  refreshUserToken,
  getUserAccessToken,
  withUserToken,
  jwtExpiryMs,
  __setClock,
  SessionExpiredError,
  type UserTokens,
} from '../tokenManager';
import { base64Encode } from '../client';
import { ApiError } from '../errors';

const T0 = 1_800_000_000_000;
let clock = T0;
beforeEach(() => {
  clock = T0;
  __setClock(() => clock);
  configureUserSession(null);
});

/** Unsigned JWT with an exp claim (signature is irrelevant client-side). */
function jwt(expMs: number, extra: Record<string, unknown> = {}): string {
  const b64url = (o: object) => base64Encode(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ exp: Math.floor(expMs / 1000), ...extra })}.sig`;
}

const unauthorized = () => new ApiError('Unauthorized', 401, { message: 'Unauthorized' });

describe('jwtExpiryMs', () => {
  it('reads exp, and returns null for non-JWTs', () => {
    expect(jwtExpiryMs(jwt(T0 + 60_000))).toBe(T0 + 60_000);
    expect(jwtExpiryMs('opaque-token')).toBeNull();
  });
});

describe('createCachedToken', () => {
  it('mints once for concurrent callers (single-flight)', async () => {
    let resolveMint!: (v: string) => void;
    const mint = jest.fn(() => new Promise<string>((r) => (resolveMint = r)));
    const tok = createCachedToken(mint, 60_000);
    const all = Promise.all([tok.get(), tok.get(), tok.get(), tok.get(), tok.get()]);
    resolveMint('t1');
    expect(await all).toEqual(['t1', 't1', 't1', 't1', 't1']);
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it('re-mints before the JWT exp (with skew), not after', async () => {
    let n = 0;
    const tok = createCachedToken(async () => jwt(T0 + 30 * 60_000, { n: ++n }), 0);
    const a = await tok.get();
    clock = T0 + 20 * 60_000;
    expect(await tok.get()).toBe(a);
    clock = T0 + 29 * 60_000; // inside the 2-min skew window
    expect(await tok.get()).not.toBe(a);
  });

  it('uses the fallback TTL for opaque tokens', async () => {
    let n = 0;
    const tok = createCachedToken(async () => `opaque-${++n}`, 10 * 60_000);
    expect(await tok.get()).toBe('opaque-1');
    clock = T0 + 9 * 60_000;
    expect(await tok.get()).toBe('opaque-2');
  });

  it('withCachedToken re-mints exactly once on 401 and retries', async () => {
    let n = 0;
    const tok = createCachedToken(async () => `t${++n}`, 60 * 60_000);
    const call = jest.fn(async (t: string) => {
      if (t === 't1') throw unauthorized();
      return `ok:${t}`;
    });
    await expect(withCachedToken(tok, call)).resolves.toBe('ok:t2');
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('withCachedToken does not retry non-auth errors', async () => {
    const tok = createCachedToken(async () => 't', 60_000);
    const call = jest.fn(async () => {
      throw new ApiError('bad', 422, {});
    });
    await expect(withCachedToken(tok, call)).rejects.toMatchObject({ status: 422 });
    expect(call).toHaveBeenCalledTimes(1);
  });
});

describe('user session', () => {
  function setup(initial: UserTokens, refresh: (rt: string) => Promise<{ accessToken: string; refreshToken?: string }>) {
    let state: UserTokens | null = initial;
    const onExpired = jest.fn(() => {
      state = null;
    });
    const refreshFn = jest.fn(refresh);
    configureUserSession({
      read: () => state,
      write: (t) => {
        state = t;
      },
      onExpired,
      refresh: refreshFn,
    });
    return { get state() { return state; }, onExpired, refreshFn };
  }

  it('5 parallel 401s trigger exactly one refresh, and all calls succeed', async () => {
    const s = setup({ accessToken: 'old', refreshToken: 'r1' }, async () => ({ accessToken: 'new', refreshToken: 'r2' }));
    const call = jest.fn(async (t: string) => {
      if (t === 'old') throw unauthorized();
      return t;
    });
    const results = await Promise.all(Array.from({ length: 5 }, () => withUserToken(call)));
    expect(results).toEqual(['new', 'new', 'new', 'new', 'new']);
    expect(s.refreshFn).toHaveBeenCalledTimes(1);
  });

  it('keeps a rotated refresh token, and the old one when none is returned', async () => {
    const s = setup({ accessToken: 'a', refreshToken: 'r1' }, async () => ({ accessToken: 'b', refreshToken: 'r2' }));
    await refreshUserToken();
    expect(s.state).toEqual({ accessToken: 'b', refreshToken: 'r2' });

    const s2 = setup({ accessToken: 'a', refreshToken: 'r1' }, async () => ({ accessToken: 'b' }));
    await refreshUserToken();
    expect(s2.state).toEqual({ accessToken: 'b', refreshToken: 'r1' });
  });

  it('refreshes proactively when the access JWT is about to expire', async () => {
    const s = setup({ accessToken: jwt(T0 + 60_000), refreshToken: 'r' }, async () => ({ accessToken: 'fresh' }));
    await expect(getUserAccessToken()).resolves.toBe('fresh');
    expect(s.refreshFn).toHaveBeenCalledTimes(1);
  });

  it('ends the session when the refresh token is rejected (401 or code 2004)', async () => {
    const s = setup({ accessToken: 'a', refreshToken: 'dead' }, async () => {
      throw unauthorized();
    });
    await expect(refreshUserToken()).rejects.toBeInstanceOf(SessionExpiredError);
    expect(s.onExpired).toHaveBeenCalledTimes(1);

    const s2 = setup({ accessToken: 'a', refreshToken: 'dead' }, async () => {
      throw new ApiError('Invalid Refresh Token.', 400, { errors: [{ code: '2004' }] });
    });
    await expect(refreshUserToken()).rejects.toBeInstanceOf(SessionExpiredError);
    expect(s2.onExpired).toHaveBeenCalledTimes(1);
  });

  it('keeps the session on a network failure or a gateway 403', async () => {
    const s = setup({ accessToken: 'a', refreshToken: 'r' }, async () => {
      throw new ApiError('Network error', 0, undefined, { kind: 'network' });
    });
    await expect(refreshUserToken()).rejects.toMatchObject({ kind: 'network' });
    expect(s.onExpired).not.toHaveBeenCalled();
    expect(s.state).not.toBeNull();

    const s2 = setup({ accessToken: 'a', refreshToken: 'r' }, async () => {
      throw new ApiError('Forbidden', 403, { message: 'Forbidden' });
    });
    await expect(refreshUserToken()).rejects.toMatchObject({ status: 403 });
    expect(s2.onExpired).not.toHaveBeenCalled();
  });

  it('does not refresh on a 403 from a user endpoint', async () => {
    const s = setup({ accessToken: 'a', refreshToken: 'r' }, async () => ({ accessToken: 'b' }));
    const call = jest.fn(async () => {
      throw new ApiError('Forbidden', 403, {});
    });
    await expect(withUserToken(call)).rejects.toMatchObject({ status: 403 });
    expect(s.refreshFn).not.toHaveBeenCalled();
  });

  it('throws SessionExpiredError when signed out', async () => {
    await expect(getUserAccessToken()).rejects.toBeInstanceOf(SessionExpiredError);
  });
});
