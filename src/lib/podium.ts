/**
 * DS-ADD(ds-figma-1, 2026-11-17): bar heights and winner for the PodiumCompare molecule.
 * 2026-11-18: podiumWinner now returns 'none' when both values are 0 or less (a loss is never a win).
 * Rollback: delete this file, its test, and src/molecules/PodiumCompare.tsx.
 */

export type PodiumWinner = 'a' | 'b' | 'none';

/** Winner of two rupee values. Equal, both 0 or less, or non-finite → 'none'. */
export function podiumWinner(a: number, b: number): PodiumWinner {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return 'none';
  if (a <= 0 && b <= 0) return 'none';
  return a > b ? 'a' : 'b';
}

/**
 * Bar heights in px. The larger value gets `maxHeight`, the other is scaled but never below
 * `minHeight` (so a small value still shows a bar). Values <= 0 get `minHeight`.
 */
export function podiumHeights(
  a: number,
  b: number,
  maxHeight: number,
  minHeight: number,
): { a: number; b: number } {
  const top = Math.max(a, b, 0);
  const h = (v: number) =>
    top <= 0 || !(v > 0) ? minHeight : Math.max(minHeight, Math.round((v / top) * maxHeight));
  return { a: h(a), b: h(b) };
}
