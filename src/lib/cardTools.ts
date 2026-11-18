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
 *  - Rank by NET yearly value: yearly savings + extra benefits - annual fee.
 *    BankKaro's own order (`roi`) is undocumented, so we do not use it.
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

export interface SpendQuestion {
  key: SpendKey;
  /** Short name, e.g. "Amazon". Used in breakdown rows and chips. */
  label: string;
  /** Full question, e.g. "How much do you spend on Amazon in a month?" */
  question: string;
  /** The unit the user answers in. Lounge visits are asked per year and sent per quarter. */
  period: SpendPeriod;
  /** 'rupees' (default) or 'visits' (lounge keys). */
  unit: 'rupees' | 'visits';
  min: number;
  max: number;
  step: number;
  /** true for the 6 questions asked first. The other 15 sit behind "Add more spends". */
  core: boolean;
}

/** All 21 questions. The 6 core ones come first, in ask order. */
export const SPEND_QUESTIONS: SpendQuestion[] = [
  { key: 'amazon_spends', label: 'Amazon', question: 'How much do you spend on Amazon in a month?', period: 'month', unit: 'rupees', min: 0, max: 50000, step: 500, core: true },
  { key: 'flipkart_spends', label: 'Flipkart', question: 'How much do you spend on Flipkart in a month?', period: 'month', unit: 'rupees', min: 0, max: 50000, step: 500, core: true },
  { key: 'other_online_spends', label: 'Other online shopping', question: 'How much do you spend on other online shopping in a month?', period: 'month', unit: 'rupees', min: 0, max: 50000, step: 500, core: true },
  { key: 'online_food_ordering', label: 'Food delivery', question: 'How much do you spend on food delivery in a month?', period: 'month', unit: 'rupees', min: 0, max: 30000, step: 500, core: true },
  { key: 'grocery_spends_online', label: 'Online groceries', question: 'How much do you spend on online groceries in a month?', period: 'month', unit: 'rupees', min: 0, max: 30000, step: 500, core: true },
  { key: 'fuel', label: 'Fuel', question: 'How much do you spend on fuel in a month?', period: 'month', unit: 'rupees', min: 0, max: 30000, step: 500, core: true },

  { key: 'dining_or_going_out', label: 'Dining out', question: 'How much do you spend on dining out in a month?', period: 'month', unit: 'rupees', min: 0, max: 30000, step: 500, core: false },
  { key: 'offline_grocery', label: 'Groceries at stores', question: 'How much do you spend on groceries at stores in a month?', period: 'month', unit: 'rupees', min: 0, max: 30000, step: 500, core: false },
  { key: 'other_offline_spends', label: 'Other shopping at stores', question: 'How much do you spend on other shopping at stores in a month?', period: 'month', unit: 'rupees', min: 0, max: 50000, step: 500, core: false },
  { key: 'mobile_phone_bills', label: 'Mobile and broadband bills', question: 'How much are your mobile and broadband bills in a month?', period: 'month', unit: 'rupees', min: 0, max: 10000, step: 100, core: false },
  { key: 'electricity_bills', label: 'Electricity bills', question: 'How much is your electricity bill in a month?', period: 'month', unit: 'rupees', min: 0, max: 20000, step: 500, core: false },
  { key: 'water_bills', label: 'Water bills', question: 'How much is your water bill in a month?', period: 'month', unit: 'rupees', min: 0, max: 5000, step: 100, core: false },
  { key: 'rent', label: 'Rent', question: 'How much rent do you pay in a month?', period: 'month', unit: 'rupees', min: 0, max: 100000, step: 1000, core: false },
  { key: 'school_fees', label: 'School fees', question: 'How much do you pay in school fees in a month?', period: 'month', unit: 'rupees', min: 0, max: 50000, step: 1000, core: false },
  { key: 'insurance_health_annual', label: 'Health insurance', question: 'How much is your health insurance premium in a year?', period: 'year', unit: 'rupees', min: 0, max: 100000, step: 1000, core: false },
  { key: 'insurance_car_or_bike_annual', label: 'Car or bike insurance', question: 'How much is your car or bike insurance premium in a year?', period: 'year', unit: 'rupees', min: 0, max: 100000, step: 1000, core: false },
  { key: 'life_insurance', label: 'Life insurance', question: 'How much is your life insurance premium in a year?', period: 'year', unit: 'rupees', min: 0, max: 200000, step: 1000, core: false },
  { key: 'flights_annual', label: 'Flights', question: 'How much do you spend on flights in a year?', period: 'year', unit: 'rupees', min: 0, max: 500000, step: 5000, core: false },
  { key: 'hotels_annual', label: 'Hotels', question: 'How much do you spend on hotels in a year?', period: 'year', unit: 'rupees', min: 0, max: 500000, step: 5000, core: false },
  { key: 'domestic_lounge_usage_quarterly', label: 'Domestic lounge visits', question: 'How many times do you use a domestic airport lounge in a year?', period: 'year', unit: 'visits', min: 0, max: 40, step: 1, core: false },
  { key: 'international_lounge_usage_quarterly', label: 'International lounge visits', question: 'How many times do you use an international airport lounge in a year?', period: 'year', unit: 'visits', min: 0, max: 40, step: 1, core: false },
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
}

/** The user can pick at most this many brands (great.cards uses 5). */
export const MAX_BRANDS = 5;

export const TOOL_BRANDS: ToolBrand[] = [
  { id: 'amazon', name: 'Amazon', key: 'amazon_spends', exact: true },
  { id: 'flipkart', name: 'Flipkart', key: 'flipkart_spends', exact: true },
  { id: 'myntra', name: 'Myntra', key: 'other_online_spends', exact: false, groupLabel: 'Counted as online shopping' },
  { id: 'ajio', name: 'Ajio', key: 'other_online_spends', exact: false, groupLabel: 'Counted as online shopping' },
  { id: 'nykaa', name: 'Nykaa', key: 'other_online_spends', exact: false, groupLabel: 'Counted as online shopping' },
  { id: 'swiggy', name: 'Swiggy', key: 'online_food_ordering', exact: false, groupLabel: 'Counted as food delivery' },
  { id: 'zomato', name: 'Zomato', key: 'online_food_ordering', exact: false, groupLabel: 'Counted as food delivery' },
  { id: 'blinkit', name: 'Blinkit', key: 'grocery_spends_online', exact: false, groupLabel: 'Counted as online groceries' },
  { id: 'zepto', name: 'Zepto', key: 'grocery_spends_online', exact: false, groupLabel: 'Counted as online groceries' },
  { id: 'bigbasket', name: 'BigBasket', key: 'grocery_spends_online', exact: false, groupLabel: 'Counted as online groceries' },
];

/** Brand names the Home tile rotates through, in order. */
export const ROTATING_BRANDS: string[] = ['Myntra', 'Swiggy', 'Flipkart', 'Amazon'];

/** A spend category for "Find best card for <category>". */
export interface ToolCategory {
  id: string;
  /** e.g. "Groceries". Also the word the Home tile rotates through. */
  label: string;
  /** The calculate keys this category fills. The monthly amount is split evenly across them. */
  keys: SpendKey[];
  /** Where the spend picker starts, rupees per month. The user can change it. */
  defaultMonthly: number;
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  { id: 'online-shopping', label: 'Online Shopping', keys: ['amazon_spends', 'flipkart_spends', 'other_online_spends'], defaultMonthly: 9000 },
  { id: 'groceries', label: 'Groceries', keys: ['grocery_spends_online', 'offline_grocery'], defaultMonthly: 8000 },
  { id: 'food-ordering', label: 'Food Ordering', keys: ['online_food_ordering'], defaultMonthly: 4000 },
  { id: 'dining', label: 'Dining', keys: ['dining_or_going_out'], defaultMonthly: 4000 },
  { id: 'fuel', label: 'Fuel', keys: ['fuel'], defaultMonthly: 5000 },
  { id: 'travel', label: 'Travel', keys: ['flights_annual', 'hotels_annual'], defaultMonthly: 8000 },
  { id: 'bills', label: 'Bills', keys: ['mobile_phone_bills', 'electricity_bills', 'water_bills'], defaultMonthly: 4500 },
];

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
  /**
   * true on lounge lines (`*_lounge_usage_quarterly`). BankKaro shows a lounge
   * value on the line, but that value is NOT in `total_savings` or
   * `total_savings_yearly` (it sits in the card's travel benefits). Never sum
   * these lines with the others: the result would disagree with the totals.
   * They are left out of `beatMyCard` rows and `topReason`.
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
  monthlySavings: number;
  yearlySavings: number;
  /** `total_extra_benefits`: milestone and welcome value per year. */
  extraBenefits: number;
  joiningFee: number;
  annualFee: number;
  /** yearlySavings + extraBenefits - annualFee. Can be negative. */
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
  rows: Array<{ key: string; label: string; mine: number; best: number }>;
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

/**
 * Body for "Find best card for <category>". `monthly` rupees are split evenly across
 * the category's keys. A key the API takes as a yearly input (question `period:
 * 'year'`, e.g. `_annual` keys and `life_insurance`) gets its share times 12.
 * An unknown id returns EMPTY_SPENDS.
 */
export function spendsForCategory(categoryId: string, monthly: number): CalculateSpends {
  const out: CalculateSpends = { ...EMPTY_SPENDS };
  const category = TOOL_CATEGORIES.find((c) => c.id === categoryId);
  const amount = num(monthly);
  if (!category || category.keys.length === 0 || amount <= 0) return out;
  const share = amount / category.keys.length;
  for (const key of category.keys) {
    // Each share is rounded to whole rupees (the API takes whole numbers).
    out[key] = Math.round(isYearlyInput(key) ? share * 12 : share);
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
      lines.push({
        key,
        label: QUESTION_BY_KEY[key]?.label ?? key,
        spend,
        savings: Math.round(rawSavings),
        rawSavings,
        explanation: pickExplanation(value.explanation),
        ...(isOutsideTotal(key) ? { outsideTotal: true as const } : {}),
      });
    }
  }
  // Stable sort: equal savings keep the API's key order.
  lines.sort((a, b) => b.savings - a.savings);

  const yearlySavings = Math.round(num(row.total_savings_yearly));
  const extraBenefits = Math.round(num(row.total_extra_benefits));
  const annualFee = Math.round(num(row.annual_fees));
  const id =
    typeof row.id === 'number' && Number.isFinite(row.id)
      ? String(row.id)
      : typeof row.id === 'string' && row.id.trim() !== ''
        ? row.id.trim()
        : undefined;
  return {
    alias,
    ...(id !== undefined ? { id } : {}),
    name: typeof row.card_name === 'string' ? row.card_name : alias,
    monthlySavings: Math.round(num(row.total_savings)),
    yearlySavings,
    extraBenefits,
    joiningFee: Math.round(num(row.joining_fees)),
    annualFee,
    netYearly: yearlySavings + extraBenefits - annualFee,
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

/** The explanation of the card's best line, or undefined when the card has no line with savings. */
export function topReason(card: CardSavings): string | undefined {
  const lines = Array.isArray(card?.lines) ? card.lines : [];
  let best: CardSavingsLine | undefined;
  for (const line of lines) {
    if (line.outsideTotal) continue;
    if (line.savings > 0 && (!best || line.savings > best.savings)) best = line;
  }
  return best?.explanation ? best.explanation : undefined;
}

/**
 * Compare the user's card with the best other card. `ranked` must already be ranked.
 * Returns null when the user's card is not in the list or the list has no other card.
 * 'equal' when the gap is under 1 rupee a year.
 */
export function beatMyCard(ranked: CardSavings[], myAlias: string): BeatResult | null {
  if (!Array.isArray(ranked) || !myAlias) return null;
  const mine = ranked.find((c) => c.alias === myAlias);
  const best = ranked.find((c) => c.alias !== myAlias);
  if (!mine || !best) return null;

  const gapYearly = best.netYearly - mine.netYearly;
  const verdict: BeatResult['verdict'] =
    Math.abs(gapYearly) < 1 ? 'equal' : gapYearly > 0 ? 'best_wins' : 'mine_wins';

  const rowsByKey = new Map<string, { key: string; label: string; mine: number; best: number }>();
  const add = (card: CardSavings, side: 'mine' | 'best') => {
    for (const line of card.lines) {
      if (line.outsideTotal) continue;
      const row = rowsByKey.get(line.key) ?? { key: line.key, label: line.label, mine: 0, best: 0 };
      // Every rupee line is per month, whatever the key name says (`_annual` keys and
      // `life_insurance` take a yearly input but come back monthly), verified on UAT
      // 2026-11-18 (G45, G46 in the project knowledge file). Unrounded monthly x 12,
      // rounded once, so rows agree with the yearly total.
      row[side] = Math.round((line.rawSavings ?? line.savings) * 12);
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
