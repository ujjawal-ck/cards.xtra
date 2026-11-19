/**
 * paused.ts: "offline with nothing to show" for a React Query result.
 *
 * App.js wires NetInfo into onlineManager and the network mode is 'online',
 * so a query that starts while the phone is offline is PAUSED: no data,
 * fetchStatus 'paused'. In v5 both `isLoading` and `isError` are false then,
 * so a screen that checks only those falls to its empty branch. Same rule as
 * `useCardSavings` (isOffline).
 */
import type { FetchStatus } from '@tanstack/react-query';

export function isPausedWithoutData(query: { data: unknown; fetchStatus: FetchStatus }): boolean {
  return query.data === undefined && query.fetchStatus === 'paused';
}
