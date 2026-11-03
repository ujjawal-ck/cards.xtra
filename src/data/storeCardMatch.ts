/**
 * storeCardMatch.ts — map an Offers category (the CashKaro store category the
 * user is browsing) to the BankKaro card categories that earn well there.
 *
 * Both sides already use the SAME category taxonomy: the card catalog tags
 * cards with `tags[].id` (Shopping=2, Travel=12, …) and the Home filter rail
 * picks against those same ids via CATEGORY_OPTIONS. So the store→card join is
 * a real, backend-driven match — this module only declares which Offers
 * category label maps to which card tag ids.
 *
 * Returns [] when there's no confident match (e.g. "Banking", "New on
 * CashKaro"); callers fall back to the top cards in that case.
 */
import { CATEGORY_OPTIONS } from './filterOptions';

// label → tagId, derived from the real taxonomy so there are no magic numbers
// (CATEGORY_OPTIONS is the single source of truth for the ids).
const TAG = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.label, o.tagId])
) as Record<string, number>;

// Offers category label (from the Offers category strip) → card tag ids. Edit
// freely — it's plain product mapping, not wired to anything else.
const MATCH: Record<string, number[]> = {
  Fashion: [TAG['Shopping']],
  'Food & Grocery': [TAG['Food Ordering'], TAG['Dining'], TAG['Grocery']],
  'Health & Wellness': [TAG['Shopping']],
  'Flights & Travel': [TAG['Travel']],
  Electronics: [TAG['Shopping']],
  'Home & Kitchen': [TAG['Shopping']],
  'Beauty & Grooming': [TAG['Shopping']],
  Pharmacy: [TAG['Shopping']],
  Departmental: [TAG['Grocery'], TAG['Shopping']],
  Mobile: [TAG['Shopping']],
  // No confident card category — caller falls back to top cards:
  //   'New on CashKaro', 'Hosting', 'Education', 'Banking', 'Loans'
};

/** Card tag ids that earn well in the given Offers category. [] = no match. */
export function cardTagIdsForCategory(label?: string): number[] {
  if (!label) return [];
  return (MATCH[label] ?? []).filter((id) => id != null);
}
