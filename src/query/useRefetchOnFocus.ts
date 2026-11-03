/**
 * useRefetchOnFocus — refetch a query every time its screen regains focus.
 *
 * Why this exists: React Navigation keeps tab screens MOUNTED across tab
 * switches (Home/Offers/Earnings/Profile never unmount), so React Query never
 * re-runs their queries on its own — there's no remount and no window-focus
 * event in React Native. The result was stale data that only refreshed on a
 * full app restart. Calling refetch() on focus fixes that, and because manual
 * refetch ignores staleTime, it also covers pushed screens re-entered inside
 * the cache window.
 *
 * Safe by construction:
 *   • Disabled queries (signed out / no arg yet) have isFetched=false → skipped,
 *     so we never fire an auth-gated call without a token.
 *   • A fetch already in flight (the initial mount's own load) → skipped, so the
 *     first focus doesn't double up on the mount fetch.
 *   • The query is read through a ref, so the focus callback stays stable and
 *     runs exactly once per focus (not again when isFetching toggles).
 *
 * Existing data stays on screen during the background refetch (React Query keeps
 * the last `data` while `isFetching` is true), so there's no loading flash.
 */
import { useCallback, useContext, useRef } from 'react';
import { useFocusEffect, NavigationContext } from '@react-navigation/native';

interface Refetchable {
  refetch: () => unknown;
  isFetched: boolean;
  isFetching: boolean;
}

export function useRefetchOnFocus(query: Refetchable): void {
  const ref = useRef(query);
  ref.current = query;

  // useFocusEffect needs a navigation context. A query hook can be called from
  // a component rendered in a @gorhom/bottom-sheet portal (e.g. CardDetailSheet
  // → useCardBenefits), and that portal mounts OUTSIDE the NavigationContainer
  // (BottomSheetModalProvider wraps it in App.js). There, useFocusEffect would
  // throw "Couldn't find a navigation object". Whether a component lives inside
  // a navigator is fixed for its whole lifetime, so this conditional hook is
  // stable across renders — the focus-refetch simply doesn't apply to a modal.
  const inNavigator = useContext(NavigationContext) !== undefined;
  if (inNavigator) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useFocusEffect(
      useCallback(() => {
        const q = ref.current;
        if (q.isFetched && !q.isFetching) q.refetch();
      }, [])
    );
  }
}
