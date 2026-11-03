/**
 * missingCashbackMapper.ts — flow rules + transforms for the Missing Cashback
 * claim flow. Centralizes the group-branching logic (ported verbatim from the
 * web prototype) and maps the JSON:API responses to the screen view-models, so
 * the screens stay thin.
 *
 * Groups drive the flow:
 *   A / B2 → order id + amount → done
 *   B1     → + New/Existing user (PUT user_type)
 *   C1     → + category select (PUT category); "Other Category" → invoice → ticket
 *   C2     → + invoice upload → ticket (always)
 *   D      → no order amount (submit "0")
 */
import type { ImageSourcePropType } from 'react-native';
import { images } from '../assets/images';
import type { McRetailer, McExitClick, McExitMeta, McClaim, McQueueResponse } from './missingCashback';

// ── Group rules ──────────────────────────────────────────────────────────

export type McGroup = 'A' | 'B1' | 'B2' | 'C1' | 'C2' | 'D' | string;

/** Group D claims skip the order-amount step (submitted with amount "0"). */
export function groupRequiresOrderAmount(group: McGroup): boolean {
  return group !== 'D';
}

/** B1/C1/C2 collect extra info AFTER the queue submit returns Pending. */
export function groupRequiresAdditionalDetails(group: McGroup): boolean {
  return group === 'B1' || group === 'C1' || group === 'C2';
}

// C1 category options (Amazon-style). "Other Category" → invoice upload.
export const CATEGORY_OPTIONS_C1 = [
  { label: 'Mobile Recharge', value: 'Mobile Recharge', description: 'Select this if you recharged your mobile or DTH' },
  {
    label: 'Add money/Gift Cards/Travel/Insurance',
    value: 'No Cashback',
    description: 'These categories are not eligible for cashback',
  },
  { label: 'All other categories', value: 'Other Category', description: 'Select this for all other product categories' },
] as const;

export const USER_TYPE_OPTIONS = [
  { label: "Yes, I am a New User", value: 'New' },
  { label: 'No, I am an Existing User', value: 'Existing' },
] as const;

// ── Submit-outcome branch ──────────────────────────────────────────────────

export type SubmitOutcome =
  | { kind: 'tracked'; cashbackId: number; cashbackValue?: string; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'collect'; group: 'B1' | 'C1' | 'C2' };

/**
 * Decide what happens after POST /queue (or PUT /queue) returns. Mirrors the
 * prototype's handleSubmitClaimDirect branch order exactly:
 *   1. cashback_id present       → cashback found ("tracked!")
 *   2. status === "Resolved"     → success
 *   3. under_tracking === "yes"  → success (auto-tracking)
 *   4. status === "Pending" + B1/C1/C2 → collect additional details
 *   5. otherwise                 → generic "added to queue" success
 */
export function decideSubmitOutcome(res: McQueueResponse | null | undefined, group: McGroup): SubmitOutcome {
  const meta = res?.meta || {};
  if (meta.cashback_id) {
    return {
      kind: 'tracked',
      cashbackId: meta.cashback_id,
      cashbackValue: meta.cashbackvalue,
      message: meta.cashbackvalue
        ? `Hurray! Cashback of ₹${meta.cashbackvalue} has been tracked.`
        : 'Hurray! Your cashback has been tracked.',
    };
  }
  if (meta.status === 'Resolved') {
    return { kind: 'success', message: 'Your missing cashback claim has been processed.' };
  }
  if (meta.under_tracking === 'yes') {
    return { kind: 'success', message: "Your claim is under auto-tracking. We'll update you once it's processed." };
  }
  if (meta.status === 'Pending' && groupRequiresAdditionalDetails(group)) {
    return { kind: 'collect', group: group as 'B1' | 'C1' | 'C2' };
  }
  return { kind: 'success', message: 'Your missing cashback claim has been added to the queue.' };
}

// ── Order-id format validation ──────────────────────────────────────────────

/**
 * Validate a typed order id against the meta.orderid_format map (values are
 * "/pattern/flags" strings). No format map → always valid.
 */
export function isOrderIdValid(value: string, formatMap?: Record<string, string>): boolean {
  if (!formatMap || Object.keys(formatMap).length === 0) return true;
  for (const regexStr of Object.values(formatMap)) {
    const m = regexStr.match(/^\/(.+)\/([gimsuy]*)$/);
    if (!m) continue;
    try {
      if (new RegExp(m[1], m[2]).test(value)) return true;
    } catch {
      /* skip bad pattern */
    }
  }
  return false;
}

// ── tracking-speed → ms (for claim countdown) ───────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseTrackingSpeed(speed?: string): number {
  if (!speed) return 30 * DAY_MS;
  const s = speed.toLowerCase();
  let ms = 0;
  const d = s.match(/(\d+)\s*d/);
  if (d) ms += parseInt(d[1], 10) * DAY_MS;
  const h = s.match(/(\d+)\s*h/);
  if (h) ms += parseInt(h[1], 10) * 60 * 60 * 1000;
  const min = s.match(/(\d+)\s*m(?!s)/);
  if (min) ms += parseInt(min[1], 10) * 60 * 1000;
  return ms > 0 ? ms : 30 * DAY_MS;
}

// ── helpers ────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

function logo(url?: string): ImageSourcePropType {
  let s = str(url).trim();
  if (!s || /no-image/i.test(s)) return images.logos.darkSmall;
  // Normalise URLs that Android's <Image> refuses to load: protocol-relative
  // (`//cdn/x.png`) and cleartext `http://` (blocked by default on Android).
  if (s.startsWith('//')) s = `https:${s}`;
  else if (/^http:\/\//i.test(s)) s = s.replace(/^http:\/\//i, 'https://');
  return { uri: s };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ── retailers → "Where did you shop?" rows ──────────────────────────────────

export interface RetailerRow {
  storeId: string;
  name: string;
  logo: ImageSourcePropType;
  group: McGroup;
  trackingSpeed: string;
  /** "Track within 48h" — shown right-aligned. */
  trackLabel: string;
}

function retailerId(r: McRetailer): string {
  return str(r.attributes.store_id) || str(r.id);
}

export function mapRetailers(res: { data?: McRetailer[] }): RetailerRow[] {
  return (res.data || []).map((r) => {
    const speed = r.attributes.tracking_speed || '72h';
    return {
      storeId: retailerId(r),
      name: r.attributes.store_name || r.attributes.report_merchant_name || 'Unknown Store',
      logo: logo(r.attributes.store_logo || r.attributes.image_url),
      group: r.attributes.group || 'A',
      trackingSpeed: speed,
      trackLabel: `Track within ${speed.replace(/\s+/g, '')}`,
    };
  });
}

// ── exit clicks → month/day picker ──────────────────────────────────────────

export interface ExitDateOption {
  /** The exitclick_date to send to the API (raw ISO/date string). */
  exitDate: string;
  /** exit_id for the ticket step (falls back to the row id). */
  exitId: string;
  /** "05" — day-of-month for the chip. */
  day: string;
}

export interface ExitMonthGroup {
  /** "April" */
  label: string;
  /** month index 0-11 (sort key) + year so labels are unique. */
  key: string;
  dates: ExitDateOption[];
}

/** Group the visit dates by month so ChooseDate can show month + day wheels. */
export function mapExitClicks(res: { data?: McExitClick[] }): ExitMonthGroup[] {
  const groups = new Map<string, ExitMonthGroup>();
  for (const c of res.data || []) {
    const raw = c.attributes.exitclick_date || c.attributes.exit_date || '';
    if (!raw) continue;
    const d = new Date(raw);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups.has(key)) {
      groups.set(key, { key, label: MONTHS[d.getMonth()], dates: [] });
    }
    groups.get(key)!.dates.push({
      exitDate: raw,
      exitId: c.attributes.exit_id || str(c.id),
      day: String(d.getDate()).padStart(2, '0'),
    });
  }
  // Sort months chronologically; days ascending within each.
  return [...groups.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((g) => ({ ...g, dates: g.dates.sort((a, b) => a.day.localeCompare(b.day)) }));
}

export function mapExitMeta(res: { meta?: McExitMeta }): McExitMeta {
  return res.meta || {};
}

// ── claims → HelpTicketCard view-models ─────────────────────────────────────

export type ClaimCardStatus = 'in-review' | 'need-details' | 'tracked' | 'under-review';

export interface ClaimCard {
  queueId: string;
  group: McGroup;
  status: ClaimCardStatus;
  brandLogo: ImageSourcePropType;
  /** Store display name — used to seed a resume draft from a need-details CTA. */
  storeName: string;
  /** Brand logo URL (for the resume draft); undefined when only a fallback. */
  storeLogoUri?: string;
  title: string;
  orderId: string;
  orderAmount: string;
  /** Tracked claims carry the cashback/order id for "View Details". */
  cashbackId?: number;
  /** "HH:MM" remaining, in-review only (static fallback). */
  timer?: string;
  /** Epoch-ms resolution target for the LIVE in-review countdown. */
  timerTarget?: number;
  /** Ticket reference (under-review cards) — rendered as "Ticket ID: …". */
  ticketId?: string;
  /** "9th Jun '26" — under-review cards show "Expect update by <date>". */
  expectByDate?: string;
  /** CTA label for need-details/tracked cards. */
  ctaLabel?: string;
}

export const STATUS_TAB_TO_API: Record<'In Review' | 'Closed' | 'Others', 'Pending' | 'Resolved' | 'Rejected'> = {
  'In Review': 'Pending',
  Closed: 'Resolved',
  Others: 'Rejected',
};

function claimStoreName(c: McClaim): string {
  const a = c.attributes;
  return a.report_storename || a.store_name || a.merchant_name || 'Unknown Store';
}

// Per-group tracking-speed fallback (hours) when the claim carries no
// explicit resolution date — matches the prototype's getTrackingTargetDate.
function groupFallbackMs(group: McGroup): number {
  switch (group) {
    case 'B1':
    case 'B2':
      return 48 * 60 * 60 * 1000;
    case 'C1':
    case 'C2':
      return 36 * 60 * 60 * 1000;
    default: // A, D, unknown
      return 72 * 60 * 60 * 1000;
  }
}

function trackingTargetMs(c: McClaim): number | null {
  const a = c.attributes;
  if (a.expected_resolution_date) {
    const t = new Date(a.expected_resolution_date).getTime();
    return isNaN(t) ? null : t;
  }
  if (a.under_tracking === 'yes' && a.status_update) {
    const t = new Date(a.status_update).getTime();
    return isNaN(t) ? null : t;
  }
  if (!a.click_date) return null;
  const click = new Date(a.click_date).getTime();
  if (isNaN(click)) return null;
  return click + groupFallbackMs(a.groupid || '');
}

function isUnderTracking(c: McClaim, now: number): boolean {
  if (c.attributes.under_tracking === 'yes') return true;
  if (c.attributes.under_tracking === 'no') return false;
  const target = trackingTargetMs(c);
  return target != null && target > now;
}

/** B1/C1/C2 claims awaiting user input (per `details` copy). */
function needsAdditionalDetails(c: McClaim, now: number): boolean {
  const group = c.attributes.groupid || '';
  if (!groupRequiresAdditionalDetails(group)) return false;
  if (isUnderTracking(c, now)) return false;
  const details = (c.attributes.details || '').toLowerCase();
  return ['waiting', 'additional', 'user', 'invoice'].some((k) => details.includes(k));
}

function remainingHHMM(target: number | null, now: number): string | undefined {
  if (target == null) return undefined;
  const diff = target - now;
  if (diff <= 0) return undefined;
  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hh = Math.floor((totalMin % (60 * 24)) / 60);
  const mm = totalMin % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return days > 0 ? `${days}d ${pad(hh)}:${pad(mm)}` : `${pad(hh)}:${pad(mm)}`;
}

/**
 * Map one claim to a HelpTicketCard model. `now` is passed in (don't call
 * Date.now() at module scope) so the same render is deterministic.
 */
export function mapClaimToCard(c: McClaim, now: number): ClaimCard {
  const a = c.attributes;
  const group = a.groupid || '';
  const tracked = !!a.cashback_id || (a.status || '').toLowerCase() === 'resolved';
  const needDetails = needsAdditionalDetails(c, now);

  let status: ClaimCardStatus;
  let title: string;
  let ctaLabel: string | undefined;
  let timer: string | undefined;
  let ticketId: string | undefined;
  let expectByDate: string | undefined;

  if (isTicketClaim(c)) {
    // A raised ticket still under review — informational card, no CTA.
    status = 'under-review';
    title = 'Your missing ticket is currently under review.';
    ticketId = String(a.ticket_id);
    expectByDate = formatExpectBy(a.expected_resolution_date || a.status_update);
  } else if (tracked) {
    status = 'tracked';
    const val = a.cashbackvalue || a.missing_txn_cashback;
    title = val ? `Hurray! Cashback of ₹${val} is added to your account.` : 'Hurray! Your cashback has been tracked.';
    ctaLabel = 'View Details';
  } else if (needDetails) {
    status = 'need-details';
    title = group === 'B1' ? 'We need a few more details to track your cashback.' : 'We need more details to track your cashback.';
    // B1 collects a detail; C1/C2 need an invoice screenshot.
    ctaLabel = group === 'B1' ? 'Add Details' : 'Upload Screenshot';
  } else {
    status = 'in-review';
    title = `Your ${claimStoreName(c)} cashback is under review.`;
    timer = remainingHHMM(trackingTargetMs(c), now);
  }

  const logoUrl = a.imageurl || a.image_url;
  const target = trackingTargetMs(c);
  return {
    queueId: str(c.id),
    group,
    status,
    brandLogo: logo(logoUrl),
    storeName: claimStoreName(c),
    storeLogoUri: logoUrl && !/no-image/i.test(logoUrl) ? logoUrl : undefined,
    title,
    orderId: a.order_id || '—',
    orderAmount: a.order_amount || '0',
    cashbackId: a.cashback_id,
    timer,
    // Live countdown only while the target is still in the future.
    timerTarget: status === 'in-review' && target != null && target > now ? target : undefined,
    ticketId,
    expectByDate,
    ctaLabel,
  };
}

/**
 * A claim is a missing-cashback TICKET once it has a ticket id but no cashback
 * tracked yet. In the tracking tabs (In Review / Closed) it renders as an
 * informational "under review" card (no CTA); it ALSO surfaces in the "Others"
 * tab as a flat detail row (mirrors staging, where the same ticket shows in
 * both places).
 */
export function isTicketClaim(c: McClaim): boolean {
  return !!c.attributes.ticket_id && !c.attributes.cashback_id;
}

export function mapClaims(res: { data?: McClaim[] }, now: number): ClaimCard[] {
  return (res.data || []).map((c) => mapClaimToCard(c, now));
}

// ── "Others" (Rejected/closed-out) claims — a flat detail card, not a
// tracking ticket (Figma 4129:23763 + summary sheet 4129:23775). ─────────────

/** StatusBadge tones we map arbitrary API status strings onto. */
export type OthersStatusTone = 'confirmed' | 'delayed' | 'cancelled' | 'paid' | 'pending';

export interface OthersClaimCard {
  ticketId: string;
  retailer: string;
  /** "04 Jun 2026" — when the claim was raised. */
  date: string;
  orderAmount: string;
  /** order_id — shown as "Transaction reference" / "Details" in the summary. */
  orderReference: string;
  /** "04 Jun 2026" — last status change. */
  statusUpdateDate: string;
  statusLabel: string;
  statusTone: OthersStatusTone;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Parse a date-ish string to {day, month(0-11), year}, or null. ISO-first to dodge timezone shifts. */
function dateParts(s?: string): { day: number; month: number; year: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { year: parseInt(iso[1], 10), month: parseInt(iso[2], 10) - 1, day: parseInt(iso[3], 10) };
  const dmy = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmy) return { day: parseInt(dmy[1], 10), month: parseInt(dmy[2], 10) - 1, year: parseInt(dmy[3], 10) };
  const t = new Date(s).getTime();
  if (isNaN(t)) return null;
  const d = new Date(t);
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() };
}

/** "9th Jun '26" — the under-review "Expect update by" chip. */
function formatExpectBy(s?: string): string {
  const p = dateParts(s);
  if (!p) return s || '—';
  return `${ordinal(p.day)} ${MONTHS_SHORT[p.month] ?? ''} '${String(p.year).slice(-2)}`;
}

/** "04 Jun 2026" — Others rows + summary sheet. */
function formatDayMonth(s?: string): string {
  const p = dateParts(s);
  if (!p) return s || '—';
  return `${String(p.day).padStart(2, '0')} ${MONTHS_SHORT[p.month] ?? ''} ${p.year}`;
}

function othersStatusTone(status: string): OthersStatusTone {
  const s = (status || '').toLowerCase();
  if (s.includes('confirm')) return 'confirmed';
  if (s.includes('paid')) return 'paid';
  if (s.includes('receiv')) return 'delayed'; // orange dot (matches staging)
  if (s.includes('reject') || s.includes('cancel') || s.includes('declin')) return 'cancelled';
  return 'pending';
}

export function mapOthersClaim(c: McClaim): OthersClaimCard {
  const a = c.attributes;
  const amount = a.order_amount || '0';
  // The TICKET status ("Received" → orange) is what staging shows here — not
  // the queue status (Pending/Resolved/Rejected) that bucketed the fetch.
  const ticketStatus = a.ticket_status || a.status || 'Received';
  return {
    ticketId: a.ticket_id || String(c.id),
    retailer: claimStoreName(c),
    date: formatDayMonth(a.click_date || a.status_update),
    orderAmount: amount.startsWith('₹') ? amount : `₹${amount}`,
    orderReference: a.order_id || '—',
    // Staging shows the raise date here (no later status change yet); the API's
    // status_update can carry the future "expect update by" date, so don't use it.
    statusUpdateDate: formatDayMonth(a.click_date || a.status_update),
    statusLabel: ticketStatus,
    statusTone: othersStatusTone(ticketStatus),
  };
}

/** The "Others" tab lists raised tickets (those with a Ticket ID) as flat rows. */
export function mapOthersClaims(res: { data?: McClaim[] }): OthersClaimCard[] {
  return (res.data || []).filter(isTicketClaim).map(mapOthersClaim);
}
