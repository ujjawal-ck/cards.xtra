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

import { formatINR } from '../../lib/money';

/** "₹1,500" / "₹775.60" — exact amount, shared app-wide formatter. */
export function formatRupees(amount: number): string {
  return formatINR(amount);
}
