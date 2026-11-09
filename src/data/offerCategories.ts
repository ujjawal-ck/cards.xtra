/**
 * offerCategories.ts — the Offers strip is driven by the CashKaro
 * "CK MINI APP" parent category (`miniapp`). Its sub-categories ARE the strip,
 * fetched live via `/offers/category/miniapp?include=categories` — so adding /
 * renaming a sub-category (or its stores) in the CashKaro admin shows up in the
 * app on next load, no code change.
 *
 * The API gives no category icons (sub-categories carry only name/slug; the
 * parent image is a `no-category.jpg` placeholder), so icons + accent colours
 * are mapped here from the local assets we already ship — matched first by
 * sub-category slug, then by a keyword in the label, with a sensible fallback.
 * This is the ONLY app-side piece; labels, order, and paths all come from the
 * backend.
 */
import type { ImageSourcePropType } from 'react-native';
import { images } from '../assets/images';

/** The parent category whose sub-categories drive the Offers strip. */
export const MINIAPP_PARENT_PATH = 'miniapp';

/** Default selected category path — the "All" tab (the parent itself, every
 *  store in the mini-app set). */
export const DEFAULT_OFFER_CATEGORY_PATH = MINIAPP_PARENT_PATH;

/** Saffron — the brand base. The "All" tab uses it so the default state shows
 *  no thematic tint shift (matching the previous strip's category-0 behaviour). */
const SAFFRON = '#ff6d1d';

/** One strip entry: an OfferCategoryEntry (label/image/accent) + the API path
 *  its grid loads from. Structurally compatible with the strip's prop type. */
export interface OfferCategory {
  label: string;
  path: string;
  image: ImageSourcePropType;
  accent: string;
}

// Exact slug → local icon. The current miniapp sub-categories all end in `-ma`.
const ICON_BY_SLUG: Record<string, ImageSourcePropType> = {
  'fashion-offers-ma': images.categories.fashion,
  'beauty-personal-care-offers-ma': images.categories.beautyAndGrooming,
  'electronics-offers-ma': images.categories.electronics,
  'mobiles-phones-offers-ma': images.categories.mobile,
  'home-kitchen-offers-ma': images.categories.homeAndKitchen,
  'min-cashback-ma': images.categories.newOnCashkaro,
  'travel-offers-ma': images.categories.flightsAndTravel,
  'health-medicine-offers-ma': images.categories.pharmacy,
  'food-and-grocery-ma': images.categories.foodAndGrocery,
  'health-and-wellness-ma': images.categories.healthAndWellness,
};

// Keyword fallback so a NEW sub-category added in the admin still gets a
// reasonable icon without a code change, as long as its name/slug is
// recognisable. Matched against both the label and the slug.
const ICON_BY_KEYWORD: [RegExp, ImageSourcePropType][] = [
  [/fashion|cloth|apparel/i, images.categories.fashion],
  [/beauty|groom|personal\s*care/i, images.categories.beautyAndGrooming],
  [/electronic/i, images.categories.electronics],
  [/mobile|phone/i, images.categories.mobile],
  [/home|kitchen/i, images.categories.homeAndKitchen],
  [/cashback|reward/i, images.categories.newOnCashkaro],
  [/travel|flight|hotel/i, images.categories.flightsAndTravel],
  [/pharmac|medicine/i, images.categories.pharmacy],
  [/food|grocery/i, images.categories.foodAndGrocery],
  [/health|wellness/i, images.categories.healthAndWellness],
  [/bank/i, images.categories.banking],
  [/educat/i, images.categories.education],
  [/host|domain/i, images.categories.hosting],
  [/loan/i, images.categories.loans],
  [/department/i, images.categories.departmental],
];

// Accent palette for sub-categories (the "All" tab is saffron). Index cycles.
const ACCENT_PALETTE = [
  '#e05a86', '#46a85a', '#2ba39a', '#3f8de0', '#5b6be0', '#d9883f',
  '#bd5ad9', '#1f9e78', '#ec7a3f', '#3aa9cf', '#7a5ae0', '#357fdf',
  '#315fa8', '#4caf6a',
];

function iconFor(slug: string, label: string): ImageSourcePropType {
  if (ICON_BY_SLUG[slug]) return ICON_BY_SLUG[slug];
  for (const [re, img] of ICON_BY_KEYWORD) {
    if (re.test(label) || re.test(slug)) return img;
  }
  // Final fallback — the CashKaro badge reads as a generic "offers" icon.
  return images.categories.newOnCashkaro;
}

/**
 * Build the Offers strip from a `/offers/category/miniapp?include=categories`
 * response: a leading "All" tab (the parent, every store) followed by each
 * sub-category in the order the API returns them. Each entry carries the path
 * its grid loads from, plus an app-side icon + accent. Returns just the "All"
 * tab if the response has no sub-categories.
 */
export function buildOfferCategoriesFromApi(res: any): OfferCategory[] {
  const included: any[] = Array.isArray(res?.included) ? res.included : [];
  let subs: any[] = [];
  for (const block of included) {
    const data = block?.categories?.relationships?.sub_categories?.data;
    if (Array.isArray(data)) {
      subs = data;
      break;
    }
  }

  const all: OfferCategory = {
    label: 'All',
    path: MINIAPP_PARENT_PATH,
    image: images.categories.newOnCashkaro,
    accent: SAFFRON,
  };

  const subCategories = subs
    .map((s, i): OfferCategory | null => {
      const a = s?.attributes ?? {};
      const slug = a.unique_identifier ?? s?.id;
      if (!slug) return null;
      const label = a.name ?? String(slug);
      return {
        label: String(label),
        path: `${MINIAPP_PARENT_PATH}/${slug}`,
        image: iconFor(String(slug), String(label)),
        accent: ACCENT_PALETTE[i % ACCENT_PALETTE.length],
      };
    })
    .filter((c): c is OfferCategory => c !== null);

  return [all, ...subCategories];
}

// ----------------------------------------------------------------------------
// Fallback: production without the `miniapp` parent
// ----------------------------------------------------------------------------
// On ckminapps.com (prod) the `miniapp` parent doesn't exist yet: the API
// answers 400 code 10003 "Invalid Category", which used to leave Offers on
// "Couldn't load offers". Until CashKaro configures it, the strip is built
// from the real top-level categories (`/offers/categories`, which works), so
// the page shows live categories and lights up as soon as stores are mapped.

/** Top-level slugs that aren't shopping categories (product feeds, internal
 *  buckets, the credit-card store set used for card rates). */
const NON_SHOPPING_SLUGS = new Set([
  'product',
  'most-popular-products',
  'popular-today',
  'ck-white-labels',
  'exclude',
  'home-categories-exclusive',
  'best-cards-shopping-hp-exp',
]);

/** Short strip labels + fitting icons for the known top-level categories.
 *  The API names ("Highest Cashback Stores", "More Categories") are too long
 *  for the 2-line strip and broke mid-word; three also fell back to the same
 *  "NEW" badge. Unknown categories keep the API name and the keyword icon. */
const TOP_LEVEL_DISPLAY: Record<string, { label: string; image: ImageSourcePropType }> = {
  'highest-cashback-stores': { label: 'Top Cashback', image: images.categories.loans },
  '100percent-cashback': { label: '100% Cashback', image: images.categories.banking },
  'voucher-deals': { label: 'New User', image: images.categories.newOnCashkaro },
  'health-beauty': { label: 'Beauty', image: images.categories.beautyAndGrooming },
  'electronics-category': { label: 'Electronics', image: images.categories.electronics },
  'more-category-offers': { label: 'More', image: images.categories.departmental },
};

/** Shown first when present: the broadest store sets lead the strip. */
const LEADING_SLUGS = ['highest-cashback-stores', '100percent-cashback', 'voucher-deals'];

/**
 * Build the strip from a `/offers/categories` response (top-level categories
 * only, internal buckets removed). Paths are the top-level slugs, which the
 * category-offers endpoint accepts directly.
 */
export function buildOfferCategoriesFromTopLevel(res: any): OfferCategory[] {
  const rows: any[] = Array.isArray(res?.data) ? res.data : [];
  const cats = rows
    .map((r) => {
      const a = r?.attributes ?? {};
      const slug = a.unique_identifier ?? r?.id;
      if (!slug || NON_SHOPPING_SLUGS.has(String(slug))) return null;
      if (a.parent_id != null && Number(a.parent_id) !== 0) return null;
      return { slug: String(slug), label: String(a.name ?? slug) };
    })
    .filter((c): c is { slug: string; label: string } => c !== null);

  const rank = (slug: string) => {
    const i = LEADING_SLUGS.indexOf(slug);
    return i === -1 ? LEADING_SLUGS.length : i;
  };
  cats.sort((a, b) => rank(a.slug) - rank(b.slug));

  return cats.map((c, i) => ({
    label: TOP_LEVEL_DISPLAY[c.slug]?.label ?? c.label,
    path: c.slug,
    image: TOP_LEVEL_DISPLAY[c.slug]?.image ?? iconFor(c.slug, c.label),
    // First tab keeps the saffron base, like the "All" tab it replaces.
    accent: i === 0 ? SAFFRON : ACCENT_PALETTE[(i - 1) % ACCENT_PALETTE.length],
  }));
}
