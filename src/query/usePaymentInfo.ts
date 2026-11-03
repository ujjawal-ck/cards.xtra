/**
 * usePaymentInfo — the signed-in user's withdrawable amounts + the payment
 * method ids, from CashKaro GET /payment/payment. Source of truth for the
 * withdraw flow (amounts shown + payment_method_id used at submit).
 *
 * Mirrors useEarnings: disabled when signed out; one refresh-token retry on
 * 401/403.
 */
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import {
  fetchPaymentInfo,
  extractPaymentData,
  extractPaymentMethodIds,
  paymentInProcessAmountFromError,
  type PaymentData,
  type PaymentMethodKey,
} from '../api/payments';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';

export interface PaymentInfo extends PaymentData {
  methodIds: Record<PaymentMethodKey, number>;
}

export function usePaymentInfo() {
  const { accessToken, refreshSession } = useAuth();
  const query = useQuery<PaymentInfo>({
    queryKey: ['ck', 'paymentInfo', accessToken],
    enabled: !!accessToken,
    // Override the 5-min app default. Payment state is unlike the card catalog:
    // a payout settles server-side at any moment, and the 5002 "in process"
    // branch below is cached as a SUCCESS (not an error), so React Query would
    // otherwise keep serving `paymentInProcess: true` for up to 5 min after the
    // payout has actually cleared — showing the "Payment Is Processing" sheet on
    // a user who can already withdraw. A short staleTime makes any focus/remount
    // re-validate promptly so the stale state clears.
    staleTime: 30 * 1000, // 30s
    queryFn: async () => {
      const load = async (token: string): Promise<PaymentInfo> => {
        const info = await fetchPaymentInfo(token);
        return { ...extractPaymentData(info), methodIds: extractPaymentMethodIds(info) };
      };
      try {
        return await load(accessToken as string);
      } catch (e) {
        // A payout already in flight isn't an error for our purposes — the
        // endpoint 400s with code 5002 and the pending amount in its meta.
        // Resolve to an in-process PaymentInfo so the UI can show the
        // "Payment Is Processing" sheet instead of a failed query.
        const pendingAmount = paymentInProcessAmountFromError(e);
        if (pendingAmount !== null) {
          return {
            mobile: '',
            totalEarnings: 0,
            cashbackEarnings: 0,
            rewardsEarnings: 0,
            currencyCode: 'INR',
            paymentThreshold: 250,
            paymentInProcess: true,
            paymentInProcessAmount: pendingAmount,
            // No success body to read method ids from — defaults are fine; the
            // withdraw flow that needs them is blocked while a payout pends.
            methodIds: extractPaymentMethodIds({}),
          };
        }
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          const fresh = await refreshSession();
          if (fresh) return load(fresh);
        }
        throw e;
      }
    },
  });
  useRefetchOnFocus(query);
  return query;
}
