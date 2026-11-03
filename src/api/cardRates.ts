/**
 * cardRates.ts — CashKaro reward lookup for BankKaro cards.
 *
 * The card catalog (name, art, fees, benefits, eligibility) comes from BankKaro,
 * but the user-facing reward value must be CashKaro's, not BankKaro's
 * `commission`. Example: SBI Cashback reads ₹1400 on BankKaro but ₹1200 on
 * CashKaro — we show ₹1200.
 *
 * Source: `getCardRateStores()` pages the `home-categories-exclusive` offers
 * category (the card stores live there). We index those rows by store id and by
 * a normalised name, then resolve each BankKaro card:
 *
 *   1. by `ck_store_id` (primary) — exact, and the only mechanism that holds in
 *      production. ≈73% of active cards match directly on staging.
 *   2. by normalised name (fallback) — recovers staging-only "twin" stores
 *      whose id differs from the production `ck_store_id` BankKaro carries
 *      (e.g. SBI Cashback's tracking id 24756 vs the staging offer 26519
 *      "SBI Cashback Credit Card CG May"). Only used when the name is
 *      unambiguous, so it never silently maps to the wrong card.
 *
 * Cards with no CashKaro match (≈25% on staging — premium / invite cards not on
 * CashKaro staging; expected to resolve by id in prod) keep the BankKaro
 * commission as a fallback, handled by the caller (cardMapper).
 */

/** A resolved CashKaro reward. `unit` decides ₹ vs % formatting. */
export interface CkRate {
  amount: number;
  unit: 'inr' | 'percent';
}

interface RateEntry extends CkRate {
  id: string;
  name: string;
}

export interface CardRateIndex {
  byId: Map<string, RateEntry>;
  byName: Map<string, RateEntry>;
}

/**
 * Normalise a card name to a comparison key: drop the bank word, the
 * "credit card" suffix, network words (Visa/RuPay/…), the CashKaro/CardGenius
 * "CG"/"Genius" tags and trailing month tags ("CG May"), then strip to
 * alphanumerics. "SBI Cashback Credit Card" and "SBI Cashback Credit Card CG
 * May" both collapse to "sbicashback".
 */
export function normCardName(name?: string): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/\bbank\b/g, '')
    .replace(/credit card|creditcard|\bcard\b/g, '')
    .replace(/\bcg\b|card genius|cardgenius|genius/g, '')
    .replace(/\brupay\b|\bvisa\b|\bmastercard\b|\bamex\b/g, '')
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/** Parse a CashKaro offer `cashback` block into a CkRate. null when unusable. */
function parseCashback(cb: any): CkRate | null {
  const amount = Number(String(cb?.amount ?? '').replace(/[^\d.]/g, ''));
  if (!isFinite(amount) || amount <= 0) return null;
  // Card stores use payment_type 'currency' (₹). 'percent' kept for safety.
  const unit: CkRate['unit'] = cb?.payment_type === 'percent' ? 'percent' : 'inr';
  return { amount, unit };
}

/**
 * Build the lookup index from the raw `home-categories-exclusive` offer rows.
 * Names that map to more than one store id are dropped from `byName` so the
 * fallback never resolves ambiguously.
 */
export function buildCardRateIndex(stores: any[]): CardRateIndex {
  const byId = new Map<string, RateEntry>();
  const byName = new Map<string, RateEntry>();
  const ambiguous = new Set<string>();

  for (const row of stores ?? []) {
    const a = row?.attributes ?? {};
    const rate = parseCashback(a.cashback);
    if (!rate) continue;
    const id = String(row?.id ?? '');
    const name = String(a.name ?? '');
    const entry: RateEntry = { ...rate, id, name };
    if (id) byId.set(id, entry);

    // Only index card-looking rows by name (currency reward or "credit card"
    // in the name) to keep the fallback to the card namespace.
    const looksLikeCard = rate.unit === 'inr' || /credit card/i.test(name);
    if (!looksLikeCard) continue;
    const key = normCardName(name);
    if (!key) continue;
    const existing = byName.get(key);
    if (existing && existing.id !== id) {
      ambiguous.add(key);
    } else if (!existing) {
      byName.set(key, entry);
    }
  }
  for (const key of ambiguous) byName.delete(key);
  return { byId, byName };
}

/**
 * Resolve one BankKaro card's CashKaro reward: by `ck_store_id` first, then an
 * unambiguous name match. null → caller falls back to BankKaro commission.
 */
export function resolveCkRate(
  ckStoreId: number | string | null | undefined,
  cardName: string | undefined,
  index: CardRateIndex,
): CkRate | null {
  const id = ckStoreId == null ? '' : String(ckStoreId).trim();
  if (id) {
    const byId = index.byId.get(id);
    if (byId) return { amount: byId.amount, unit: byId.unit };
  }
  const byName = index.byName.get(normCardName(cardName));
  return byName ? { amount: byName.amount, unit: byName.unit } : null;
}
