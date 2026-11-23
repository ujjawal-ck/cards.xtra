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
import { formatINR } from '../../lib/money';

export type WithdrawBucket = 'cashback' | 'rewards' | 'combined';

export type WithdrawView =
  | 'loading' // first load still running
  | 'offline' // first load paused offline, nothing cached
  | 'error' // first load failed
  | 'processing' // a payout is already pending (code 5002)
  | 'rate_limited' // one payout request per 30 minutes (code 5002, security)
  | 'payments_disabled' // payouts off after an email or mobile change (code 5002, security)
  | 'below_minimum' // balance under the cash-out minimum (code 5003)
  | 'unavailable' // a needed amount is missing or not a number
  | 'ready';

/** Withdrawable amount (₹) of one bucket, or null when it is not known. */
export function bucketAmount(info: PaymentInfo | undefined, bucket: WithdrawBucket): number | null {
  if (!info || info.paymentInProcess || info.payoutBlock || info.belowThreshold) return null;
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
  // Before the amount check: these states have no amounts, and are not
  // "balance unavailable".
  if (info.paymentInProcess) return 'processing';
  if (info.payoutBlock?.kind === 'rate_limited') return 'rate_limited';
  if (info.payoutBlock?.kind === 'disabled_after_contact_change') return 'payments_disabled';
  if (info.belowThreshold) return 'below_minimum';
  // From Earnings only the tapped bucket shows (and heads the masthead).
  // From Profile the visible sections depend on all three amounts.
  const needed: WithdrawBucket[] = entryBucket ? [entryBucket] : ['cashback', 'rewards', 'combined'];
  if (needed.some((b) => bucketAmount(info, b) === null)) return 'unavailable';
  return 'ready';
}

/** Shown when CashKaro gives no text for a security block (doc wording). */
export const RATE_LIMITED_FALLBACK =
  'As a security measure, only one payment request is allowed within 30 minutes. Please request for another payment after 30 minutes.';
export const PAYMENTS_DISABLED_FALLBACK =
  'For security, payments are temporarily disabled because you recently updated your registered email ID or mobile number.';

/**
 * Title and body for a payout CashKaro refuses (code 5002), or null when it
 * does not. A pending amount shows only when it is above ₹0. The security
 * blocks show CashKaro's own text: the contact-change one carries the date
 * when payouts open again.
 */
export function payoutBlockedText(info: PaymentInfo | undefined): { title: string; body: string } | null {
  const block = info?.payoutBlock;
  if (!block) return null;
  if (block.kind === 'pending') {
    const lead =
      block.amount !== null && block.amount > 0
        ? `We’ve already got your payment request of ${formatINR(block.amount)}.`
        : 'A withdrawal is already in process.';
    return {
      title: 'Payment Is Processing',
      body: `${lead} You can request another payment after this is completed :)`,
    };
  }
  if (block.kind === 'rate_limited') {
    return { title: 'Try Again in 30 Minutes', body: block.detail ?? RATE_LIMITED_FALLBACK };
  }
  return { title: 'Payments Temporarily Disabled', body: block.detail ?? PAYMENTS_DISABLED_FALLBACK };
}
