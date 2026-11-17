/**
 * DS-ADD(ds-expansion-1, 2026-11-17): percentage widths for bars and progress.
 * Rollback: delete this file, its test, and the parts that import it
 * (src/molecules/BarBreakdown.tsx, StackedBar.tsx, src/atoms/StepProgress.tsx).
 *
 * chartMath — pure width maths for BarBreakdown, StackedBar and StepProgress.
 */

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** value / total as a 0..1 fraction, clamped. total <= 0 → 0. */
export function progressFraction(value: number, total: number): number {
  if (!(total > 0) || !isFinite(value)) return 0;
  return clamp01(value / total);
}

/**
 * Bar widths in percent (0..100), one per value. Scale is `max` when given,
 * else the largest value. Negative values count as 0; values above `max` are
 * capped at 100. All zero → all 0.
 */
export function barWidths(values: number[], max?: number): number[] {
  const safe = values.map((v) => (isFinite(v) && v > 0 ? v : 0));
  const scale = max != null && max > 0 ? max : Math.max(0, ...safe);
  if (scale <= 0) return safe.map(() => 0);
  return safe.map((v) => clamp01(v / scale) * 100);
}

/** Stacked segment widths in percent; they sum to 100 (or are all 0 when the total is 0). */
export function stackedWidths(values: number[]): number[] {
  const safe = values.map((v) => (isFinite(v) && v > 0 ? v : 0));
  const total = safe.reduce((a, b) => a + b, 0);
  if (total <= 0) return safe.map(() => 0);
  return safe.map((v) => (v / total) * 100);
}
