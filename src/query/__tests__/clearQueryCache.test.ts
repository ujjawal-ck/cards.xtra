/**
 * clearQueryCache (sign-in, sign-out, session end): user queries go, the last
 * good CashKaro card-rate rows stay with their own `dataUpdatedAt` (contract Q1).
 * Row content is dummy.
 */
import { QueryClient } from '@tanstack/react-query';
import { clearQueryCache } from '../queryClient';
import { qk } from '../keys';

const rows = [{ id: '10', attributes: { name: 'Alpha Store', cashback: { payment_type: 'currency', amount: '100' } } }];
const TEN_MIN = 10 * 60 * 1000;

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => qc.clear());

describe('clearQueryCache', () => {
  it('keeps the card-rate rows and their dataUpdatedAt; user and other queries go', () => {
    const updatedAt = Date.now() - 60_000;
    qc.setQueryData(qk.cards.rateStores, rows, { updatedAt });
    qc.setQueryData(qk.user.profile(), { name: 'x' });
    qc.setQueryData(qk.user.earnings(), { total: 100 });
    qc.setQueryData(['bk', 'cards'], { all: [], shown: [] });

    clearQueryCache(qc);

    expect(qc.getQueryData(qk.cards.rateStores)).toEqual(rows);
    expect(qc.getQueryState(qk.cards.rateStores)?.dataUpdatedAt).toBe(updatedAt);
    expect(qc.getQueryData(qk.user.profile())).toBeUndefined();
    expect(qc.getQueryData(qk.user.earnings())).toBeUndefined();
    expect(qc.getQueryData(['bk', 'cards'])).toBeUndefined();
    expect(qc.getQueryCache().getAll().map((q) => q.queryKey)).toEqual([qk.cards.rateStores]);
  });

  it('the kept rows are never garbage-collected (gcTime Infinity)', () => {
    qc.setQueryData(qk.cards.rateStores, rows);
    clearQueryCache(qc);
    expect(qc.getQueryCache().find({ queryKey: qk.cards.rateStores })?.gcTime).toBe(Infinity);
  });

  it('the 10 min freshness does not restart: fresh rows need no call, stale rows do', async () => {
    const queryFn = jest.fn(async () => rows);
    qc.setQueryData(qk.cards.rateStores, rows, { updatedAt: Date.now() - 60_000 });
    clearQueryCache(qc);
    await qc.fetchQuery({ queryKey: qk.cards.rateStores, queryFn, staleTime: TEN_MIN });
    expect(queryFn).not.toHaveBeenCalled();

    qc.setQueryData(qk.cards.rateStores, rows, { updatedAt: Date.now() - TEN_MIN - 60_000 });
    clearQueryCache(qc);
    await qc.fetchQuery({ queryKey: qk.cards.rateStores, queryFn, staleTime: TEN_MIN });
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('with no card-rate rows the cache ends empty', () => {
    qc.setQueryData(qk.user.profile(), { name: 'x' });
    clearQueryCache(qc);
    expect(qc.getQueryCache().getAll()).toHaveLength(0);
    expect(qc.getQueryData(qk.cards.rateStores)).toBeUndefined();
  });
});
