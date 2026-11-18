/**
 * beatView: pure helpers for the "Beat my card" screens (pick and result).
 * No React, no tokens, no network. Money is rupees a year. No rate is written
 * here: rates come from the API line at run time.
 */
import type { BeatResult, BeatRow, CardSavings, CardSavingsLine } from './cardTools';
import { formatINR } from './money';
import type { BreakdownRowData } from './breakdownTable';

/** The part of a league row these helpers read. */
export interface PickItem {
  savings: CardSavings;
  card?: { name: string };
}

export function pickName(item: PickItem): string {
  return item.card?.name ?? item.savings.name;
}

/** Bank names with the card count, most cards first, then A to Z. */
export function pickBanks(list: PickItem[]): Array<{ bank: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of list) {
    const bank = item.savings.bankName?.trim();
    if (bank) counts.set(bank, (counts.get(bank) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([bank, count]) => ({ bank, count }))
    .sort((a, b) => b.count - a.count || a.bank.localeCompare(b.bank));
}

/** Rows of one bank (all rows when `bank` is null) whose name or bank contains the query. */
export function filterPickRows<T extends PickItem>(list: T[], bank: string | null, query: string): T[] {
  const q = query.trim().toLowerCase();
  return list.filter((item) => {
    if (bank && item.savings.bankName?.trim() !== bank) return false;
    if (!q) return true;
    return (
      pickName(item).toLowerCase().includes(q) ||
      item.savings.name.toLowerCase().includes(q) ||
      (item.savings.bankName ?? '').toLowerCase().includes(q)
    );
  });
}

export type HeroKind = 'other_wins' | 'mine_wins' | 'tie';

export function heroKind(verdict: BeatResult['verdict']): HeroKind {
  return verdict === 'best_wins' ? 'other_wins' : verdict === 'mine_wins' ? 'mine_wins' : 'tie';
}

export function heroTitle(kind: HeroKind): string {
  return kind === 'other_wins' ? 'A better card wins' : kind === 'mine_wins' ? 'Your card wins' : 'It is a tie';
}

/** "X wins by ₹Y a year", or null on a tie. `gap` is other minus mine. */
export function winLine(gap: number, otherName: string): string | null {
  if (Math.abs(gap) < 1) return null;
  return gap > 0
    ? `${otherName} wins by ${formatINR(gap)} a year`
    : `Your card wins by ${formatINR(-gap)} a year`;
}

export type RowWinner = 'mine' | 'other' | 'tie';

export function rowWinner(row: Pick<BeatRow, 'mine' | 'best'>): RowWinner {
  return row.best > row.mine ? 'other' : row.mine > row.best ? 'mine' : 'tie';
}

/** "X wins by ₹N" for one category row, or null on a tie. */
export function rowFooter(row: Pick<BeatRow, 'mine' | 'best'>, otherName: string): string | null {
  const w = rowWinner(row);
  if (w === 'tie') return null;
  const by = formatINR(Math.abs(row.best - row.mine));
  return w === 'other' ? `${otherName} wins by ${by}` : `Your card wins by ${by}`;
}

/**
 * Rows for the BreakdownTable. Columns add up to `netYearly`:
 * savings + milestones + lounge - the fee counted. The lounge row shows only
 * when either card has a lounge value. The fee row shows when either card lists
 * a fee, and counts 0 where the bank waives it.
 */
export function beatTableRows(mine: CardSavings, other: CardSavings): BreakdownRowData[] {
  const rows: BreakdownRowData[] = [
    { label: 'Spend savings', a: mine.yearlySavings, b: other.yearlySavings },
    { label: 'Milestone benefits', a: mine.extraBenefits, b: other.extraBenefits },
  ];
  if (mine.loungeValue > 0 || other.loungeValue > 0) {
    rows.push({ label: 'Lounge benefits', a: mine.loungeValue, b: other.loungeValue });
  }
  if (mine.annualFee > 0 || other.annualFee > 0) {
    rows.push({ label: 'Annual fee', a: -mine.annualFeeCounted, b: -other.annualFeeCounted });
  }
  return rows;
}

/** Which cards have a waived fee: a line for under the table, or null. */
export function waivedNote(mine: CardSavings, other: CardSavings, otherName: string): string | null {
  const names = [...(mine.feeWaived ? ['Your card'] : []), ...(other.feeWaived ? [otherName] : [])];
  return names.length > 0 ? `Waived at your spend: ${names.join(' and ')}.` : null;
}

/** Rate text of one API line, or undefined when the API sent neither a percentage nor points. */
export function lineRate(line: CardSavingsLine | undefined): string | undefined {
  if (!line) return undefined;
  if (typeof line.cashbackPct === 'number' && line.cashbackPct > 0) {
    return `${line.cashbackPct}% back`;
  }
  if (typeof line.pointsEarned === 'number' && line.pointsEarned > 0) {
    const pts = `${Math.round(line.pointsEarned * 12).toLocaleString('en-IN')} points a year`;
    return typeof line.pointValue === 'number' && line.pointValue > 0
      ? `${pts}, ${formatINR(line.pointValue)} each`
      : pts;
  }
  return undefined;
}

/** One card's text in the expanded category block. */
export function lineDetail(who: string, line: CardSavingsLine | undefined, yearlySavings: number): string {
  if (!line) return `${who}: no savings on this spend.`;
  const parts = [`${who}: saves ${formatINR(yearlySavings)} a year`];
  const rate = lineRate(line);
  if (rate) parts.push(rate);
  const head = parts.join(', ') + '.';
  return line.explanation ? `${head} ${line.explanation}` : head;
}

/**
 * The best card the user can apply for in this app that beats the user's card:
 * first row with an app card, not the user's card, with a higher net yearly
 * that is also above 0 (a loss-making card is never pushed). `list` is in rank order.
 */
export function bestApplicable<T extends { savings: CardSavings; card?: unknown }>(
  list: T[],
  myAlias: string,
  mineNet: number,
): T | undefined {
  return list.find((r) => !!r.card && r.savings.alias !== myAlias && r.savings.netYearly > mineNet && r.savings.netYearly > 0);
}
