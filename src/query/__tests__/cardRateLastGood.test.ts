/**
 * Last good card-rate rows (contract Q1, F2) with a real QueryClient and mocked APIs.
 *
 *   - A good run (call OK and at least one active card matches) replaces the cached rows.
 *   - A failed call, or a call that matches no card, keeps the last good rows.
 *   - With no last good rows the catalog run throws (screens show an error with Retry).
 *   - `cardsError` (cardsQueryFailed) is false while cached cards exist and a refetch fails.
 * Amounts are dummy values.
 */
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  NavigationContext: require('react').createContext(undefined),
}));
jest.mock('../../api/bankkaro', () => ({
  ...jest.requireActual('../../api/bankkaro'),
  getCards: jest.fn(),
  initBundle: jest.fn(),
}));
jest.mock('../../api/cashkaro', () => ({
  ...jest.requireActual('../../api/cashkaro'),
  getCardRateStores: jest.fn(),
}));

import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { getCards, initBundle } from '../../api/bankkaro';
import { getCardRateStores } from '../../api/cashkaro';
import { setHandledErrorReporter } from '../../api/http/report';
import { cardsQueryKey, fetchCatalog, type CardCatalog } from '../useCards';
import { cardsQueryFailed } from '../useCardSavings';
import { qk } from '../keys';

const mockGetCards = getCards as jest.MockedFunction<typeof getCards>;
const mockInit = initBundle as jest.MockedFunction<typeof initBundle>;
const mockRates = getCardRateStores as jest.MockedFunction<typeof getCardRateStores>;

const bk = (id: number, alias: string, ckStoreId: string) => ({
  id,
  name: `${alias} Credit Card`,
  card_alias: alias,
  status: true,
  ck_store_id: ckStoreId,
  commission: '100',
  joining_fee_text: '0',
  annual_fee_text: '0',
});
const cardsResponse = { data: [bk(1, 'alpha', '10'), bk(2, 'beta', '20'), bk(3, 'gamma', '30')] };

const store = (id: string, name: string, amount: string) => ({
  id,
  attributes: { name, cashback: { payment_type: 'currency', amount } },
});
const goodRows = [store('10', 'Alpha Store', '100')];
const newRows = [store('20', 'Beta Store', '200')];
const nonCardRows = [store('16919', 'Some Fashion Store', '100')];

const shownIds = (c: CardCatalog) => c.shown.map((x) => x.id);

let qc: QueryClient;
const reported: string[] = [];

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockGetCards.mockResolvedValue(cardsResponse);
  mockInit.mockResolvedValue(null);
  reported.length = 0;
  setHandledErrorReporter((_e, context) => reported.push(context));
});

afterEach(() => {
  qc.clear();
});

/** Make the cached rows stale, so the next run calls CashKaro again (as after 10 min). */
const expire = () => qc.invalidateQueries({ queryKey: qk.cards.rateStores });

describe('fetchCatalog: last good card-rate rows', () => {
  it('cold failure: the run throws and nothing is cached', async () => {
    mockRates.mockRejectedValueOnce(new Error('network'));
    await expect(fetchCatalog(qc)).rejects.toThrow('network');
    expect(qc.getQueryData(qk.cards.rateStores)).toBeUndefined();
  });

  it('cold success with 0 shown cards: the run throws and nothing is cached', async () => {
    mockRates.mockResolvedValueOnce(nonCardRows);
    await expect(fetchCatalog(qc)).rejects.toThrow(/match no card/);
    expect(qc.getQueryData(qk.cards.rateStores)).toBeUndefined();
  });

  it('a good run caches the rows and shows only the matched cards', async () => {
    mockRates.mockResolvedValueOnce(goodRows);
    const c = await fetchCatalog(qc);
    expect(shownIds(c)).toEqual(['1']);
    expect(c.all).toHaveLength(3);
    expect(qc.getQueryData(qk.cards.rateStores)).toEqual(goodRows);
  });

  it('inside the fresh window a second run does not call CashKaro', async () => {
    mockRates.mockResolvedValueOnce(goodRows);
    await fetchCatalog(qc);
    const c = await fetchCatalog(qc);
    expect(mockRates).toHaveBeenCalledTimes(1);
    expect(shownIds(c)).toEqual(['1']);
  });

  it('warm failure keeps the last good rows and reports it', async () => {
    mockRates.mockResolvedValueOnce(goodRows);
    await fetchCatalog(qc);
    await expire();
    mockRates.mockRejectedValueOnce(new Error('network'));
    const c = await fetchCatalog(qc);
    expect(mockRates).toHaveBeenCalledTimes(2);
    expect(shownIds(c)).toEqual(['1']);
    expect(qc.getQueryData(qk.cards.rateStores)).toEqual(goodRows);
    expect(reported.some((r) => r.startsWith('ck card-rate stores'))).toBe(true);
  });

  it('a warm success with 0 shown cards keeps the last good rows', async () => {
    mockRates.mockResolvedValueOnce(goodRows);
    await fetchCatalog(qc);
    await expire();
    mockRates.mockResolvedValueOnce(nonCardRows);
    const c = await fetchCatalog(qc);
    expect(mockRates).toHaveBeenCalledTimes(2);
    expect(shownIds(c)).toEqual(['1']);
    expect(qc.getQueryData(qk.cards.rateStores)).toEqual(goodRows);
  });

  it('a warm good success replaces the last good rows', async () => {
    mockRates.mockResolvedValueOnce(goodRows);
    await fetchCatalog(qc);
    await expire();
    mockRates.mockResolvedValueOnce(newRows);
    const c = await fetchCatalog(qc);
    expect(mockRates).toHaveBeenCalledTimes(2);
    expect(shownIds(c)).toEqual(['2']);
    expect(qc.getQueryData(qk.cards.rateStores)).toEqual(newRows);
  });

  it('a failed cards call fails the run even with last good rows, and is not reported as a card-rate failure', async () => {
    mockRates.mockResolvedValueOnce(goodRows);
    await fetchCatalog(qc);
    await expire();
    mockGetCards.mockRejectedValueOnce(new Error('bk down'));
    mockRates.mockResolvedValueOnce(goodRows);
    await expect(fetchCatalog(qc)).rejects.toThrow('bk down');
    expect(reported.some((r) => r.startsWith('ck card-rate stores'))).toBe(false);
    expect(qc.getQueryData(qk.cards.rateStores)).toEqual(goodRows);
  });
});

describe('cardsError (cardsQueryFailed) on a real cards query', () => {
  const observe = () => {
    const observer = new QueryObserver<CardCatalog>(qc, {
      queryKey: cardsQueryKey,
      queryFn: () => fetchCatalog(qc),
    });
    const unsubscribe = observer.subscribe(() => undefined);
    return { observer, unsubscribe };
  };

  it('false when cards are cached and a refetch fails', async () => {
    mockRates.mockResolvedValue(goodRows);
    const { observer, unsubscribe } = observe();
    await observer.refetch();
    expect(observer.getCurrentResult().isSuccess).toBe(true);

    mockGetCards.mockRejectedValueOnce(new Error('bk down'));
    await observer.refetch();
    const r = observer.getCurrentResult();
    expect(r.isError).toBe(true);
    expect(r.data?.shown.map((x) => x.id)).toEqual(['1']);
    expect(cardsQueryFailed(r)).toBe(false);
    unsubscribe();
  });

  it('true when the cards query fails with nothing cached', async () => {
    mockRates.mockRejectedValue(new Error('network'));
    const { observer, unsubscribe } = observe();
    await observer.refetch();
    const r = observer.getCurrentResult();
    expect(r.isError).toBe(true);
    expect(r.data).toBeUndefined();
    expect(cardsQueryFailed(r)).toBe(true);
    unsubscribe();
  });
});
