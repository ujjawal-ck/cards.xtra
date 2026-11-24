/**
 * Last good card-rate rows (contract Q1, F2) with a real QueryClient and mocked APIs.
 *
 *   - A good run (call OK and at least one active card matches) replaces the cached rows.
 *   - A failed call, or a call that matches no card, keeps the last good rows.
 *   - With no last good rows the catalog run throws (screens show an error with Retry).
 *   - `cardsError` (cardsQueryFailed) is false while cached cards exist and a refetch fails.
 *   - The tools' loading flag (savingsFlags) stays true until the cards list resolves or fails.
 *   - A covered card-rate failure is reported once until the next good run.
 *   - The catalog query never retries a NoMappedCardsError (app default retry otherwise).
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

import { QueryClient, QueryObserver, onlineManager } from '@tanstack/react-query';
import { getCards, initBundle } from '../../api/bankkaro';
import { getCardRateStores } from '../../api/cashkaro';
import { setHandledErrorReporter } from '../../api/http/report';
import {
  __resetCardRateReport,
  cardsQueryKey,
  catalogQueryOptions,
  fetchCatalog,
  isNoMappedCardsError,
  type CardCatalog,
} from '../useCards';
import { defaultQueryRetry, queryClient as appQueryClient } from '../queryClient';
import { ApiError } from '../../api/http/errors';
import { cardsQueryFailed, savingsFlags } from '../useCardSavings';
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
  __resetCardRateReport();
});

afterEach(() => {
  qc.clear();
});

/** Make the cached rows stale, so the next run calls CashKaro again (as after 10 min). */
const expire = () => qc.invalidateQueries({ queryKey: qk.cards.rateStores });

describe('fetchCatalog: last good card-rate rows', () => {
  it('cold failure: the run throws and nothing is cached', async () => {
    mockRates.mockRejectedValueOnce(new Error('network'));
    const error = await fetchCatalog(qc).catch((e) => e);
    expect(error.message).toBe('network');
    expect(isNoMappedCardsError(error)).toBe(false); // the screens say "Check your connection"
    expect(qc.getQueryData(qk.cards.rateStores)).toBeUndefined();
  });

  it('cold success with 0 shown cards: the run throws and nothing is cached', async () => {
    mockRates.mockResolvedValueOnce(nonCardRows);
    const error = await fetchCatalog(qc).catch((e) => e);
    expect(isNoMappedCardsError(error)).toBe(true); // the screens say "Cards aren't available"
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

describe('savingsFlags: the tools wait for the cards list (no unmapped row, no empty flash)', () => {
  afterEach(() => onlineManager.setOnline(true));

  const calcDone = { data: { list: [] }, isPending: false, fetchStatus: 'idle' as const };
  const cardsObserver = () => {
    const observer = new QueryObserver<CardCatalog>(qc, {
      queryKey: cardsQueryKey,
      queryFn: () => fetchCatalog(qc),
    });
    const unsubscribe = observer.subscribe(() => undefined);
    return { observer, unsubscribe };
  };
  /** Resolves once the cards query is no longer pending. */
  const settled = (observer: QueryObserver<CardCatalog>) =>
    new Promise<void>((resolve) => {
      const unsubscribe = observer.subscribe((r) => {
        if (!r.isPending) {
          unsubscribe();
          resolve();
        }
      });
    });

  it('loading while the catalog is pending; not loading after it resolves', async () => {
    let resolveCards: (v: unknown) => void = () => undefined;
    mockGetCards.mockReturnValueOnce(new Promise((r) => (resolveCards = r)));
    mockRates.mockResolvedValue(goodRows);
    const { observer, unsubscribe } = cardsObserver();
    const done = settled(observer);

    expect(observer.getCurrentResult().isPending).toBe(true);
    expect(savingsFlags(true, calcDone, observer.getCurrentResult())).toEqual({ isLoading: true, isOffline: false });

    resolveCards(cardsResponse);
    await done;
    expect(observer.getCurrentResult().isSuccess).toBe(true);
    expect(savingsFlags(true, calcDone, observer.getCurrentResult())).toEqual({ isLoading: false, isOffline: false });
    unsubscribe();
  });

  it('not loading after the catalog fails (the error state shows)', async () => {
    let rejectCards: (e: unknown) => void = () => undefined;
    mockGetCards.mockReturnValueOnce(new Promise((_r, j) => (rejectCards = j)));
    mockRates.mockResolvedValue(goodRows);
    const { observer, unsubscribe } = cardsObserver();
    const done = settled(observer);
    expect(savingsFlags(true, calcDone, observer.getCurrentResult()).isLoading).toBe(true);

    rejectCards(new Error('bk down'));
    await done;
    const r = observer.getCurrentResult();
    expect(savingsFlags(true, calcDone, r)).toEqual({ isLoading: false, isOffline: false });
    expect(cardsQueryFailed(r)).toBe(true);
    unsubscribe();
  });

  it('the cards list paused offline with no data is offline, not loading', () => {
    onlineManager.setOnline(false);
    const { observer, unsubscribe } = cardsObserver();
    const r = observer.getCurrentResult();
    expect(r.fetchStatus).toBe('paused');
    expect(savingsFlags(true, calcDone, r)).toEqual({ isLoading: false, isOffline: true });
    unsubscribe();
  });

  it('the calculate call still gates the flags; an idle hook is neither', () => {
    const cardsDone = { data: { all: [], shown: [] }, isPending: false, fetchStatus: 'idle' as const };
    const calcPending = { data: undefined, isPending: true, fetchStatus: 'fetching' as const };
    expect(savingsFlags(true, calcPending, cardsDone)).toEqual({ isLoading: true, isOffline: false });
    expect(savingsFlags(false, calcPending, calcPending)).toEqual({ isLoading: false, isOffline: false });
  });
});

describe('card-rate failure report: once until the next good run', () => {
  const rateReports = () => reported.filter((r) => r.startsWith('ck card-rate stores')).length;

  it('an outage reports once, still calls CashKaro on every stale run, and a good run re-arms it', async () => {
    mockRates.mockResolvedValueOnce(goodRows);
    await fetchCatalog(qc);
    for (let i = 0; i < 3; i++) {
      await expire();
      mockRates.mockRejectedValueOnce(new Error('network'));
      await fetchCatalog(qc);
    }
    expect(mockRates).toHaveBeenCalledTimes(4);
    expect(rateReports()).toBe(1);

    await expire();
    mockRates.mockResolvedValueOnce(goodRows);
    await fetchCatalog(qc);
    await expire();
    mockRates.mockResolvedValueOnce(nonCardRows); // a zero-match run is a failure too
    await fetchCatalog(qc);
    expect(rateReports()).toBe(2);
  });
});

describe('catalog retry (catalogQueryOptions) on the app default retry', () => {
  // The app's real default retry; no delay, so a retry runs at once.
  const appClient = () => new QueryClient({ defaultOptions: { queries: { retry: defaultQueryRetry, retryDelay: 0 } } });

  const settle = async (client: QueryClient) => {
    const observer = new QueryObserver<CardCatalog>(client, catalogQueryOptions(client));
    const result = await new Promise<ReturnType<typeof observer.getCurrentResult>>((resolve) => {
      const unsubscribe = observer.subscribe((r) => {
        if (r.status !== 'pending' && r.fetchStatus === 'idle') {
          unsubscribe();
          resolve(r);
        }
      });
    });
    client.clear();
    return result;
  };

  it('the app client uses defaultQueryRetry', () => {
    expect(appQueryClient.getDefaultOptions().queries?.retry).toBe(defaultQueryRetry);
  });

  it('a cold no-match run is not retried: the BankKaro list downloads once', async () => {
    mockRates.mockResolvedValue(nonCardRows);
    const r = await settle(appClient());
    expect(isNoMappedCardsError(r.error)).toBe(true);
    expect(mockGetCards).toHaveBeenCalledTimes(1);
  });

  it('another error keeps the default: a plain error is retried once, an ApiError never', async () => {
    mockRates.mockRejectedValue(new Error('network'));
    await settle(appClient());
    expect(mockGetCards).toHaveBeenCalledTimes(2);

    mockGetCards.mockClear();
    mockRates.mockRejectedValue(new ApiError('down', 500));
    await settle(appClient());
    expect(mockGetCards).toHaveBeenCalledTimes(1);
  });
});
