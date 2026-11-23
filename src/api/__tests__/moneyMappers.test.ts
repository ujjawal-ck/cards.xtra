/**
 * Money and empty-state rules for the Earnings, Orders and Missing Cashback
 * mappers (audit QA-01..04, DATA-09, CODE-05). Exact strings, so a wrong
 * amount fails here instead of staying green.
 *
 * Run once with TZ=America/Los_Angeles as well: the visit-day cases only fail
 * on a phone west of UTC.
 */
import { mapEarnings, requireEarnings } from '../earningsMapper';
import { mapOrders, mapOrderDetail } from '../ordersMapper';
import {
  decideSubmitOutcome,
  mapClaimToCard,
  mapExitClicks,
  mapOthersClaim,
} from '../missingCashbackMapper';
import type { McClaim } from '../missingCashback';

const fx = (name: string) => JSON.parse(JSON.stringify(require(`../__fixtures__/${name}.json`)));

// Input → shown amount, shared by every money field fixed here.
const AMOUNT_CASES: [unknown, string][] = [
  ['-50.00', '-₹50'],
  ['99.999', '₹100'],
  ['684.50', '₹684.50'],
  ['', '—'],
  ['abc', '—'],
  [null, '—'],
];

describe('earnings: an unusable response is not success (QA-02)', () => {
  it.each([
    ['empty string', ''],
    ['an HTML page', '<html><body>Login to Wi-Fi</body></html>'],
    ['an empty data list', { data: [] }],
    ['an empty object', {}],
    ['a row with no amounts', { data: [{ attributes: { firstname: 'A' } }] }],
  ])('%s throws, so the screen shows its error state', (_label, body) => {
    expect(mapEarnings(body).hasData).toBe(false);
    expect(() => requireEarnings(body)).toThrow();
  });

  it('a real account passes, also with zero balances', () => {
    expect(requireEarnings(fx('doc.earnings')).confirmed).toBe('₹500');
    expect(() => requireEarnings(fx('staging.earnings'))).not.toThrow();
    expect(requireEarnings({ data: [{ attributes: { confirmed_cashback: '0.00' } }] }).confirmed).toBe('₹0');
  });
});

describe('orders amounts (QA-01, DATA-09, CODE-05)', () => {
  const row = (cashback_amount: unknown) => ({
    id: '1',
    attributes: { cashback_type: 'Cashback', cashback_status: 'Pending', cashback_amount },
  });

  it.each(AMOUNT_CASES)('list cashback_amount %p → %p', (input, shown) => {
    expect(mapOrders({ data: [row(input)] })[0].amount).toBe(shown);
  });

  it.each(AMOUNT_CASES)('detail cashback_amount and order_amount %p → %p', (input, shown) => {
    const d = mapOrderDetail({ data: { id: '1', attributes: { cashback_amount: input, order_amount: input } } });
    expect(d.amount).toBe(shown);
    expect(d.orderAmount).toBe(shown);
  });

  it('a missing amount field is a dash, not ₹0', () => {
    expect(mapOrders({ data: [{ id: '1', attributes: {} }] })[0].amount).toBe('—');
    expect(mapOrderDetail({ data: { id: '1', attributes: {} } }).orderAmount).toBe('—');
  });

  it('keeps the doc rows formatted with grouping and two decimals', () => {
    const amounts = mapOrders(fx('doc.orders')).map((r) => r.amount);
    for (const a of amounts) expect(a).toMatch(/^-?₹[\d,]+(\.\d{2})?$/);
  });

  it('a real empty list is []; a body without a data list throws (no false "No orders yet")', () => {
    expect(mapOrders(fx('staging.orders'))).toEqual([]);
    expect(mapOrders({ data: [] })).toEqual([]);
    expect(() => mapOrders('<html>proxy</html>')).toThrow();
    expect(() => mapOrders({})).toThrow();
    expect(() => mapOrders(undefined)).toThrow();
  });
});

describe('missing cashback amounts (DATA-09)', () => {
  const claim = (attrs: Partial<McClaim['attributes']>): McClaim => ({
    id: '9',
    type: 'queue',
    attributes: { order_id: 'OD1', status: 'Pending', ...attrs },
  });
  const NOW = Date.parse('2026-11-23T00:00:00Z');

  it.each(AMOUNT_CASES)('Others order_amount %p → %p', (input, shown) => {
    const c = claim({ ticket_id: 'T1', order_amount: input as string });
    expect(mapOthersClaim(c).orderAmount).toBe(shown);
  });

  it('Others: an amount already prefixed with ₹ is not doubled', () => {
    expect(mapOthersClaim(claim({ ticket_id: 'T1', order_amount: '₹1,250.5' })).orderAmount).toBe('₹1,250.50');
  });

  it('submit outcome: a tracked value is formatted; unreadable or zero uses the line without an amount', () => {
    const res = (cashbackvalue?: string) => ({ data: { type: 'queue', id: 1 }, meta: { cashback_id: 7, cashbackvalue } });
    expect(decideSubmitOutcome(res('1250.5'), 'A')).toMatchObject({
      kind: 'tracked',
      message: 'Hurray! Cashback of ₹1,250.50 has been tracked.',
    });
    for (const v of ['0.00', 'abc', '', undefined]) {
      expect(decideSubmitOutcome(res(v), 'A')).toMatchObject({
        kind: 'tracked',
        message: 'Hurray! Your cashback has been tracked.',
      });
    }
  });

  it('tracked claim card: formatted value, never "₹0.00" or the raw string', () => {
    expect(mapClaimToCard(claim({ cashback_id: 7, cashbackvalue: '1250.50' }), NOW).title).toBe(
      'Hurray! Cashback of ₹1,250.50 is added to your account.',
    );
    expect(mapClaimToCard(claim({ cashback_id: 7, cashbackvalue: '0.00', missing_txn_cashback: '99.5' }), NOW).title).toBe(
      'Hurray! Cashback of ₹99.50 is added to your account.',
    );
    expect(mapClaimToCard(claim({ cashback_id: 7, cashbackvalue: '0.00' }), NOW).title).toBe(
      'Hurray! Your cashback has been tracked.',
    );
  });

  it('claim card orderAmount stays raw (HelpTicketCard adds ₹; the draft parses it)', () => {
    expect(mapClaimToCard(claim({ order_amount: '1899.5' }), NOW).orderAmount).toBe('1899.5');
  });
});

describe('missing cashback visit dates (QA-03, QA-04)', () => {
  const clicks = (dates: string[]) => ({
    data: dates.map((d, i) => ({ type: 'clickdates', id: String(i), attributes: { exitclick_date: d } })) as any,
  });

  it('the day chip is the day in the string, in any time zone', () => {
    const groups = mapExitClicks(fx('doc.mc_exit_dates'));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: '2022-08', label: 'August' });
    expect(groups[0].dates.map((d) => d.day)).toEqual(['09', '12']);
    // The raw value sent back to the API is unchanged.
    expect(groups[0].dates.map((d) => d.exitDate)).toEqual(['2022-08-09', '2022-08-12']);
  });

  it('a visit on the 1st stays in its own month', () => {
    const groups = mapExitClicks(clicks(['2026-09-01']));
    expect(groups.map((g) => [g.label, g.dates[0].day])).toEqual([['September', '01']]);
  });

  it('months sort chronologically across October (padded key)', () => {
    const groups = mapExitClicks(clicks(['2026-11-03', '2026-08-20', '2026-10-15', '2026-09-30', '2026-11-01']));
    expect(groups.map((g) => g.key)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    expect(groups.map((g) => g.label)).toEqual(['August', 'September', 'October', 'November']);
    expect(groups[3].dates.map((d) => d.day)).toEqual(['01', '03']);
  });

  it('sorts across a year boundary and reads a date-time string by its date', () => {
    const groups = mapExitClicks(clicks(['2027-01-02T00:30:00+05:30', '2026-12-31']));
    expect(groups.map((g) => g.key)).toEqual(['2026-12', '2027-01']);
    expect(groups[1].dates[0].day).toBe('02');
  });

  it('skips unreadable dates', () => {
    expect(mapExitClicks(clicks(['', 'not a date', '2026-13-40']))).toEqual([]);
  });
});
