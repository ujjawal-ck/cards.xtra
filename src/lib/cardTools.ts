/**
 * cardTools: pure logic for the Home card tools (Find best card by category,
 * Beat my card, Find my ultimate card, Best card for brands).
 *
 * One BankKaro call powers all four tools: POST /cardgenius/calculate with 21
 * spend keys returns every card with its savings. This file holds the spend
 * questions, the brand and category maps, the response mapper and the ranking
 * rule. No React, no tokens, no network: everything here is unit tested.
 *
 * Product rules (do not change without the owner):
 *  - Rank by NET yearly value: yearly savings + extra benefits + lounge value
 *    - annual fee, where the annual fee is not counted when the user's yearly
 *    spend reaches the card's waiver spend (D26 in docs/decision.md). The
 *    joining fee is never counted.
 *  - We compute that sum from named fields and do not read BankKaro's `roi`,
 *    because it is undocumented. On UAT data our sum equals `roi`.
 *  - The CashKaro apply Reward is one-time. It is shown by the screens from the
 *    app's card, and it is NOT part of the ranking.
 *  - Brand accuracy: BankKaro has brand keys only for Amazon and Flipkart
 *    (`exact: true`). Every other brand is counted in its category, and the
 *    screens must say so (`groupLabel`).
 *  - No amount typed by the user goes into analytics.
 */
import type { CalculateSpends } from '../api/types';

export type SpendKey = keyof CalculateSpends;

/** How the user thinks about one spend. The API unit can differ (see `toApiValue`). */
export type SpendPeriod = 'month' | 'year';

/** The 10 spend categories. A question's `group` and a brand's `tab` are one of these. */
export type ToolCategoryId =
  | 'shopping'
  | 'groceries'
  | 'bills'
  | 'fuel'
  | 'insurance'
  | 'food'
  | 'dining'
  | 'travel'
  | 'rent'
  | 'education';

export interface SpendQuestion {
  key: SpendKey;
  /** The category this question belongs to. */
  group: ToolCategoryId;
  /** Short name, e.g. "Amazon". Used in breakdown rows and chips. */
  label: string;
  /** Full question, e.g. "How much do you spend on Amazon in a month?" */
  question: string;
  /** Examples that help the user split a spend, e.g. "Swiggy, Zomato". */
  hint?: string;
  /** The unit the user answers in. Lounge visits are asked per year and sent per quarter. */
  period: SpendPeriod;
  /** 'rupees' (default) or 'visits' (lounge keys). */
  unit: 'rupees' | 'visits';
  min: number;
  /** The highest amount the user can type. */
  max: number;
  /** The highest value on the ruler. At most about 250 ticks at `step`. */
  rulerMax: number;
  step: number;
}

/** Highest typed amounts, rupees (lounge: visits a year). */
const MAX_MONTHLY_SPEND = 1000000;
const MAX_BILL = 200000;
const MAX_LARGE = 5000000;
const MAX_LOUNGE_VISITS = 40;

/** All 21 questions, grouped by category, in ask order. */
export const SPEND_QUESTIONS: SpendQuestion[] = [
  { key: 'amazon_spends', group: 'shopping', label: 'Amazon', question: 'How much do you spend on Amazon in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_MONTHLY_SPEND, rulerMax: 100000, step: 500 },
  { key: 'flipkart_spends', group: 'shopping', label: 'Flipkart', question: 'How much do you spend on Flipkart in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_MONTHLY_SPEND, rulerMax: 100000, step: 500 },
  { key: 'other_online_spends', group: 'shopping', label: 'Other online shopping', question: 'How much do you spend on other online shopping in a month?', hint: 'Myntra, Nykaa, Ajio', period: 'month', unit: 'rupees', min: 0, max: MAX_MONTHLY_SPEND, rulerMax: 100000, step: 500 },
  { key: 'other_offline_spends', group: 'shopping', label: 'Other shopping at stores', question: 'How much do you spend on other shopping at stores in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_MONTHLY_SPEND, rulerMax: 100000, step: 500 },

  { key: 'grocery_spends_online', group: 'groceries', label: 'Online groceries', question: 'How much do you spend on online groceries in a month?', hint: 'Blinkit, Zepto, Instamart', period: 'month', unit: 'rupees', min: 0, max: MAX_MONTHLY_SPEND, rulerMax: 50000, step: 500 },
  { key: 'offline_grocery', group: 'groceries', label: 'Groceries at stores', question: 'How much do you spend on groceries at stores in a month?', hint: 'DMart, Reliance Smart', period: 'month', unit: 'rupees', min: 0, max: MAX_MONTHLY_SPEND, rulerMax: 50000, step: 500 },

  { key: 'online_food_ordering', group: 'food', label: 'Food delivery', question: 'How much do you spend on food delivery in a month?', hint: 'Swiggy, Zomato', period: 'month', unit: 'rupees', min: 0, max: MAX_MONTHLY_SPEND, rulerMax: 50000, step: 500 },
  { key: 'dining_or_going_out', group: 'dining', label: 'Dining out', question: 'How much do you spend on dining out in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_MONTHLY_SPEND, rulerMax: 50000, step: 500 },
  { key: 'fuel', group: 'fuel', label: 'Fuel', question: 'How much do you spend on fuel in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_MONTHLY_SPEND, rulerMax: 50000, step: 500 },

  { key: 'flights_annual', group: 'travel', label: 'Flights', question: 'How much do you spend on flights in a year?', period: 'year', unit: 'rupees', min: 0, max: MAX_LARGE, rulerMax: 1000000, step: 5000 },
  { key: 'hotels_annual', group: 'travel', label: 'Hotels', question: 'How much do you spend on hotels in a year?', period: 'year', unit: 'rupees', min: 0, max: MAX_LARGE, rulerMax: 1000000, step: 5000 },
  { key: 'domestic_lounge_usage_quarterly', group: 'travel', label: 'Domestic lounge visits', question: 'How many times do you use a domestic airport lounge in a year?', period: 'year', unit: 'visits', min: 0, max: MAX_LOUNGE_VISITS, rulerMax: MAX_LOUNGE_VISITS, step: 1 },
  { key: 'international_lounge_usage_quarterly', group: 'travel', label: 'International lounge visits', question: 'How many times do you use an international airport lounge in a year?', period: 'year', unit: 'visits', min: 0, max: MAX_LOUNGE_VISITS, rulerMax: MAX_LOUNGE_VISITS, step: 1 },

  { key: 'mobile_phone_bills', group: 'bills', label: 'Mobile and broadband bills', question: 'How much are your mobile and broadband bills in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_BILL, rulerMax: 10000, step: 100 },
  { key: 'electricity_bills', group: 'bills', label: 'Electricity bills', question: 'How much is your electricity bill in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_BILL, rulerMax: 25000, step: 500 },
  { key: 'water_bills', group: 'bills', label: 'Water bills', question: 'How much is your water bill in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_BILL, rulerMax: 5000, step: 100 },

  { key: 'life_insurance', group: 'insurance', label: 'Life insurance', question: 'How much is your life insurance premium in a year?', period: 'year', unit: 'rupees', min: 0, max: MAX_LARGE, rulerMax: 200000, step: 1000 },
  { key: 'insurance_health_annual', group: 'insurance', label: 'Health insurance', question: 'How much is your health insurance premium in a year?', period: 'year', unit: 'rupees', min: 0, max: MAX_LARGE, rulerMax: 200000, step: 1000 },
  { key: 'insurance_car_or_bike_annual', group: 'insurance', label: 'Car or bike insurance', question: 'How much is your car or bike insurance premium in a year?', period: 'year', unit: 'rupees', min: 0, max: MAX_LARGE, rulerMax: 200000, step: 1000 },

  { key: 'rent', group: 'rent', label: 'Rent', question: 'How much rent do you pay in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_LARGE, rulerMax: 200000, step: 1000 },
  { key: 'school_fees', group: 'education', label: 'School fees', question: 'How much do you pay in school fees in a month?', period: 'month', unit: 'rupees', min: 0, max: MAX_LARGE, rulerMax: 100000, step: 1000 },
];

/** A brand the user can pick in "Best card for brands". */
export interface ToolBrand {
  id: string;
  name: string;
  /** The calculate key this brand's monthly spend is added to. */
  key: SpendKey;
  /** true only when BankKaro has a key for this exact brand (Amazon, Flipkart). */
  exact: boolean;
  /** Shown when `exact` is false, e.g. "Counted as food delivery". */
  groupLabel?: string;
  /** The picker tab this brand sits under. */
  tab: ToolCategoryId;
}

/** The user can pick at most this many brands (great.cards uses 5). */
export const MAX_BRANDS = 5;

/**
 * BankKaro rejects brand names, so each brand maps to ONE calculate key.
 * Swiggy Instamart, DMart and Jio: mapping seen on great.cards on 2026-11-18.
 */
export const TOOL_BRANDS: ToolBrand[] = [
  { id: 'amazon', name: 'Amazon', key: 'amazon_spends', exact: true, tab: 'shopping' },
  { id: 'flipkart', name: 'Flipkart', key: 'flipkart_spends', exact: true, tab: 'shopping' },
  { id: 'myntra', name: 'Myntra', key: 'other_online_spends', exact: false, groupLabel: 'Counted as online shopping', tab: 'shopping' },
  { id: 'ajio', name: 'Ajio', key: 'other_online_spends', exact: false, groupLabel: 'Counted as online shopping', tab: 'shopping' },
  { id: 'nykaa', name: 'Nykaa', key: 'other_online_spends', exact: false, groupLabel: 'Counted as online shopping', tab: 'shopping' },
  { id: 'swiggy', name: 'Swiggy', key: 'online_food_ordering', exact: false, groupLabel: 'Counted as food delivery', tab: 'food' },
  { id: 'zomato', name: 'Zomato', key: 'online_food_ordering', exact: false, groupLabel: 'Counted as food delivery', tab: 'food' },
  { id: 'blinkit', name: 'Blinkit', key: 'grocery_spends_online', exact: false, groupLabel: 'Counted as online groceries', tab: 'groceries' },
  { id: 'zepto', name: 'Zepto', key: 'grocery_spends_online', exact: false, groupLabel: 'Counted as online groceries', tab: 'groceries' },
  { id: 'bigbasket', name: 'BigBasket', key: 'grocery_spends_online', exact: false, groupLabel: 'Counted as online groceries', tab: 'groceries' },
  { id: 'swiggy-instamart', name: 'Swiggy Instamart', key: 'grocery_spends_online', exact: false, groupLabel: 'Counted as online groceries', tab: 'groceries' },
  { id: 'dmart', name: 'DMart', key: 'offline_grocery', exact: false, groupLabel: 'Counted as groceries at stores', tab: 'groceries' },
  { id: 'jio', name: 'Jio', key: 'mobile_phone_bills', exact: false, groupLabel: 'Counted as mobile and broadband bills', tab: 'bills' },
];

/** Brand names the Home tile rotates through, in order. */
export const ROTATING_BRANDS: string[] = ['Myntra', 'Swiggy', 'Flipkart', 'Amazon'];

/**
 * One column per distinct calculate key among the picked brands, in pick order.
 * The label joins the picked brand names that share the key, e.g. "Swiggy + Zomato".
 * Unknown and repeated ids are ignored.
 */
export function brandColumns(brandIds: string[]): Array<{ key: SpendKey; label: string }> {
  if (!Array.isArray(brandIds)) return [];
  const names = new Map<SpendKey, string[]>();
  const seen = new Set<string>();
  for (const id of brandIds) {
    const brand = TOOL_BRANDS.find((b) => b.id === id);
    if (!brand || seen.has(brand.id)) continue;
    seen.add(brand.id);
    const list = names.get(brand.key) ?? [];
    list.push(brand.name);
    names.set(brand.key, list);
  }
  return [...names.entries()].map(([key, list]) => ({ key, label: list.join(' + ') }));
}

/** A spend category for "Find best card for <category>". */
export interface ToolCategory {
  id: ToolCategoryId;
  /** e.g. "Groceries". The Home tile shows it unless `tileWord` is set. */
  label: string;
  /** The word the Home tile shows, when it differs from `label`. */
  tileWord?: string;
  /** The questions of this category (their keys), in ask order. */
  keys: SpendKey[];
}

/** The category a Home tile word names ("Fuel" → 'fuel'), by label or tile word. undefined when unknown. */
export function categoryIdForWord(word: string | undefined): ToolCategoryId | undefined {
  if (!word) return undefined;
  return TOOL_CATEGORIES.find((c) => c.label === word || c.tileWord === word)?.id;
}

/** The brand a Home tile word names ("Myntra" → 'myntra'), ignoring case. undefined when unknown. */
export function brandIdForWord(word: string | undefined): string | undefined {
  const w = word?.toLowerCase();
  return w ? TOOL_BRANDS.find((b) => b.name.toLowerCase() === w)?.id : undefined;
}

const keysOf = (group: ToolCategoryId): SpendKey[] =>
  SPEND_QUESTIONS.filter((q) => q.group === group).map((q) => q.key);

/** The 10 categories, in picker order. `keys` come from the question groups. */
export const TOOL_CATEGORIES: ToolCategory[] = [
  { id: 'shopping', label: 'Shopping', keys: keysOf('shopping') },
  { id: 'groceries', label: 'Groceries', keys: keysOf('groceries') },
  { id: 'bills', label: 'Paying Bills', keys: keysOf('bills') },
  { id: 'fuel', label: 'Fuel', keys: keysOf('fuel') },
  { id: 'insurance', label: 'Insurance', keys: keysOf('insurance') },
  { id: 'food', label: 'Ordering Food', keys: keysOf('food') },
  { id: 'dining', label: 'Dining Out', keys: keysOf('dining') },
  { id: 'travel', label: 'Travel', keys: keysOf('travel') },
  { id: 'rent', label: 'Rent', keys: keysOf('rent') },
  { id: 'education', label: 'Education Fees', keys: keysOf('education') },
];

/** The questions of one category, in ask order. [] for an unknown id. */
export function questionsForCategory(id: string): SpendQuestion[] {
  return SPEND_QUESTIONS.filter((q) => q.group === id);
}

/** One spend line of one card, only for keys where the user entered a spend. */
export interface CardSavingsLine {
  key: string;
  /** From SPEND_QUESTIONS when the key is known, else the key itself. */
  label: string;
  /**
   * Rupees per month, for every rupee key, also for `_annual` keys and
   * `life_insurance` (the API takes a yearly input for those and reports the
   * line per month). Lounge lines: visits per quarter.
   */
  spend: number;
  /** Rupees saved per month, rounded to whole rupees (for display). */
  savings: number;
  /**
   * Rupees saved per month as the API sent it, NOT rounded. Use it for any sum or
   * yearly figure (`beatMyCard` rows use round(rawSavings x 12)), so rows agree with
   * the yearly total. Optional so hand-built lines still type-check; read it as
   * `line.rawSavings ?? line.savings`.
   */
  rawSavings?: number;
  /** Plain text (HTML stripped). The yearly explanation when present, else the monthly one. */
  explanation: string;
  /** Plain text of the monthly explanation, when the API sends one. */
  explanationMonthly?: string;
  /** BankKaro `savings_type`, e.g. 'cashback' or 'points'. */
  savingsType?: string;
  /** BankKaro `cashback_percentage` (X%), only when the API sends it. */
  cashbackPct?: number;
  /** BankKaro `points_earned`: points per month, as sent. */
  pointsEarned?: number;
  /** BankKaro `conv_rate`: rupees per point, only when the API sends it. */
  pointValue?: number;
  /**
   * true on lounge lines (`*_lounge_usage_quarterly`). BankKaro shows a lounge
   * value on the line, but that value is NOT in `total_savings` or
   * `total_savings_yearly` (it sits in the card's travel benefits). Never sum
   * these lines with the others: the result would disagree with the totals.
   * They are left out of `beatMyCard` rows.
   */
  outsideTotal?: true;
}

/** What `calculate` says about one card. Money is in rupees, rounded to whole rupees. */
export interface CardSavings {
  /** BankKaro `seo_card_alias`. Joins to the app card through `filterMeta.cardAlias`. */
  alias: string;
  /**
   * BankKaro card `id` as a string, when the row has one. The second join key to
   * the app card (`CardModel.id`), used only when the alias does not match.
   */
  id?: string;
  /** BankKaro `card_name`. Use the app card's name on screen; this is a fallback. */
  name: string;
  /** BankKaro `bank_name`, when sent. */
  bankName?: string;
  /** BankKaro `image`, else `card_bg_image`. */
  imageUrl?: string;
  /** true when BankKaro `sourceable` is false or 0. A missing value is NOT discontinued. */
  discontinued: boolean;
  /** true when BankKaro `invite_only` is true or 1. */
  inviteOnly: boolean;
  /**
   * Listed annual fee 0 and joining fee 0, and not discontinued and not invite
   * only. A waived fee is not lifetime free.
   */
  lifetimeFree: boolean;
  monthlySavings: number;
  yearlySavings: number;
  /** `total_extra_benefits`: milestone and welcome value per year. */
  extraBenefits: number;
  joiningFee: number;
  /** The card's listed annual fee, rupees. Shown as is; the fee counted in `netYearly` is `annualFeeCounted`. */
  annualFee: number;
  /**
   * `travel_benefits.total_travel_benefit_annual`: rupees a year of the lounge
   * visits the user entered, rounded. 0 when missing. It is NOT inside
   * `yearlySavings` or `extraBenefits`.
   */
  loungeValue: number;
  /**
   * `annual_fee_spends`: the yearly spend, rupees, at which the bank waives the
   * annual fee. 0 when the card has no waiver (empty string or not a number).
   */
  feeWaiverSpend: number;
  /**
   * true when `feeWaiverSpend` > 0 and the user's yearly spend
   * (`total_spends` x 12; `total_spends` is monthly) is at least `feeWaiverSpend`.
   * false when `total_spends` is missing. This rule is derived from UAT data on
   * 2026-11-18 (facts G51 to G55 in the project knowledge file). BankKaro has
   * not confirmed it.
   */
  feeWaived: boolean;
  /** The annual fee counted in `netYearly`, rupees: 0 when `feeWaived`, else `annualFee`. */
  annualFeeCounted: number;
  /** yearlySavings + extraBenefits + loungeValue - annualFeeCounted, rupees a year. Can be negative. */
  netYearly: number;
  /** Lines with spend above 0, highest savings first. */
  lines: CardSavingsLine[];
}

/** Result of "Beat my card". */
export interface BeatResult {
  mine: CardSavings;
  /** The best card that is not the user's card. */
  best: CardSavings;
  /** best.netYearly - mine.netYearly. Above 0 means the other card wins. */
  gapYearly: number;
  verdict: 'best_wins' | 'mine_wins' | 'equal';
  /** One row per in-total spend line (no `outsideTotal` lines) that either card has, yearly rupees, largest gap first. */
  rows: BeatRow[];
}

/** One spend category in "Beat my card". Money is rupees a year. */
export interface BeatRow {
  key: string;
  label: string;
  mine: number;
  best: number;
  /** The user's spend on this key, rupees a year (monthly line spend x 12). */
  spendYearly: number;
  /** The user's card's line, for rate and explanation. Absent when that card has no line. */
  mineLine?: CardSavingsLine;
  /** The best card's line. Absent when that card has no line. */
  bestLine?: CardSavingsLine;
}

/** All 21 keys set to 0. */
export const EMPTY_SPENDS: CalculateSpends = {
  amazon_spends: 0,
  flipkart_spends: 0,
  other_online_spends: 0,
  grocery_spends_online: 0,
  online_food_ordering: 0,
  other_offline_spends: 0,
  offline_grocery: 0,
  dining_or_going_out: 0,
  fuel: 0,
  mobile_phone_bills: 0,
  electricity_bills: 0,
  water_bills: 0,
  rent: 0,
  school_fees: 0,
  insurance_health_annual: 0,
  insurance_car_or_bike_annual: 0,
  life_insurance: 0,
  flights_annual: 0,
  hotels_annual: 0,
  domestic_lounge_usage_quarterly: 0,
  international_lounge_usage_quarterly: 0,
};

/** The 21 keys in one fixed order (the order of EMPTY_SPENDS). */
const SPEND_KEYS = Object.keys(EMPTY_SPENDS) as SpendKey[];

const QUESTION_BY_KEY: Record<string, SpendQuestion> = Object.fromEntries(
  SPEND_QUESTIONS.map((q) => [q.key, q]),
);

/** A finite number from a number or a numeric string, else 0. */
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Key classes, all read from the question table (SPEND_QUESTIONS), so there is
 * one source of truth for "count" and "yearly input".
 */

/** A count key (lounge visits), not rupees. */
function isVisitsKey(key: string): boolean {
  return QUESTION_BY_KEY[key]?.unit === 'visits';
}

/** A rupee key the API takes as a yearly input (`_annual` keys and `life_insurance`). */
function isYearlyInput(key: string): boolean {
  const q = QUESTION_BY_KEY[key];
  return q?.unit === 'rupees' && q.period === 'year';
}

/**
 * Breakdown keys that sit outside the card's savings totals: the lounge input
 * keys, plus `railway_lounge_usage_quarterly`, which the response breakdown
 * carries but which is not an input (so it is not in the question table).
 */
function isOutsideTotal(key: string): boolean {
  return isVisitsKey(key) || key === 'railway_lounge_usage_quarterly';
}

/**
 * Turn the user's answer for one question into the value the API wants.
 * Rupee keys pass through. Lounge keys are asked per year and sent per quarter:
 * divide by 4 and round to the nearest whole visit, with a floor of 1 when the
 * answer is above 0 (1 to 5 a year send 1, 6 sends 2, 0 sends 0).
 * The result is a whole number, never negative.
 */
export function toApiValue(key: SpendKey, answer: number): number {
  const a = num(answer);
  if (a <= 0) return 0;
  return isVisitsKey(key) ? Math.max(1, Math.round(a / 4)) : Math.round(a);
}

/** A full 21-key body from the user's ANSWERS (each run through `toApiValue`). Missing keys are 0. */
export function buildSpends(answers: Partial<Record<SpendKey, number>>): CalculateSpends {
  const out: CalculateSpends = { ...EMPTY_SPENDS };
  if (!isRecord(answers)) return out;
  for (const key of SPEND_KEYS) {
    const v = answers[key];
    if (v !== undefined) out[key] = toApiValue(key, v);
  }
  return out;
}

/**
 * Body for "Best card for brands". Each pick is a brand id and its monthly rupees.
 * Spends of brands that share a key are added. Unknown ids and amounts of 0 or less are ignored.
 */
export function spendsFromBrands(picks: Array<{ brandId: string; monthly: number }>): CalculateSpends {
  const out: CalculateSpends = { ...EMPTY_SPENDS };
  if (!Array.isArray(picks)) return out;
  for (const pick of picks) {
    const brand = TOOL_BRANDS.find((b) => b.id === pick?.brandId);
    const monthly = num(pick?.monthly);
    if (!brand || monthly <= 0) continue;
    out[brand.key] += Math.round(monthly);
  }
  return out;
}

/** true when at least one key is above 0. The tools do not call the API with an empty body. */
export function hasAnySpend(spends: CalculateSpends): boolean {
  if (!isRecord(spends)) return false;
  return SPEND_KEYS.some((k) => num(spends[k]) > 0);
}

/** A stable string for one spend profile (keys in a fixed order). Used as the query key. */
export function spendsKey(spends: CalculateSpends): string {
  const s: Partial<CalculateSpends> = isRecord(spends) ? spends : {};
  return SPEND_KEYS.map((k) => num(s[k])).join(',');
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

/** Plain text from BankKaro's explanation HTML: tags removed, entities decoded, spaces collapsed. */
export function stripHtml(html: string): string {
  if (typeof html !== 'string' || html === '') return '';
  return (
    html
      // A tag becomes a space, so "</b>you" does not glue two words.
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#(\d+);/g, (m, d) => safeChar(Number(d), m))
      .replace(/&#x([0-9a-f]+);/gi, (m, h) => safeChar(parseInt(h, 16), m))
      .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
      // &amp; last, so "&amp;nbsp;" stays the literal text "&nbsp;".
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      // No space before punctuation that a closing tag left behind.
      .replace(/ ([.,;:!?)])/g, '$1')
      .trim()
  );
}

function safeChar(code: number, fallback: string): string {
  try {
    return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : fallback;
  } catch {
    return fallback;
  }
}

/** The monthly explanation as plain text, or undefined when the API sends none. */
function pickMonthlyExplanation(raw: unknown): string | undefined {
  if (!Array.isArray(raw)) return undefined;
  const monthly = raw.filter(isRecord).find((e) => e.key === 'monthly');
  return monthly && typeof monthly.explanation === 'string' ? stripHtml(monthly.explanation) : undefined;
}

/** A finite number when the API sent one (number or numeric string), else undefined. */
function optNum(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** A trimmed non-empty string, else undefined. */
function optStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/** true for `true`, 1 or "1". BankKaro sends flags as a bool or an int. */
function isTrue(v: unknown): boolean {
  return v === true || v === 1 || v === '1';
}

/** true for `false`, 0 or "0". A missing value is not false here. */
function isFalse(v: unknown): boolean {
  return v === false || v === 0 || v === '0';
}

/** Pick the yearly explanation when present, else the monthly one, else the first. */
function pickExplanation(raw: unknown): string {
  if (!Array.isArray(raw)) return '';
  const items = raw.filter(isRecord);
  const chosen =
    items.find((e) => e.key === 'annual') ?? items.find((e) => e.key === 'monthly') ?? items[0];
  return chosen && typeof chosen.explanation === 'string' ? stripHtml(chosen.explanation) : '';
}

function mapCard(row: unknown): CardSavings | null {
  if (!isRecord(row)) return null;
  const alias = typeof row.seo_card_alias === 'string' ? row.seo_card_alias.trim() : '';
  if (!alias) return null;

  const lines: CardSavingsLine[] = [];
  const breakdown = row.spending_breakdown;
  if (isRecord(breakdown)) {
    for (const [key, value] of Object.entries(breakdown)) {
      if (!isRecord(value)) continue;
      const spend = Math.round(num(value.spend));
      if (spend <= 0) continue;
      const rawSavings = num(value.savings);
      const explanationMonthly = pickMonthlyExplanation(value.explanation);
      const savingsType = optStr(value.savings_type);
      const cashbackPct = optNum(value.cashback_percentage);
      const pointsEarned = optNum(value.points_earned);
      const pointValue = optNum(value.conv_rate);
      lines.push({
        key,
        label: QUESTION_BY_KEY[key]?.label ?? key,
        spend,
        savings: Math.round(rawSavings),
        rawSavings,
        explanation: pickExplanation(value.explanation),
        ...(explanationMonthly !== undefined ? { explanationMonthly } : {}),
        ...(savingsType !== undefined ? { savingsType } : {}),
        ...(cashbackPct !== undefined ? { cashbackPct } : {}),
        ...(pointsEarned !== undefined ? { pointsEarned } : {}),
        ...(pointValue !== undefined ? { pointValue } : {}),
        ...(isOutsideTotal(key) ? { outsideTotal: true as const } : {}),
      });
    }
  }
  // Stable sort: equal savings keep the API's key order.
  lines.sort((a, b) => b.savings - a.savings);

  const yearlySavings = Math.round(num(row.total_savings_yearly));
  const extraBenefits = Math.round(num(row.total_extra_benefits));
  const annualFee = Math.round(num(row.annual_fees));
  const travel = row.travel_benefits;
  const loungeValue = isRecord(travel) ? Math.round(num(travel.total_travel_benefit_annual)) : 0;
  const feeWaiverSpend = num(row.annual_fee_spends);
  // A missing or non-numeric `total_spends` reads as 0, so it never reaches a waiver above 0.
  const feeWaived = feeWaiverSpend > 0 && num(row.total_spends) * 12 >= feeWaiverSpend;
  const annualFeeCounted = feeWaived ? 0 : annualFee;
  const id =
    typeof row.id === 'number' && Number.isFinite(row.id)
      ? String(row.id)
      : typeof row.id === 'string' && row.id.trim() !== ''
        ? row.id.trim()
        : undefined;
  const joiningFee = Math.round(num(row.joining_fees));
  const bankName = optStr(row.bank_name);
  const imageUrl = optStr(row.image) ?? optStr(row.card_bg_image);
  const discontinued = isFalse(row.sourceable);
  const inviteOnly = isTrue(row.invite_only);
  return {
    alias,
    ...(id !== undefined ? { id } : {}),
    name: typeof row.card_name === 'string' ? row.card_name : alias,
    ...(bankName !== undefined ? { bankName } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    discontinued,
    inviteOnly,
    lifetimeFree: annualFee === 0 && joiningFee === 0 && !discontinued && !inviteOnly,
    monthlySavings: Math.round(num(row.total_savings)),
    yearlySavings,
    extraBenefits,
    joiningFee,
    annualFee,
    loungeValue,
    feeWaiverSpend,
    feeWaived,
    annualFeeCounted,
    netYearly: yearlySavings + extraBenefits + loungeValue - annualFeeCounted,
    lines,
  };
}

/**
 * Map the raw `calculate` response to CardSavings[]. Tolerant: a row with no alias is
 * dropped, a bad number becomes 0, fees arrive as strings like "588.8199999999999".
 * Returns [] when the shape is not `{ data: { savings: [...] } }`.
 */
export function mapCalculateResponse(raw: unknown): CardSavings[] {
  if (!isRecord(raw) || !isRecord(raw.data) || !Array.isArray(raw.data.savings)) return [];
  const out: CardSavings[] = [];
  for (const row of raw.data.savings) {
    try {
      const card = mapCard(row);
      if (card) out.push(card);
    } catch {
      // one odd row never fails the list
    }
  }
  return out;
}

/**
 * Sort a copy: netYearly high to low. Ties: higher yearlySavings, then lower annualFee,
 * then alias A to Z (so the order never changes between calls).
 */
export function rankByNetValue(list: CardSavings[]): CardSavings[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    if (b.netYearly !== a.netYearly) return b.netYearly - a.netYearly;
    if (b.yearlySavings !== a.yearlySavings) return b.yearlySavings - a.yearlySavings;
    if (a.annualFee !== b.annualFee) return a.annualFee - b.annualFee;
    // Plain comparison (not localeCompare) so Hermes and Node agree.
    return a.alias < b.alias ? -1 : a.alias > b.alias ? 1 : 0;
  });
}

/**
 * Compare the user's card with the best other card. `ranked` must already be ranked;
 * it may be a filtered list. When the user's card is filtered out of `ranked`, it is
 * looked up in `all` (the unfiltered list).
 * Returns null when the user's card is in neither list, or `ranked` has no other card.
 * 'equal' when the gap is under 1 rupee a year.
 */
export function beatMyCard(
  ranked: CardSavings[],
  myAlias: string,
  all?: CardSavings[],
): BeatResult | null {
  if (!Array.isArray(ranked) || !myAlias) return null;
  const mine =
    ranked.find((c) => c.alias === myAlias) ??
    (Array.isArray(all) ? all.find((c) => c.alias === myAlias) : undefined);
  const best = ranked.find((c) => c.alias !== myAlias);
  if (!mine || !best) return null;

  const gapYearly = best.netYearly - mine.netYearly;
  const verdict: BeatResult['verdict'] =
    Math.abs(gapYearly) < 1 ? 'equal' : gapYearly > 0 ? 'best_wins' : 'mine_wins';

  const rowsByKey = new Map<string, BeatRow>();
  const add = (card: CardSavings, side: 'mine' | 'best') => {
    for (const line of card.lines) {
      if (line.outsideTotal) continue;
      const row: BeatRow = rowsByKey.get(line.key) ?? {
        key: line.key,
        label: line.label,
        mine: 0,
        best: 0,
        // Both cards get the same spend, so either line gives it.
        spendYearly: line.spend * 12,
      };
      // Every rupee line is per month, whatever the key name says (`_annual` keys and
      // `life_insurance` take a yearly input but come back monthly), verified on UAT
      // 2026-11-18 (G45, G46 in the project knowledge file). Unrounded monthly x 12,
      // rounded once, so rows agree with the yearly total.
      row[side] = Math.round((line.rawSavings ?? line.savings) * 12);
      if (side === 'mine') row.mineLine = line;
      else row.bestLine = line;
      rowsByKey.set(line.key, row);
    }
  };
  add(mine, 'mine');
  add(best, 'best');
  const rows = [...rowsByKey.values()].sort(
    (a, b) => Math.abs(b.best - b.mine) - Math.abs(a.best - a.mine),
  );

  return { mine, best, gapYearly, verdict, rows };
}

// ── League table (one list for all four tools) ──────────────────────────────

/** List every calculate row, also cards the app does not list (no Apply, no card link). */
export const SHOW_CARDS_NOT_IN_APP = true;
/** Keep cards with `netYearly <= 0` in the list. Rank order puts them below the others. */
export const SHOW_LOSS_MAKING = true;
/** Keep cards with `sourceable` false in the list, labelled "Discontinued". */
export const SHOW_DISCONTINUED = true;

/** One league row. `C` is the app card type (CardModel in the app). */
export interface LeagueRowOf<C> {
  /** 1-based position in the full ranked league. It does not change when a filter hides rows. */
  rank: number;
  savings: CardSavings;
  /** The app card, when the join finds one. Only then can the screen show Apply or the card page. */
  card?: C;
}

/** The two join keys of an app card. */
export interface JoinableCard {
  id?: string;
  filterMeta?: { cardAlias?: string };
}

/**
 * Join calculate rows to app cards: by alias first, then by BankKaro id, only for
 * rows still without a card. One app card joins at most one row, and an alias
 * match always beats an id match.
 */
export function joinAppCards<C extends JoinableCard>(
  list: CardSavings[],
  appCards: C[],
): Map<CardSavings, C> {
  const matched = new Map<CardSavings, C>();
  if (!Array.isArray(list) || !Array.isArray(appCards)) return matched;
  const byAlias = new Map<string, C>();
  const byId = new Map<string, C>();
  for (const card of appCards) {
    const alias = card.filterMeta?.cardAlias;
    if (alias && !byAlias.has(alias)) byAlias.set(alias, card);
    if (card.id && !byId.has(card.id)) byId.set(card.id, card);
  }
  const used = new Set<C>();
  for (const savings of list) {
    const card = byAlias.get(savings.alias);
    if (card && !used.has(card)) {
      used.add(card);
      matched.set(savings, card);
    }
  }
  for (const savings of list) {
    if (matched.has(savings) || !savings.id) continue;
    const card = byId.get(savings.id);
    if (card && !used.has(card)) {
      used.add(card);
      matched.set(savings, card);
    }
  }
  return matched;
}

/**
 * League rows from a RANKED list. With `showNotInApp` false, rows without an app
 * card are left out and ranks count only the rows kept.
 */
export function buildLeague<C extends JoinableCard>(
  ranked: CardSavings[],
  appCards: C[] | undefined,
  showNotInApp: boolean = SHOW_CARDS_NOT_IN_APP,
): Array<LeagueRowOf<C>> {
  if (!Array.isArray(ranked)) return [];
  const matched = joinAppCards(ranked, appCards ?? []);
  const out: Array<LeagueRowOf<C>> = [];
  for (const savings of ranked) {
    const card = matched.get(savings);
    if (!card && !showNotInApp) continue;
    out.push({ rank: out.length + 1, savings, ...(card ? { card } : {}) });
  }
  return out;
}

/** A league row, or a bare CardSavings. The helpers below take either. */
type LeagueItem = CardSavings | { savings: CardSavings };

function savingsOf(item: LeagueItem): CardSavings {
  return 'savings' in item && isRecord(item.savings) ? item.savings : (item as CardSavings);
}

/** Yearly rupees saved on one key: round(raw monthly savings x 12) of the in-total line. 0 when absent. */
export function yearlyForKey(card: CardSavings, key: string): number {
  const lines = Array.isArray(card?.lines) ? card.lines : [];
  const line = lines.find((l) => l.key === key && !l.outsideTotal);
  return line ? Math.round((line.rawSavings ?? line.savings) * 12) : 0;
}

/** Extra benefits plus lounge value, rupees a year: the part of `netYearly` that is not spend savings or fee. */
export function extrasYearly(card: CardSavings): number {
  return card.extraBenefits + card.loungeValue;
}

/** Keys with a spend above 0, in question order. Lounge keys are left out. */
export function enteredKeys(spends: CalculateSpends): SpendKey[] {
  if (!isRecord(spends)) return [];
  return SPEND_QUESTIONS.filter((q) => q.unit !== 'visits' && num(spends[q.key]) > 0).map((q) => q.key);
}

/**
 * The user's spend, rupees a year: monthly rupee keys x 12, plus yearly-input keys
 * as they are. Lounge visits are not counted.
 */
export function totalYearlySpend(spends: CalculateSpends): number {
  if (!isRecord(spends)) return 0;
  let total = 0;
  for (const q of SPEND_QUESTIONS) {
    if (q.unit !== 'rupees') continue;
    const v = Math.max(0, num(spends[q.key]));
    total += isYearlyInput(q.key) ? v : v * 12;
  }
  return Math.round(total);
}

export interface LeagueFilters {
  lifetimeFreeOnly: boolean;
  includeInviteOnly: boolean;
}

export const DEFAULT_LEAGUE_FILTERS: LeagueFilters = {
  lifetimeFreeOnly: false,
  includeInviteOnly: true,
};

/** A filtered copy, order kept. Also applies SHOW_LOSS_MAKING and SHOW_DISCONTINUED. */
export function filterLeague<T extends LeagueItem>(list: T[], filters: LeagueFilters): T[] {
  if (!Array.isArray(list)) return [];
  const f = filters ?? DEFAULT_LEAGUE_FILTERS;
  return list.filter((item) => {
    const s = savingsOf(item);
    if (f.lifetimeFreeOnly && !s.lifetimeFree) return false;
    if (!f.includeInviteOnly && s.inviteOnly) return false;
    if (!SHOW_LOSS_MAKING && s.netYearly <= 0) return false;
    if (!SHOW_DISCONTINUED && s.discontinued) return false;
    return true;
  });
}

/**
 * 'net': rank order (rankByNetValue). 'savings': yearlySavings. 'extras': extrasYearly.
 * 'fee': annualFeeCounted (the fee after the waiver), low to high. { key }: yearlyForKey.
 */
export type LeagueSort = 'net' | 'savings' | 'extras' | 'fee' | { key: string };

/** A sorted copy. Every sort is high to low except 'fee'. Ties keep the 'net' order. */
export function sortLeague<T extends LeagueItem>(list: T[], sort: LeagueSort): T[] {
  if (!Array.isArray(list)) return [];
  const netOrder = new Map<CardSavings, number>();
  rankByNetValue(list.map(savingsOf)).forEach((s, i) => netOrder.set(s, i));
  const byNet = (a: T, b: T) => netOrder.get(savingsOf(a))! - netOrder.get(savingsOf(b))!;
  const value = (s: CardSavings): number => {
    if (typeof sort === 'object' && sort !== null) return yearlyForKey(s, sort.key);
    if (sort === 'savings') return s.yearlySavings;
    if (sort === 'extras') return extrasYearly(s);
    if (sort === 'fee') return -s.annualFeeCounted;
    return 0;
  };
  return [...list].sort((a, b) => {
    if (sort !== 'net') {
      const d = value(savingsOf(b)) - value(savingsOf(a));
      if (d !== 0) return d;
    }
    return byNet(a, b);
  });
}

/**
 * Indexes (into `list`) of rows whose card name or bank name contains `query`,
 * ignoring case and outer spaces. A row with an app card also matches on that card's
 * `name`. An empty query returns [].
 */
export function searchLeague<T extends LeagueItem>(list: T[], query: string): number[] {
  const q = typeof query === 'string' ? query.trim().toLowerCase() : '';
  if (!q || !Array.isArray(list)) return [];
  const out: number[] = [];
  list.forEach((item, i) => {
    const s = savingsOf(item);
    const appCard = 'card' in item && isRecord(item.card) ? item.card : undefined;
    const names = [s.name, s.bankName, typeof appCard?.name === 'string' ? appCard.name : undefined];
    if (names.some((n) => typeof n === 'string' && n.toLowerCase().includes(q))) out.push(i);
  });
  return out;
}
