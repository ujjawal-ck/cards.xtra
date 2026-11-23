/**
 * usePaymentInfo — the signed-in user's withdrawable amounts + the payment
 * method ids, from CashKaro GET /payment/payment. Source of truth for the
 * withdraw flow (amounts shown + payment_method_id used at submit). An
 * amount the API did not give is null ("balance unavailable"), never 0.
 *
 * Mirrors useEarnings: disabled when signed out; token refresh is handled
 * by the API layer.
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchPaymentInfo,
  extractPaymentData,
  extractPaymentMethodIds,
  paymentInProcessAmountFromError,
  paymentThresholdFromError,
  type PaymentData,
  type PaymentMethodIds,
} from '../api/payments';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { qk } from './keys';

export interface PaymentInfo extends PaymentData {
  /** Only the ids the API listed. Read with requirePaymentMethodId(). */
  methodIds: PaymentMethodIds;
  /** True when the balance is below the cash-out minimum (API code 5003).
   *  `paymentThreshold` then holds that minimum. Withdraw is not possible. */
  belowThreshold?: boolean;
}

/** A 200 from /payment/payment → PaymentInfo. */
export function paymentInfoFromResponse(info: unknown): PaymentInfo {
  return { ...extractPaymentData(info), methodIds: extractPaymentMethodIds(info) };
}

/**
 * The two /payment/payment errors that are states, not failures. Returns null
 * for any other error (the query then fails as usual).
 */
export function paymentInfoFromError(e: unknown): PaymentInfo | null {
  // A payout already in flight isn't an error for our purposes — the
  // endpoint 400s with code 5002 and the pending amount in its meta.
  // Resolve to an in-process PaymentInfo so the UI can show the
  // "Payment Is Processing" sheet instead of a failed query.
  const pendingAmount = paymentInProcessAmountFromError(e);
  if (pendingAmount !== null) {
    return {
      mobile: '',
      // No success body: the balances are unknown, not ₹0.
      totalEarnings: null,
      cashbackEarnings: null,
      rewardsEarnings: null,
      currencyCode: 'INR',
      paymentThreshold: 250,
      paymentInProcess: true,
      paymentInProcessAmount: pendingAmount,
      // No success body to read method ids from. The withdraw flow that
      // needs them is blocked while a payout pends.
      methodIds: {},
    };
  }
  // Balance below the cash-out minimum isn't a failure either: the
  // endpoint 400s with code 5003. Resolve to a PaymentInfo with
  // belowThreshold so the UI can say "Earn ₹X to withdraw" instead of
  // showing a generic error.
  const threshold = paymentThresholdFromError(e);
  if (threshold !== null) {
    return {
      mobile: '',
      // No success body: the balances are unknown, not ₹0.
      totalEarnings: null,
      cashbackEarnings: null,
      rewardsEarnings: null,
      currencyCode: 'INR',
      paymentThreshold: threshold,
      paymentInProcess: false,
      paymentInProcessAmount: 0,
      belowThreshold: true,
      methodIds: {},
    };
  }
  return null;
}

export function usePaymentInfo() {
  const { accessToken } = useAuth();
  const query = useQuery<PaymentInfo>({
    queryKey: qk.user.paymentInfo(),
    enabled: !!accessToken,
    // Override the 5-min app default. Payment state is unlike the card catalog:
    // a payout settles server-side at any moment, and the 5002 "in process"
    // state (paymentInfoFromError) is cached as a SUCCESS (not an error), so React Query would
    // otherwise keep serving `paymentInProcess: true` for up to 5 min after the
    // payout has actually cleared — showing the "Payment Is Processing" sheet on
    // a user who can already withdraw. A short staleTime makes any focus/remount
    // re-validate promptly so the stale state clears.
    staleTime: 30 * 1000, // 30s
    queryFn: async ({ signal }) => {
      try {
        return paymentInfoFromResponse(await fetchPaymentInfo(accessToken as string, signal));
      } catch (e) {
        const known = paymentInfoFromError(e);
        if (known) return known;
        throw e;
      }
    },
  });
  useRefetchOnFocus(query);
  return query;
}
