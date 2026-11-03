/**
 * eligibilityVerdict.ts — the ONE place that decides a card's eligibility
 * outcome. Used by Home (grouped list + Apply routing), the iOS card detail
 * sheet and the Android card detail screen, so the same card can never be
 * "Ineligible" on Home and "Congrats, eligible" in its detail sheet.
 *
 * Source of truth is the CardGenius eligibility API (`eligibleAliases`):
 *   eligible   — the card's alias is in the API's eligible set. Nothing else
 *                can make a card eligible (income alone never overrides an
 *                API rejection).
 *   maybe      — NOT in the eligible set, but the user's income is a near
 *                miss: within 20% below the card's income bar
 *                (0.8·req ≤ income < req). A soft, income-only miss.
 *   ineligible — everything else. If income already clears the bar the API
 *                rejection is a hard gate (pincode / employment), so it is
 *                never softened to "maybe".
 *
 * The income bar is a client-side estimate from the annual fee tier until
 * the API returns a per-card income requirement.
 */
import type { CardModel } from '../molecules/CardTile';

export type EligibilityOutcome = 'eligible' | 'maybe' | 'ineligible';

type CardLike = Pick<CardModel, 'annualFee' | 'filterMeta' | 'detail'>;

/** Estimated monthly in-hand income a card needs, by annual-fee tier. */
export function requiredMonthlyIncome(card: CardLike): number {
  const feeStr = card.detail?.fee.annual.amount ?? card.annualFee ?? '';
  const fee = Number(String(feeStr).replace(/[^0-9]/g, '')) || 0;
  if (fee >= 2500) return 100000; // premium
  if (fee >= 500) return 50000; // mid
  return 25000; // entry / lifetime-free
}

export function resolveCardOutcome(
  card: CardLike | null | undefined,
  eligibleAliases: readonly string[] | ReadonlySet<string> | null | undefined,
  monthlyIncome: number
): EligibilityOutcome {
  const alias = card?.filterMeta?.cardAlias;
  if (alias && eligibleAliases) {
    const hit =
      eligibleAliases instanceof Set
        ? eligibleAliases.has(alias)
        : (eligibleAliases as readonly string[]).includes(alias);
    if (hit) return 'eligible';
  }
  if (!card || !Number.isFinite(monthlyIncome)) return 'ineligible';
  const req = requiredMonthlyIncome(card);
  if (monthlyIncome >= req) return 'ineligible';
  if (monthlyIncome >= 0.8 * req) return 'maybe';
  return 'ineligible';
}
