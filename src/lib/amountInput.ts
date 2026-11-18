/**
 * DS-ADD(ds-expansion-1, 2026-11-17): parse / format / clamp a rupee amount typed by the user.
 * Rollback: delete this file, its test, and src/molecules/AmountInput.tsx.
 *
 * amountInput — pure helpers for the AmountInput molecule.
 */
import { groupIndian } from './money';

// First digit (zero) of the Indian scripts a phone keyboard can type digits in:
// Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam.
const INDIC_ZEROS = [0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66];

/** Indian-script digits to 0-9 ("५२३४" → "5234"). Other characters stay as they are. */
export function toAsciiDigits(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const zero = INDIC_ZEROS.find((z) => cp >= z && cp <= z + 9);
    out += zero === undefined ? ch : String(cp - zero);
  }
  return out;
}

/** "₹ 1,20,000", "1,20,000.50", " 5000 ", "५२३४" → whole rupees. Empty / no digits → null. */
export function parseAmount(text: string): number | null {
  // Anything after a decimal point is dropped: amounts are whole rupees here.
  const whole = toAsciiDigits(text).replace(/^\s*(₹|rs\.?|inr)/i, '').split('.')[0];
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
