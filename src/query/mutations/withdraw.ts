/**
 * withdraw.ts — the payout request, made safe against double payouts.
 *
 * Three rules:
 *   1. One payout in flight at a time (a module-level lock, so a double tap,
 *      the OTP auto-submit and a re-render can't fire two requests).
 *   2. Never auto-retry /payment/paymentV1. The transport never retries a
 *      POST, and the mutation has retry: false.
 *   3. If the request times out or the network drops, we don't know whether
 *      CashKaro accepted it. Before telling the user to try again, re-check
 *      GET /payment/payment: error code 5002 means a payout is already pending,
 *      i.e. ours went through.
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
import { qk } from '../keys';

export type WithdrawOutcome =
  /** CashKaro accepted the request. */
  | { status: 'submitted' }
  /** The request timed out, but a re-check shows a payout is now pending. */
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

export interface WithdrawDeps {
  submit: (token: string, draft: WithdrawDraft, otpGuid: string) => Promise<unknown>;
  recheck: (token: string) => Promise<unknown>;
}

const defaultDeps: WithdrawDeps = {
  submit: (token, draft, otpGuid) => {
    const { method, paymentType, paymentMethodId } = draft;
    if (method === 'upi') return submitUPIPayment(token, paymentType, draft.upiId ?? '', otpGuid, paymentMethodId);
    if (method === 'amazon') return submitAmazonPayment(token, paymentType, draft.mobile ?? '', otpGuid, paymentMethodId);
    if (method === 'flipkart') return submitFlipkartPayment(token, paymentType, draft.email ?? '', otpGuid, paymentMethodId);
    return Promise.reject(new Error(`Unsupported payout method: ${method}`));
  },
  recheck: (token) => fetchPaymentInfo(token),
};

let inFlight = false;

/** Test seam. */
export function __resetPayoutLock(): void {
  inFlight = false;
}

/** Submit one payout. Pure of React so it can be unit tested. */
export async function submitWithdrawal(
  token: string,
  draft: WithdrawDraft,
  otpGuid: string,
  deps: WithdrawDeps = defaultDeps,
): Promise<WithdrawOutcome> {
  if (inFlight) throw new PayoutInFlightError();
  inFlight = true;
  try {
    await deps.submit(token, draft, otpGuid);
    return { status: 'submitted' };
  } catch (e) {
    // A real answer from the server (4xx/5xx) is final: surface it.
    if (!(isApiError(e) && (e.kind === 'timeout' || e.kind === 'network'))) throw e;
    // No answer: find out whether the payout landed before allowing a retry.
    try {
      await deps.recheck(token);
    } catch (check) {
      if (paymentInProcessAmountFromError(check) !== null) return { status: 'submitted_after_recheck' };
    }
    throw new PayoutUnknownError();
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
