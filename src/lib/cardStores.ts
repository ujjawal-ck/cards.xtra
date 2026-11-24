/**
 * cardStores — which CashKaro stores are credit-card stores (owner rule D-B,
 * 2026-11-24: "Offers show all stores except credit-card stores").
 *
 * A store is a card store when (contract C6):
 *   1. its CashKaro store id is the `ck_store_id` of any BankKaro card row
 *      (every row, inactive cards too), OR
 *   2. its name matches /credit\s*card/i.
 * Neither signal alone is enough: some card stores carry no "card" in the name
 * (an id match only), and some are not in BankKaro (a name match only). The
 * card-rate category rows are NOT the set: they also hold shopping stores.
 * When the BankKaro list has not loaded or failed, the id set is empty and
 * only the name rule runs (Q4): Offers never waits on BankKaro.
 *
 * Pure: no React or React Query here, so it runs in plain unit tests.
 */

const CARD_STORE_NAME = /credit\s*card/i;

/**
 * The BankKaro `ck_store_id`s, as strings, from the raw `/cardgenius/cards`
 * response (`{ data: [...] }`). Reads every row, also `status: false` rows.
 * Skips a missing, empty or `0` id.
 */
export function cardStoreIdsFrom(rawCardsResponse: any): Set<string> {
  const ids = new Set<string>();
  const rows: any[] = Array.isArray(rawCardsResponse?.data) ? rawCardsResponse.data : [];
  for (const row of rows) {
    const value = row?.ck_store_id;
    if (value === null || value === undefined) continue;
    const id = String(value).trim();
    if (!id || /^0+$/.test(id)) continue;
    ids.add(id);
  }
  return ids;
}

/** True when the store is a credit-card store: its id is a BankKaro card store id, or its name says "credit card". */
export function isCardStore(s: { storeId?: string; name: string }, ids: ReadonlySet<string>): boolean {
  if (s.storeId !== undefined && ids.has(s.storeId)) return true;
  return CARD_STORE_NAME.test(s.name ?? '');
}

/** The list without its credit-card stores (isCardStore). Keeps the order. */
export function excludeCardStores<T extends { storeId?: string; name: string }>(
  list: T[],
  ids: ReadonlySet<string>,
): T[] {
  return list.filter((s) => !isCardStore(s, ids));
}
