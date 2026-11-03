/**
 * useOffers — CashKaro offers hooks.
 *   useOfferCategories()    → the Offers strip (miniapp parent + sub-categories)
 *   useCategoryOffers(slug) → stores in a category (Offers grid)
 *   useOfferStore(slug)     → a single store/brand page
 */
import { useQueries, useQuery } from '@tanstack/react-query';
import { getCategoryOffers, getOfferCategoryTree, getOfferStore } from '../api/cashkaro';
import {
  mapCategoryOffers,
  mapOfferStore,
  type OfferStoreSummary,
  type OfferStoreDetail,
} from '../api/offersMapper';
import {
  MINIAPP_PARENT_PATH,
  buildOfferCategoriesFromApi,
  type OfferCategory,
} from '../data/offerCategories';
import { useRefetchOnFocus } from './useRefetchOnFocus';

/**
 * The Offers strip, driven by the CashKaro "CK MINI APP" parent category. One
 * call returns the parent's sub-categories; buildOfferCategoriesFromApi turns
 * them into the strip (leading "All" tab + each sub, with app-side icons).
 */
export function useOfferCategories() {
  const query = useQuery<OfferCategory[]>({
    queryKey: ['ck', 'offer-categories', MINIAPP_PARENT_PATH],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => buildOfferCategoriesFromApi(await getOfferCategoryTree(MINIAPP_PARENT_PATH)),
  });
  useRefetchOnFocus(query);
  return query;
}

export function useCategoryOffers(categorySlug: string | null) {
  const query = useQuery<OfferStoreSummary[]>({
    queryKey: ['ck', 'category-offers', categorySlug],
    enabled: !!categorySlug,
    queryFn: async () => mapCategoryOffers(await getCategoryOffers(categorySlug as string)),
  });
  useRefetchOnFocus(query);
  return query;
}

export function useOfferStore(storeSlug: string | null) {
  const query = useQuery<OfferStoreDetail | null>({
    queryKey: ['ck', 'offer-store', storeSlug],
    enabled: !!storeSlug,
    queryFn: async () => mapOfferStore(await getOfferStore(storeSlug as string)),
  });
  useRefetchOnFocus(query);
  return query;
}

/**
 * Global store index for Offers search — every category's stores, merged and
 * deduped by slug (CashKaro has no store-search endpoint). `paths` is the live
 * set of category paths from useOfferCategories (the miniapp parent + its
 * sub-categories). Each per-category query reuses the SAME cache key as
 * useCategoryOffers, so a category the user already browsed is served from
 * cache; the rest fetch in parallel. `enabled` gates the whole fan-out so it
 * only fires when the search overlay opens.
 */
export function useAllOfferStores(
  enabled: boolean,
  paths: string[]
): {
  stores: OfferStoreSummary[];
  isLoading: boolean;
} {
  const results = useQueries({
    queries: paths.map((path) => ({
      queryKey: ['ck', 'category-offers', path],
      enabled,
      staleTime: 5 * 60 * 1000,
      queryFn: async () => mapCategoryOffers(await getCategoryOffers(path)),
    })),
  });

  const bySlug = new Map<string, OfferStoreSummary>();
  for (const r of results) {
    for (const s of r.data ?? []) {
      if (!bySlug.has(s.slug)) bySlug.set(s.slug, s);
    }
  }
  return {
    stores: Array.from(bySlug.values()),
    // Loading until the first category resolves — search can render results
    // progressively as the rest stream in, rather than blocking on all.
    isLoading: enabled && results.every((r) => r.isLoading),
  };
}
