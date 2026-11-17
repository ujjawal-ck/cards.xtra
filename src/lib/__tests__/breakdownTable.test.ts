import { betterSide, breakdownTotals } from '../breakdownTable';

describe('breakdownTable', () => {
  it('sums each column, negatives included', () => {
    const t = breakdownTotals([
      { label: 'Rewards', a: 79920, b: 79920 },
      { label: 'Fee', a: -2000, b: -1000 },
    ]);
    expect(t).toEqual({ a: 77920, b: 78920 });
  });

  it('keeps paise exact', () => {
    expect(breakdownTotals([{ label: 'x', a: 0.1, b: 0 }, { label: 'y', a: 0.2, b: 0 }]).a).toBe(0.3);
  });

  it('empty rows total zero', () => {
    expect(breakdownTotals([])).toEqual({ a: 0, b: 0 });
  });

  it('finds the better side', () => {
    expect(betterSide(67000, 68002)).toBe('b');
    expect(betterSide(68002, 67000)).toBe('a');
    expect(betterSide(5, 5)).toBe('tie');
    expect(betterSide(1000, 590, true)).toBe('b');
    expect(betterSide(NaN, 1)).toBe('tie');
  });
});
