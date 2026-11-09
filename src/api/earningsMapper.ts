/**
 * earningsMapper.ts — CashKaro `GET /users/earnings` → EarningsScreen shape.
 *
 * Confirmed shape (staging): `data` is an ARRAY of one `user` row; amounts are
 * decimal strings ("22991.60"). Fields used:
 *   total_earned · total_cashback_earned · total_rewards_earned ·
 *   confirmed_cashback · pending_cashback   (also: paid_cashback,
 *   payment_threshold, firstname/email — not shown here).
 */
import { formatINR } from '../lib/money';
interface EarningsValues {
  /** "₹1,500" — all-time / total earnings (masthead headline). */
  totalEarnings: string;
  /** "₹1500.0" — total cashback (masthead stat). */
  cashbackValue: string;
  /** "₹0.0" — total rewards (masthead stat). */
  rewardsValue: string;
  /** "₹1500.0" — confirmed, withdrawable. */
  confirmed: string;
  /** "₹0.0" — pending. */
  pending: string;
  /** "₹0.0" — already paid out to the user. */
  paid: string;
  /** "₹1500.0" — confirmed cashback + rewards, the total available to
   *  withdraw on the Request Payment screen ("Cashback + Reward"). */
  combined: string;
  /** Numeric bucket amounts (₹, rounded) — used by the withdraw flow to
   *  thread the chosen bucket's value through navigation params (the
   *  string fields above are display-only). */
  confirmedNum: number;
  rewardsNum: number;
  combinedNum: number;
  /** True when the API actually returned usable numbers. */
  hasData: boolean;
}

function toAmount(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v).trim();
  // Only a plain (optionally signed, comma-grouped) decimal counts. "",
  // "N/A", "1e3", "12.34.56" are NOT amounts — they used to read as 0, 13
  // or 0 and still mark the response as "hasData". The minus sign is kept
  // (it was stripped, so a -₹50 reversal showed as ₹50).
  const m = t.replace(/[₹,\s]/g, '').match(/^-?\d+(\.\d+)?$/);
  return m ? Number(m[0]) : null;
}

const money = formatINR;

export function mapEarnings(res: any): EarningsValues {
  // `data` is an array of one `user` row.
  const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
  const a: Record<string, unknown> = row?.attributes ?? {};

  const confirmed = toAmount(a.confirmed_cashback);
  const pending = toAmount(a.pending_cashback);
  const paid = toAmount(a.paid_cashback);
  const cashback = toAmount(a.total_cashback_earned) ?? toAmount(a.total_cashback);
  const rewards = toAmount(a.total_rewards_earned) ?? toAmount(a.total_rewards);
  // Derived total only when there's something to derive it from — a bare 0
  // made an all-empty response look like real data.
  const total =
    toAmount(a.total_earned) ??
    (confirmed !== null || pending !== null ? (confirmed ?? 0) + (pending ?? 0) : null);

  const hasData = [confirmed, pending, cashback, rewards, total].some((x) => x !== null);

  return {
    totalEarnings: money(total ?? 0),
    cashbackValue: money(cashback ?? confirmed ?? 0),
    rewardsValue: money(rewards ?? 0),
    confirmed: money(confirmed ?? 0),
    pending: money(pending ?? 0),
    paid: money(paid ?? 0),
    // Confirmed cashback is the withdrawable cashback; rewards has no
    // separate confirmed/pending split in the API, so the full rewards
    // balance is treated as withdrawable. Sum = the combined bucket.
    combined: money((confirmed ?? 0) + (rewards ?? 0)),
    // Exact amounts (no rounding): ₹99.60 must not become a withdrawable 100.
    confirmedNum: confirmed ?? 0,
    rewardsNum: rewards ?? 0,
    combinedNum: (confirmed ?? 0) + (rewards ?? 0),
    hasData,
  };
}

export type { EarningsValues };
