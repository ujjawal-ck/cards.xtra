import { groupByMonth } from '../groupByMonth';

const r = (id: string, dateISO?: string) => ({ id, dateISO });
const shape = (s: ReturnType<typeof groupByMonth>) =>
  s.map((x) => [x.label, x.rows.map((y: any) => y.id)]);

describe('groupByMonth', () => {
  it('returns [] for no rows', () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it('groups by calendar month, newest month first, keeping order inside a month', () => {
    const out = groupByMonth([
      r('a', '2026-09-30T10:00:00'),
      r('b', '2026-11-03T10:00:00'),
      r('c', '2026-11-01T10:00:00'),
      r('d', '2026-10-15T10:00:00'),
    ]);
    expect(shape(out)).toEqual([
      ['November 2026', ['b', 'c']],
      ['October 2026', ['d']],
      ['September 2026', ['a']],
    ]);
  });

  it('puts missing or unparseable dates under "Earlier", last', () => {
    const out = groupByMonth([r('x', 'not-a-date'), r('y', '2026-11-03T10:00:00'), r('z')]);
    expect(shape(out)).toEqual([
      ['November 2026', ['y']],
      ['Earlier', ['x', 'z']],
    ]);
  });

  it('returns one heading-less section when no row has a date', () => {
    const out = groupByMonth([r('a'), r('b')]);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('');
    expect(out[0].rows).toHaveLength(2);
  });
});
