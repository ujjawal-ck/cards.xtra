/**
 * Orders list month dates ("Fetch detail dates", decision 2026-11-23):
 * each shown row's detail is fetched at most 4 at a time, into the SAME cache
 * entry the order detail screen reads, with no retry on top of the HTTP
 * client's own. A failed call puts the row under "Other".
 */
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  NavigationContext: require('react').createContext(undefined),
}));
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ accessToken: null }) }));
jest.mock('../../api/cashkaro', () => ({ getOrders: jest.fn(), getOrderDetail: jest.fn() }));

import { QueryClient } from '@tanstack/react-query';
import { getOrderDetail } from '../../api/cashkaro';
import { groupOrdersByMonth, type OrderListRow } from '../../api/ordersMapper';
import { qk } from '../keys';
import { queryClient as appQueryClient } from '../queryClient';
import { orderDetailQuery } from '../useOrderDetail';
import { prefetchOrderDetails, orderDateFrom, ORDER_DATE_CONCURRENCY } from '../useOrders';

const mockDetail = getOrderDetail as jest.Mock;
const detail = (id: string, transaction_date?: string) => ({
  data: { type: 'orderdetails', id, attributes: { cashback_amount: '10.00', transaction_date } },
});
// The app's client defaults (5 min staleTime, its retry rule), not a bare client.
const clients: QueryClient[] = [];
const newClient = () => {
  const qc = new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() });
  clients.push(qc);
  return qc;
};
const dateOf = (qc: QueryClient, id: string) => {
  const state = qc.getQueryState(qk.user.order(id));
  return state ? orderDateFrom(state as any) : undefined;
};

afterEach(() => {
  mockDetail.mockReset();
  // Drop cached queries so their gc timers don't keep Jest running.
  clients.splice(0).forEach((qc) => qc.clear());
});

describe('order dates for the Orders list', () => {
  it('uses the detail screen query key', () => {
    expect(orderDetailQuery('token', '42').queryKey).toEqual(qk.user.order('42'));
  });

  it('caches the detail under the detail screen key; a fetch with the shared options reads that cache', async () => {
    mockDetail.mockImplementation(async (_t: string, id: string) => detail(id, '2026-11-03T00:00:00Z'));
    const qc = newClient();
    await prefetchOrderDetails(qc, 'token', ['42']);
    expect(mockDetail).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData<any>(qk.user.order('42'))?.transactionDateISO).toBe('2026-11-03T00:00:00Z');
    expect(dateOf(qc, '42')).toBe('2026-11-03T00:00:00Z');

    // A fetch with the detail screen's options reads the fresh cache. (The
    // screen's useRefetchOnFocus still refetches on entry: not covered here.)
    await qc.fetchQuery(orderDetailQuery('token', '42'));
    // A second list pass (the next page loads) does not fetch it again either.
    await prefetchOrderDetails(qc, 'token', ['42']);
    expect(mockDetail).toHaveBeenCalledTimes(1);
  });

  it('a failed call is made once (no retry) and puts the row under "Other"', async () => {
    mockDetail.mockImplementation(async (_t: string, id: string) => {
      if (id === 'bad') throw new Error('network down');
      return detail(id, '2026-10-15T00:00:00Z');
    });
    const qc = newClient();
    await prefetchOrderDetails(qc, 'token', ['ok', 'bad']);
    expect(mockDetail.mock.calls.filter((c) => c[1] === 'bad')).toHaveLength(1);
    expect(dateOf(qc, 'bad')).toBeNull();

    const rows = [{ id: 'ok' }, { id: 'bad' }] as OrderListRow[];
    const datesById = { ok: dateOf(qc, 'ok') as string, bad: dateOf(qc, 'bad') as null };
    expect(groupOrdersByMonth(rows, datesById).map((s) => [s.label, s.rows.map((r) => r.id)])).toEqual([
      ['October 2026', ['ok']],
      ['Other', ['bad']],
    ]);
  });

  it('a detail with no transaction_date also goes under "Other"', async () => {
    mockDetail.mockImplementation(async (_t: string, id: string) => detail(id));
    const qc = newClient();
    await prefetchOrderDetails(qc, 'token', ['nodate']);
    expect(dateOf(qc, 'nodate')).toBeNull();
  });

  it('a row not fetched yet has no date (stays in the list with no heading)', () => {
    expect(orderDateFrom({ data: undefined, status: 'pending' })).toBeUndefined();
  });

  it('never has more than 4 detail calls in flight', async () => {
    expect(ORDER_DATE_CONCURRENCY).toBe(4);
    let active = 0;
    let peak = 0;
    mockDetail.mockImplementation(async (_t: string, id: string) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return detail(id, '2026-11-03T00:00:00Z');
    });
    const qc = newClient();
    const ids = Array.from({ length: 20 }, (_, i) => `o${i}`);
    await prefetchOrderDetails(qc, 'token', ids);
    expect(mockDetail).toHaveBeenCalledTimes(20);
    expect(peak).toBe(4);
  });

  it('skips a row that left the list before its turn, and reports it', async () => {
    mockDetail.mockImplementation(async (_t: string, id: string) => detail(id, '2026-11-03T00:00:00Z'));
    const qc = newClient();
    const notFetched: string[] = [];
    await prefetchOrderDetails(qc, 'token', ['keep', 'gone'], (id) => id !== 'gone', (id) => notFetched.push(id));
    expect(mockDetail.mock.calls.map((c) => c[1])).toEqual(['keep']);
    expect(dateOf(qc, 'gone')).toBeUndefined();
    expect(notFetched).toEqual(['gone']);
  });

  it('reports a call cancelled mid-flight (the row left the list), so it can queue again', async () => {
    let release!: () => void;
    mockDetail.mockImplementation(
      (_t: string, id: string) =>
        new Promise((res) => {
          release = () => res(detail(id, '2026-11-03T00:00:00Z'));
        })
    );
    const qc = newClient();
    const notFetched: string[] = [];
    const done = prefetchOrderDetails(qc, 'token', ['x'], () => true, (id) => notFetched.push(id));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockDetail).toHaveBeenCalledTimes(1);
    // Same cancel (with revert) React Query runs when the last observer leaves.
    await qc.cancelQueries({ queryKey: qk.user.order('x') });
    release();
    await done;
    expect(dateOf(qc, 'x')).toBeUndefined();
    expect(notFetched).toEqual(['x']);
  });
});
