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
