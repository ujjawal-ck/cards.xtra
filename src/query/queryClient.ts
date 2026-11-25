/**
 * queryClient.ts — single TanStack Query client for the app.
 *
 * Defaults tuned for a mobile catalog: cards/filters don't change minute to
 * minute, so a generous staleTime avoids needless refetches. API errors are
 * not retried here: the transport (src/api/http/client.ts) already retries
 * transient failures with backoff, and 4xx needs a fix, not a retry. Stacking
 * both would multiply requests (3 x 2 = 6 per failure).
 */
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { qk } from './keys';

/**
 * The app's default query retry: an ApiError never (the transport already
 * retried it), any other error once. Exported so a query can narrow it
 * (the card catalog, useCards.ts).
 */
export function defaultQueryRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 30 * 60 * 1000, // 30 min
      retry: defaultQueryRetry,
      // Refetch active queries when the app returns to the foreground. RN has no
      // real "window focus", so App.js wires focusManager to AppState — without
      // that wiring this flag is inert. Re-entering individual screens is
      // handled separately by useRefetchOnFocus.
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Clear the query cache (sign-in, sign-out, session end), so one user's data
 * never reaches the next. Keeps the last good CashKaro card-rate rows
 * (`qk.cards.rateStores`, contract Q1): they are public data and must last the
 * app session. They go back with their own `dataUpdatedAt`, so their 10 min
 * freshness does not restart, and with `gcTime: Infinity`, as useCards keeps them.
 */
export function clearQueryCache(client: QueryClient = queryClient): void {
  const rates = client.getQueryState<unknown>(qk.cards.rateStores);
  client.clear();
  if (rates?.data === undefined) return;
  client.setQueryDefaults(qk.cards.rateStores, { gcTime: Infinity });
  client.setQueryData(qk.cards.rateStores, rates.data, { updatedAt: rates.dataUpdatedAt });
}
