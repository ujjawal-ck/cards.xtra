/**
 * inlineEligibility.ts — where a card-detail eligibility result is shown.
 *
 * Home passes `onShowResultSheet` and presents its own coloured sheet. Every
 * other host (tools results, advisor, store best cards, "Cards you can get")
 * passes nothing, so the result must show inside the card detail itself.
 */
import type { EligibilityOutcome } from '../organisms/CardDetailSheet';

export type EligibilityResultPlace = 'inline' | 'sheet';

export function pickResultPlace(opts: {
  hadDefaults: boolean;
  hasSheetHandler: boolean;
}): EligibilityResultPlace {
  return opts.hadDefaults || !opts.hasSheetHandler ? 'inline' : 'sheet';
}

/** Params for Events.ELIGIBILITY_RESULT when the result is shown inline.
 *  Home logs the same event when it presents its sheet. */
export function inlineResultParams(
  cardId: string | number | undefined,
  outcome: EligibilityOutcome,
  gateVariant: string
) {
  return {
    item_id: cardId,
    outcome,
    gate_variant: gateVariant,
    surface: 'card_detail_inline',
  };
}
