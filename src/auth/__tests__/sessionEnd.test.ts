/**
 * endLocalSession and the launch check (AUTH-02, DATA-03, QA-10, AUTH-06,
 * DATA-11). Storage is an in-memory secure store.
 */
import { endLocalSession, restoreSession } from '../sessionEnd';
import { currentSegment, loadSegment } from '../tokenStore';
import { getAdvisorSession } from '../../screens/advisor/advisorSession';
import { useSavedSpends } from '../../lib/savedSpends';
import { clearQueryCache } from '../../query/queryClient';
import { analytics } from '../../analytics';
import { bumpSessionGeneration, __setClock } from '../../api/http/tokenManager';
import { base64Encode } from '../../api/http/client';
import { ApiError } from '../../api/http/errors';
import * as CashbackGuard from '../../../modules/cashback-guard';
import { hydratePayoutCooldown, payoutCooldownOn, startPayoutCooldown } from '../../lib/payoutCooldown';

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
jest.mock('../../query/queryClient', () => ({ clearQueryCache: jest.fn() }));
jest.mock('../../../modules/cashback-guard', () => ({
  isSupported: true,
  stopGuard: jest.fn(),
  setMerchants: jest.fn(),
}));
// useSavedSpends outside a component.
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useSyncExternalStore: (subscribe: (l: () => void) => () => void, getSnapshot: () => unknown) => {
    subscribe(() => undefined);
    return getSnapshot();
  },
}));

/** Keys that belong to the signed-in user: all must go at a session end. */
const USER_KEYS: Record<string, string> = {
  ck_access_token: 'a',
  ck_refresh_token: 'r',
  ck_display_name: 'Asha',
  ck_name_pending: '1',
  ck_user_id: '42',
  // The CashKaro segment from login / refresh (AC-24, M11).
  ck_segment_ids: JSON.stringify(['1629794787', '888888888']),
  ck_new_user_segment_expiry_sec: '86400',
  ck_user_joined_at: '2026-11-01T00:00:00Z',
  'cardsxtra.profile.v1': JSON.stringify({
    eligibility: { pincode: '110001', income: '50000', incomeType: 'salaried' },
    applied: [{ alias: 'hdfc-millennia', at: '2026-11-01T00:00:00.000Z' }],
  }),
  'cardsxtra.toolSpends.v1': JSON.stringify({ fuel: 3000 }),
  never_miss_cashback_enabled: '1',
};
/** Keys that belong to the install: kept on purpose. */
const DEVICE_KEYS: Record<string, string> = {
  device_unique_id: 'dev-1',
  onboarding_seen: '1',
  never_miss_cashback_nudge_dismissed: '1',
  'cardsxtra.recentSearches.v1': '[]',
  'cardsxtra.recentSearches.offers.v1': '[]',
};

const T0 = 1_800_000_000_000;
function jwt(expMs: number): string {
  const b64url = (o: object) => base64Encode(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ exp: Math.floor(expMs / 1000) })}.sig`;
}
const EXPIRED = { accessToken: jwt(T0 - 60_000), refreshToken: 'r' };
const flush = () => new Promise((r) => setImmediate(r));

const sinkProps: Record<string, string | null>[] = [];
const sinkIds: (string | null)[] = [];
analytics.registerSink({
  track: () => undefined,
  identify: (id) => sinkIds.push(id),
  setUserProperties: (p) => sinkProps.push(p),
});

function seed() {
  mockStore.clear();
  for (const [k, v] of Object.entries({ ...USER_KEYS, ...DEVICE_KEYS })) mockStore.set(k, v);
}
const keysLeft = () => [...mockStore.keys()].sort();

beforeEach(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  __setClock(() => T0);
  seed();
  sinkProps.length = 0;
  sinkIds.length = 0;
  // Saved spends in memory, like a mounted tools screen.
  useSavedSpends().save({ fuel: 3000 });
  await flush();
  getAdvisorSession().state = { answers: { opener: 'travel' }, held: [] } as never;
  getAdvisorSession().formDraft = { job: 'salaried', income: '50000', pincode: '110001' };
});

describe('endLocalSession', () => {
  it('clears every user-scoped key and keeps the install keys', async () => {
    expect(useSavedSpends().answers).toEqual({ fuel: 3000 });
    await endLocalSession('dev-1');
    expect(keysLeft()).toEqual(Object.keys(DEVICE_KEYS).sort());
  });

  it('clears the in-memory stores, the query cache and the analytics identity, and stops the reminder', async () => {
    await endLocalSession('dev-1');
    expect(useSavedSpends().answers).toEqual({});
    expect(getAdvisorSession().formDraft).toBeNull();
    expect(getAdvisorSession().state.answers).toEqual({});
    expect(clearQueryCache).toHaveBeenCalled();
    expect(sinkProps).toContainEqual({ ck_user_id: null });
    expect(sinkIds[sinkIds.length - 1]).toBe('dev-1');
    expect(CashbackGuard.stopGuard).toHaveBeenCalledTimes(1);
  });

  it('drops the segment from memory as well as the store, so the next offers call sends none (AC-24)', async () => {
    await loadSegment();
    expect(currentSegment()?.ids).toEqual(['1629794787', '888888888']);
    const ending = endLocalSession('dev-1');
    // Memory first: gone before the store work finishes.
    expect(currentSegment()).toBeNull();
    await ending;
    expect(currentSegment()).toBeNull();
    expect(await loadSegment()).toBeNull();
    for (const k of ['ck_user_id', 'ck_segment_ids', 'ck_new_user_segment_expiry_sec', 'ck_user_joined_at']) {
      expect(mockStore.has(k)).toBe(false);
    }
  });

  describe('payout cool-down across a session end (log out and in is no way round it)', () => {
    const KEY = 'cardsxtra.payoutUnknownUntil.v1';
    const start = async () => {
      mockStore.set('ck_user_id', '42');
      await hydratePayoutCooldown();
      await startPayoutCooldown(Date.now() + 10 * 60_000);
      expect(payoutCooldownOn(Date.now())).toBe(true);
      await endLocalSession('dev-1');
      // The saved value stays; the memory copy is forgotten until the next read.
      expect(mockStore.has(KEY)).toBe(true);
      expect(payoutCooldownOn(Date.now())).toBe(false);
    };

    it('blocks the same user who logs in again', async () => {
      await start();
      mockStore.set('ck_user_id', '42');
      await hydratePayoutCooldown();
      expect(payoutCooldownOn(Date.now())).toBe(true);
    });

    it('blocks a different account on the same phone too (review-2 R2-02)', async () => {
      await start();
      mockStore.set('ck_user_id', '77');
      await hydratePayoutCooldown();
      expect(payoutCooldownOn(Date.now())).toBe(true);
    });

    it('stays blocked while the user id is not known yet (fail closed)', async () => {
      await start();
      mockStore.delete('ck_user_id');
      await hydratePayoutCooldown();
      expect(payoutCooldownOn(Date.now())).toBe(true);
    });
  });

  it('is safe to run twice and never throws on a storage failure', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.deleteItemAsync.mockImplementationOnce(async () => {
      throw new Error('keystore');
    });
    await expect(endLocalSession(null)).resolves.toBeUndefined();
    await expect(endLocalSession(null)).resolves.toBeUndefined();
    expect(keysLeft()).toEqual(Object.keys(DEVICE_KEYS).sort());
    expect(sinkIds[sinkIds.length - 1]).toBeNull();
  });
});

describe('restoreSession (launch)', () => {
  it('a dead refresh token (401) clears the same keys as a logout', async () => {
    const refresh = jest.fn(async () => {
      throw new ApiError('Unauthorized', 401, { message: 'Unauthorized' });
    });
    await expect(restoreSession(EXPIRED, 'dev-1', refresh)).resolves.toBeNull();
    expect(keysLeft()).toEqual(Object.keys(DEVICE_KEYS).sort());
    expect(sinkProps).toContainEqual({ ck_user_id: null });
    expect(CashbackGuard.stopGuard).toHaveBeenCalledTimes(1);
  });

  it('a dead refresh token (code 2004) clears the same keys as a logout', async () => {
    const refresh = jest.fn(async () => {
      throw new ApiError('Invalid Refresh Token.', 400, { errors: [{ code: '2004' }] });
    });
    await expect(restoreSession(EXPIRED, 'dev-1', refresh)).resolves.toBeNull();
    expect(keysLeft()).toEqual(Object.keys(DEVICE_KEYS).sort());
  });

  it('a network failure keeps the session and clears nothing', async () => {
    const refresh = jest.fn(async () => {
      throw new ApiError('Network error', 0, undefined, { kind: 'network' });
    });
    await expect(restoreSession(EXPIRED, 'dev-1', refresh)).resolves.toBe(EXPIRED);
    expect(keysLeft()).toEqual(Object.keys({ ...USER_KEYS, ...DEVICE_KEYS }).sort());
    expect(CashbackGuard.stopGuard).not.toHaveBeenCalled();
  });

  it('a valid access token is used without a refresh', async () => {
    const valid = { accessToken: jwt(T0 + 60 * 60_000), refreshToken: 'r' };
    const refresh = jest.fn();
    await expect(restoreSession(valid, 'dev-1', refresh)).resolves.toBe(valid);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('saves the refreshed tokens, keeping the refresh token when none is returned', async () => {
    await expect(restoreSession(EXPIRED, 'dev-1', async () => ({ accessToken: 'new' }))).resolves.toEqual({
      accessToken: 'new',
      refreshToken: 'r',
    });
    expect(mockStore.get('ck_access_token')).toBe('new');
  });

  it('a session end during the refresh drops the tokens (AUTH-05)', async () => {
    let resolve!: (v: { accessToken: string }) => void;
    const pending = restoreSession(EXPIRED, 'dev-1', () => new Promise((r) => (resolve = r)));
    bumpSessionGeneration();
    mockStore.delete('ck_access_token');
    resolve({ accessToken: 'late' });
    await expect(pending).resolves.toBe('superseded');
    expect(mockStore.has('ck_access_token')).toBe(false);
  });
});
