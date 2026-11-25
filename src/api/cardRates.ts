/**
 * cardRates.ts — CashKaro reward lookup for BankKaro cards, and the rule that
 * decides which cards the app shows.
 *
 * The card catalog (name, art, fees, benefits, eligibility) comes from BankKaro,
 * but the reward the user sees comes ONLY from CashKaro's store rate for the
 * card. BankKaro's `commission` / `bk_commission` is never shown as the user's
 * reward (decision 2026-11-23, audit PM-02 and DATA-07). A card with no CashKaro
 * rate shows no amount.
 *
 * Source: `getCardRateStores()` pages the `home-categories-exclusive` offers
 * category (the card stores live there). We index those rows by store id and by
 * a normalised name, then resolve each BankKaro card:
 *
 *   1. by `ck_store_id` (primary) — exact, and the only mechanism that holds in
 *      production.
 *   2. by normalised name (fallback) — recovers staging-only "twin" stores
 *      whose id differs from the production `ck_store_id` BankKaro carries
 *      (e.g. SBI Cashback's tracking id 24756 vs the staging offer 26519
 *      "SBI Cashback Credit Card CG May"). Only used when the name is
 *      unambiguous, so it never silently maps to the wrong card.
 *
 * Every store row counts, also a row with amount 0: CashKaro then shows the
 * server's `cashback_button_text` in place of an amount (parity J), kept here
 * as `label`.
 *
 * "Filter once mapped" (decision 2026-11-23), the one rule (`isCardShown`):
 *   - Filter ON when at least one catalogue card matches a CashKaro store row
 *     (`isCkFilterOn`). Then only matched cards show. A row for a store that is
 *     not a card never turns it on.
 *   - Filter OFF (no card matches, or the index is empty or failed): the rule
 *     from before the decision, "commissionable only": a card shows when it has
 *     a CashKaro amount or a BankKaro commission above 0. That commission is
 *     read internally and never displayed, so the shown set never grows.
 * Production returns 0 card stores for the app key today, so the filter is off
 * and no card shows an amount; it turns on by itself once CashKaro maps the
 * card stores.
 */
import { isRupeeCashback } from './offersMapper';

/** A resolved CashKaro reward. `unit` decides ₹ vs % formatting. */
export interface CkRate {
  /** 0 when the store row has no usable amount: show `label`, or no amount. */
  amount: number;
  unit: 'inr' | 'percent';
  /** True when the store has lower secondary tiers (e.g. existing bank
   *  customers), so `amount` is the top tier. cashkaro.com shows "Upto" then. */
  upto?: boolean;
  /** The server's `cashback_button_text`, set only when `amount` is 0. CashKaro
   *  shows it in place of an amount (parity J). */
  label?: string;
}

interface RateEntry extends CkRate {
  id: string;
  name: string;
}

export interface CardRateIndex {
  byId: Map<string, RateEntry>;
  byName: Map<string, RateEntry>;
  /** Store rows indexed. 0 = empty or failed to load: the filter is off. */
  size: number;
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

/**
 * Parse a CashKaro offer `cashback` block. `amount` is 0 when it is unusable:
 * missing, not above 0, or a `payment_type` that is neither rupee
 * ('flat' / 'currency', see isRupeeCashback) nor 'percent'.
 */
function parseCashback(cb: any): Pick<CkRate, 'amount' | 'unit'> {
  const unit: CkRate['unit'] | null =
    cb?.payment_type === 'percent' ? 'percent' : isRupeeCashback(cb) ? 'inr' : null;
  const amount = Number(String(cb?.amount ?? '').replace(/[^\d.]/g, ''));
  if (!unit || !isFinite(amount) || amount <= 0) return { amount: 0, unit: unit ?? 'inr' };
  return { amount, unit };
}

/** Trimmed `cashback_button_text`, or undefined when empty. */
function buttonText(raw: unknown): string | undefined {
  const t = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  return t || undefined;
}

/**
 * Build the lookup index from the raw `home-categories-exclusive` offer rows.
 * Every row with an id or a name is a store row, also one with amount 0.
 * Names that map to more than one store id are dropped from `byName` so the
 * fallback never resolves ambiguously.
 */
export function buildCardRateIndex(stores: any[]): CardRateIndex {
  const byId = new Map<string, RateEntry>();
  const byName = new Map<string, RateEntry>();
  const named: Array<{ key: string; entry: RateEntry }> = [];
  let size = 0;

  for (const row of stores ?? []) {
    const a = row?.attributes ?? {};
    const id = String(row?.id ?? '').trim();
    const name = String(a.name ?? '');
    if (!id && !name.trim()) continue;
    size += 1;
    const { amount, unit } = parseCashback(a.cashback);
    const label = amount > 0 ? undefined : buttonText(a.cashback_button_text);
    const entry: RateEntry = {
      amount,
      unit,
      upto: Number(a.secondary_cashback_count) > 0,
      ...(label ? { label } : {}),
      id,
      name,
    };
    if (id) byId.set(id, entry);

    // Only index card-looking rows by name (rupee reward or "credit card" in
    // the name) to keep the fallback to the card namespace.
    const looksLikeCard = isRupeeCashback(a.cashback) || /credit card/i.test(name);
    if (!looksLikeCard) continue;
    const key = normCardName(name);
    if (key) named.push({ key, entry });
  }

  // Name fallback: a row with an amount owns its name over a row with amount 0,
  // so a 0 row never makes a rated card's name ambiguous. Two different rows of
  // the same kind on one name make it ambiguous: dropped.
  const owned = new Set<string>();
  for (const withAmount of [true, false]) {
    const ambiguous = new Set<string>();
    for (const { key, entry } of named) {
      if (entry.amount > 0 !== withAmount || owned.has(key)) continue;
      const existing = byName.get(key);
      if (!existing) byName.set(key, entry);
      else if (existing.id !== entry.id) ambiguous.add(key);
    }
    for (const key of byName.keys()) owned.add(key);
    for (const key of ambiguous) {
      byName.delete(key);
      owned.add(key);
    }
  }
  return { byId, byName, size };
}

/** The public rate of one entry (no id / name). */
function toRate(e: RateEntry): CkRate {
  return { amount: e.amount, unit: e.unit, upto: e.upto, ...(e.label ? { label: e.label } : {}) };
}

/**
 * Resolve one BankKaro card's CashKaro store row: by `ck_store_id` first, then
 * an unambiguous name match. null → no CashKaro row: the card has no amount.
 * A match can carry amount 0 (see `label`).
 */
export function resolveCkRate(
  ckStoreId: number | string | null | undefined,
  cardName: string | undefined,
  index: CardRateIndex,
): CkRate | null {
  const id = ckStoreId == null ? '' : String(ckStoreId).trim();
  if (id) {
    const byId = index.byId.get(id);
    if (byId) return toRate(byId);
  }
  const byName = index.byName.get(normCardName(cardName));
  return byName ? toRate(byName) : null;
}

/** The BankKaro card fields the card rule reads (a raw `BkCard` fits). */
export interface CardRuleInput {
  ck_store_id?: number | string | null;
  name?: string;
  commission?: unknown;
  bk_commission?: unknown;
}

/**
 * BankKaro commission above 0, parsed exactly as before 2026-11-23
 * (`commission`, else `bk_commission`). Internal: the rule reads it to keep
 * today's card set; it is never displayed.
 */
function hasBkCommission(card: CardRuleInput): boolean {
  const raw = card.commission || card.bk_commission || '';
  const n = Number(String(raw).replace(/[^\d.]/g, ''));
  return isFinite(n) && n > 0;
}

/**
 * True when the CashKaro card filter is on: at least one catalogue card matches
 * a store row (by id or by the unambiguous name). An index with only non-card
 * stores, an empty index or a failed load leaves it off.
 */
export function isCkFilterOn(index: CardRateIndex, cards: CardRuleInput[]): boolean {
  if (index.size === 0) return false;
  return (cards ?? []).some((c) => !!c && resolveCkRate(c.ck_store_id, c.name, index) !== null);
}

/**
 * THE card rule (decision 2026-11-23, "filter once mapped"). `filterOn` comes
 * from isCkFilterOn over the same catalogue.
 *   - On: a card shows only when it matches a CashKaro store row.
 *   - Off: "commissionable only", as before: a CashKaro amount or a BankKaro
 *     commission above 0 (internal, never displayed).
 * Input pickers (the user's own card) do not apply it.
 */
export function isCardShown(card: CardRuleInput, index: CardRateIndex, filterOn: boolean): boolean {
  const rate = resolveCkRate(card.ck_store_id, card.name, index);
  if (filterOn) return rate !== null;
  return (!!rate && rate.amount > 0) || hasBkCommission(card);
}

/** The shown cards, for a card-tool league (see leagueForDisplay). */
export interface ShownCards {
  /** Ids of the app cards isCardShown keeps. */
  ids: ReadonlySet<string>;
  filterOn: boolean;
}

/**
 * The same rule on a card-tool league (the four Home tools' table, and the
 * "cards that beat yours" lists). Display only: never narrow the league itself.
 *
 *   - `shown` null (the card list is not known yet): every row as it is.
 *   - Filter on: a row stays only when its app card is shown. A row with no app
 *     card stays out: no CashKaro store row can match it.
 *   - Filter off: every row stays (repo D27), but a row whose app card is not
 *     shown loses its `card`, so it reads as a card the app does not list (no
 *     Apply, no card page), as before 2026-11-23.
 *   - The row of `keepAlias` (the user's own card) always stays as it is.
 */
export function leagueForDisplay<T extends { savings: { alias: string }; card?: { id: string } }>(
  rows: T[],
  shown: ShownCards | null,
  keepAlias?: string,
): T[] {
  if (!Array.isArray(rows)) return [];
  if (!shown) return rows;
  const out: T[] = [];
  for (const r of rows) {
    const mine = !!keepAlias && r.savings.alias === keepAlias;
    if (mine || (!!r.card && shown.ids.has(r.card.id))) {
      out.push(r);
    } else if (!shown.filterOn) {
      if (!r.card) {
        out.push(r);
      } else {
        const { card: _notListed, ...rest } = r;
        out.push(rest as T);
      }
    }
  }
  return out;
}
