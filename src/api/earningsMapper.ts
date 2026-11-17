/**
 * earningsMapper.ts — CashKaro `GET /users/earnings` → EarningsScreen shape.
 *
 * Confirmed shape (staging): `data` is an ARRAY of one `user` row; amounts are
 * decimal strings ("22991.60"). Fields used:
 *   total_earned · total_cashback_earned · total_rewards_earned ·
 *   confirmed/pending/paid_cashback · confirmed/pending/paid_rewards
 *   (also: payment_threshold, firstname/email — not shown here).
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
  /** "₹1500.0" — confirmed cashback + confirmed rewards, the total available
   *  to withdraw on the Request Payment screen ("Cashback + Reward"). */
  combined: string;
  /** Per-type display amounts. Cashback: */
  confirmedCashback: string;
  pendingCashback: string;
  paidCashback: string;
  totalCashback: string;
  /** Rewards (gift-card payout only): */
  confirmedRewards: string;
  pendingRewards: string;
  paidRewards: string;
  totalRewards: string;
  /** Numeric bucket amounts (₹, rounded) — used by the withdraw flow to
   *  thread the chosen bucket's value through navigation params (the
   *  string fields above are display-only). */
  /** Confirmed (withdrawable) cashback. */
  confirmedNum: number;
  /** Confirmed (withdrawable) rewards — NOT the rewards total. */
  rewardsNum: number;
  /** Confirmed cashback + confirmed rewards. */
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
  const confirmedRewards = toAmount(a.confirmed_rewards);
  const pendingRewards = toAmount(a.pending_rewards);
  const paidRewards = toAmount(a.paid_rewards);
  // Derived total only when there's something to derive it from — a bare 0
  // made an all-empty response look like real data.
  const totalRaw = toAmount(a.total_earned);
  const total =
    totalRaw ??
    (confirmed !== null || pending !== null ? (confirmed ?? 0) + (pending ?? 0) : null);

  // Only values the API actually sent count; the computed fallback total
  // must not make an empty response look like "₹0 earned".
  const hasData = [confirmed, pending, cashback, rewards, totalRaw].some((x) => x !== null);

  return {
    totalEarnings: money(total ?? 0),
    cashbackValue: money(cashback ?? confirmed ?? 0),
    rewardsValue: money(rewards ?? 0),
    confirmed: money(confirmed ?? 0),
    pending: money(pending ?? 0),
    paid: money(paid ?? 0),
    // Withdrawable = confirmed cashback + confirmed rewards. Pending and
    // paid rewards are not withdrawable.
    combined: money((confirmed ?? 0) + (confirmedRewards ?? 0)),
    confirmedCashback: money(confirmed ?? 0),
    pendingCashback: money(pending ?? 0),
    paidCashback: money(paid ?? 0),
    totalCashback: money(cashback ?? 0),
    confirmedRewards: money(confirmedRewards ?? 0),
    pendingRewards: money(pendingRewards ?? 0),
    paidRewards: money(paidRewards ?? 0),
    totalRewards: money(rewards ?? 0),
    // Exact amounts (no rounding): ₹99.60 must not become a withdrawable 100.
    confirmedNum: confirmed ?? 0,
    rewardsNum: confirmedRewards ?? 0,
    combinedNum: (confirmed ?? 0) + (confirmedRewards ?? 0),
    hasData,
  };
}

export type { EarningsValues };
