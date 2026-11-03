/**
 * offersMapper.ts — CashKaro offers (JSON:API) → app shapes.
 *
 * Two consumers:
 *   - OffersScreen grid: a category's stores → { slug, name, image, ctaLabel }.
 *   - OffersBrandAmazon: a single store → { name, logo, banner, cashback, ... }.
 *
 * Cashback comes as `{ payment_type: 'percent'|'flat', amount: '5.20' }`. We
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
 * "Shop & Earn Flat 80%" / "Shop & Earn Upto 5.2%" / "Shop & Earn Flat ₹500".
 * Flat-vs-Upto is decided SOLELY by whether the store has category-wise
 * secondary rates: secondaryCount > 0 → the headline is the MAX of several
 * rates → "Upto"; otherwise the single headline rate is guaranteed → "Flat".
 * `cashback_type` ('Rewards' vs 'Cashback') is NOT used here — a Rewards store
 * with no secondary rates is still a single flat rate. `payment_type` only
 * decides the UNIT (₹ vs %), NOT the Flat/Upto word.
 */
function cashbackCtaLabel(cb?: OfferCashback, secondaryCount = 0): string {
  const amt = Number(cb?.amount ?? 0);
  if (!isFinite(amt) || amt <= 0) return 'Shop & Earn Cashback';
  // Trim a trailing ".0"/".00" so "5.00" → "5", but keep "5.20" → "5.2".
  const pretty = String(parseFloat(amt.toFixed(2)));
  const prefix = secondaryCount > 0 ? 'Upto' : 'Flat';
  const unit = cb?.payment_type === 'flat' ? `₹${pretty}` : `${pretty}%`;
  return `Shop & Earn ${prefix} ${unit}`;
}

/** Just the value, e.g. "5.2%" / "₹500", for the brand-page cashback floor. */
export function cashbackValueText(cb?: OfferCashback): string {
  const amt = Number(cb?.amount ?? 0);
  if (!isFinite(amt) || amt <= 0) return 'Cashback';
  const pretty = String(parseFloat(amt.toFixed(2)));
  return cb?.payment_type === 'flat' ? `₹${pretty}` : `${pretty}%`;
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
  const pretty = String(parseFloat(strike.toFixed(2)));
  return cb?.payment_type === 'flat' ? `₹${pretty}` : `${pretty}%`;
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
  const pretty = String(parseFloat(amt.toFixed(2)));
  return cb?.payment_type === 'flat' ? `₹${pretty}` : `${pretty}%`;
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

/** One coupon from the store's embedded `coupons` include. */
export interface StoreCoupon {
  /** The promo code to enter at checkout (only set when the API sends one). */
  code?: string;
  /** The coupon's own offer line (e.g. "Flat ₹300 off on orders over ₹999"). */
  title?: string;
}

/**
 * Pull coupons from the store response's JSON:API `included` block. The
 * request asks for `include=coupons`, but staging has never returned a
 * populated coupons relationship (INTEGRATION.md §7), so the exact payload
 * shape is unverified. Accept both shapes this API uses for includes —
 * a `{ coupons: [{ attributes }] }` bundle (like `secondary_cashback`) or
 * flat `{ type: 'coupon(s)', attributes }` rows — and read only explicit
 * code / title fields. Never invents a code: [] when nothing real is sent.
 */
function extractCoupons(res: any): StoreCoupon[] {
  const included: any[] = Array.isArray(res?.included) ? res.included : [];
  const rows: any[] = [];
  for (const entry of included) {
    if (Array.isArray(entry?.coupons)) {
      rows.push(...entry.coupons.map((c: any) => c?.attributes ?? c));
    } else if (typeof entry?.type === 'string' && /coupon/i.test(entry.type)) {
      rows.push(entry.attributes ?? {});
    }
  }
  const clean = (v: unknown): string | undefined => {
    const t = typeof v === 'string' ? stripHtml(v) : undefined;
    return t || undefined;
  };
  return rows
    .map((at): StoreCoupon => ({
      code: clean(at?.coupon_code ?? at?.code),
      title: clean(at?.title ?? at?.coupon_title ?? at?.name),
    }))
    .filter((c) => !!c.code || !!c.title);
}

export interface OfferStoreSummary {
  slug: string;
  name: string;
  image?: string;
  ctaLabel: string;
  /** > 0 → the store's brand page renders the coupons variant. */
  couponsCount: number;
}

/** Map `GET /offers/category/<slug>` → grid store summaries. */
export function mapCategoryOffers(res: any): OfferStoreSummary[] {
  const data: any[] = Array.isArray(res?.data) ? res.data : [];
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
  /** Coupons from the `coupons` include. [] when the API sends none. */
  coupons: StoreCoupon[];
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

  const upsellText: string | undefined = a.cashback_upsell_button_text || undefined;
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
    ratingValue: a.rating_value || undefined,
    ratingCount: a.rating_count || undefined,
    banners,
    faq,
    coupons: extractCoupons(res),
  };
}
