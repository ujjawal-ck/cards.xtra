/**
 * eligibility.ts — run a CardGenius eligibility check and reduce it to the
 * set of cards the user qualifies for.
 *
 * The API returns one row per card with an `eligible` boolean. Rows are
 * matched back to the catalog by `card_alias` (NOT product_id — some
 * eligible rows return product_id: null). Shared by the Home eligibility
 * toggle and the embedded checker in the card detail sheet.
 */
import { checkEligibility } from './bankkaro';

export interface EligibilityOutcome {
  eligibleCount: number;
  /** card_alias of every card the user is eligible for. */
  eligibleAliases: string[];
}

export async function fetchEligibility(params: {
  pincode: string;
  /** Monthly in-hand income (rupees). */
  incomeMonthly: number;
  selfEmployed: boolean;
}): Promise<EligibilityOutcome> {
  const res = await checkEligibility({
    pincode: params.pincode,
    inhandIncome: String(Number.isFinite(params.incomeMonthly) ? params.incomeMonthly : 0),
    // API rejects the hyphenated form ("self-employed") — must be underscore.
    empStatus: params.selfEmployed ? 'self_employed' : 'salaried',
  });
  const rows: Array<{ eligible?: boolean; card_alias?: string }> = Array.isArray(res?.data)
    ? res.data
    : [];
  const eligible = rows.filter((r) => r?.eligible === true && !!r.card_alias);
  return {
    eligibleCount: eligible.length,
    eligibleAliases: eligible.map((r) => r.card_alias as string),
  };
}

// ── Per-card verdict (single source of truth) ─────────────────────────────
//
// Every surface (Home grouped list, card-detail checker, Apply result sheet)
// MUST use classifyCardEligibility so one card never gets two different
// answers. The CardGenius API is the only thing that can say "eligible":
// income alone never upgrades a card the API rejected.
//
//   eligible   — the card's alias is in the API's eligible set.
//   maybe      — the API could not confirm this card (no alias to match),
//                OR it rejected the card and income is within 20% below the
//                card's income bar (a soft, income-only near-miss).
//   ineligible — the API rejected the card and income is clearly short, or
//                income clears the bar (so the block is a hard gate:
//                pincode / employment type).

export type EligibilityBucket = 'eligible' | 'maybe' | 'ineligible';

/** Minimal card shape the verdict needs (CardModel satisfies it). */
export interface EligibilityCardInput {
  filterMeta?: { cardAlias?: string } | null;
  detail?: { fee?: { annual?: { amount?: string } } } | null;
  annualFee?: string;
}

/**
 * Approximate monthly income bar for a card, from its annual-fee tier.
 * CardGenius does not return per-card income requirements, so this only
 * decides between "maybe" and "ineligible" for cards the API rejected.
 */
export function requiredMonthlyIncome(card: EligibilityCardInput): number {
  const feeStr = card.detail?.fee?.annual?.amount ?? card.annualFee ?? '';
  const fee = Number(String(feeStr).replace(/[^0-9]/g, '')) || 0;
  if (fee >= 2500) return 100000; // premium
  if (fee >= 500) return 50000; // mid
  return 25000; // entry / lifetime-free
}

export function classifyCardEligibility(
  card: EligibilityCardInput | null | undefined,
  eligibleAliases: readonly string[],
  monthlyIncome: number
): EligibilityBucket {
  const alias = card?.filterMeta?.cardAlias;
  if (!alias) return 'maybe';
  if (eligibleAliases.includes(alias)) return 'eligible';
  if (!card || !Number.isFinite(monthlyIncome)) return 'ineligible';
  const req = requiredMonthlyIncome(card);
  if (monthlyIncome >= req) return 'ineligible';
  if (monthlyIncome >= 0.8 * req) return 'maybe';
  return 'ineligible';
}

/** Copy for the error state when the eligibility API call fails. */
export const ELIGIBILITY_ERROR_MESSAGE =
  "We couldn't check your eligibility right now. Check your connection and try again.";
