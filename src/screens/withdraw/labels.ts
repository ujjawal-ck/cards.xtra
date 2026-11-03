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
