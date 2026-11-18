/**
 * Rotation maths for the Home tools row. Pure, no tokens.
 *
 * One timer ticks every TOOLS_ROW_TICK_MS. A word stays for TICKS_PER_WORD
 * ticks (2 x 2100 = 4200 ms). The two rotating tiles are half a cycle apart:
 * phase 0 (category) changes on even ticks, phase 1 (brands) on odd ticks,
 * so they never change on the same tick. Both show word 0 at tick 0; the
 * brands tile therefore shows its first word for one tick only (2100 ms),
 * then 4200 ms per word.
 */
export const TOOLS_ROW_TICK_MS = 2100;
export const TICKS_PER_WORD = 2;

export type RotationPhase = 0 | 1;

/** Index of the word a tile shows at `tick`. Wraps at `length`. */
export function rotatingWordIndex(tick: number, phase: RotationPhase, length: number): number {
  if (length <= 0) return 0;
  return Math.floor((tick + phase) / TICKS_PER_WORD) % length;
}
