/**
 * formatINR — the ONE rupee formatter for money shown to users.
 *
 * "₹10,000" when whole, "₹775.60" when there are paise, Indian digit grouping
 * (12,34,567), sign preserved ("-₹50"). Replaces three drifting copies
 * (earningsMapper money(), withdraw/amount.ts, an ungrouped one in the
 * withdraw gate) that disagreed: ₹775.60 on Earnings became "₹776" on the
 * withdraw masthead and "₹776.0" on the success screen, and 10.999 rendered
 * as "₹10.100".
 */

/** Indian digit grouping of a non-negative integer string: 1234567 → "12,34,567". */
export function groupIndian(n: number): string {
  const s = Math.trunc(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  // Round to whole paise FIRST so 10.999 → 11.00 (not "10.100").
  const paise = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(paise / 100);
  const frac = paise % 100;
  const sign = amount < 0 && paise > 0 ? '-' : '';
  return frac > 0
    ? `${sign}₹${groupIndian(whole)}.${String(frac).padStart(2, '0')}`
    : `${sign}₹${groupIndian(whole)}`;
}

/** Shown in place of an amount the API did not send or sent unreadable. */
export const MONEY_DASH = '—';

/**
 * An API amount → number, or null when it is not an amount.
 *
 * Only a plain (optionally signed, comma-grouped, ₹-prefixed) decimal counts.
 * "", "N/A", "abc", "1e3", "12.34.56", null and NaN are NOT amounts: they
 * used to read as 0 (shown as a real "₹0") or 13. The minus sign is kept, so
 * a -₹50 reversal never reads as a ₹50 credit.
 */
export function parseAmount(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v).trim();
  const m = t.replace(/[₹,\s]/g, '').match(/^-?\d+(\.\d+)?$/);
  return m ? Number(m[0]) : null;
}

/**
 * An API amount → "₹1,234.50" / "-₹50", or the dash when it is missing or
 * unreadable. For display only; never for a value the user can withdraw.
 */
export function formatINROrDash(v: unknown): string {
  const n = parseAmount(v);
  return n === null ? MONEY_DASH : formatINR(n);
}
