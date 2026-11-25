import { groupOrdersByMonth, type OrderListRow } from '../ordersMapper';

const row = (id: string) => ({ id } as OrderListRow);
const shape = (s: ReturnType<typeof groupOrdersByMonth>) => s.map((x) => [x.label, x.rows.map((r) => r.id)]);

describe('groupOrdersByMonth', () => {
  const rows = ['a', 'b', 'c', 'd', 'e'].map(row);

  it('returns [] for no rows', () => {
    expect(groupOrdersByMonth([], {})).toEqual([]);
  });

  it('shows one list with no heading while no date has arrived', () => {
    expect(shape(groupOrdersByMonth(rows, {}))).toEqual([['', ['a', 'b', 'c', 'd', 'e']]]);
  });

  it('groups by month, newest first, keeps server order inside a month, "Other" last', () => {
    const out = groupOrdersByMonth(rows, {
      a: '2026-09-30T10:00:00',
      b: null, // the detail call failed
      c: '2026-11-03T10:00:00',
      d: '2026-11-01T10:00:00',
      e: '2026-10-15T10:00:00',
    });
    expect(shape(out)).toEqual([
      ['November 2026', ['c', 'd']],
      ['October 2026', ['e']],
      ['September 2026', ['a']],
      ['Other', ['b']],
    ]);
  });

  it('keeps rows without a date yet in a section with no heading, before "Other"', () => {
    const out = groupOrdersByMonth(rows, { a: '2026-11-03T10:00:00', e: null });
    expect(shape(out)).toEqual([
      ['November 2026', ['a']],
      ['', ['b', 'c', 'd']],
      ['Other', ['e']],
    ]);
  });

  it('puts a detail with no usable date under "Other"', () => {
    const out = groupOrdersByMonth([row('a'), row('b')], { a: 'not-a-date', b: '' });
    expect(shape(out)).toEqual([['Other', ['a', 'b']]]);
  });
});
