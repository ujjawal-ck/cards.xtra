/**
 * offersMapper.ts — CashKaro offers (JSON:API) → app shapes.
 *
 * Two consumers:
 *   - OffersScreen grid: a category's stores → { slug, name, image, ctaLabel }.
 *   - OffersBrandAmazon: a single store → { name, logo, banner, cashback, ... }.
 *
 * Cashback comes as `{ payment_type: 'percent'|'flat'|'currency', amount:
 * '5.20' }` ('flat' and 'currency' are both rupees, see isRupeeCashback). We
 * format it into the "Shop & Earn upto X" CTA the tile already uses.
 */

/**
 * Rewrite a CashKaro asset host to the public CDN.
 *
 * The staging offers API returns store images on `asset11.ckassets.com`, an
 * S3 bucket that is locked down (every request 403s with AccessDenied), so the
 * tiles render blank. The live site serves the IDENTICAL paths from the public
 * `asset21.ckassets.com` CDN (verified 200 for staging-only stores too). This
 * is a client-side host swap only — no API / backend change. Any `assetNN`
 * host is normalised to the public one; non-ckassets URLs pass through.
 */
const PUBLIC_ASSET_HOST = 'asset21.ckassets.com';
function publicAssetUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/asset\d+\.ckassets\.com/i, PUBLIC_ASSET_HOST);
}

interface OfferCashback {
  payment_type?: string;
  amount?: string;
  details?: string;
  strike_out_value?: number;
}

/**
 * True when a cashback row is in rupees, not a percent.
 *
 * CashKaro sends a rupee cashback as `payment_type: 'currency'` (with
 * `currency: 'INR'`, see the `outzidr-coupons` row in
 * `__fixtures__/staging.offer_store.json`); older rows use `'flat'`. Checking
 * only 'flat' showed a "₹X" cashback as "X%". Do not key on `currency`:
 * nothing says a percent row never carries it. Shared with cardRates.
 */
export function isRupeeCashback(cb?: { payment_type?: string | null } | null): boolean {
  const t = String(cb?.payment_type ?? '').trim().toLowerCase();
  return t === 'flat' || t === 'currency';
}

/** "5.2%" or "₹500" for a rate amount, in the row's unit. */
function rateUnitText(cb: OfferCashback | undefined, amount: number): string {
  // Trim a trailing ".0"/".00" so "5.00" → "5", but keep "5.20" → "5.2".
  const pretty = String(parseFloat(amount.toFixed(2)));
  return isRupeeCashback(cb) ? `₹${pretty}` : `${pretty}%`;
}

/** CTA for a store with no rate amount (amount 0 or missing). */
const NO_RATE_CTA = 'Shop & Earn Cashback';

/**
 * "Shop & Earn Flat 80%" / "Shop & Earn Upto 5.2%" / "Shop & Earn Flat ₹500".
 * Flat-vs-Upto is decided SOLELY by whether the store has category-wise
 * secondary rates: secondaryCount > 0 → the headline is the MAX of several
 * rates → "Upto"; otherwise the single headline rate is guaranteed → "Flat".
 * `cashback_type` ('Rewards' vs 'Cashback') is NOT used here — a Rewards store
 * with no secondary rates is still a single flat rate. `payment_type` only
 * decides the UNIT (₹ vs %), NOT the Flat/Upto word.
 *
 * Amount 0 or missing: the row's server text `cashback_button_text` (a
 * sibling of `cashback` on the row's attributes, e.g. "Earn Rewards on
 * Amazon"), as the CashKaro app does; the generic CTA only when that is blank.
 */
function cashbackCtaLabel(cb?: OfferCashback, secondaryCount = 0, buttonText?: unknown): string {
  const amt = Number(cb?.amount ?? 0);
  if (!isFinite(amt) || amt <= 0) {
    const serverText = typeof buttonText === 'string' ? buttonText.replace(/\s+/g, ' ').trim() : '';
    return serverText || NO_RATE_CTA;
  }
  const prefix = secondaryCount > 0 ? 'Upto' : 'Flat';
  return `Shop & Earn ${prefix} ${rateUnitText(cb, amt)}`;
}

/** Just the value, e.g. "5.2%" / "₹500", for the brand-page cashback floor. */
export function cashbackValueText(cb?: OfferCashback): string {
  const amt = Number(cb?.amount ?? 0);
  if (!isFinite(amt) || amt <= 0) return 'Cashback';
  return rateUnitText(cb, amt);
}

/**
 * The pre-boost "was" rate, struck through before the live value
 * ("Flat ~~4%~~ 5.2% Cashback"). The API's `strike_out_value` is the base
 * rate before a boost; same unit as the live cashback. '' when there's no
 * boost (no strike_out_value, or it isn't above the live amount), so the
 * floor renders the plain headline. */
export function cashbackStrikeText(cb?: OfferCashback): string {
  const strike = Number(cb?.strike_out_value ?? 0);
  if (!isFinite(strike) || strike <= 0) return '';
  return rateUnitText(cb, strike);
}

/**
 * The bare rate for a single rates-sheet row, e.g. "5.6%" / "₹500" / "0%".
 * Unlike cashbackValueText, an explicit 0 renders as "0%" (not "Cashback"):
 * the secondary list carries genuine 0% category rows ("no cashback on
 * jewellery") that should read as a rate, not as a generic label.
 */
function rateRowText(cb?: OfferCashback): string {
  const amt = Number(cb?.amount ?? 0);
  if (!isFinite(amt)) return 'Cashback';
  return rateUnitText(cb, amt);
}

/**
 * Pull the embedded `secondary_cashback` rows from a store response's JSON:API
 * `included` block. Flipkart-style stores list every category-wise rate here
 * (the headline `cashback` is only the top one) — without these the rates
 * sheet shows a single row instead of the full breakdown. [] when absent.
 */
function extractSecondaryCashback(res: any): OfferCashback[] {
  const included: any[] = Array.isArray(res?.included) ? res.included : [];
  for (const entry of included) {
    const list = entry?.secondary_cashback;
    if (Array.isArray(list)) {
      return list
        .map((s: any) => s?.attributes)
        .filter((at: any): at is OfferCashback => !!at && at.amount != null);
    }
  }
  return [];
}

export interface OfferStoreSummary {
  slug: string;
  name: string;
  image?: string;
  ctaLabel: string;
  /** > 0 → the store's brand page renders the coupons variant. */
  couponsCount: number;
}

/**
 * Map `GET /offers/category/<slug>` → grid store summaries.
 * `{ data: [] }` is a real empty category, and so is a JSON:API body that
 * counts 0 stores (`meta.total_records: 0`) with no `data` list or a null one
 * (review R-10; the production shape of an empty category is not captured).
 * Any other body without a `data` array (a proxy page, captive-portal HTML)
 * throws, so the grid shows its error state instead of a false "No offers
 * here yet".
 */
export function mapCategoryOffers(res: any): OfferStoreSummary[] {
  if (!Array.isArray(res?.data)) {
    const total = res?.meta?.total_records;
    if (res?.data == null && (total === 0 || total === '0')) return [];
    throw new Error('Offers category response had no data list');
  }
  const data: any[] = res.data;
  return data
    .map((row): OfferStoreSummary | null => {
      const a = row?.attributes ?? {};
      const slug = a.unique_identifier ?? row?.id;
      if (!slug) return null;
      return {
        slug: String(slug),
        name: a.name ?? '',
        image: publicAssetUrl(a.image_url),
        ctaLabel: cashbackCtaLabel(
          a.cashback,
          Number(a.secondary_cashback_count ?? 0) || 0,
          a.cashback_button_text,
        ),
        couponsCount: Number(a.coupons_count ?? 0) || 0,
      };
    })
    .filter((s): s is OfferStoreSummary => s !== null);
}

/** Strip HTML tags + collapse whitespace (API descriptions are HTML). */
function stripHtml(html?: string): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text || undefined;
}

import type { IconName } from '../atoms';

export interface TimelineTile {
  label: string;
  metric: string;
  unit: string;
  unitHidden?: boolean;
}

export interface OfferStoreDetail {
  slug: string;
  name: string;
  logo?: string;
  bannerImage?: string;
  /** 'Flat' (cashback_type 'Cashback') or 'Upto' (tiered 'Rewards'). */
  cashbackPrefix: string;
  /** Trailing word — 'Cashback' or 'Rewards' (from cashback_type). */
  cashbackKind: string;
  /** "5.2%" / "₹500". */
  cashbackValue: string;
  /** Struck-through pre-boost rate ("4%"); '' when the store isn't boosted. */
  cashbackStrikeValue: string;
  cashbackDetails?: string;
  description: string;
  /** Numbered benefit lines (benefit_card_short_description) — when present
   *  the page shows the Benefits block instead of the Top-Offers block. */
  benefits: string[];
  /** True when the store has how-to-shop steps (drives the offer/how-to block). */
  hasHowTo: boolean;
  /** "How to get this offer" steps (popup_steps_to_shop) — shown in a sheet. */
  howToSteps: string[];
  /** "See Offer Details" lines (benefit_card_details, full text) — sheet body. */
  offerDetails: string[];
  /** True when the store has an upsell offer (bonus card + timer). */
  isUpsell: boolean;
  upsellText?: string;
  /** Upsell cashback expiry (ISO) from `attributes.upsell.cashback_expiry_date`. */
  upsellExpiry?: string;
  timelineTiles: TimelineTile[];
  rewardRates: { rate: string; description: string }[];
  termsIntro?: string;
  termsBullets: string[];
  termsCards: { text: string; icon: IconName }[];
  /** Cashback click-out URL ("Earn Cashback on <brand>"). */
  cashbackUrl?: string;
  ratingValue?: string;
  ratingCount?: string;
  /** Store hero banners (image type only) — drives the PromoBanner carousel.
   *  Lottie/json entries from store_banners are skipped (raster only). */
  banners: string[];
  /** Store FAQ ({ ques, ans } from the API) → accordion section. [] = none. */
  faq: FaqEntry[];
}

/** One store FAQ row (API `faq[].ques` / `.ans`). */
export interface FaqEntry {
  question: string;
  answer: string;
}

// Rotating icons for the T&C cards (no per-term icon in the API).
const TC_ICONS: IconName[] = [
  'feat-discount-outline',
  'feat-rewards-outline',
  'feat-celebration-outline',
];

/** Parse the API's `* bullet \r\n`-style terms into clean lines. */
function parseTerms(termsText?: string, special?: unknown): string[] {
  const fromText = (termsText ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^[*•\-\s]+/, '').trim())
    .filter((l) => l.length > 5);
  if (fromText.length > 0) return fromText.slice(0, 8);
  if (Array.isArray(special)) {
    return special.map((s) => String(s).trim()).filter((s) => s.length > 5).slice(0, 8);
  }
  return [];
}

/** Coerce an API array into clean, non-empty display strings. */
function toStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => (typeof s === 'string' ? s : ''))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0);
}

/** "1 Hours" → { metric:'1', unit:'Hours' }; 35 → { metric:'35', unit:'Days' }. */
function splitMetric(raw: unknown, fallbackUnit: string): { metric: string; unit: string } {
  const s = String(raw ?? '').trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (m) return { metric: m[1], unit: m[2] || fallbackUnit };
  return { metric: s || '—', unit: fallbackUnit };
}

/** Map `GET /offers/<slug>` → brand-page detail (variant + real data). */
export function mapOfferStore(res: any): OfferStoreDetail | null {
  const data = res?.data;
  if (!data) return null;
  const a = data.attributes ?? {};
  const name = a.name ?? '';
  const cb: OfferCashback | undefined = a.cashback;

  const appTracks = !!(a.app_tracking_enabled_android || a.app_tracking_enabled_ios);
  const track = splitMetric(a.tracking_speed, 'Hours');
  const confirm = splitMetric(a.expected_confirmation_days, 'Days');

  // cashback_type 'Rewards' → tiered "Upto"; 'Cashback' → guaranteed "Flat".
  const cashbackKind = a.cashback_type === 'Rewards' ? 'Rewards' : 'Cashback';

  // Rate rows for the "View Cashback/Reward Rates" sheet: the store's headline
  // rate first, then every category-wise secondary rate embedded in the
  // response's `included` block (Flipkart-style stores carry 15+ of these).
  const rateValue = cashbackValueText(cb);
  const primaryRows =
    rateValue && rateValue !== 'Cashback'
      ? [{ rate: rateValue, description: cb?.details || `${cashbackKind} on all ${name} orders` }]
      : [];
  const secondaryRows = extractSecondaryCashback(res).map((s) => ({
    rate: rateRowText(s),
    description: s.details || `${cashbackKind} on select ${name} orders`,
  }));
  const rewardRates = [...primaryRows, ...secondaryRows];

  // Tiered store → the headline amount is the MAX rate, not a guaranteed one,
  // so the prefix is "Upto" and the subtitle stays generic. Decided SOLELY by
  // the presence of category-wise secondary rates (cashback_type 'Rewards' is
  // NOT treated as tiered on its own) — matching the listing tile's rule so the
  // two screens always agree.
  const isTiered = secondaryRows.length > 0;
  const cashbackPrefix = isTiered ? 'Upto' : 'Flat';
  const cashbackSubtitle = isTiered
    ? 'on select categories — view all rates below'
    : cb?.details || stripHtml(a.short_description) || undefined;

  const termsBullets = parseTerms(
    a.terms_and_conditions || a.final_terms_condition,
    a.special_terms_conditions,
  );

  // The store endpoint nests the upsell under `attributes.upsell{}`; the top-level
  // `cashback_upsell_button_text` exists only on list rows (kept as the fallback).
  const upsell: Record<string, any> = a.upsell && typeof a.upsell === 'object' ? a.upsell : {};
  const upsellText: string | undefined =
    upsell.cashback_upsell_button_text || a.cashback_upsell_button_text || undefined;
  const upsellExpiry: string | undefined =
    upsell.cashback_expiry_date || a.cashback_expiry_date || undefined;
  const benefits: string[] = Array.isArray(a.benefit_card_short_description)
    ? a.benefit_card_short_description.filter((b: unknown) => typeof b === 'string' && b.trim())
    : [];

  // "How to get this offer" steps — the API's popup_steps_to_shop is the
  // real, reliably-populated source ("Click below to visit X" / "Shop as
  // usual" / "Get cashback in N hours"); how_to_get_offer is the legacy
  // fallback. Drives the offer/how-to block + its sheet.
  const howToSteps = toStringList(a.popup_steps_to_shop).length
    ? toStringList(a.popup_steps_to_shop)
    : toStringList(a.how_to_get_offer);
  // "See Offer Details" lines — full benefit text, falling back to the
  // short benefit lines already shown on the page.
  const offerDetails = toStringList(a.benefit_card_details).length
    ? toStringList(a.benefit_card_details)
    : benefits;

  // Hero banners — store_banners.mobile.data is a mix of { type, value }
  // entries (image / lottie). Keep only raster images (the carousel renders
  // <Image>), normalise to the public CDN host. Falls back to the single
  // banner_image_url so the carousel always has at least one slide.
  const bannerData: any[] = Array.isArray(a.store_banners?.mobile?.data)
    ? a.store_banners.mobile.data
    : [];
  const banners = bannerData
    .filter((b) => b?.type === 'image' && typeof b.value === 'string')
    .map((b) => publicAssetUrl(b.value) as string)
    .filter(Boolean);

  // FAQ — API `faq[]` of { ques, ans }. Drop blank rows.
  const faq: FaqEntry[] = Array.isArray(a.faq)
    ? a.faq
        .map((f: any) => ({
          question: stripHtml(f?.ques) ?? '',
          answer: stripHtml(f?.ans) ?? '',
        }))
        .filter((f: FaqEntry) => f.question && f.answer)
    : [];

  return {
    slug: String(a.unique_identifier ?? data.id ?? ''),
    name,
    logo: publicAssetUrl(a.image_url),
    bannerImage: publicAssetUrl(a.banner_image_url || a.image_url),
    cashbackPrefix,
    cashbackKind,
    cashbackValue: rateValue,
    cashbackStrikeValue: cashbackStrikeText(cb),
    cashbackDetails: cashbackSubtitle,
    description:
      stripHtml(a.seo_description) ||
      stripHtml(a.short_description) ||
      stripHtml(a.full_description) ||
      `Shop on ${name} via Cards.xtra and earn rewarding cashback on your orders.`,
    benefits,
    hasHowTo: howToSteps.length > 0,
    howToSteps,
    offerDetails,
    isUpsell: !!upsellText,
    timelineTiles: [
      { label: 'Cashback tracks in', metric: track.metric, unit: track.unit },
      { label: 'Cashback confirms in', metric: confirm.metric, unit: confirm.unit },
      {
        label: `Cashback on ${name} app orders?`,
        metric: appTracks ? 'Yes' : 'No',
        unit: '',
        unitHidden: true,
      },
    ],
    rewardRates,
    termsIntro: termsBullets[0],
    termsBullets,
    termsCards: termsBullets.map((t, i) => ({ text: t, icon: TC_ICONS[i % TC_ICONS.length] })),
    cashbackUrl: a.cashback_url ? String(a.cashback_url).trim() : undefined,
    upsellText,
    upsellExpiry,
    ratingValue: a.rating_value || undefined,
    ratingCount: a.rating_count || undefined,
    banners,
    faq,
  };
}

/**
 * Upsell expiry (ISO) → the Timer value "dd:hh:mm". Undefined when there is no
 * expiry, it is unreadable, or it has passed (the caller then keeps the default).
 */
export function upsellTimerValue(expiryISO: string | undefined, now: number = Date.now()): string | undefined {
  if (!expiryISO) return undefined;
  const end = new Date(expiryISO).getTime();
  if (!Number.isFinite(end) || end <= now) return undefined;
  const mins = Math.floor((end - now) / 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(mins / 1440))}:${pad(Math.floor((mins % 1440) / 60))}:${pad(mins % 60)}`;
}
