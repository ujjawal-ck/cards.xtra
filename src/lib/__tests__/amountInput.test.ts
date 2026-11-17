import { parseAmount, formatAmount, clampAmount } from '../amountInput';

describe('amountInput', () => {
  it('formats with Indian grouping while typing', () => {
    expect(formatAmount(parseAmount('1'))).toBe('1');
    expect(formatAmount(parseAmount('1200'))).toBe('1,200');
    expect(formatAmount(parseAmount('120000'))).toBe('1,20,000');
    expect(formatAmount(parseAmount('1,20,0000'))).toBe('12,00,000');
  });

  it('parses pasted text with commas, ₹ and spaces', () => {
    expect(parseAmount('₹ 1,20,000')).toBe(120000);
    expect(parseAmount(' Rs. 5 000 ')).toBe(5000);
    expect(parseAmount('1,20,000.75')).toBe(120000);
  });

  it('empty or digit-less input is null', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
    expect(parseAmount('₹')).toBeNull();
    expect(formatAmount(null)).toBe('');
  });

  it('keeps zero (a real amount) distinct from empty', () => {
    expect(parseAmount('0')).toBe(0);
    expect(formatAmount(0)).toBe('0');
  });

  it('clamps to min and max', () => {
    expect(clampAmount(50, 100, 1000)).toBe(100);
    expect(clampAmount(5000, 100, 1000)).toBe(1000);
    expect(clampAmount(500, 100, 1000)).toBe(500);
    expect(clampAmount(5000)).toBe(5000);
    expect(clampAmount(5000, undefined, 1000)).toBe(1000);
  });
});
