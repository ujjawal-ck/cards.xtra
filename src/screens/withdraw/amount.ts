/**
 * Shared amount helpers for the UPI withdraw flow.
 *
 * The withdraw stack carries a single numeric `amount` (rupees). Every
 * screen formats it from this one source — no hardcoded ₹ strings in the
 * screens. `DEFAULT_WITHDRAW_AMOUNT` is the demo fallback used when the
 * stack is opened without an explicit amount.
 */

/** Demo fallback amount (₹) when the stack is opened without a param. */
export const DEFAULT_WITHDRAW_AMOUNT = 1500;

/** Indian digit grouping: 1234567 → "12,34,567". */
function groupIndian(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/** "₹1,500" — masthead headline form. */
export function formatRupees(amount: number): string {
  return `₹${groupIndian(amount)}`;
}

/** "₹1,500.0" — success-screen form (one decimal place). */
export function formatRupeesDecimal(amount: number): string {
  return `₹${groupIndian(amount)}.0`;
}
