import { barWidths, stackedWidths, progressFraction } from '../chartMath';

describe('barWidths', () => {
  it('zero total gives zero widths', () => {
    expect(barWidths([0, 0, 0])).toEqual([0, 0, 0]);
    expect(barWidths([])).toEqual([]);
  });
  it('one item fills the bar', () => {
    expect(barWidths([500])).toEqual([100]);
  });
  it('scales to the largest value, or to max when given', () => {
    expect(barWidths([50, 100])).toEqual([50, 100]);
    expect(barWidths([50, 100], 200)).toEqual([25, 50]);
  });
  it('caps values above max at 100 and treats negatives as 0', () => {
    expect(barWidths([300, 100], 200)).toEqual([100, 50]);
    expect(barWidths([-5, 10])).toEqual([0, 100]);
  });
});

describe('stackedWidths', () => {
  it('sums to 100', () => {
    const w = stackedWidths([10, 20, 30, 40]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
    expect(w[0]).toBeCloseTo(10, 10);
    const odd = stackedWidths([1, 1, 1]);
    expect(odd.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });
  it('zero total gives zeros; one item is 100', () => {
    expect(stackedWidths([0, 0])).toEqual([0, 0]);
    expect(stackedWidths([7])).toEqual([100]);
  });
});

describe('progressFraction', () => {
  it('clamps below 0, above total, and total 0', () => {
    expect(progressFraction(-2, 6)).toBe(0);
    expect(progressFraction(9, 6)).toBe(1);
    expect(progressFraction(3, 0)).toBe(0);
    expect(progressFraction(2, 6)).toBeCloseTo(1 / 3, 10);
    expect(progressFraction(NaN, 6)).toBe(0);
  });
});
