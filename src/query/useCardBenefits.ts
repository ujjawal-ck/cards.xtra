/**
 * useCardBenefits — categorized benefits for one card (the "All Card
 * Benefits" page). Fetches BankKaro `GET /cardgenius/cards/:alias` and maps
 * its `product_benefits` into tab categories. Disabled until an alias exists.
 */
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { getCardDetail } from '../api/bankkaro';
import { mapCardBenefits, type BenefitCategory } from '../api/cardBenefitsMapper';
import { useRefetchOnFocus } from './useRefetchOnFocus';

const benefitsQuery = (alias: string) => ({
  queryKey: ['bk', 'card-benefits', alias] as const,
  queryFn: async () => mapCardBenefits(await getCardDetail(alias)),
});

export function useCardBenefits(alias?: string) {
  const query = useQuery<BenefitCategory[]>({
    ...benefitsQuery(alias ?? ''),
    enabled: !!alias,
  });
  useRefetchOnFocus(query);
  return query;
}

/**
 * Warm the cache for a card's detail benefits ahead of time (e.g. for the
 * cards adjacent to the one open in the CardDetailSheet) so swiping to them
 * shows benefits with no fetch delay. No-op without an alias.
 */
export function prefetchCardBenefits(client: QueryClient, alias?: string) {
  if (!alias) return;
  client.prefetchQuery(benefitsQuery(alias));
}
