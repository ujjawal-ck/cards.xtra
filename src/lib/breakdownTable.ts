/**
 * DS-ADD(ds-figma-1, 2026-11-17): totals and "better side" for the two-column BreakdownTable.
 * Rollback: delete this file, its test, and src/molecules/BreakdownTable.tsx.
 */

export interface BreakdownRowData {
  label: string;
  /** Value for the first column ("Your pick"). Whole or fractional rupees; negative = a cost. */
  a: number;
  /** Value for the second column ("Our pick"). */
  b: number;
}

export type BetterSide = 'a' | 'b' | 'tie';

/** Which side is better. Higher is better unless `lowerIsBetter`. Equal or non-finite → 'tie'. */
export function betterSide(a: number, b: number, lowerIsBetter = false): BetterSide {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return 'tie';
  const aWins = lowerIsBetter ? a < b : a > b;
  return aWins ? 'a' : 'b';
}

/** Column totals. Sums in paise so 0.1 + 0.2 stays exact. */
export function breakdownTotals(rows: BreakdownRowData[]): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const r of rows) {
    a += Math.round((Number.isFinite(r.a) ? r.a : 0) * 100);
    b += Math.round((Number.isFinite(r.b) ? r.b : 0) * 100);
  }
  return { a: a / 100, b: b / 100 };
}
