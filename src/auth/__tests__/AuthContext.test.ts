/**
 * AuthProvider session-end paths (AUTH-02, DATA-03, QA-10, AUTH-05, AUTH-06):
 * signOut, expiry (refresh token rejected) and the launch dead-token path must
 * clear the same keys. No React renderer is installed (node test env), so a
 * small hooks stand-in calls AuthProvider as a plain function and reads the
 * context value from the element it returns.
 */
import type { useAuth } from '../AuthContext';

type AuthValue = ReturnType<typeof useAuth>;
interface Harness {
  slots: unknown[];
  i: number;
  effects: (() => void)[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  const h: any = { slots: [], i: 0, effects: [] };
  const changed = (a: any, b: any) => !a || !b || a.length !== b.length || a.some((v: any, k: number) => !Object.is(v, b[k]));
  const memo = (fn: any, deps: any) => {
    const k = h.i++;
    const prev = h.slots[k];
    if (prev && !changed(prev.deps, deps)) return prev.v;
    const v = fn();
    h.slots[k] = { deps, v };
    return v;
  };
  const hooks = {
    useState(init: any) {
      const k = h.i++;
      if (!(k in h.slots)) {
        const s: any = { v: typeof init === 'function' ? init() : init };
        s.set = (n: any) => {
          s.v = typeof n === 'function' ? n(s.v) : n;
        };
        h.slots[k] = s;
      }
      return [h.slots[k].v, h.slots[k].set];
    },
    useRef(init: any) {
      const k = h.i++;
      if (!(k in h.slots)) h.slots[k] = { current: init };
      return h.slots[k];
    },
    useMemo: memo,
    useCallback: (fn: any, deps: any) => memo(() => fn, deps),
    useEffect(fn: any, deps: any) {
      const k = h.i++;
      const prev = h.slots[k];
      if (prev && !changed(prev.deps, deps)) return;
      const s: any = { deps };
      h.slots[k] = s;
      h.effects.push(() => {
        if (prev && prev.cleanup) prev.cleanup();
        const c = fn();
        s.cleanup = typeof c === 'function' ? c : undefined;
      });
    },
  };
  return { __esModule: true, ...actual, default: actual, ...hooks, __harness: h };
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid' }));
jest.mock('../../api/cashkaro', () => ({
  logout: jest.fn(async () => undefined),
  refreshTokens: jest.fn(),
  getEarnings: jest.fn(async () => ({})),
  configureSegmentSource: jest.fn(),
}));
jest.mock('../../query/useProfile', () => ({ fetchProfile: jest.fn(async () => ({ id: 42 })) }));
jest.mock('../../query/useEarnings', () => ({ fetchEarnings: jest.fn(async () => ({})) }));
jest.mock('../../query/queryClient', () => ({
  queryClient: {
    clear: jest.fn(),
    prefetchQuery: jest.fn(() => Promise.resolve()),
    fetchQuery: jest.fn(({ queryFn }: { queryFn: (c: { signal?: AbortSignal }) => unknown }) =>
      Promise.resolve(queryFn({})),
    ),
  },
}));
jest.mock('../../../modules/cashback-guard', () => ({
  isSupported: true,
  stopGuard: jest.fn(),
  setMerchants: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const SecureStore = require('expo-secure-store') as { deleteItemAsync: jest.Mock; setItemAsync: jest.Mock };
const cashkaro = require('../../api/cashkaro') as {
  refreshTokens: jest.Mock;
  logout: jest.Mock;
  configureSegmentSource: jest.Mock;
};
const CashbackGuard = require('../../../modules/cashback-guard') as { stopGuard: jest.Mock };
const { fetchEarnings } = require('../../query/useEarnings') as { fetchEarnings: jest.Mock };
const { queryClient } = require('../../query/queryClient') as { queryClient: { prefetchQuery: jest.Mock } };
const { qk } = require('../../query/keys') as typeof import('../../query/keys');
const { AuthProvider } = require('../AuthContext') as typeof import('../AuthContext');
const { currentSegment } = require('../tokenStore') as typeof import('../tokenStore');
const { analytics } = require('../../analytics') as typeof import('../../analytics');
const { __setClock } = require('../../api/http/tokenManager') as typeof import('../../api/http/tokenManager');
const { base64Encode } = require('../../api/http/client') as typeof import('../../api/http/client');
const { ApiError } = require('../../api/http/errors') as typeof import('../../api/http/errors');
const harness = (require('react') as { __harness: Harness }).__harness;
/* eslint-enable @typescript-eslint/no-var-requires */

const T0 = 1_800_000_000_000;
function jwt(expMs: number): string {
  const b64url = (o: object) => base64Encode(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ exp: Math.floor(expMs / 1000) })}.sig`;
}
const VALID = jwt(T0 + 60 * 60_000);
const EXPIRED = jwt(T0 - 60_000);

const USER_KEYS: Record<string, string> = {
  ck_refresh_token: 'r1',
  ck_display_name: 'Asha',
  ck_user_id: '42',
  ck_segment_ids: JSON.stringify(['1629794787', '1629794721']),
  ck_new_user_segment_expiry_sec: '86400',
  ck_user_joined_at: '2021-09-21T23:55:18Z',
  'cardsxtra.profile.v1': JSON.stringify({
    eligibility: { pincode: '110001', income: '50000', incomeType: 'salaried' },
    applied: [],
  }),
  'cardsxtra.toolSpends.v1': JSON.stringify({ fuel: 3000 }),
  never_miss_cashback_enabled: '1',
};
const DEVICE_KEYS = ['device_unique_id', 'never_miss_cashback_nudge_dismissed', 'onboarding_seen'];

const sinkProps: Record<string, string | null>[] = [];
analytics.registerSink({ track: () => undefined, setUserProperties: (p) => sinkProps.push(p) });

const flush = () => new Promise((r) => setImmediate(r));

function render(): AuthValue {
  harness.i = 0;
  const el = AuthProvider({ children: null }) as unknown as { props: { value: AuthValue } };
  harness.effects.splice(0).forEach((run) => run());
  return el.props.value;
}

/** Let async work finish, re-rendering so effects see the new state. */
async function settle(): Promise<AuthValue> {
  for (let n = 0; n < 6; n++) {
    await flush();
    render();
  }
  return render();
}

/** Launch with a saved session whose access token is `accessToken`. */
async function launch(accessToken: string): Promise<AuthValue> {
  mockStore.clear();
  for (const [k, v] of Object.entries(USER_KEYS)) mockStore.set(k, v);
  mockStore.set('ck_access_token', accessToken);
  mockStore.set('device_unique_id', 'dev-1');
  mockStore.set('onboarding_seen', '1');
  mockStore.set('never_miss_cashback_nudge_dismissed', '1');
  render();
  return settle();
}

/** The keys deleted from secure store since the last mockClear. */
const deletedKeys = () => [...new Set(SecureStore.deleteItemAsync.mock.calls.map((c) => c[0] as string))].sort();
const keysLeft = () => [...mockStore.keys()].sort();

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  __setClock(() => T0);
  harness.slots = [];
  harness.effects = [];
  sinkProps.length = 0;
});

describe('every session end clears the same keys', () => {
  async function signOutKeys(): Promise<string[]> {
    const v = await launch(VALID);
    SecureStore.deleteItemAsync.mockClear();
    await v.signOut();
    await settle();
    return deletedKeys();
  }

  it('signOut clears every user-scoped key, the name and ck_user_id, and stops the reminder', async () => {
    const v = await launch(VALID);
    expect(v.status).toBe('authenticated');
    expect(v.displayName).toBe('Asha');
    expect(sinkProps).toContainEqual({ ck_user_id: '42' });
    await v.signOut();
    const after = await settle();
    expect(after.status).toBe('unauthenticated');
    expect(after.accessToken).toBeNull();
    expect(after.displayName).toBeNull();
    expect(after.sessionExpiredAt).toBeNull();
    expect(keysLeft()).toEqual(DEVICE_KEYS);
    expect(sinkProps[sinkProps.length - 1]).toEqual({ logged_in: 'false' });
    expect(sinkProps).toContainEqual({ ck_user_id: null });
    expect(CashbackGuard.stopGuard).toHaveBeenCalled();
  });

  it('expiry (refresh token rejected) clears the same keys as signOut', async () => {
    const expected = await signOutKeys();
    harness.slots = [];
    sinkProps.length = 0;
    CashbackGuard.stopGuard.mockClear();

    const v = await launch(VALID);
    SecureStore.deleteItemAsync.mockClear();
    cashkaro.refreshTokens.mockRejectedValueOnce(new ApiError('Unauthorized', 401, { message: 'Unauthorized' }));
    await expect(v.refreshSession()).resolves.toBeNull();
    const after = await settle();
    expect(after.status).toBe('unauthenticated');
    expect(after.sessionExpiredAt).not.toBeNull();
    expect(after.displayName).toBeNull();
    expect(deletedKeys()).toEqual(expected);
    expect(keysLeft()).toEqual(DEVICE_KEYS);
    expect(sinkProps).toContainEqual({ ck_user_id: null });
    expect(CashbackGuard.stopGuard).toHaveBeenCalled();
  });

  it('the launch dead-token path clears the same keys as signOut and shows no name', async () => {
    const expected = await signOutKeys();
    harness.slots = [];
    sinkProps.length = 0;
    CashbackGuard.stopGuard.mockClear();

    SecureStore.deleteItemAsync.mockClear();
    cashkaro.refreshTokens.mockRejectedValueOnce(
      new ApiError('Invalid Refresh Token.', 400, { errors: [{ code: '2004' }] }),
    );
    const after = await launch(EXPIRED);
    expect(after.status).toBe('unauthenticated');
    expect(after.displayName).toBeNull();
    expect(deletedKeys()).toEqual(expected);
    expect(keysLeft()).toEqual(DEVICE_KEYS);
    expect(sinkProps).toContainEqual({ ck_user_id: null });
    expect(CashbackGuard.stopGuard).toHaveBeenCalled();
  });
});

describe('AUTH-05: a refresh that finishes after logout', () => {
  it('saves nothing, and the status stays unauthenticated', async () => {
    const v = await launch(VALID);
    let resolveRefresh!: (r: { accessToken: string; refreshToken?: string }) => void;
    cashkaro.refreshTokens.mockImplementationOnce(() => new Promise((r) => (resolveRefresh = r)));
    const refreshing = v.refreshSession(); // a refresh is pending
    await flush();
    await v.signOut();
    await settle();
    SecureStore.setItemAsync.mockClear();
    resolveRefresh({
      accessToken: 'late-access',
      refreshToken: 'late-refresh',
      userId: '42',
      segment: { ids: ['5'], newUserExpirySec: 60, joinedAt: '2026-11-01T00:00:00Z' },
    } as never);
    await expect(refreshing).resolves.toBeNull();
    const after = await settle();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('ck_access_token', expect.anything());
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('ck_refresh_token', expect.anything());
    // Nor the user id or segment of the ended session.
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(currentSegment()).toBeNull();
    expect(mockStore.has('ck_access_token')).toBe(false);
    expect(after.status).toBe('unauthenticated');
    expect(after.accessToken).toBeNull();
    expect(after.session).toBeNull();
    expect(after.sessionExpiredAt).toBeNull();
  });
});

describe('AUTH-02: signIn', () => {
  it('drops the previous name; a signup sets the new one right after', async () => {
    const v = await launch(VALID);
    expect(v.displayName).toBe('Asha');
    await v.signIn({ accessToken: VALID, refreshToken: 'b-refresh' });
    const b = await settle();
    expect(b.status).toBe('authenticated');
    expect(b.displayName).toBeNull();
    expect(mockStore.has('ck_display_name')).toBe(false);
    expect(mockStore.get('ck_refresh_token')).toBe('b-refresh');

    await b.setDisplayName('Ravi');
    expect((await settle()).displayName).toBe('Ravi');
  });

  it('R-08: the earnings prefetch uses the same query function as useEarnings', async () => {
    const v = await launch(VALID);
    queryClient.prefetchQuery.mockClear();
    await v.signIn({ accessToken: VALID, refreshToken: 'b-refresh' });
    const call = queryClient.prefetchQuery.mock.calls.find(
      ([o]) => JSON.stringify(o.queryKey) === JSON.stringify(qk.user.earnings()),
    );
    expect(call).toBeDefined();
    await call![0].queryFn({ signal: undefined });
    expect(fetchEarnings).toHaveBeenCalledWith(VALID, undefined);
  });
});

describe('AC-24 / D6: the user id and segment from login, signup and refresh', () => {
  /** The segment the offers calls would send now (the source AuthContext registered). */
  const segmentSource = () => {
    const calls = cashkaro.configureSegmentSource.mock.calls;
    const fn = calls[calls.length - 1]?.[0] as (() => unknown) | null | undefined;
    return fn ? fn() : null;
  };

  it('signIn stores the user id and segment of the login response, and the offers source reads them', async () => {
    const v = await launch(VALID);
    await v.signIn({
      accessToken: VALID,
      refreshToken: 'b-refresh',
      userId: '17',
      segment: { ids: ['1629794787', '888888888'], newUserExpirySec: 86400, joinedAt: '2026-11-20T00:00:00Z' },
    });
    const b = await settle();
    expect(b.status).toBe('authenticated');
    // Session state holds the tokens only.
    expect(b.session).toEqual({ accessToken: VALID, refreshToken: 'b-refresh' });
    expect(mockStore.get('ck_user_id')).toBe('17');
    expect(JSON.parse(mockStore.get('ck_segment_ids') as string)).toEqual(['1629794787', '888888888']);
    expect(mockStore.get('ck_new_user_segment_expiry_sec')).toBe('86400');
    expect(mockStore.get('ck_user_joined_at')).toBe('2026-11-20T00:00:00Z');
    expect(segmentSource()).toEqual({
      ids: ['1629794787', '888888888'],
      newUserExpirySec: 86400,
      joinedAt: '2026-11-20T00:00:00Z',
    });
  });

  it('signIn without these fields keeps nothing of the previous user', async () => {
    const v = await launch(VALID);
    expect(mockStore.get('ck_user_id')).toBe('42');
    await v.signIn({ accessToken: VALID, refreshToken: 'b-refresh' });
    await settle();
    for (const k of ['ck_user_id', 'ck_segment_ids', 'ck_new_user_segment_expiry_sec', 'ck_user_joined_at']) {
      expect(mockStore.has(k)).toBe(false);
    }
    expect(segmentSource()).toBeNull();
  });

  it('launch loads the stored segment for a saved session', async () => {
    await launch(VALID);
    expect(segmentSource()).toEqual({
      ids: ['1629794787', '1629794721'],
      newUserExpirySec: 86400,
      joinedAt: '2021-09-21T23:55:18Z',
    });
  });

  it('a refresh updates the fields it carries and keeps the others', async () => {
    const v = await launch(VALID);
    cashkaro.refreshTokens.mockResolvedValueOnce({ accessToken: VALID, segment: { ids: ['9'] } });
    await expect(v.refreshSession()).resolves.toBe(VALID);
    await settle();
    expect(JSON.parse(mockStore.get('ck_segment_ids') as string)).toEqual(['9']);
    expect(mockStore.get('ck_new_user_segment_expiry_sec')).toBe('86400');
    expect(mockStore.get('ck_user_joined_at')).toBe('2021-09-21T23:55:18Z');
    expect(mockStore.get('ck_user_id')).toBe('42');
    expect(segmentSource()).toEqual({ ids: ['9'], newUserExpirySec: 86400, joinedAt: '2021-09-21T23:55:18Z' });

    // No segment fields and no id: everything stays.
    cashkaro.refreshTokens.mockResolvedValueOnce({ accessToken: VALID, segment: {} });
    await v.refreshSession();
    await settle();
    expect(JSON.parse(mockStore.get('ck_segment_ids') as string)).toEqual(['9']);
    expect(mockStore.get('ck_user_id')).toBe('42');

    // An empty list is a value: the user has no segment now.
    cashkaro.refreshTokens.mockResolvedValueOnce({ accessToken: VALID, userId: '42', segment: { ids: [] } });
    await v.refreshSession();
    await settle();
    expect(JSON.parse(mockStore.get('ck_segment_ids') as string)).toEqual([]);
  });

  it('the launch refresh updates the loaded segment instead of being overwritten by it', async () => {
    cashkaro.refreshTokens.mockResolvedValueOnce({
      accessToken: VALID,
      refreshToken: 'r2',
      userId: '42',
      segment: { ids: ['5'] },
    });
    const v = await launch(EXPIRED);
    expect(v.status).toBe('authenticated');
    expect(JSON.parse(mockStore.get('ck_segment_ids') as string)).toEqual(['5']);
    expect(segmentSource()).toEqual({ ids: ['5'], newUserExpirySec: 86400, joinedAt: '2021-09-21T23:55:18Z' });
  });

  it('a guest gets no segment, even right after a sign-out', async () => {
    const v = await launch(VALID);
    expect(segmentSource()).not.toBeNull();
    await v.signOut();
    await settle();
    expect(segmentSource()).toBeNull();
    expect(currentSegment()).toBeNull();
  });
});

describe('AUTH-05: a refresh whose id and segment save is still running at sign-out', () => {
  it('leaves no id or segment behind', async () => {
    const v = await launch(VALID);
    const realSet = SecureStore.setItemAsync.getMockImplementation() as (k: string, v: string) => Promise<void>;
    let releaseSave: (() => void) | undefined;
    SecureStore.setItemAsync.mockImplementation(async (k: string, val: string) => {
      if (k === 'ck_segment_ids') await new Promise<void>((r) => (releaseSave = r));
      return realSet(k, val);
    });
    try {
      cashkaro.refreshTokens.mockResolvedValueOnce({ accessToken: VALID, userId: '42', segment: { ids: ['5'] } });
      const refreshing = v.refreshSession();
      for (let i = 0; i < 3; i++) await flush();
      expect(releaseSave).toBeDefined(); // the segment save is waiting
      await v.signOut();
      await settle();
      releaseSave!(); // the old write lands after the sign-out cleared the store
      await expect(refreshing).resolves.toBeNull();
      await settle();
    } finally {
      SecureStore.setItemAsync.mockImplementation(realSet);
    }
    for (const k of ['ck_user_id', 'ck_segment_ids', 'ck_new_user_segment_expiry_sec', 'ck_user_joined_at']) {
      expect(mockStore.has(k)).toBe(false);
    }
    expect(currentSegment()).toBeNull();
    expect(keysLeft()).toEqual(DEVICE_KEYS);
  });
});
