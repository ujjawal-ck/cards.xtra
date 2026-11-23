/**
 * earningsMapper.ts — CashKaro `GET /users/earnings` → EarningsScreen shape.
 *
 * Confirmed shape (staging): `data` is an ARRAY of one `user` row; amounts are
 * decimal strings ("22991.60"). Fields used:
 *   total_earned · total_cashback_earned · total_rewards_earned ·
 *   confirmed/pending/paid_cashback · confirmed/pending/paid_rewards
 *   (also: payment_threshold, firstname/email — not shown here).
 */
import { formatINR, parseAmount } from '../lib/money';
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
  /** Pending cashback + pending rewards (Earnings page balance card). */
  pendingCombined: string;
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

// Strict amount parse (lib/money): "", "N/A", "1e3" are not amounts, so they
// cannot mark the response as "hasData". The minus sign is kept.
const toAmount = parseAmount;

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
    pendingCombined: money((pending ?? 0) + (pendingRewards ?? 0)),
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

/**
 * mapEarnings for the query: throws when the response has no usable amount.
 *
 * The transport returns a non-JSON 200 body (captive-portal Wi-Fi, a proxy
 * page) as plain text, and `{ data: [] }` maps to all zeros. Returning that
 * as data showed ₹0 balances as if real (cached 5 min) and made the withdraw
 * gate say "cashback not confirmed". Throwing makes the screen show its
 * error state with Try again. A plain Error gets the query client's one
 * automatic retry (an ApiError gets none); a portal page may clear by then.
 */
export function requireEarnings(res: unknown): EarningsValues {
  const mapped = mapEarnings(res);
  if (!mapped.hasData) {
    throw new Error('Earnings response had no usable amounts');
  }
  return mapped;
}

export type { EarningsValues };
