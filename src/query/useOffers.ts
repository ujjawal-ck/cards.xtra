/**
 * useOffers — CashKaro offers hooks.
 *   useOfferCategories()    → the Offers strip (miniapp parent + sub-categories)
 *   useCategoryOffers(slug) → stores in a category (Offers grid)
 *   useOfferStore(slug)     → a single store/brand page
 *   useAllOfferStores()     → every category's stores (Offers search)
 *
 * Credit-card stores never show on Offers (owner rule D-B, 2026-11-24). The
 * cache keeps the full category list; the grid and search hooks drop the card
 * stores when they read it (src/lib/cardStores.ts). The BankKaro card store
 * ids come from the raw card list Home already downloads. Until it loads, or
 * if it fails, only the name rule runs (Q4): Offers never waits on BankKaro.
 */
import { useCallback, useMemo } from 'react';
import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getCategoryOffers,
  getOfferCategories,
  getOfferCategoryTree,
  getOfferStore,
} from '../api/cashkaro';
import { getCards } from '../api/bankkaro';
import { ApiError } from '../api/client';
import {
  mapCategoryOffers,
  mapOfferStore,
  type OfferStoreSummary,
  type OfferStoreDetail,
} from '../api/offersMapper';
import {
  MINIAPP_PARENT_PATH,
  buildOfferCategoriesFromApi,
  buildOfferCategoriesFromTopLevel,
  type OfferCategory,
} from '../data/offerCategories';
import { cardStoreIdsFrom, excludeCardStores } from '../lib/cardStores';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { rawCardsQueryKey } from './useCards';
import { qk } from './keys';

/** No BankKaro ids yet (loading or failed): one shared empty set, so memos stay stable. */
const NO_CARD_STORE_IDS: ReadonlySet<string> = new Set();

/**
 * How long a category list stays fresh. "More" is 4 calls (~1.47 MB raw), so
 * the grid and search index refetch on screen focus or app foreground only
 * when their data is older than this. Pull-to-refresh still forces a refetch.
 */
const CATEGORY_FRESH_MS = 10 * 60 * 1000;

/**
 * useRefetchOnFocus, but only when the data is older than `maxAgeMs` (or there
 * is none, as after an error). useRefetchOnFocus itself is unchanged: other
 * screens use it.
 */
function useRefetchOnFocusIfOlder(
  query: { refetch: () => unknown; isFetched: boolean; isFetching: boolean; dataUpdatedAt: number },
  maxAgeMs: number,
): void {
  useRefetchOnFocus({
    isFetched: query.isFetched,
    isFetching: query.isFetching,
    refetch: () => (Date.now() - query.dataUpdatedAt >= maxAgeMs ? query.refetch() : undefined),
  });
}

/**
 * The BankKaro card store ids, read from the raw card list (one observer of
 * `rawCardsQueryKey`, the download Home already makes). `staleTime: Infinity`:
 * Offers never starts a refetch of the 3.3 MB list itself (the Offers tab stays
 * mounted, so a default observer would refetch on every app foreground). It
 * fetches only when nothing is cached yet. The set keeps its reference while
 * the ids are the same, so a Home refetch does not re-filter the Offers lists.
 */
function useCardStoreIds(): ReadonlySet<string> {
  const { data } = useQuery({
    queryKey: rawCardsQueryKey,
    queryFn: getCards,
    staleTime: Infinity,
    select: cardStoreIdsFrom,
  });
  const key = data && data.size > 0 ? [...data].sort().join(',') : '';
  return useMemo(() => (key ? new Set(key.split(',')) : NO_CARD_STORE_IDS), [key]);
}

/** `select` for a category query: the stores without the card stores. Stable while the ids are the same. */
function useWithoutCardStores(): (stores: OfferStoreSummary[]) => OfferStoreSummary[] {
  const ids = useCardStoreIds();
  return useCallback((stores: OfferStoreSummary[]) => excludeCardStores(stores, ids), [ids]);
}

/**
 * The Offers strip, driven by the CashKaro "CK MINI APP" parent category. One
 * call returns the parent's sub-categories; buildOfferCategoriesFromApi turns
 * them into the strip (leading "All" tab + each sub, with app-side icons).
 */
export function useOfferCategories() {
  const query = useQuery<OfferCategory[]>({
    queryKey: qk.offers.categories(MINIAPP_PARENT_PATH),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        return buildOfferCategoriesFromApi(await getOfferCategoryTree(MINIAPP_PARENT_PATH));
      } catch (e) {
        // Production has no `miniapp` parent yet (400 "Invalid Category").
        // Fall back to the real top-level categories instead of failing the
        // whole page. Network errors (status 0) still surface as errors.
        if (e instanceof ApiError && e.status === 400) {
          return buildOfferCategoriesFromTopLevel(await getOfferCategories());
        }
        throw e;
      }
    },
  });
  useRefetchOnFocus(query);
  return query;
}

/**
 * Stores in a category for the Offers grid, without the credit-card stores.
 * The cache keeps every store. Fresh for 10 minutes: a focus or app foreground
 * refetches only older data; `refetch()` (pull-to-refresh) always runs.
 */
export function useCategoryOffers(categorySlug: string | null) {
  const withoutCardStores = useWithoutCardStores();
  const query = useQuery<OfferStoreSummary[], Error, OfferStoreSummary[]>({
    queryKey: qk.offers.category(categorySlug ?? ''),
    enabled: !!categorySlug,
    staleTime: CATEGORY_FRESH_MS,
    queryFn: async () => mapCategoryOffers(await getCategoryOffers(categorySlug as string)),
    select: withoutCardStores,
  });
  useRefetchOnFocusIfOlder(query, CATEGORY_FRESH_MS);
  return query;
}

export function useOfferStore(storeSlug: string | null) {
  const query = useQuery<OfferStoreDetail | null>({
    queryKey: qk.offers.store(storeSlug ?? ''),
    enabled: !!storeSlug,
    queryFn: async () => mapOfferStore(await getOfferStore(storeSlug as string)),
  });
  useRefetchOnFocus(query);
  return query;
}

/** Merge the per-category results (every store, card stores too), deduped by slug.
 *  Module level, so `useQueries` keeps the merged result while no query changes. */
function mergeCategoryStores(results: UseQueryResult<OfferStoreSummary[], Error>[]) {
  const bySlug = new Map<string, OfferStoreSummary>();
  for (const r of results) {
    for (const s of r.data ?? []) {
      if (!bySlug.has(s.slug)) bySlug.set(s.slug, s);
    }
  }
  return {
    all: Array.from(bySlug.values()),
    allLoading: results.every((r) => r.isLoading),
    allLoaded: results.length > 0 && results.every((r) => r.isSuccess),
  };
}

/**
 * Global store index for Offers search — every category's stores, merged and
 * deduped by slug (CashKaro has no store-search endpoint), without the
 * credit-card stores. `paths` is the live set of category paths from
 * useOfferCategories (the miniapp parent + its sub-categories). Each
 * per-category query reuses the SAME cache key as useCategoryOffers, so a
 * category the user already browsed is served from cache; the rest fetch in
 * parallel. `enabled` gates the whole fan-out so it only fires when the search
 * overlay opens. Fresh for 10 minutes, like the grid: opening search or an app
 * foreground refetches only older categories.
 */
export function useAllOfferStores(
  enabled: boolean,
  paths: string[]
): {
  stores: OfferStoreSummary[];
  isLoading: boolean;
  /** Every category has loaded: a slug missing from `stores` is not a live, non-card store. */
  isComplete: boolean;
  /** Every loaded store by slug, card stores too: lets an old recent (no saved store id) be checked. */
  loadedBySlug: ReadonlyMap<string, OfferStoreSummary>;
  /** The BankKaro card store ids (empty until they load, or if BankKaro fails). */
  cardStoreIds: ReadonlySet<string>;
} {
  const cardStoreIds = useCardStoreIds();
  const merged = useQueries({
    queries: paths.map((path) => ({
      queryKey: qk.offers.category(path),
      enabled,
      staleTime: CATEGORY_FRESH_MS,
      queryFn: async () => mapCategoryOffers(await getCategoryOffers(path)),
    })),
    combine: mergeCategoryStores,
  });
  const stores = useMemo(() => excludeCardStores(merged.all, cardStoreIds), [merged.all, cardStoreIds]);
  const loadedBySlug = useMemo(() => new Map(merged.all.map((s) => [s.slug, s] as const)), [merged.all]);

  return {
    stores,
    // Loading until the first category resolves — search can render results
    // progressively as the rest stream in, rather than blocking on all.
    isLoading: enabled && merged.allLoading,
    isComplete: enabled && merged.allLoaded,
    loadedBySlug,
    cardStoreIds,
  };
}
