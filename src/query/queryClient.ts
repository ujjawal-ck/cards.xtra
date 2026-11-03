/**
 * queryClient.ts — single TanStack Query client for the app.
 *
 * Defaults tuned for a mobile catalog: cards/filters don't change minute to
 * minute, so a generous staleTime avoids needless refetches; one retry covers
 * transient network blips without hammering on real failures. Auth errors
 * (401/403) are not retried — they need a re-login, not a retry.
 */
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 30 * 60 * 1000, // 30 min
      retry: (failureCount, error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return false;
        }
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
