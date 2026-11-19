/**
 * N1 and N2: a Missing Cashback lookup that is paused offline (no data yet)
 * is never "no visits" / "no recent visits". The screens switch on these
 * resolvers; the screen wiring itself is not render-tested here.
 */
import { QueryClient, QueryObserver, onlineManager } from '@tanstack/react-query';
import { isPausedWithoutData } from '../paused';
import {
  resolveDidYouShopYes,
  handleDidYouShopYes,
  resolveChooseDateView,
} from '../missingCashbackStates';

const idle = { isLoading: false, isError: false, isOffline: false };

describe('isPausedWithoutData (real React Query state)', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('a query started offline is paused: not loading, not error, no data', () => {
    onlineManager.setOnline(false);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const queryFn = jest.fn(async () => [1]);
    const observer = new QueryObserver(qc, { queryKey: ['mc', 'retailers'], queryFn });
    const unsubscribe = observer.subscribe(() => undefined);
    const r = observer.getCurrentResult();

    expect(r.fetchStatus).toBe('paused');
    expect(r.isLoading).toBe(false);
    expect(r.isError).toBe(false);
    expect(r.data).toBeUndefined();
    expect(queryFn).not.toHaveBeenCalled();
    expect(isPausedWithoutData(r)).toBe(true);

    unsubscribe();
    qc.clear();
  });

  it('cached data while paused is not offline-without-data', () => {
    expect(isPausedWithoutData({ data: [], fetchStatus: 'paused' })).toBe(false);
    expect(isPausedWithoutData({ data: undefined, fetchStatus: 'idle' })).toBe(false);
    expect(isPausedWithoutData({ data: undefined, fetchStatus: 'fetching' })).toBe(false);
  });
});

describe('N1: "Did You Shop?" Yes', () => {
  const deps = () => ({ navigate: jest.fn(), trackHasVisits: jest.fn(), alert: jest.fn() });

  it('offline: shows the offline alert, does not go to Oops, does not track has_visits', () => {
    const d = deps();
    const outcome = resolveDidYouShopYes({ ...idle, isOffline: true, retailerCount: 0 });
    expect(outcome).toBe('offline');
    handleDidYouShopYes(outcome, d);
    expect(d.alert).toHaveBeenCalledWith('offline');
    expect(d.navigate).not.toHaveBeenCalled();
    expect(d.trackHasVisits).not.toHaveBeenCalled();
  });

  it('offline wins over an earlier error', () => {
    expect(resolveDidYouShopYes({ ...idle, isError: true, isOffline: true, retailerCount: 0 })).toBe('offline');
  });

  it('failed lookup: error alert, no Oops, no tracking', () => {
    const d = deps();
    handleDidYouShopYes(resolveDidYouShopYes({ ...idle, isError: true, retailerCount: 0 }), d);
    expect(d.alert).toHaveBeenCalledWith('error');
    expect(d.navigate).not.toHaveBeenCalled();
    expect(d.trackHasVisits).not.toHaveBeenCalled();
  });

  it('loading: does nothing', () => {
    const d = deps();
    handleDidYouShopYes(resolveDidYouShopYes({ ...idle, isLoading: true, retailerCount: 0 }), d);
    expect(d.alert).not.toHaveBeenCalled();
    expect(d.navigate).not.toHaveBeenCalled();
    expect(d.trackHasVisits).not.toHaveBeenCalled();
  });

  it('a real empty list still goes to Oops and tracks has_visits false', () => {
    const d = deps();
    handleDidYouShopYes(resolveDidYouShopYes({ ...idle, retailerCount: 0 }), d);
    expect(d.trackHasVisits).toHaveBeenCalledWith(false);
    expect(d.navigate).toHaveBeenCalledWith('MissingCashbackOops');
  });

  it('visits go to the store list and track has_visits true', () => {
    const d = deps();
    handleDidYouShopYes(resolveDidYouShopYes({ ...idle, retailerCount: 3 }), d);
    expect(d.trackHasVisits).toHaveBeenCalledWith(true);
    expect(d.navigate).toHaveBeenCalledWith('MissingCashbackWhereDidYouShop');
    expect(d.alert).not.toHaveBeenCalled();
  });
});

describe('N2: Choose date', () => {
  it('offline with no cache is the offline state, not the empty state', () => {
    expect(resolveChooseDateView({ ...idle, isOffline: true, monthCount: 0 })).toBe('offline');
  });

  it('a failed load is the error state, not the empty state', () => {
    expect(resolveChooseDateView({ ...idle, isError: true, monthCount: 0 })).toBe('error');
  });

  it('only a loaded empty list is the empty state', () => {
    expect(resolveChooseDateView({ ...idle, monthCount: 0 })).toBe('empty');
    expect(resolveChooseDateView({ ...idle, monthCount: 2 })).toBe('dates');
    expect(resolveChooseDateView({ ...idle, isLoading: true, monthCount: 0 })).toBe('loading');
  });
});
