/**
 * Offers grid focus refetch (useCategoryOffers): the age is read from the cache
 * at focus time. No cached data (never loaded, or dropped by the cache clear at
 * sign-in or sign-out) refetches; data older than the window refetches.
 */
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  NavigationContext: require('react').createContext(undefined),
}));

import { QueryClient } from '@tanstack/react-query';
import { shouldRefetchOnFocus } from '../useOffers';
import { clearQueryCache } from '../queryClient';
import { qk } from '../keys';

const TEN_MIN = 10 * 60 * 1000;
const NOW = 1_700_000_000_000;

describe('shouldRefetchOnFocus', () => {
  it('refetches when nothing is cached (undefined or 0)', () => {
    expect(shouldRefetchOnFocus(undefined, NOW, TEN_MIN)).toBe(true);
    expect(shouldRefetchOnFocus(0, NOW, TEN_MIN)).toBe(true);
  });

  it('refetches data older than the window, keeps fresher data', () => {
    expect(shouldRefetchOnFocus(NOW - TEN_MIN, NOW, TEN_MIN)).toBe(true);
    expect(shouldRefetchOnFocus(NOW - TEN_MIN - 1, NOW, TEN_MIN)).toBe(true);
    expect(shouldRefetchOnFocus(NOW - 60_000, NOW, TEN_MIN)).toBe(false);
  });

  it('after the cache clear the category state is gone, so the focus refetches', () => {
    const qc = new QueryClient();
    const key = qk.offers.category('fashion');
    qc.setQueryData(key, [{ slug: 'a' }]);
    expect(shouldRefetchOnFocus(qc.getQueryState(key)?.dataUpdatedAt, Date.now(), TEN_MIN)).toBe(false);
    clearQueryCache(qc);
    expect(shouldRefetchOnFocus(qc.getQueryState(key)?.dataUpdatedAt, Date.now(), TEN_MIN)).toBe(true);
    qc.clear();
  });
});
