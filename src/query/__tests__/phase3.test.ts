jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ accessToken: null }) }));
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { addEventListener: jest.fn(() => () => undefined) } }));
// The device store the payout cool-down is saved in. It survives __resetPayoutLock (an app restart).
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

import { QueryClient } from '@tanstack/react-query';
import { qk } from '../keys';
import {
  submitWithdrawal,
  __resetPayoutLock,
  isPayoutRejection,
  PayoutInFlightError,
  PayoutUnknownError,
  RECHECK_ATTEMPTS,
  RECHECK_INTERVAL_MS,
  UNKNOWN_COOLDOWN_MS,
  isPayoutOutcomePending,
  type WithdrawDeps,
} from '../mutations/withdraw';
import { ApiError } from '../../api/http/errors';
import { isOfflineState } from '../../lib/network';
import { PAYOUT_COOLDOWN_KEY } from '../../lib/payoutCooldown';
import type { WithdrawDraft } from '../../navigation/types';

const draft: WithdrawDraft = { method: 'upi', paymentType: 'cashback', amount: 300, paymentMethodId: 20, upiId: 'x@upi' };
const timeout = () => new ApiError('Request timed out', 0, undefined, { kind: 'timeout' });

describe('query keys', () => {
  it('never put the access token in a user key', () => {
    const keys = [qk.user.profile(), qk.user.earnings(), qk.user.orders({ status: 'confirmed' } as any), qk.user.paymentInfo(), qk.user.mc.claims('pending')];
    for (const k of keys) expect(k[0]).toBe('user');
    expect(JSON.stringify(keys)).not.toMatch(/eyJ/); // no JWTs
  });

  it('invalidating user.mc.all hits every claims tab, retailers and exit dates', async () => {
    const qc = new QueryClient();
    for (const k of [qk.user.mc.claims('Pending'), qk.user.mc.claims('Resolved'), qk.user.mc.retailers(), qk.user.mc.exitDates('5')]) {
      qc.setQueryData(k, 1);
    }
    qc.setQueryData(qk.user.earnings(), 1);
    await qc.invalidateQueries({ queryKey: qk.user.mc.all });
    const stale = qc.getQueryCache().getAll().filter((q) => q.state.isInvalidated).map((q) => q.queryKey[1]);
    expect(stale).toEqual(['mc', 'mc', 'mc', 'mc']);
  });

  it('clearing user.all leaves public catalogue data alone', () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.user.profile(), { id: 1 });
    qc.setQueryData(qk.offers.store('flipkart'), { name: 'Flipkart' });
    qc.removeQueries({ queryKey: qk.user.all });
    expect(qc.getQueryData(qk.user.profile())).toBeUndefined();
    expect(qc.getQueryData(qk.offers.store('flipkart'))).toEqual({ name: 'Flipkart' });
  });
});

describe('payout safety', () => {
  beforeEach(() => {
    mockStore.clear();
    __resetPayoutLock();
  });

  // No real 5 s pauses between re-checks in tests.
  const wait = jest.fn(async () => undefined);
  const pending = () => new ApiError('pending', 400, { errors: [{ code: '5002', meta: { requested_earnings: '300' } }] });
  const deps = (submit: WithdrawDeps['submit'], recheck: WithdrawDeps['recheck'] = jest.fn(async () => ({}))) => ({ submit, recheck, wait });

  it('submits once and reports success', async () => {
    const submit = jest.fn(async () => ({}));
    await expect(submitWithdrawal('t', draft, 'g', deps(submit))).resolves.toEqual({ status: 'submitted' });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('blocks a second payout while one is in flight (double tap)', async () => {
    let release!: () => void;
    const submit = jest.fn(() => new Promise<void>((r) => (release = r)));
    const d = deps(submit);
    const first = submitWithdrawal('t', draft, 'g', d);
    await expect(submitWithdrawal('t', draft, 'g', d)).rejects.toBeInstanceOf(PayoutInFlightError);
    await new Promise((r) => setImmediate(r)); // the saved cool-down is read before the POST
    release();
    await first;
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('on timeout, treats a 5002 "payout pending" re-check as success and never resubmits', async () => {
    const submit = jest.fn(async () => Promise.reject(timeout()));
    const recheck = jest.fn(async () => Promise.reject(pending()));
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).resolves.toEqual({ status: 'submitted_after_recheck' });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(recheck).toHaveBeenCalledTimes(1);
  });

  it('on timeout with no pending payout, re-checks 3 times about 5 s apart, then says the outcome is unknown', async () => {
    const submit = jest.fn(async () => Promise.reject(timeout()));
    const recheck = jest.fn(async () => ({}));
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(recheck).toHaveBeenCalledTimes(RECHECK_ATTEMPTS);
    expect(RECHECK_ATTEMPTS).toBe(3);
    expect(wait).toHaveBeenCalledTimes(RECHECK_ATTEMPTS - 1);
    expect(wait).toHaveBeenCalledWith(RECHECK_INTERVAL_MS);
    expect(RECHECK_INTERVAL_MS).toBe(5_000);
  });

  it('returns submitted_after_recheck when the 2nd re-check shows the payout in process', async () => {
    const submit = jest.fn(async () => Promise.reject(timeout()));
    const recheck = jest
      .fn<Promise<unknown>, [string]>()
      .mockResolvedValueOnce({}) // 1st: CashKaro has not marked it pending yet
      .mockRejectedValueOnce(pending()); // 2nd: 5002
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).resolves.toEqual({ status: 'submitted_after_recheck' });
    expect(recheck).toHaveBeenCalledTimes(2);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('treats a network drop like a timeout', async () => {
    const submit = jest.fn(async () => Promise.reject(new ApiError('Network error', 0, undefined, { kind: 'network' })));
    const recheck = jest.fn(async () => ({}));
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(recheck).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['500 server error', 500],
    ['502 BFF UPSTREAM_ERROR', 502],
    ['503 unavailable', 503],
    ['504 BFF timeout', 504],
    ['429 rate limited', 429],
  ])('a %s re-checks and throws PayoutUnknownError, never a plain failure', async (_label, status) => {
    const submit = jest.fn(async () => Promise.reject(new ApiError('Service is unavailable. Please try again.', status, { errors: [{ code: 'UPSTREAM_ERROR' }] })));
    const recheck = jest.fn(async () => ({}));
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(recheck).toHaveBeenCalledTimes(3);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('a 502 whose re-check shows 5002 counts as submitted', async () => {
    const submit = jest.fn(async () => Promise.reject(new ApiError('Service is unavailable.', 502)));
    const recheck = jest.fn(async () => Promise.reject(pending()));
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).resolves.toEqual({ status: 'submitted_after_recheck' });
  });

  // The two security 5002s of GET /payment/payment (openapi-mini.json 400-13,
  // examples 5 and 6). Audit D2.
  const rateLimited = () =>
    new ApiError('refused', 400, {
      errors: [{
        code: '5002',
        detail: 'As a security measure, only one payment request is allowed within 30 minutes. Please request for another payment after 30 minutes.',
        meta: { type: 'security' },
      }],
    });
  const contactChanged = () =>
    new ApiError('refused', 400, {
      errors: [{
        code: '5002',
        detail: 'For security, payments are temporarily disabled because you recently updated your registered email ID or mobile number. Request a payment after 22-08-2025 04:00:03 PM please.',
        meta: { type: 'security' },
      }],
    });

  it('a re-check that shows the 30-minute rule counts as landed and keeps the cool-down', async () => {
    const submit = jest.fn(async () => Promise.reject(timeout()));
    const recheck = jest.fn(async () => Promise.reject(rateLimited()));
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).resolves.toEqual({ status: 'submitted_after_recheck' });
    expect(recheck).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
    // Indirect evidence: the cool-down saved before the re-check stays on.
    expect(await isPayoutOutcomePending()).toBe(true);
    expect(mockStore.has(PAYOUT_COOLDOWN_KEY)).toBe(true);
  });

  it('a re-check that shows "disabled after a contact change" is not landed: 3 re-checks, then unknown', async () => {
    const submit = jest.fn(async () => Promise.reject(timeout()));
    const recheck = jest.fn(async () => Promise.reject(contactChanged()));
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(recheck).toHaveBeenCalledTimes(RECHECK_ATTEMPTS);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(await isPayoutOutcomePending()).toBe(true);
    expect(mockStore.has(PAYOUT_COOLDOWN_KEY)).toBe(true);
  });

  it('"disabled after a contact change" on the 1st re-check, then pending on the 2nd: landed', async () => {
    const submit = jest.fn(async () => Promise.reject(timeout()));
    const recheck = jest
      .fn<Promise<unknown>, [string]>()
      .mockRejectedValueOnce(contactChanged())
      .mockRejectedValueOnce(pending());
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).resolves.toEqual({ status: 'submitted_after_recheck' });
    expect(recheck).toHaveBeenCalledTimes(2);
    expect(await isPayoutOutcomePending()).toBe(false);
  });

  it('a 5002 the classifier cannot place is not landed (fail closed)', async () => {
    const submit = jest.fn(async () => Promise.reject(timeout()));
    const recheck = jest.fn(async () =>
      Promise.reject(new ApiError('refused', 400, { errors: [{ code: '5002', detail: 'Payments are paused.', meta: { type: 'security' } }] })),
    );
    await expect(submitWithdrawal('t', draft, 'g', deps(submit, recheck))).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(recheck).toHaveBeenCalledTimes(RECHECK_ATTEMPTS);
  });

  it('a security 5002 from paymentV1 itself is a real rejection, passed straight through', async () => {
    const recheck = jest.fn();
    const err = rateLimited();
    await expect(submitWithdrawal('t', draft, 'g', { submit: async () => Promise.reject(err), recheck, wait })).rejects.toBe(err);
    expect(recheck).not.toHaveBeenCalled();
    expect(await isPayoutOutcomePending()).toBe(false);
  });

  it('an error that is not an ApiError is unknown too (fail closed)', async () => {
    const submit = jest.fn(async () => Promise.reject(new TypeError('boom')));
    await expect(submitWithdrawal('t', draft, 'g', deps(submit))).rejects.toBeInstanceOf(PayoutUnknownError);
  });

  it('passes a real server rejection straight through, without a re-check', async () => {
    const recheck = jest.fn();
    const err = new ApiError('Invalid OTP', 422, { errors: [{ code: '7002' }] });
    await expect(submitWithdrawal('t', draft, 'g', { submit: async () => Promise.reject(err), recheck, wait })).rejects.toBe(err);
    expect(recheck).not.toHaveBeenCalled();
  });

  it('passes a 400 "payment pending" (5002) from paymentV1 straight through', async () => {
    const recheck = jest.fn();
    const err = pending();
    await expect(submitWithdrawal('t', draft, 'g', { submit: async () => Promise.reject(err), recheck, wait })).rejects.toBe(err);
    expect(recheck).not.toHaveBeenCalled();
  });

  it('classifies only a 4xx (not 429) as a real rejection', () => {
    expect(isPayoutRejection(new ApiError('bad', 400))).toBe(true);
    expect(isPayoutRejection(new ApiError('bad', 422))).toBe(true);
    expect(isPayoutRejection(new ApiError('auth', 401))).toBe(true);
    expect(isPayoutRejection(new ApiError('slow down', 429))).toBe(false);
    expect(isPayoutRejection(new ApiError('down', 500))).toBe(false);
    expect(isPayoutRejection(new ApiError('down', 502))).toBe(false);
    expect(isPayoutRejection(timeout())).toBe(false);
    expect(isPayoutRejection(new ApiError('gone', 0, undefined, { kind: 'aborted' }))).toBe(false);
    expect(isPayoutRejection(new Error('x'))).toBe(false);
  });

  // Changed on purpose (audit DATA-01): a 500 used to be final, so the next
  // submit went through. Now it re-checks and fails closed.
  it('a 500 runs the re-check and throws PayoutUnknownError, then blocks every new payout for the cool-down', async () => {
    let clock = 1_000_000;
    const d = {
      submit: jest.fn(async () => Promise.reject(new ApiError('x', 500))),
      recheck: jest.fn(async () => ({})),
      wait,
      now: () => clock,
    };
    await expect(submitWithdrawal('t', draft, 'g', d)).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(d.recheck).toHaveBeenCalledTimes(3);
    expect(await isPayoutOutcomePending(clock)).toBe(true);
    // A fresh OTP (new guid) from any screen is still refused, without a POST.
    d.submit.mockResolvedValueOnce(undefined as any);
    await expect(submitWithdrawal('t', draft, 'g2', d)).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(d.submit).toHaveBeenCalledTimes(1);
    // After the cool-down the user may try again.
    clock += UNKNOWN_COOLDOWN_MS;
    await expect(submitWithdrawal('t', draft, 'g3', d)).resolves.toEqual({ status: 'submitted' });
    expect(d.submit).toHaveBeenCalledTimes(2);
  });

  it('a payout that was confirmed (or rejected) starts no cool-down', async () => {
    const d = { submit: jest.fn(async () => Promise.reject(new ApiError('x', 422))), recheck: jest.fn(), wait };
    await expect(submitWithdrawal('t', draft, 'g', d)).rejects.toBeInstanceOf(ApiError);
    expect(await isPayoutOutcomePending()).toBe(false);
    expect(mockStore.has(PAYOUT_COOLDOWN_KEY)).toBe(false);
  });

  it('releases the lock after a real rejection', async () => {
    const d = { submit: jest.fn(async () => Promise.reject(new ApiError('x', 422))), recheck: jest.fn(), wait };
    await expect(submitWithdrawal('t', draft, 'g', d)).rejects.toBeInstanceOf(ApiError);
    d.submit.mockResolvedValueOnce(undefined as any);
    await expect(submitWithdrawal('t', draft, 'g', d)).resolves.toEqual({ status: 'submitted' });
  });

  it('keeps the lock while it re-checks', async () => {
    let open!: () => void;
    const gate = new Promise<void>((r) => (open = r));
    const submit = jest.fn(async () => Promise.reject(timeout()));
    const recheck = jest.fn(async () => {
      await gate; // every re-check waits until the test opens the gate
      return {};
    });
    const first = submitWithdrawal('t', draft, 'g', { submit, recheck, wait });
    await new Promise((r) => setImmediate(r)); // let submit fail and the 1st re-check start
    expect(recheck).toHaveBeenCalledTimes(1);
    await expect(submitWithdrawal('t', draft, 'g', { submit, recheck, wait })).rejects.toBeInstanceOf(PayoutInFlightError);
    open();
    await expect(first).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

describe('payout cool-down on the device (R-01, R-05)', () => {
  const wait = jest.fn(async () => undefined);
  const T = 1_000_000;
  /** One payout whose outcome stays unknown, at time T. */
  async function unknownPayout() {
    const d = {
      submit: jest.fn(async () => Promise.reject(new ApiError('x', 504))),
      recheck: jest.fn(async () => ({})),
      wait,
      now: () => T,
    };
    await expect(submitWithdrawal('t', draft, 'g', d)).rejects.toBeInstanceOf(PayoutUnknownError);
  }
  /** A payout that would succeed, at time `at`. */
  const okDeps = (at: number) => ({ submit: jest.fn(async () => ({})), recheck: jest.fn(), wait, now: () => at });
  const saved = () => JSON.parse(mockStore.get(PAYOUT_COOLDOWN_KEY) ?? 'null');

  beforeEach(() => {
    mockStore.clear();
    __resetPayoutLock();
  });

  it('is saved with its end time and the user id', async () => {
    mockStore.set('ck_user_id', '42');
    await unknownPayout();
    expect(saved()).toEqual({ until: T + UNKNOWN_COOLDOWN_MS, userId: '42' });
  });

  it('survives an app restart: no POST until it ends', async () => {
    await unknownPayout();
    __resetPayoutLock(); // the app is killed and opened again: memory is empty
    expect(await isPayoutOutcomePending(T + 1)).toBe(true);
    const d = okDeps(T + 1);
    await expect(submitWithdrawal('t', draft, 'g2', d)).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(d.submit).not.toHaveBeenCalled();
    expect(d.recheck).not.toHaveBeenCalled(); // refused up front, no re-check and no new cool-down
  });

  it('ends 10 minutes after the unknown outcome, after a restart too', async () => {
    await unknownPayout();
    __resetPayoutLock();
    expect(await isPayoutOutcomePending(T + UNKNOWN_COOLDOWN_MS - 1)).toBe(true);
    expect(await isPayoutOutcomePending(T + UNKNOWN_COOLDOWN_MS)).toBe(false);
    const d = okDeps(T + UNKNOWN_COOLDOWN_MS);
    await expect(submitWithdrawal('t', draft, 'g2', d)).resolves.toEqual({ status: 'submitted' });
    expect(d.submit).toHaveBeenCalledTimes(1);
  });

  it('is saved before the re-check, so a kill while the screen is locked keeps it', async () => {
    let open!: () => void;
    const gate = new Promise<void>((r) => (open = r));
    const d = {
      submit: jest.fn(async () => Promise.reject(new ApiError('x', 504))),
      recheck: jest.fn(async () => {
        await gate;
        return {};
      }),
      wait,
      now: () => T,
    };
    const first = submitWithdrawal('t', draft, 'g', d);
    await new Promise((r) => setImmediate(r)); // the POST failed, the 1st re-check runs
    expect(d.recheck).toHaveBeenCalledTimes(1);
    expect(saved()).toEqual({ until: T + UNKNOWN_COOLDOWN_MS });
    open();
    await expect(first).rejects.toBeInstanceOf(PayoutUnknownError);
  });

  it('a re-check that shows the payout pending (5002) clears it', async () => {
    const d = {
      submit: jest.fn(async () => Promise.reject(new ApiError('x', 504))),
      recheck: jest.fn(async () =>
        Promise.reject(new ApiError('pending', 400, { errors: [{ code: '5002', meta: { requested_earnings: '300' } }] })),
      ),
      wait,
      now: () => T,
    };
    await expect(submitWithdrawal('t', draft, 'g', d)).resolves.toEqual({ status: 'submitted_after_recheck' });
    expect(mockStore.has(PAYOUT_COOLDOWN_KEY)).toBe(false);
    expect(await isPayoutOutcomePending(T)).toBe(false);
  });

  it('after a restart, blocks the same user and a user whose id is not known yet', async () => {
    mockStore.set('ck_user_id', '42');
    await unknownPayout();
    __resetPayoutLock();
    expect(await isPayoutOutcomePending(T + 1)).toBe(true);
    __resetPayoutLock();
    mockStore.delete('ck_user_id');
    expect(await isPayoutOutcomePending(T + 1)).toBe(true);
  });

  it('after a restart, blocks every account on the phone, also a different known user (review-2 R2-02, R2-04)', async () => {
    mockStore.set('ck_user_id', '42');
    await unknownPayout();
    __resetPayoutLock();
    mockStore.set('ck_user_id', '77');
    expect(await isPayoutOutcomePending(T + 1)).toBe(true);
    const d = okDeps(T + 1);
    await expect(submitWithdrawal('t', draft, 'g2', d)).rejects.toBeInstanceOf(PayoutUnknownError);
    expect(d.submit).not.toHaveBeenCalled();
  });

  it('an app kill during the POST leaves the next run blocked (review-2 R2-03)', async () => {
    const hanging = {
      submit: jest.fn(() => new Promise<never>(() => undefined)),
      recheck: jest.fn(),
      wait,
      now: () => T,
    };
    void submitWithdrawal('t', draft, 'g', hanging);
    await new Promise((r) => setImmediate(r)); // the POST is in flight
    expect(hanging.submit).toHaveBeenCalledTimes(1);
    __resetPayoutLock(); // the app is killed: memory and the lock are gone
    expect(await isPayoutOutcomePending(T + 1)).toBe(true);
  });

  it('a clear answer removes the cool-down saved before the POST', async () => {
    const ok = okDeps(T);
    await expect(submitWithdrawal('t', draft, 'g', ok)).resolves.toEqual({ status: 'submitted' });
    __resetPayoutLock();
    expect(await isPayoutOutcomePending(T + 1)).toBe(false);
    const rejected = { submit: jest.fn(async () => Promise.reject(new ApiError('bad upi', 422))), recheck: jest.fn(), wait, now: () => T };
    await expect(submitWithdrawal('t', draft, 'g2', rejected)).rejects.toBeInstanceOf(ApiError);
    __resetPayoutLock();
    expect(await isPayoutOutcomePending(T + 1)).toBe(false);
  });

  it('a cool-down saved with no user id blocks every user', async () => {
    await unknownPayout();
    __resetPayoutLock();
    mockStore.set('ck_user_id', '77');
    expect(await isPayoutOutcomePending(T + 1)).toBe(true);
  });

  it('a malformed saved value is no cool-down', async () => {
    mockStore.set(PAYOUT_COOLDOWN_KEY, '<garbage>');
    expect(await isPayoutOutcomePending(T)).toBe(false);
  });
});

describe('offline detection', () => {
  it('is offline only when NetInfo is sure', () => {
    expect(isOfflineState({ isConnected: false, isInternetReachable: null })).toBe(true);
    expect(isOfflineState({ isConnected: true, isInternetReachable: false })).toBe(true);
    expect(isOfflineState({ isConnected: true, isInternetReachable: null })).toBe(false);
    expect(isOfflineState({ isConnected: null, isInternetReachable: null })).toBe(false);
  });
});
