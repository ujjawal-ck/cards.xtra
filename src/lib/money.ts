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
