/**
 * balances.ts — what the withdraw method-select screen may show, from
 * GET /payment/payment (usePaymentInfo). Pure, so it is unit tested.
 *
 * The CashKaro app reads /payment/payment for withdraw, so the withdraw stack
 * shows these amounts, not /users/earnings. An amount the API did not give is
 * null: the screen then shows "Balance unavailable", never a ₹0 placeholder,
 * and passes no amount forward.
 */
import type { FetchStatus } from '@tanstack/react-query';
import type { PaymentInfo } from '../../query/usePaymentInfo';
import { isPausedWithoutData } from '../../query/paused';

export type WithdrawBucket = 'cashback' | 'rewards' | 'combined';

export type WithdrawView =
  | 'loading' // first load still running
  | 'offline' // first load paused offline, nothing cached
  | 'error' // first load failed
  | 'processing' // a payout is already pending (code 5002)
  | 'below_minimum' // balance under the cash-out minimum (code 5003)
  | 'unavailable' // a needed amount is missing or not a number
  | 'ready';

/** Withdrawable amount (₹) of one bucket, or null when it is not known. */
export function bucketAmount(info: PaymentInfo | undefined, bucket: WithdrawBucket): number | null {
  if (!info || info.paymentInProcess || info.belowThreshold) return null;
  if (bucket === 'cashback') return info.cashbackEarnings;
  if (bucket === 'rewards') return info.rewardsEarnings;
  return info.totalEarnings;
}

export function resolveWithdrawView(
  query: { data: PaymentInfo | undefined; isLoading: boolean; isError: boolean; fetchStatus: FetchStatus },
  entryBucket?: WithdrawBucket,
): WithdrawView {
  const info = query.data;
  if (!info) {
    if (isPausedWithoutData(query)) return 'offline';
    if (query.isError) return 'error';
    return 'loading';
  }
  if (info.paymentInProcess) return 'processing';
  if (info.belowThreshold) return 'below_minimum';
  // From Earnings only the tapped bucket shows (and heads the masthead).
  // From Profile the visible sections depend on all three amounts.
  const needed: WithdrawBucket[] = entryBucket ? [entryBucket] : ['cashback', 'rewards', 'combined'];
  if (needed.some((b) => bucketAmount(info, b) === null)) return 'unavailable';
  return 'ready';
}
