jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ accessToken: null }) }));
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { addEventListener: jest.fn(() => () => undefined) } }));

import { QueryClient } from '@tanstack/react-query';
import { qk } from '../keys';
import { submitWithdrawal, __resetPayoutLock, PayoutInFlightError, PayoutUnknownError } from '../mutations/withdraw';
import { ApiError } from '../../api/http/errors';
import { isOfflineState } from '../../lib/network';
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
  beforeEach(() => __resetPayoutLock());

  it('submits once and reports success', async () => {
    const submit = jest.fn(async () => ({}));
    await expect(submitWithdrawal('t', draft, 'g', { submit, recheck: jest.fn() })).resolves.toEqual({ status: 'submitted' });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('blocks a second payout while one is in flight (double tap)', async () => {
    let release!: () => void;
    const submit = jest.fn(() => new Promise<void>((r) => (release = r)));
    const deps = { submit, recheck: jest.fn() };
    const first = submitWithdrawal('t', draft, 'g', deps);
    await expect(submitWithdrawal('t', draft, 'g', deps)).rejects.toBeInstanceOf(PayoutInFlightError);
    release();
    await first;
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('on timeout, treats a 5002 "payout pending" re-check as success and never resubmits', async () => {
    const submit = jest.fn(async () => Promise.reject(timeout()));
    const recheck = jest.fn(async () =>
      Promise.reject(new ApiError('pending', 400, { errors: [{ code: '5002', meta: { requested_earnings: '300' } }] })),
    );
    await expect(submitWithdrawal('t', draft, 'g', { submit, recheck })).resolves.toEqual({ status: 'submitted_after_recheck' });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('on timeout with no pending payout, says the outcome is unknown', async () => {
    const submit = jest.fn(async () => Promise.reject(timeout()));
    await expect(submitWithdrawal('t', draft, 'g', { submit, recheck: jest.fn(async () => ({})) })).rejects.toBeInstanceOf(PayoutUnknownError);
  });

  it('passes a real server rejection straight through, without a re-check', async () => {
    const recheck = jest.fn();
    const err = new ApiError('Invalid OTP', 422, { errors: [{ code: '7002' }] });
    await expect(submitWithdrawal('t', draft, 'g', { submit: async () => Promise.reject(err), recheck })).rejects.toBe(err);
    expect(recheck).not.toHaveBeenCalled();
  });

  it('releases the lock after a failure', async () => {
    const deps = { submit: jest.fn(async () => Promise.reject(new ApiError('x', 500))), recheck: jest.fn() };
    await expect(submitWithdrawal('t', draft, 'g', deps)).rejects.toBeInstanceOf(ApiError);
    deps.submit.mockResolvedValueOnce(undefined as any);
    await expect(submitWithdrawal('t', draft, 'g', deps)).resolves.toEqual({ status: 'submitted' });
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
