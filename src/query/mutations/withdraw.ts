/**
 * withdraw.ts — the payout request, made safe against double payouts.
 *
 * Four rules:
 *   1. One payout in flight at a time (a module-level lock, so a double tap,
 *      the OTP auto-submit and a re-render can't fire two requests).
 *   2. Never auto-retry /payment/paymentV1. The transport never retries a
 *      POST, and the mutation has retry: false.
 *   3. Only a 4xx from the server is a real rejection (isPayoutRejection).
 *      Every other failure means "outcome unknown": a timeout, a network or
 *      dropped connection, a 429, any 5xx (including the BFF's 502
 *      UPSTREAM_ERROR and 504), or anything else. CashKaro may already have
 *      accepted the payout.
 *   4. For an unknown outcome, re-check GET /payment/payment up to 3 times,
 *      about 5 s apart. Error code 5002 means a payout is pending, i.e. ours
 *      went through. If no re-check shows it, throw PayoutUnknownError, and
 *      the screen blocks any further payout attempt.
 *
 * The cool-down after an unknown outcome is saved on the device
 * (lib/payoutCooldown.ts), so killing the app does not end it (review R-01).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '../../api/http/errors';
import {
  fetchPaymentInfo,
  paymentInProcessAmountFromError,
  submitAmazonPayment,
  submitFlipkartPayment,
  submitUPIPayment,
} from '../../api/payments';
import type { WithdrawDraft } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';
import {
  __resetPayoutCooldownMemory,
  clearPayoutCooldown,
  hydratePayoutCooldown,
  payoutCooldownOn,
  startPayoutCooldown,
} from '../../lib/payoutCooldown';
import { qk } from '../keys';

export type WithdrawOutcome =
  /** CashKaro accepted the request. */
  | { status: 'submitted' }
  /** The answer was lost, but a re-check shows a payout is now pending. */
  | { status: 'submitted_after_recheck' };

/** Thrown when we can't tell whether the payout went through. */
export class PayoutUnknownError extends Error {
  constructor() {
    super("We couldn't confirm your withdrawal. Please check your payment history before trying again.");
    this.name = 'PayoutUnknownError';
  }
}

/** Thrown when a second submit is attempted while one is in flight. */
export class PayoutInFlightError extends Error {
  constructor() {
    super('Your withdrawal is already being processed.');
    this.name = 'PayoutInFlightError';
  }
}

/**
 * True only for a real rejection: the server answered with a 4xx (not 429).
 * Everything else, a non-ApiError included, is "outcome unknown".
 */
export function isPayoutRejection(e: unknown): boolean {
  return isApiError(e) && e.kind === 'http' && e.status >= 400 && e.status < 500 && e.status !== 429;
}

/** How many times, and how far apart, the pending-payout re-check runs. */
export const RECHECK_ATTEMPTS = 3;
export const RECHECK_INTERVAL_MS = 5_000;
/** One re-check read: short deadline, no transport retries, so the screen is
 *  never locked for minutes (3 reads x 10 s + 2 waits x 5 s = about 40 s). */
export const RECHECK_TIMEOUT_MS = 10_000;
/** After an unknown outcome, every new payout is blocked app-wide for this
 *  long (not only on the screen that saw it): Back, then "Get Paid" again,
 *  must not open a second payout while the first may still be landing. The
 *  cool-down is saved on the device, so an app restart keeps it. */
export const UNKNOWN_COOLDOWN_MS = 10 * 60_000;

export interface WithdrawDeps {
  submit: (token: string, draft: WithdrawDraft, otpGuid: string) => Promise<unknown>;
  recheck: (token: string) => Promise<unknown>;
  /** Pause between re-checks. Injectable so tests don't wait 5 s. */
  wait?: (ms: number) => Promise<void>;
  /** Clock. Injectable for the cool-down tests. */
  now?: () => number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const defaultDeps: WithdrawDeps = {
  submit: (token, draft, otpGuid) => {
    const { method, paymentType, paymentMethodId } = draft;
    if (method === 'upi') return submitUPIPayment(token, paymentType, draft.upiId ?? '', otpGuid, paymentMethodId);
    if (method === 'amazon') return submitAmazonPayment(token, paymentType, draft.mobile ?? '', otpGuid, paymentMethodId);
    if (method === 'flipkart') return submitFlipkartPayment(token, paymentType, draft.email ?? '', otpGuid, paymentMethodId);
    return Promise.reject(new Error(`Unsupported payout method: ${method}`));
  },
  recheck: (token) => fetchPaymentInfo(token, undefined, { timeoutMs: RECHECK_TIMEOUT_MS, retries: 0 }),
  wait: sleep,
};

let inFlight = false;

/** Test seam: memory as after an app restart (the saved cool-down is kept). */
export function __resetPayoutLock(): void {
  inFlight = false;
  __resetPayoutCooldownMemory();
}

/** True while an earlier payout's outcome is still unknown (cool-down). It
 *  reads the saved cool-down first, once per app run. */
export async function isPayoutOutcomePending(now: number = Date.now()): Promise<boolean> {
  await hydratePayoutCooldown();
  return payoutCooldownOn(now);
}

/** True when one GET /payment/payment shows a pending payout (code 5002). */
async function showsPendingPayout(token: string, deps: WithdrawDeps): Promise<boolean> {
  try {
    await deps.recheck(token);
    return false; // a 200 means no payout is pending (yet)
  } catch (check) {
    return paymentInProcessAmountFromError(check) !== null;
  }
}

/** Submit one payout. Pure of React so it can be unit tested. */
export async function submitWithdrawal(
  token: string,
  draft: WithdrawDraft,
  otpGuid: string,
  deps: WithdrawDeps = defaultDeps,
): Promise<WithdrawOutcome> {
  if (inFlight) throw new PayoutInFlightError();
  // Take the lock before the first await: a double tap must not pass the
  // check above twice.
  inFlight = true;
  try {
    const now = deps.now ?? Date.now;
    // An earlier payout may still be landing (in this app run or before a
    // restart): never send another one yet.
    if (await isPayoutOutcomePending(now())) throw new PayoutUnknownError();
    try {
      await deps.submit(token, draft, otpGuid);
      return { status: 'submitted' };
    } catch (e) {
      // A 4xx is CashKaro's final answer: surface it.
      if (isPayoutRejection(e)) throw e;
      // Save the cool-down before the re-check: the screen is locked for about
      // 40 s, and a user who kills the app then must stay blocked after the
      // restart.
      await startPayoutCooldown(now() + UNKNOWN_COOLDOWN_MS);
      // Find out whether the payout landed. Keep the lock while we look, so
      // nothing else can submit in the meantime.
      const wait = deps.wait ?? sleep;
      for (let attempt = 1; attempt <= RECHECK_ATTEMPTS; attempt++) {
        if (attempt > 1) await wait(RECHECK_INTERVAL_MS);
        if (await showsPendingPayout(token, deps)) {
          // CashKaro shows the payout as pending (5002): that blocks a second
          // one on its side, so no cool-down.
          await clearPayoutCooldown();
          return { status: 'submitted_after_recheck' };
        }
      }
      await startPayoutCooldown(now() + UNKNOWN_COOLDOWN_MS);
      throw new PayoutUnknownError();
    }
  } finally {
    inFlight = false;
  }
}

/** React hook: the withdraw mutation, invalidating balances on settle. */
export function useWithdraw() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['user', 'withdraw'],
    retry: false,
    // Never pause a payout while NetInfo says offline: a paused mutation
    // resumes later, maybe after the user left or retried. Run it now; an
    // offline phone fails fast into the unknown-outcome path above.
    networkMode: 'always',
    mutationFn: ({ draft, otpGuid }: { draft: WithdrawDraft; otpGuid: string }) => {
      if (!accessToken) return Promise.reject(new PayoutUnknownError());
      return submitWithdrawal(accessToken, draft, otpGuid);
    },
    onSettled: () => {
      // Whatever happened, balances may have moved.
      void queryClient.invalidateQueries({ queryKey: qk.user.paymentInfo() });
      void queryClient.invalidateQueries({ queryKey: qk.user.earnings() });
    },
  });
}
