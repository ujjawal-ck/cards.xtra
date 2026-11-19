/**
 * missingCashbackStates.ts: which branch the Missing Cashback lookups take.
 *
 * Pure (no React Native), so the rule "offline or failed is never 'no visits'"
 * is unit-tested. The screens only switch on the result.
 */

export interface LookupState {
  isLoading: boolean;
  isError: boolean;
  /** From isPausedWithoutData: offline before the first answer. */
  isOffline: boolean;
}

/** "Did You Shop?" → Yes. */
export type DidYouShopYes = 'wait' | 'offline' | 'error' | 'visits' | 'no_visits';

export function resolveDidYouShopYes(s: LookupState & { retailerCount: number }): DidYouShopYes {
  if (s.isLoading) return 'wait';
  // Offline first: a paused query that failed before is also isError.
  if (s.isOffline) return 'offline';
  if (s.isError) return 'error';
  return s.retailerCount > 0 ? 'visits' : 'no_visits';
}

export interface DidYouShopYesDeps {
  navigate: (route: 'MissingCashbackWhereDidYouShop' | 'MissingCashbackOops') => void;
  trackHasVisits: (hasVisits: boolean) => void;
  alert: (kind: 'offline' | 'error') => void;
}

/** Runs the Yes tap. Only a real answer is tracked or routed. */
export function handleDidYouShopYes(outcome: DidYouShopYes, deps: DidYouShopYesDeps): void {
  if (outcome === 'wait') return;
  if (outcome === 'offline' || outcome === 'error') {
    deps.alert(outcome);
    return;
  }
  const hasVisits = outcome === 'visits';
  deps.trackHasVisits(hasVisits);
  deps.navigate(hasVisits ? 'MissingCashbackWhereDidYouShop' : 'MissingCashbackOops');
}

/** Choose date body. */
export type ChooseDateView = 'loading' | 'offline' | 'error' | 'empty' | 'dates';

export function resolveChooseDateView(s: LookupState & { monthCount: number }): ChooseDateView {
  if (s.isLoading) return 'loading';
  if (s.isOffline) return 'offline';
  if (s.isError) return 'error';
  return s.monthCount > 0 ? 'dates' : 'empty';
}
