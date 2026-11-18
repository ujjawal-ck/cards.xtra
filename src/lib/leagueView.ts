/**
 * leagueView: pure helpers for the league table screen (ToolResultsScreen),
 * its row (LeagueCardRow) and its two sheets (EditSpendsSheet,
 * SavingsBreakdownSheet). No React, no tokens: everything here is unit tested.
 *
 * Money is rupees a year unless a name says month. Rates are never written
 * here: a rate on screen comes from the API line at run time ("X%").
 */
import type { CalculateSpends } from '../api/types';
import type { CardTypeTagKind } from './tagVariants';
import {
  SPEND_QUESTIONS,
  TOOL_CATEGORIES,
  brandColumns,
  enteredKeys,
  yearlyForKey,
  type CardSavings,
  type CardSavingsLine,
  type LeagueSort,
  type SpendKey,
  type SpendQuestion,
} from './cardTools';

export type ResultTool = 'ultimate' | 'category' | 'brands' | 'beat';

/** One "By category" cell column. */
export interface LeagueColumn {
  key: SpendKey;
  label: string;
}

const LABEL_BY_KEY: Record<string, string> = Object.fromEntries(SPEND_QUESTIONS.map((q) => [q.key, q.label]));

/**
 * The "By category" columns: one per entered key (`enteredKeys`). For the
 * brands tool, the labels are the picked brand names (`brandColumns`), and only
 * keys with a spend above 0 are kept. Falls back to the question labels.
 */
export function leagueColumns(tool: ResultTool, spends: CalculateSpends, brandIds?: string[]): LeagueColumn[] {
  const entered = enteredKeys(spends);
  if (tool === 'brands' && Array.isArray(brandIds) && brandIds.length > 0) {
    const set = new Set<string>(entered);
    const cols = brandColumns(brandIds).filter((c) => set.has(c.key));
    if (cols.length > 0) return cols;
  }
  return entered.map((key) => ({ key, label: LABEL_BY_KEY[key] ?? key }));
}

/** One choice of the "Sort by" control. `id` is stable, for state and keys. */
export interface SortOption {
  id: string;
  label: string;
  sort: LeagueSort;
}

/** Annual savings (default), Savings, Milestones, Lowest fee, then one per column. */
export function sortOptions(columns: LeagueColumn[]): SortOption[] {
  return [
    { id: 'net', label: 'Annual savings', sort: 'net' },
    { id: 'savings', label: 'Savings', sort: 'savings' },
    { id: 'extras', label: 'Milestones', sort: 'extras' },
    { id: 'fee', label: 'Lowest fee', sort: 'fee' },
    ...(Array.isArray(columns) ? columns : []).map((c) => ({ id: `key:${c.key}`, label: c.label, sort: { key: c.key } })),
  ];
}

/**
 * Questions the edit sheet lists: all 21 for 'ultimate' and 'beat'; for
 * 'category' and 'brands' only the keys present in `answers`, in question order.
 */
export function editKeys(tool: ResultTool, answers: Partial<Record<SpendKey, number>>): SpendKey[] {
  if (tool === 'ultimate' || tool === 'beat') return SPEND_QUESTIONS.map((q) => q.key);
  const a = answers && typeof answers === 'object' ? answers : {};
  return SPEND_QUESTIONS.filter((q) => a[q.key] !== undefined).map((q) => q.key);
}

/** One item of the edit sheet list: a category heading or a question. */
export type EditSheetItem =
  | { type: 'group'; id: string; label: string }
  | { type: 'question'; id: string; question: SpendQuestion };

/**
 * A flat list for the edit sheet: each category label once, then its questions,
 * in question order. Unknown keys are dropped. No keys (or undefined) means all 21.
 */
export function editSheetItems(keys?: SpendKey[]): EditSheetItem[] {
  const wanted = Array.isArray(keys) ? new Set<string>(keys) : undefined;
  const out: EditSheetItem[] = [];
  let lastGroup: string | undefined;
  for (const q of SPEND_QUESTIONS) {
    if (wanted && !wanted.has(q.key)) continue;
    if (q.group !== lastGroup) {
      lastGroup = q.group;
      const label = TOOL_CATEGORIES.find((c) => c.id === q.group)?.label ?? q.group;
      out.push({ type: 'group', id: `group:${q.group}`, label });
    }
    out.push({ type: 'question', id: q.key, question: q });
  }
  return out;
}

/** The highest yearly savings of each key among `list`. A key is left out when no card saves above 0 on it. */
export function topByKey(list: CardSavings[], keys: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (!Array.isArray(list) || !Array.isArray(keys)) return out;
  for (const key of keys) {
    let best = 0;
    for (const s of list) best = Math.max(best, yearlyForKey(s, key));
    if (best > 0) out[key] = best;
  }
  return out;
}

/** The status labels of a card, in a fixed order. */
export function cardLabels(s: CardSavings): CardTypeTagKind[] {
  const out: CardTypeTagKind[] = [];
  if (s?.lifetimeFree) out.push('lifetimeFree');
  if (s?.inviteOnly) out.push('inviteOnly');
  if (s?.discontinued) out.push('discontinued');
  return out;
}

/**
 * The CashKaro Rewards text of an app card, built like CardTile and
 * CardDetailSheet build it: "<Flat|Upto> <value> Rewards". undefined when the
 * card carries no reward value.
 */
export function rewardText(card?: { cashbackValue?: string; rewardPrefix?: 'Flat' | 'Upto' }): string | undefined {
  const value = typeof card?.cashbackValue === 'string' ? card.cashbackValue.trim() : '';
  if (!value) return undefined;
  return `${card?.rewardPrefix ?? 'Flat'} ${value} Rewards`;
}

/** The next search match, wrapping at both ends. 0 when there are no matches. */
export function stepCursor(cursor: number, count: number, dir: 1 | -1): number {
  if (!(count > 0)) return 0;
  const c = Number.isFinite(cursor) ? Math.trunc(cursor) : 0;
  return (((c + dir) % count) + count) % count;
}

/** The parts of one row's sum. savings + milestones + lounge - feeCounted = net. */
export interface RowSum {
  savings: number;
  milestones: number;
  lounge: number;
  /** The listed annual fee. */
  fee: number;
  /** The fee counted in `net`: 0 when waived. */
  feeCounted: number;
  feeWaived: boolean;
  net: number;
}

export function rowSum(s: CardSavings): RowSum {
  return {
    savings: s.yearlySavings,
    milestones: s.extraBenefits,
    lounge: s.loungeValue,
    fee: s.annualFee,
    feeCounted: s.annualFeeCounted,
    feeWaived: s.feeWaived,
    net: s.netYearly,
  };
}

/** The card's in-total lines with a spend above 0 (lounge lines left out), in the card's order. */
export function breakdownLines(s: CardSavings): CardSavingsLine[] {
  const lines = Array.isArray(s?.lines) ? s.lines : [];
  return lines.filter((l) => !l.outsideTotal && l.spend > 0);
}

export type BreakdownPeriod = 'year' | 'month';

/** What the API says about the rate of one line. undefined when it sent neither a percentage nor points. */
export type LineRate =
  | { kind: 'percent'; percent: number }
  | { kind: 'points'; points: number; pointValue?: number };

/** Figures of one line for the Yearly / Monthly toggle. Line spend and savings are per month in the API. */
export interface LineFigures {
  spend: number;
  savings: number;
  rate?: LineRate;
  explanation: string;
}

export function lineFigures(line: CardSavingsLine, period: BreakdownPeriod): LineFigures {
  const raw = line.rawSavings ?? line.savings;
  const yearly = period === 'year';
  let rate: LineRate | undefined;
  if (line.cashbackPct !== undefined) {
    rate = { kind: 'percent', percent: line.cashbackPct };
  } else if (line.pointsEarned !== undefined) {
    const points = yearly ? line.pointsEarned * 12 : line.pointsEarned;
    rate = {
      kind: 'points',
      points: Math.round(points * 100) / 100,
      ...(line.pointValue !== undefined ? { pointValue: line.pointValue } : {}),
    };
  }
  return {
    spend: yearly ? line.spend * 12 : line.spend,
    savings: yearly ? Math.round(raw * 12) : Math.round(raw),
    ...(rate ? { rate } : {}),
    explanation: yearly ? line.explanation : line.explanationMonthly ?? line.explanation,
  };
}

/**
 * Ruler range for one question in the edit sheet: the question's `rulerMax`,
 * or, when a saved answer is above it, that answer rounded up to a whole step
 * (never above the typed `max`), so the ruler does not cut the value.
 */
export function rulerRange(q: SpendQuestion, value: number): { max: number } {
  const v = Number.isFinite(value) ? value : 0;
  if (v <= q.rulerMax) return { max: q.rulerMax };
  return { max: Math.min(q.max, Math.ceil(v / q.step) * q.step) };
}

/** Index of the row whose card alias is `alias`, or -1. */
export function indexOfAlias<T extends { savings: CardSavings }>(list: T[], alias: string | undefined): number {
  if (!alias || !Array.isArray(list)) return -1;
  return list.findIndex((r) => r.savings.alias === alias);
}
