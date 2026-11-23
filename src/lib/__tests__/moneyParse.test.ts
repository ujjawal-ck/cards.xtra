/**
 * parseAmount / formatINROrDash: an API amount that is missing or unreadable
 * is never shown as a real "₹0", and the minus sign of a reversal is kept.
 */
import { formatINR, formatINROrDash, parseAmount, MONEY_DASH } from '../money';

describe('parseAmount', () => {
  it('reads plain, signed, grouped and ₹-prefixed decimals', () => {
    expect(parseAmount('684.50')).toBe(684.5);
    expect(parseAmount('-50.00')).toBe(-50);
    expect(parseAmount('99.999')).toBe(99.999);
    expect(parseAmount('₹1,250.50')).toBe(1250.5);
    expect(parseAmount(' 25 ')).toBe(25);
    expect(parseAmount(0)).toBe(0);
    expect(parseAmount('0.00')).toBe(0);
  });

  it('returns null for anything that is not an amount', () => {
    for (const v of ['', '   ', 'abc', 'N/A', '1e3', '12.34.56', null, undefined, NaN, Infinity, {}]) {
      expect(parseAmount(v)).toBeNull();
    }
  });
});

describe('formatINROrDash', () => {
  it.each([
    ['-50.00', '-₹50'],
    ['99.999', '₹100'],
    ['684.50', '₹684.50'],
    ['1234567.8', '₹12,34,567.80'],
    ['0', '₹0'],
    ['', MONEY_DASH],
    ['abc', MONEY_DASH],
    [null, MONEY_DASH],
    [undefined, MONEY_DASH],
  ])('%p → %p', (input, expected) => {
    expect(formatINROrDash(input)).toBe(expected);
  });

  it('matches formatINR for every readable amount', () => {
    expect(formatINROrDash('775.6')).toBe(formatINR(775.6));
  });
});
