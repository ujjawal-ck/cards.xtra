/**
 * filterOptions.ts — the Home filter rails' option metadata + the
 * client-side predicate that applies a selection to the loaded card list.
 *
 * The server card endpoint only filters by category, so all four rails are
 * applied locally against each card's `filterMeta` (see cardMapper). Keeping
 * the option definitions here (not inside FilterMenu) lets the screen
 * translate the sheet's index-based selections into real values, and lets
 * the category carousel reuse the same category list / tag ids.
 */
import type { CardModel } from '../molecules';
import { images } from '../assets/images';

export interface CategoryOption {
  /** BankKaro tag id this category maps to (tags[].id). */
  tagId: number;
  label: string;
  imageKey: keyof typeof images.filters;
}

// Order matters — it's the order tiles render AND the index the filter
// sheet / carousel select against. tagIds from init-bundle tag_data.
export const CATEGORY_OPTIONS: CategoryOption[] = [
  { tagId: 2, label: 'Shopping', imageKey: 'shopping' },
  { tagId: 1, label: 'Fuel', imageKey: 'fuel' },
  { tagId: 5, label: 'Food Ordering', imageKey: 'foodOrdering' },
  { tagId: 6, label: 'Dining', imageKey: 'dining' },
  { tagId: 7, label: 'Grocery', imageKey: 'grocery' },
  { tagId: 12, label: 'Travel', imageKey: 'travel' },
  { tagId: 14, label: 'Bills', imageKey: 'bills' },
];

export const NETWORK_OPTIONS = [
  'Visa',
  'Mastercard',
  'RuPay',
  'American Express',
  'Diners Club',
];

export interface FeeBucket {
  label: string;
  test: (annualFee: number, isFree: boolean) => boolean;
}

export const ANNUAL_FEE_BUCKETS: FeeBucket[] = [
  { label: 'Lifetime Free (₹0)', test: (_f, isFree) => isFree },
  // Not lifetime free, annual fee up to ₹1,000. Includes a ₹0 annual fee with
  // a joining fee above ₹0, which no bucket matched before.
  { label: '₹0 - ₹1,000', test: (f, isFree) => !isFree && f <= 1000 },
  { label: '₹1,000 - ₹2,000', test: (f) => f > 1000 && f <= 2000 },
  { label: '₹2,000 - ₹5,000', test: (f) => f > 2000 && f <= 5000 },
  { label: '₹5,000+', test: (f) => f > 5000 },
];

/** Card traits: yes/no properties of a card. A card must have EVERY selected
 *  trait (AND), unlike the other rails where any selected value matches. */
export type CardTrait = 'firstCard';

export interface TraitOption {
  id: CardTrait;
  label: string;
  /** Short name for sentences ("No exact match for Fuel · First card"). */
  short: string;
}

// Order matters: the filter sheet's "Card Type" rail selects by index.
export const TRAIT_OPTIONS: TraitOption[] = [
  // BankKaro `new_to_credit`: the bank accepts an applicant with no credit history.
  { id: 'firstCard', label: 'Good for a first credit card', short: 'First card' },
];

/** A resolved filter selection (values, not sheet indices). Empty arrays = no
 *  constraint on that dimension. */
export interface AppliedFilters {
  categoryTagIds: number[];
  bankNames: string[];
  networks: string[];
  feeBucketIndices: number[];
  traits: CardTrait[];
}

export const EMPTY_FILTERS: AppliedFilters = {
  categoryTagIds: [],
  bankNames: [],
  networks: [],
  feeBucketIndices: [],
  traits: [],
};

/** "American Express" / "AmericanExpress" / "VISA" → one comparable form. */
function normalizeNetwork(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

/** A card's networks. BankKaro `card_type` is one network or a comma list
 *  ("VISA,RuPay"), in its own spelling ("AmericanExpress", "DinersClub"). */
export function cardNetworks(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map(normalizeNetwork).filter(Boolean);
}

function hasTrait(card: CardModel, trait: CardTrait): boolean {
  return trait === 'firstCard' && card.filterMeta?.newToCredit === true;
}

export function hasActiveFilters(f: AppliedFilters): boolean {
  return (
    f.categoryTagIds.length > 0 ||
    f.bankNames.length > 0 ||
    f.networks.length > 0 ||
    f.feeBucketIndices.length > 0 ||
    f.traits.length > 0
  );
}

/** Filter the loaded cards by an applied selection. A card passes a dimension
 *  if it matches ANY selected value in it (OR within a rail), and must pass
 *  every active dimension (AND across rails). Cards without filterMeta are
 *  dropped only when a filter is active. */
export function applyFilters(
  cards: CardModel[],
  f: AppliedFilters,
): CardModel[] {
  if (!hasActiveFilters(f)) return cards;
  return cards.filter((card) => {
    const m = card.filterMeta;
    if (!m) return false;
    if (
      f.categoryTagIds.length &&
      !f.categoryTagIds.some((id) => m.categoryIds.includes(id))
    ) {
      return false;
    }
    if (f.bankNames.length && !(m.bankName && f.bankNames.includes(m.bankName))) {
      return false;
    }
    if (f.networks.length) {
      const own = cardNetworks(m.network);
      if (!f.networks.some((n) => own.includes(normalizeNetwork(n)))) return false;
    }
    if (
      f.feeBucketIndices.length &&
      !f.feeBucketIndices.some((i) =>
        ANNUAL_FEE_BUCKETS[i]?.test(m.annualFeeValue, m.isFree),
      )
    ) {
      return false;
    }
    if (f.traits.length && !f.traits.every((t) => hasTrait(card, t))) {
      return false;
    }
    return true;
  });
}

/** Sort order of the Home list. `recommended` is the order the API returns. */
export type SortKey = 'recommended' | 'annualFeeAsc';

export const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'annualFeeAsc', label: 'Lowest annual fee' },
];

/** Stable sort. `recommended` returns the same array. For `annualFeeAsc`,
 *  lifetime-free cards come first, then the annual fee low to high; cards
 *  with an unknown fee (text fee / no filterMeta) go last. Ties keep the
 *  API order. */
export function sortCards(cards: CardModel[], key: SortKey): CardModel[] {
  if (key === 'recommended') return cards;
  const rank = (c: CardModel): number => {
    const m = c.filterMeta;
    if (!m || !isFinite(m.annualFeeValue)) return Infinity;
    return m.isFree ? -1 : m.annualFeeValue;
  };
  return cards
    .map((card, i) => ({ card, i, r: rank(card) }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r - b.r))
    .map((x) => x.card);
}
