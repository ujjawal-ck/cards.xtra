/**
 * cardMapper.ts — BankKaro CardGenius card → app CardModel.
 *
 * The catalog response (`GET /cardgenius/cards` → data[]) has ~80 fields;
 * the Home tile + CardDetailSheet only need a handful. This module pins down
 * that subset and the transforms the raw data needs:
 *
 *   - cashback badge ← `commission` (NOT a user-cashback field; product chose
 *     it). Rendered as "Flat ₹<commission> Rewards" — see INTEGRATION.md.
 *   - fees ← joining_fee_text / annual_fee_text (raw numbers like "3500"/"0").
 *   - feeType is derived (no API field): both fees 0 → lifetime-free,
 *     status:false → discontinued, else with-fees.
 *   - benefit icons ← product_usps[].tag_id mapped to local feat-* icons
 *     (the API carries no icon), with a rewards default.
 *
 * Encoding note: ₹ in API text arrives as proper UTF-8 over fetch (the
 * mojibake seen in shell probes is just terminal latin-1 decoding).
 */
import type {
  CardModel,
  CardDetail,
  CardEligibilityRow,
  CardFilterMeta,
} from '../molecules';
import type { IconName } from '../atoms';
import { cardTrackingUrl } from './cashkaro';
import type { CkRate } from './cardRates';

/** Resolved bank metadata for one bank_id (from init-bundle `bank_data`). */
export interface BankInfo {
  name: string;
  /** Logo URL from the live bank_data. Absent in the static fallback. */
  logo?: string;
}

/** bank_id → {name, logo}, built from the live init-bundle `bank_data`. */
export type BankDirectory = Record<number, BankInfo>;

// Name-only SAFETY NET for when the init-bundle `bank_data` can't be fetched
// (offline / API error). The live directory always takes precedence and is
// the ONLY source of logos — this is a fallback, not the source of truth, so
// it never needs to be kept perfectly in sync with the backend.
const FALLBACK_BANK_NAMES: Record<number, string> = {
  1: 'Axis', 2: 'IDFC', 3: 'SBI', 6: 'HDFC', 7: 'AU Small Finance Bank',
  8: 'IndusInd Bank', 9: 'Bajaj Finserv', 10: 'Standard Chartered Bank',
  11: 'American Express', 12: 'HSBC Bank', 13: 'Kotak', 14: 'ICICI Bank',
  15: 'RBL Bank', 16: 'Yes Bank', 17: 'Federal Bank', 18: 'SBM Bank',
  19: 'Bank of Baroda', 20: 'Equitas Small Finance Bank',
};

/** Raw BankKaro bank row from init-bundle `data.bank_data`. */
interface BkBank {
  id: number;
  name?: string;
  logo?: string;
}

/**
 * init-bundle response → bank_id → {name, logo}. Tolerant of a missing/null
 * response (returns {} so callers fall back to FALLBACK_BANK_NAMES, with
 * logos simply absent).
 */
export function buildBankDirectory(res: unknown): BankDirectory {
  const list = (res as { data?: { bank_data?: BkBank[] } })?.data?.bank_data;
  const dir: BankDirectory = {};
  if (Array.isArray(list)) {
    for (const b of list) {
      if (b?.id != null && b.name) {
        dir[b.id] = { name: b.name, logo: b.logo || undefined };
      }
    }
  }
  return dir;
}

/** Raw BankKaro card — only the fields we read are listed; rest passthrough. */
export interface BkCard {
  id: number;
  name: string;
  image?: string;
  card_alias?: string;
  network_url?: string;
  /** CashKaro store id (production) — maps to the CK tracking URL + reward.
   *  See cardRates.ts / cardTrackingUrl. */
  ck_store_id?: number | string;
  bank_id?: number;
  card_type?: string;
  commission?: string;
  bk_commission?: string;
  joining_fee_text?: string;
  joining_fee_comment?: string;
  annual_fee_text?: string;
  annual_fee_waiver?: string;
  annual_fee_comment?: string;
  age_criteria?: string;
  age_self_emp?: string;
  income?: string;
  income_salaried?: string;
  income_self_emp?: string;
  crif?: string;
  new_to_credit?: boolean;
  existing_customer?: boolean;
  invite_only?: boolean;
  status?: boolean;
  tags?: Array<{ id: number; name: string }>;
  product_usps?: Array<{
    header?: string;
    description?: string;
    tag_id?: number;
  }>;
  [key: string]: unknown;
}

// product_usps tag_id → feature icon. Tag ids observed live (init tags):
// 1 Fuel · 2 Shopping · 4 Lounge · 5 Food ordering · 6 Dining · 7 Grocery
// · 12 Travel · 14 Utility bills · 15 UPI. Anything else → rewards default.
const USP_TAG_ICON: Record<number, IconName> = {
  1: 'feat-fuel-outline',
  2: 'feat-discount-outline',
  4: 'feat-lounge-outline',
  5: 'feat-dining-outline',
  6: 'feat-dining-outline',
  7: 'feat-savings-outline',
  12: 'feat-travel-outline',
  14: 'feat-mobile-recharge-outline',
  15: 'feat-mobile-recharge-outline',
};
const DEFAULT_USP_ICON: IconName = 'feat-rewards-outline';

/** Indian digit grouping (last 3, then pairs): 1234567 → "12,34,567". */
function groupIndian(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/**
 * One parser for BankKaro fee text, shared by every fee display + filter.
 *
 * Previously each site stripped ALL non-digits and called Number(), so
 * "500 (waived on 1.5L spend)" became 5001.5 (shown as "₹5,002") and
 * non-numeric text like "Contact bank" became Number("") = 0 → "Free".
 * Now only a LEADING amount counts ("₹500 + GST", "Rs. 1,499"); explicit
 * "Free"/"Nil" text is free; anything else is unknown text, shown as-is and
 * never treated as free. Numbers (the API sometimes sends them) are accepted.
 */
type ParsedFee =
  | { kind: 'na' }
  | { kind: 'free' }
  | { kind: 'amount'; value: number }
  | { kind: 'text'; text: string };

const LEADING_AMOUNT = /^(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)/i;

function parseFee(raw: unknown): ParsedFee {
  if (typeof raw === 'number') {
    if (!isFinite(raw)) return { kind: 'na' };
    return raw === 0 ? { kind: 'free' } : { kind: 'amount', value: raw };
  }
  if (typeof raw !== 'string') return { kind: 'na' };
  const t = raw.trim();
  if (t === '' || t.toUpperCase() === 'N/A') return { kind: 'na' };
  const m = t.match(LEADING_AMOUNT);
  if (m) {
    const value = Number(m[1].replace(/,/g, ''));
    if (isFinite(value)) return value === 0 ? { kind: 'free' } : { kind: 'amount', value };
  }
  if (/\b(free|nil)\b/i.test(t)) return { kind: 'free' };
  return { kind: 'text', text: t };
}

/** "3500" → "₹3,500" · "0"/"Lifetime Free" → "Free" · "N/A"/empty → "—" · other text → as-is. */
function formatFee(raw?: unknown): string {
  const f = parseFee(raw);
  if (f.kind === 'na') return '—';
  if (f.kind === 'free') return 'Free';
  if (f.kind === 'text') return f.text;
  return `₹${groupIndian(f.value)}`;
}

/** True only when the fee is genuinely zero / explicitly free. */
function isZeroFee(raw?: unknown): boolean {
  return parseFee(raw).kind === 'free';
}

function deriveFeeType(bk: BkCard): CardModel['feeType'] {
  if (bk.status === false) return 'discontinued';
  if (isZeroFee(bk.joining_fee_text) && isZeroFee(bk.annual_fee_text)) {
    return 'lifetime-free';
  }
  return 'with-fees';
}

/** Commission → "₹1,400" for the cashback badge value. Empty when absent. */
function commissionValue(bk: BkCard): string {
  const raw = bk.commission || bk.bk_commission || '';
  const n = Number(String(raw).replace(/[^\d.]/g, ''));
  return isFinite(n) && n > 0 ? `₹${groupIndian(n)}` : '';
}

/** A resolved CashKaro reward → badge value, e.g. {amount:1200} → "₹1,200",
 *  {amount:5,unit:'percent'} → "5%". Empty when unusable. */
function ckRateValue(rate?: CkRate | null): string {
  if (!rate || !isFinite(rate.amount) || rate.amount <= 0) return '';
  if (rate.unit === 'percent') return `${String(parseFloat(rate.amount.toFixed(2)))}%`;
  return `₹${groupIndian(rate.amount)}`;
}

// ── CardDetailSheet body data ──────────────────────────────────────────────
const DASH = '—';
// Non-strings (numbers/booleans from the API) are not "N/A"; callers that
// need a string coerce with String(). Previously raw.trim() crashed on them.
const isNA = (raw?: unknown) =>
  raw === null ||
  raw === undefined ||
  (typeof raw === 'string' && (raw.trim() === '' || raw.trim().toUpperCase() === 'N/A'));

/**
 * Fee notes (annual_fee_waiver / joining_fee_comment) worth showing as a
 * bullet. Production data fills ~100 cards with "Not Applicable" (any case
 * or spacing) and a few with bare numbers ("720", "0"); shown alone those
 * read as noise under the fee block, so they are dropped.
 */
function isFeeNote(raw?: unknown): boolean {
  if (isNA(raw) || typeof raw !== 'string') return false;
  const t = raw.trim().replace(/\s+/g, ' ');
  if (/^not applicable$/i.test(t)) return false;
  if (/^[\d.,]+$/.test(t)) return false;
  return true;
}

/** "21-65" → "21-65Y" (age criteria), "N/A" → "—". */
function ageValue(raw?: string): string {
  return isNA(raw) ? DASH : `${String(raw).trim()}Y`;
}

/** income_salaried/self_emp are LPA figures (e.g. "3"); fall back to the
 *  monthly `income` when the per-type value is N/A. */
function incomeValue(perType?: string, monthly?: string): string {
  if (!isNA(perType)) {
    const n = Number(String(perType).replace(/[^\d.]/g, ''));
    if (isFinite(n) && n > 0) return `₹${n} LPA`;
  }
  if (!isNA(monthly)) {
    const n = Number(String(monthly).replace(/[^\d.]/g, ''));
    if (isFinite(n) && n > 0) return `₹${groupIndian(n)}/mo`;
  }
  return DASH;
}

/** CRIF/CIBIL score "750" → "750+". */
function cibilValue(raw?: string): string {
  if (isNA(raw)) return DASH;
  const n = Number(String(raw).replace(/[^\d.]/g, ''));
  return isFinite(n) && n > 0 ? `${n}+` : DASH;
}

const yesNo = (b?: boolean): string => (b === true ? 'Yes' : b === false ? 'No' : DASH);

function eligibilityRows(bk: BkCard, kind: 'salaried' | 'self'): CardEligibilityRow[] {
  const age = kind === 'salaried' ? bk.age_criteria : bk.age_self_emp;
  const income = kind === 'salaried' ? bk.income_salaried : bk.income_self_emp;
  return [
    // Age + New-to-credit icons matched to Figma 3914:64048 (sofa + bank
    // pillars). The rest are intentionally left as-is.
    { icon: 'sofa-outline', caption: 'Age', value: ageValue(age) },
    { icon: 'wallet-outline', caption: 'Income', value: incomeValue(income, bk.income) },
    { icon: 'star-outline', caption: 'CIBIL', value: cibilValue(bk.crif) },
    { icon: 'bank-pillars-outline', caption: 'New to credit allowed', value: yesNo(bk.new_to_credit) },
    { icon: 'feat-bank-outline', caption: 'Existing bank customer allowed', value: yesNo(bk.existing_customer) },
  ];
}

/** Numeric fee for filter buckets: "3500" → 3500, free/"N/A" → 0, unknown
 *  text → NaN (so it matches no ₹ range and is never counted as free). */
function feeNumber(raw?: unknown): number {
  const f = parseFee(raw);
  if (f.kind === 'amount') return f.value;
  if (f.kind === 'text') return NaN;
  return 0;
}

function buildFilterMeta(bk: BkCard, bankDir: BankDirectory): CardFilterMeta {
  const annualFeeValue = feeNumber(bk.annual_fee_text);
  const info = bk.bank_id != null ? bankDir[bk.bank_id] : undefined;
  return {
    cardAlias: bk.card_alias,
    bankId: bk.bank_id,
    // Live name from the directory; static fallback only if init-bundle was
    // unavailable for this bank_id. Logos come only from the live directory.
    bankName:
      info?.name ?? (bk.bank_id != null ? FALLBACK_BANK_NAMES[bk.bank_id] : undefined),
    bankLogo: info?.logo,
    network: (bk.card_type ?? '').trim(),
    categoryIds: (bk.tags ?? []).map((t) => t?.id).filter((id): id is number => id != null),
    annualFeeValue,
    isFree: isZeroFee(bk.annual_fee_text) && isZeroFee(bk.joining_fee_text),
  };
}

// GST on card fees is 18%. The detail sheet shows the GST-inclusive amount
// (what the bank actually charges) with the base + GST breakdown revealed
// on the info ("i") tap.
const GST_RATE = 0.18;
function feeStat(label: string, raw?: unknown): { label: string; amount: string; sub: string } {
  const f = parseFee(raw);
  if (f.kind === 'na') return { label, amount: DASH, sub: '' };
  if (f.kind === 'free') return { label, amount: 'Free', sub: '' };
  if (f.kind === 'text') return { label, amount: f.text, sub: '' };
  const base = f.value;
  const withGst = Math.round(base * (1 + GST_RATE));
  return {
    label,
    amount: `₹${groupIndian(withGst)}`,
    sub: `(₹${groupIndian(base)} + GST)`,
  };
}

function buildDetail(bk: BkCard): CardDetail {
  const bullets = [bk.annual_fee_waiver, bk.joining_fee_comment]
    .filter((b): b is string => isFeeNote(b))
    .map((b) => String(b).trim().replace(/\s+/g, ' '));
  return {
    fee: {
      annual: feeStat('Annual Fees', bk.annual_fee_text),
      joining: feeStat('Joining Fees', bk.joining_fee_text),
      bullets,
    },
    eligibilitySalaried: eligibilityRows(bk, 'salaried'),
    eligibilitySelfEmployed: eligibilityRows(bk, 'self'),
  };
}

/**
 * Pick which tile benefits to surface, category-aware.
 *
 * This mirrors what the CardGenius web team does: a card's headline points
 * reflect the SELECTED category. Pick "Fuel" → the card's fuel USP rises into
 * the tile; pick "Shopping" → its shopping USP does. The card data is
 * unchanged — only WHICH of its (up to 6) USPs surface in the 2 tile slots.
 *
 * Multi-select uses round-robin (the recommended approach): one matching USP
 * per selected category, walked in the order the user selected them, until the
 * slots fill — so two categories show one point each and the tile never
 * clutters. If the matches don't fill `max` (a selected category the card has
 * no USP for), we top up with the card's remaining USPs in their original
 * (priority) order so the tile is never under-filled.
 *
 * With no category selected, this is the old behaviour: the card's top `max`.
 */
export function selectTileBenefits<T extends { tagId?: number }>(
  benefits: T[],
  selectedTagIds: number[],
  max = 2,
): T[] {
  if (!selectedTagIds.length) return benefits.slice(0, max);

  const picked: T[] = [];
  const usedIdx = new Set<number>();

  // Round-robin: one USP per selected category, in selection order.
  for (const tagId of selectedTagIds) {
    if (picked.length >= max) break;
    const idx = benefits.findIndex((b, i) => !usedIdx.has(i) && b.tagId === tagId);
    if (idx !== -1) {
      usedIdx.add(idx);
      picked.push(benefits[idx]);
    }
  }

  // Top up with the card's remaining USPs (original priority order).
  for (let i = 0; i < benefits.length && picked.length < max; i += 1) {
    if (!usedIdx.has(i)) {
      usedIdx.add(i);
      picked.push(benefits[i]);
    }
  }

  return picked;
}

export function mapBkCardToCardModel(
  bk: BkCard,
  bankDir: BankDirectory = {},
  ckRate?: CkRate | null,
): CardModel {
  // The displayed reward is CashKaro's (e.g. SBI Cashback = ₹1200), resolved
  // from the card's ck_store_id; BankKaro's `commission` is only the fallback
  // when the card has no CashKaro store match (see cardRates.ts).
  const cashbackValue = ckRateValue(ckRate) || commissionValue(bk);
  // The organism CardTile renders the badge as "Flat <value> Rewards"; the
  // CardDetailSheet splits `cashback` on its leading word — so both stay in
  // sync when `cashback` starts with "Flat".
  const cashback = cashbackValue ? `Flat ${cashbackValue} Rewards` : 'Rewards';

  const tags = (bk.tags ?? [])
    .map((t) => t?.name)
    .filter((n): n is string => !!n)
    .slice(0, 3);

  // Each USP is ONE sentence split across `header` (bold lede, e.g.
  // "Get 5% Cashback on") and `description` (the continuation, e.g. "all online
  // spends with a capping of ₹2,000…"). They're kept SEPARATE so the tile can
  // bold the lede, but render as a continuous line — not stacked. A USP with
  // only a description promotes it to the title. `tag_id` rides along for
  // category-aware display (see selectTileBenefits); tag_id 0 = uncategorised.
  //
  // The raw data is messy: headers carry trailing tabs/spaces, descriptions
  // carry leading spaces, and the same benefit recurs with different tag_ids
  // (often a real category + a tag_id:0 duplicate). We collapse internal
  // whitespace, dedupe on the combined text, and when a duplicate carries a
  // real category we adopt it so category matching still works.
  interface UspAcc {
    icon: IconName;
    title: string;
    description?: string;
    tagId?: number;
    _h: string; // normalised header (lede), for dup detection
    _d: string; // normalised description, for dup detection
  }
  const acc: UspAcc[] = [];
  for (const u of bk.product_usps ?? []) {
    const header = (u.header ?? '').replace(/\s+/g, ' ').trim();
    const description = (u.description ?? '').replace(/\s+/g, ' ').trim();
    const title = header || description;
    if (!title) continue;
    const sub = header ? description : '';
    // tag_id 0 is "uncategorised" — treat as no category.
    const tagId = u.tag_id ? u.tag_id : undefined;
    const hLc = title.toLowerCase();
    const dLc = sub.toLowerCase();

    // A USP is a duplicate of one we kept when the lede matches AND one
    // description is a prefix of the other (identical, or just a
    // longer-worded variant — e.g. the Kiwi card's two "Flat ₹250 Cashback"
    // lines that differ only by a trailing "issued on the Kiwi App"). This
    // does NOT merge genuinely-distinct benefits that share a lede but have
    // divergent descriptions (e.g. SBI's "Get 5% Cashback on" [all online]
    // vs [Blinkit…]).
    const dup = acc.find(
      (e) => e._h === hLc && (e._d === dLc || e._d.startsWith(dLc) || dLc.startsWith(e._d)),
    );
    if (dup) {
      // Keep the more concise phrasing (how CardGenius shows it)…
      if (sub.length < dup._d.length) {
        dup.title = title;
        dup.description = sub || undefined;
        dup._d = dLc;
      }
      // …and adopt a real category from whichever variant carries one.
      if (dup.tagId == null && tagId != null) dup.tagId = tagId;
      dup.icon = USP_TAG_ICON[dup.tagId ?? -1] ?? dup.icon;
      continue;
    }
    acc.push({
      icon: USP_TAG_ICON[tagId ?? -1] ?? DEFAULT_USP_ICON,
      title,
      description: sub || undefined,
      tagId,
      _h: hLc,
      _d: dLc,
    });
    if (acc.length >= 6) break;
  }
  const tileBenefits = acc.map(({ _h, _d, ...b }) => b);

  return {
    id: String(bk.id),
    name: bk.name,
    shortName: (bk.name ?? '').split(' ')[0].toUpperCase().slice(0, 5),
    placeholderColor: 'cobalt',
    cardImage: { uri: bk.image || '' },
    cashback,
    cashbackValue,
    feeType: deriveFeeType(bk),
    tags,
    benefits: [], // legacy emoji list — unused by the organism tile / detail
    tileBenefits,
    joiningFee: formatFee(bk.joining_fee_text),
    annualFee: formatFee(bk.annual_fee_text),
    inviteOnly: !!bk.invite_only,
    detail: buildDetail(bk),
    filterMeta: buildFilterMeta(bk, bankDir),
    cashkaroStoreId: bk.ck_store_id != null ? Number(bk.ck_store_id) : undefined,
    // "Apply Now" routes through CashKaro for attribution: the
    // `…/visitretailer/app/<ck_store_id>?id=` tracker (the empty id= slot is the
    // user id, filled at click via withTrackingUser). Falls back to BankKaro's
    // network_url (placeholders stripped, trimmed) when there's no store id.
    applyUrl:
      cardTrackingUrl(bk.ck_store_id) ??
      (bk.network_url
        ? bk.network_url.replace(/\{[^}]*\}/g, '').trim() || undefined
        : undefined),
  };
}
