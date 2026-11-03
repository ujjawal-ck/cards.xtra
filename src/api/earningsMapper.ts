/**
 * earningsMapper.ts — CashKaro `GET /users/earnings` → EarningsScreen shape.
 *
 * Confirmed shape (staging): `data` is an ARRAY of one `user` row; amounts are
 * decimal strings ("22991.60"). Fields used:
 *   total_earned · total_cashback_earned · total_rewards_earned ·
 *   confirmed_cashback · pending_cashback   (also: paid_cashback,
 *   payment_threshold, firstname/email — not shown here).
 */
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

/** Indian digit grouping: 1234567 → "12,34,567". */
function groupIndian(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

function toAmount(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return isFinite(n) ? n : null;
}

/** "₹10,000" when whole, "₹775.60" when there are paise. */
function money(n: number): string {
  const whole = Math.trunc(n);
  const frac = Math.round((Math.abs(n) - Math.abs(whole)) * 100);
  return frac > 0
    ? `₹${groupIndian(whole)}.${String(frac).padStart(2, '0')}`
    : `₹${groupIndian(whole)}`;
}

export function mapEarnings(res: any): EarningsValues {
  // `data` is an array of one `user` row.
  const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
  const a: Record<string, unknown> = row?.attributes ?? {};

  const confirmed = toAmount(a.confirmed_cashback);
  const pending = toAmount(a.pending_cashback);
  const paid = toAmount(a.paid_cashback);
  const cashback = toAmount(a.total_cashback_earned) ?? toAmount(a.total_cashback);
  const rewards = toAmount(a.total_rewards_earned) ?? toAmount(a.total_rewards);
  const total =
    toAmount(a.total_earned) ?? ((confirmed ?? 0) + (pending ?? 0));

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
    confirmedNum: Math.round(confirmed ?? 0),
    rewardsNum: Math.round(rewards ?? 0),
    combinedNum: Math.round((confirmed ?? 0) + (rewards ?? 0)),
    hasData,
  };
}

export type { EarningsValues };
