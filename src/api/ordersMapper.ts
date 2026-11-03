/**
 * ordersMapper.ts — CashKaro `/users/orders` (list) + `/users/orders/:id`
 * (detail) → the OrdersList / OrdersDetail screen shapes.
 *
 * Confirmed shapes (staging, live probe 2026-06-04):
 *
 * LIST  GET /users/orders?page[size]=N  → JSON:API
 *   meta { total_records, page_number, page_size }
 *   data[] { type:"myorder", id, attributes:{
 *     merchant_image_url, bonus_type|null, cashback_type ("Cashback"|"Rewards"
 *     |"Bonus"|"Referral"), order_id (string, may be ""), cashback_amount
 *     (decimal string "684.50"), cashback_status ("Pending"|"Requested"|
 *     "Confirmed"|"Paid"|"Cancelled"), referral_name|null, currency,
 *     comments|null, groupid } }
 *
 * DETAIL GET /users/orders/:id → JSON:API
 *   data { type:"orderdetails", id, attributes:{
 *     order_amount, merchant_name, report_merchant_name, cashback_type,
 *     cashback_amount, cashback_status, order_id, transaction_date (ISO),
 *     pending_date, confirm_date, paid_date, cancelled_date,
 *     expected_confirmation_date, orig_expected_confirmation_date,
 *     is_delayed ("yes"/"no"), merchant_image_url, bonus_type|null,
 *     referral_name|null, *_comments, raisequery, ... },
 *     relationships:{ configurations (raisequery Q&A), ticket } }
 *
 * Notes:
 *   • merchant_image_url is sometimes ".../no-image.jpg" — treated as absent.
 *   • Money strings are decimal ("684.50"); formatted to "₹684.5" / "₹4,563".
 *   • The OrderRow `type` drives both the meta line ("Order ID:"/"Bonus Type:"
 *     /"Referral Name:") and the badge variant (referral → Tag, else Status).
 */
import type { ImageSourcePropType } from 'react-native';
import type { OrderRowType, OrderRowBadgeVariant, TimelineStep } from '../organisms';
import type { StatusBadgeStatus } from '../atoms';
import type { ToneName } from '../tokens';
import { images } from '../assets/images';

// Timeline status key (a subset of StatusBadgeStatus the detail visuals cover).
export type OrderStatusKey = 'pending' | 'delayed' | 'cancelled' | 'confirmed' | 'paid';

export interface OrderListRow {
  id: string;
  type: OrderRowType;
  badgeVariant: OrderRowBadgeVariant;
  status?: StatusBadgeStatus;
  tagLabel?: string;
  tagTone?: ToneName;
  amount: string;
  showAmountChevron: boolean;
  metaLabel: string;
  metaValue: string;
  note?: { text: string; expandable: boolean };
  logoSrc: ImageSourcePropType;
  /** Display name of the store this order is from. Empty when the list
   *  payload exposes neither a merchant name nor a parseable logo slug. */
  merchantName: string;
  /** Stable grouping key for the Store filter (logo URL → falls back to
   *  the name, then the record id). Same store ⇒ same key. */
  merchantKey: string;
}

export interface OrderDetailModel {
  id: string;
  /** Masthead headline (cashback/bonus amount). */
  amount: string;
  /** Brand logo for the masthead; undefined → caller's fallback. */
  brandLogoUri?: string;
  /** Drives Masthead background wash + badge tone. */
  tone: StatusBadgeStatus;
  /** Explicit badge copy, e.g. "Cashback Pending" / "Bonus Confirmed". */
  statusLabel: string;
  /** Footer line under the amount, e.g. "Expected by Jun 6, 2026". */
  expectedText: string;
  /** Order-summary rows. */
  orderAmount: string;
  orderId: string;
  transactionDate: string;
  /** Cashback-journey timeline. */
  steps: TimelineStep[];
}

// ── helpers ────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

/** Indian digit grouping: 1234567 → "12,34,567". */
function groupIndian(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/** Decimal string → "₹684.5" (drops trailing zero paise, keeps real paise). */
function money(v: unknown): string {
  const n = Number(str(v).replace(/[^\d.-]/g, ''));
  if (!isFinite(n)) return '₹0';
  const whole = Math.trunc(n);
  const paise = Math.round((Math.abs(n) - Math.abs(whole)) * 100);
  if (paise === 0) return `₹${groupIndian(whole)}`;
  // Trim a trailing zero so "684.50" → "₹684.5" (matches earnings styling).
  const frac = paise % 10 === 0 ? String(paise / 10) : String(paise).padStart(2, '0');
  return `₹${groupIndian(whole)}.${frac}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO → "Jun 6, 2026" (timeline / expected-text). Empty on bad/missing input. */
function longDate(iso: unknown): string {
  const s = str(iso);
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** ISO → "16-02-2026" (order-summary value). Empty on bad/missing input. */
function shortDate(iso: unknown): string {
  const s = str(iso);
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/** "no-image.jpg" placeholders count as no logo. */
function logoFromUrl(url: unknown): ImageSourcePropType {
  const s = str(url);
  if (!s || /no-image/i.test(s)) return images.logos.darkSmall;
  return { uri: s };
}

/**
 * Best-effort store name from a logo URL filename (e.g.
 * ".../stores/amazon-india.png" → "Amazon India"). Returns '' for
 * placeholder/hash-like filenames so we never surface garbage labels.
 * Only used as a fallback when the payload carries no merchant name.
 */
function nameFromLogo(url: unknown): string {
  const s = str(url);
  if (!s || /no-image/i.test(s)) return '';
  const file = (s.split('?')[0].split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '');
  // Reject hash-like names (long hex / no letters) — not human-readable.
  if (!file || /^[0-9a-f]{12,}$/i.test(file) || !/[a-z]/i.test(file)) return '';
  return file
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** cashback_type (+ referral/bonus hints) → OrderRow type. */
function rowType(attrs: Record<string, unknown>): OrderRowType {
  const t = str(attrs.cashback_type).toLowerCase();
  if (t === 'rewards') return 'rewards';
  if (t === 'bonus') return 'bonus';
  if (t === 'referral') return 'referral';
  if (t === 'cashback') return 'cashback';
  // Fallbacks when cashback_type is unexpected.
  if (str(attrs.referral_name)) return 'referral';
  if (str(attrs.bonus_type)) return 'bonus';
  return 'cashback';
}

/** API cashback_status → StatusBadge status (delayed wins when is_delayed). */
function badgeStatus(status: unknown, isDelayed: boolean): StatusBadgeStatus {
  const s = str(status).toLowerCase();
  if (isDelayed && (s === 'pending' || s === 'requested')) return 'delayed';
  switch (s) {
    case 'pending':
      return 'pending';
    case 'requested':
      return 'requested';
    case 'confirmed':
      return 'confirmed';
    case 'paid':
      return 'paid';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'delayed':
      return 'delayed';
    case 'expired':
      return 'expired';
    default:
      return 'pending';
  }
}

/** Word shown in the type-led copy ("Cashback"/"Rewards"/"Bonus"/"Referral"). */
const TYPE_WORD: Record<OrderRowType, string> = {
  cashback: 'Cashback',
  rewards: 'Rewards',
  referral: 'Referral',
  bonus: 'Bonus',
};

const META_LABEL: Record<OrderRowType, string> = {
  cashback: 'Order ID:',
  rewards: 'Order ID:',
  referral: 'Referral Name:',
  bonus: 'Bonus Type:',
};

// ── list ─────────────────────────────────────────────────────────────────

export function mapOrders(res: any): OrderListRow[] {
  const rows: any[] = Array.isArray(res?.data) ? res.data : [];
  return rows.map((row) => {
    const a: Record<string, unknown> = row?.attributes ?? {};
    const type = rowType(a);
    const isDelayed = str(a.is_delayed).toLowerCase() === 'yes';
    const isReferral = type === 'referral';

    const metaValue =
      type === 'referral'
        ? str(a.referral_name)
        : type === 'bonus'
          ? str(a.bonus_type)
          : str(a.order_id);

    const comments = str(a.comments);

    // Store identity. The list payload (probed) carries no merchant name —
    // only merchant_image_url — so we read a name defensively (in case the
    // live API does include one) and fall back to a logo-derived slug.
    const merchantName =
      str(a.merchant_name) ||
      str(a.report_merchant_name) ||
      str(a.store_name) ||
      nameFromLogo(a.merchant_image_url);
    const merchantKey = str(a.merchant_image_url) || merchantName || str(row?.id);

    return {
      id: str(row?.id),
      type,
      badgeVariant: isReferral ? 'tag' : 'status',
      status: badgeStatus(a.cashback_status, isDelayed),
      tagLabel: isReferral ? 'Referral' : undefined,
      tagTone: isReferral ? 'success' : undefined,
      amount: money(a.cashback_amount),
      // Referrals have no order detail page (no order_id); everything else does.
      showAmountChevron: !isReferral,
      metaLabel: META_LABEL[type],
      metaValue: metaValue || '—',
      note: comments ? { text: comments, expandable: true } : undefined,
      logoSrc: logoFromUrl(a.merchant_image_url),
      merchantName,
      merchantKey,
    };
  });
}

// ── detail ─────────────────────────────────────────────────────────────────

const STEP_PLACED_ICON = 'cart-filled' as const;
const STEP_TRACKED_ICON = 'check-circle-outline' as const;

/** Footer "expected/confirmed/paid on …" line per status. */
function expectedLine(statusKey: OrderStatusKey, a: Record<string, unknown>): string {
  const exp = longDate(a.expected_confirmation_date);
  switch (statusKey) {
    case 'confirmed': {
      const d = longDate(a.confirm_date);
      return d ? `Confirmed on ${d}` : 'Cashback confirmed';
    }
    case 'paid': {
      const d = longDate(a.paid_date);
      return d ? `Paid on ${d}` : 'Cashback paid';
    }
    case 'cancelled': {
      const d = longDate(a.cancelled_date);
      return d ? `Cancelled on ${d}` : 'Cashback cancelled';
    }
    case 'delayed':
      return exp ? `Now Expected by ${exp}` : 'Confirmation delayed';
    default:
      return exp ? `Expected by ${exp}` : 'Confirmation pending';
  }
}

/** Build the cashback-journey timeline from real dates + status. */
function buildSteps(statusKey: OrderStatusKey, a: Record<string, unknown>): TimelineStep[] {
  const placedDate = longDate(a.transaction_date);
  const trackedDate = longDate(a.pending_date) || placedDate;

  const placed: TimelineStep = {
    iconName: STEP_PLACED_ICON,
    title: 'Order placed',
    date: placedDate,
    fill: 'soft',
    tone: 'success',
  };
  const tracked: TimelineStep = {
    iconName: STEP_TRACKED_ICON,
    title: 'Cashback tracked',
    date: trackedDate,
    fill: 'soft',
    tone: 'success',
  };

  const expDate = longDate(a.expected_confirmation_date);

  switch (statusKey) {
    case 'confirmed':
      return [
        placed,
        tracked,
        { iconName: 'check-filled', title: 'Cashback confirmed', date: longDate(a.confirm_date) || expDate, fill: 'solid', tone: 'success' },
      ];
    case 'paid':
      return [
        placed,
        tracked,
        { iconName: 'check-filled', title: 'Cashback confirmed', date: longDate(a.confirm_date) || expDate, fill: 'soft', tone: 'success' },
        { iconName: 'wallet-outline', title: 'Cashback paid', date: longDate(a.paid_date) || expDate, fill: 'solid', tone: 'success' },
      ];
    case 'cancelled':
      return [
        placed,
        tracked,
        { iconName: 'desc-cross', title: 'Cashback cancelled', date: longDate(a.cancelled_date) || expDate, fill: 'solid', tone: 'error' },
      ];
    case 'delayed':
      // Timeline has no orange tone; warning (amber) is the closest available.
      return [
        placed,
        tracked,
        { iconName: 'clock-filled', title: 'Confirmation delayed', date: expDate, fill: 'solid', tone: 'warning' },
      ];
    default: // pending / requested
      return [
        placed,
        tracked,
        { iconName: 'clock-filled', title: 'Confirmation pending', date: expDate, fill: 'solid', tone: 'warning' },
      ];
  }
}

export function mapOrderDetail(res: any): OrderDetailModel {
  const row = res?.data;
  const a: Record<string, unknown> = row?.attributes ?? {};
  const type = rowType(a);
  const isDelayed = str(a.is_delayed).toLowerCase() === 'yes';
  const tone = badgeStatus(a.cashback_status, isDelayed);

  // Timeline key is a subset of the badge tone (requested folds into pending).
  const statusKey: OrderStatusKey =
    tone === 'delayed' ? 'delayed'
    : tone === 'confirmed' ? 'confirmed'
    : tone === 'paid' ? 'paid'
    : tone === 'cancelled' ? 'cancelled'
    : 'pending';

  const statusWord =
    tone === 'delayed' ? 'Delayed'
    : tone.charAt(0).toUpperCase() + tone.slice(1);

  const merchantLogo = str(a.merchant_image_url);

  return {
    id: str(row?.id),
    amount: money(a.cashback_amount),
    brandLogoUri: merchantLogo && !/no-image/i.test(merchantLogo) ? merchantLogo : undefined,
    tone,
    statusLabel: `${TYPE_WORD[type]} ${statusWord}`,
    expectedText: expectedLine(statusKey, a),
    orderAmount: money(a.order_amount),
    orderId: str(a.order_id) || '—',
    transactionDate: shortDate(a.transaction_date) || '—',
    steps: buildSteps(statusKey, a),
  };
}
