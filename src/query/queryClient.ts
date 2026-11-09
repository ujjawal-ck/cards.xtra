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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 30 * 60 * 1000, // 30 min
      retry: (failureCount, error) => {
        if (error instanceof ApiError) return false;
        return failureCount < 1;
      },
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
