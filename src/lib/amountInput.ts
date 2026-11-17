/**
 * DS-ADD(ds-expansion-1, 2026-11-17): parse / format / clamp a rupee amount typed by the user.
 * Rollback: delete this file, its test, and src/molecules/AmountInput.tsx.
 *
 * amountInput — pure helpers for the AmountInput molecule.
 */
import { groupIndian } from './money';

/** "₹ 1,20,000", "1,20,000.50", " 5000 " → whole rupees. Empty / no digits → null. */
export function parseAmount(text: string): number | null {
  // Anything after a decimal point is dropped: amounts are whole rupees here.
  const whole = text.replace(/^\s*(₹|rs\.?|inr)/i, '').split('.')[0];
  const digits = whole.replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

/** 120000 → "1,20,000". null → "". */
export function formatAmount(value: number | null): string {
  return value == null ? '' : groupIndian(value);
}

/** Keep a number inside [min, max]. Either bound may be omitted. */
export function clampAmount(value: number, min?: number, max?: number): number {
  let n = value;
  if (max != null && n > max) n = max;
  if (min != null && n < min) n = min;
  return n;
}
