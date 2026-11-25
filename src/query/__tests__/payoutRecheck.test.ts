/**
 * Review R-02: the payout re-check is one GET /payment/payment attempt with a
 * 10 s deadline. ck() used to drop `retries: 0`, so each re-check made up to
 * 3 attempts. Nothing is injected here: the real submit, re-check, ck() and
 * http client run against a fetch mock, on fake timers.
 */
// Set before the modules load: env.ts reads the BFF URL at import time.
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://bff.test';

jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ accessToken: null }) }));
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

/* eslint-disable @typescript-eslint/no-var-requires */
const withdraw = require('../mutations/withdraw') as typeof import('../mutations/withdraw');
const { fetchPaymentInfo } = require('../../api/payments') as typeof import('../../api/payments');
/* eslint-enable @typescript-eslint/no-var-requires */
import type { WithdrawDraft } from '../../navigation/types';

const draft: WithdrawDraft = { method: 'upi', paymentType: 'cashback', amount: 300, paymentMethodId: 20, upiId: 'x@upi' };

const calls: { method: string; url: string }[] = [];
const gets = () => calls.filter((c) => c.method === 'GET').length;
const posts = () => calls.filter((c) => c.method === 'POST').length;

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  };
}

/** A GET that never answers: it ends only when the client aborts it. */
function hangUntilAbort(signal?: AbortSignal) {
  return new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      reject(e);
    });
  });
}

let getMode: 'hang' | '503' = 'hang';

beforeEach(() => {
  jest.useFakeTimers();
  calls.length = 0;
  mockStore.clear();
  withdraw.__resetPayoutLock();
  getMode = 'hang';
  (globalThis as any).fetch = jest.fn(async (url: string, init: { method: string; signal?: AbortSignal }) => {
    calls.push({ method: init.method, url: String(url) });
    // The payout POST: the BFF gave up on CashKaro (outcome unknown).
    if (init.method === 'POST') return response(504, { message: 'Gateway timeout' });
    if (getMode === '503') return response(503, { message: 'Unavailable' });
    return hangUntilAbort(init.signal);
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('payout re-check (R-02)', () => {
  it('each re-check is one attempt with a 10 s deadline: 3 reads + 2 waits = 40 s', async () => {
    const result = withdraw.submitWithdrawal('tok', draft, 'g');
    const settled = jest.fn();
    result.then(settled, settled);

    // The POST fails, then the first re-check starts.
    await jest.advanceTimersByTimeAsync(0);
    expect(posts()).toBe(1);
    expect(gets()).toBe(1);

    // Still waiting just before the deadline.
    await jest.advanceTimersByTimeAsync(withdraw.RECHECK_TIMEOUT_MS - 1);
    expect(gets()).toBe(1);
    // At the deadline the read times out, and it is not retried.
    await jest.advanceTimersByTimeAsync(1);
    expect(gets()).toBe(1);
    // The next re-check starts after the 5 s pause, not before.
    await jest.advanceTimersByTimeAsync(withdraw.RECHECK_INTERVAL_MS - 1);
    expect(gets()).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(gets()).toBe(2);

    // Second and third reads time out the same way.
    await jest.advanceTimersByTimeAsync(withdraw.RECHECK_TIMEOUT_MS + withdraw.RECHECK_INTERVAL_MS);
    expect(gets()).toBe(3);
    expect(settled).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(withdraw.RECHECK_TIMEOUT_MS);

    // 3 x 10 s + 2 x 5 s = 40 s in all, one POST, one GET per re-check.
    await expect(result).rejects.toBeInstanceOf(withdraw.PayoutUnknownError);
    expect(posts()).toBe(1);
    expect(gets()).toBe(withdraw.RECHECK_ATTEMPTS);
  });

  it('a transient 503 on a re-check read is not retried either', async () => {
    getMode = '503';
    const result = withdraw.submitWithdrawal('tok', draft, 'g');
    result.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(2 * withdraw.RECHECK_INTERVAL_MS);
    await expect(result).rejects.toBeInstanceOf(withdraw.PayoutUnknownError);
    expect(gets()).toBe(withdraw.RECHECK_ATTEMPTS);
  });

  it('control: a normal GET /payment/payment still retries a 503 twice', async () => {
    getMode = '503';
    const read = fetchPaymentInfo('tok');
    read.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(20_000);
    await expect(read).rejects.toMatchObject({ status: 503 });
    expect(gets()).toBe(3);
  });
});
