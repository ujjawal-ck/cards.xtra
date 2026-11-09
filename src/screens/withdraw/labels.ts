/**
 * Shared withdraw header titles.
 *
 * The title reflects WHICH bucket is being withdrawn: the rewards bucket can
 * only be taken out as gift cards, so its flow reads "Withdraw Rewards".
 * Everything else — plain cashback and the combined cashback+rewards bucket —
 * reads "Withdraw Cashback".
 */
import type {
  WithdrawPaymentType,
  WithdrawGiftCardVariant,
} from '../../navigation/types';

export function withdrawTitle(
  kind: WithdrawPaymentType | WithdrawGiftCardVariant
): string {
  return kind === 'rewards' ? 'Withdraw Rewards' : 'Withdraw Cashback';
}

/**
 * Masthead subtitle under the amount — which bucket is being paid out. The
 * UPI / Amazon / Flipkart / OTP screens hard-coded the cashback line, so a
 * rewards or combined withdrawal was mislabelled "Cashback Available".
 */
export function withdrawSubtitle(
  kind: WithdrawPaymentType | WithdrawGiftCardVariant
): string {
  if (kind === 'rewards') return 'Withdrawing Available Rewards';
  if (kind === 'cashback_and_rewards' || kind === 'combined') {
    return 'Withdrawing Total Amount (Cashback + Rewards)';
  }
  return 'Cashback Available For Payment';
}
