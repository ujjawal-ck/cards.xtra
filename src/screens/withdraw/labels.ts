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
 * Shared masthead sub-line — names the bucket being paid out, so the rewards
 * and combined flows don't read "Cashback Available For Payment". Same copy
 * as the gift-card chooser's masthead (WithdrawGiftCard).
 */
export function withdrawSubtitle(
  kind: WithdrawPaymentType | WithdrawGiftCardVariant
): string {
  if (kind === 'rewards') return 'Withdrawing Available Rewards';
  if (kind === 'combined' || kind === 'cashback_and_rewards') {
    return 'Withdrawing Total Amount (Cashback + Rewards)';
  }
  return 'Cashback Available For Payment';
}
