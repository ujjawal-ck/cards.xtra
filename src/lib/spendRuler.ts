/**
 * DS-ADD(ds-figma-1, 2026-11-17): value <-> scroll offset maths for the SpendCard ruler, and the +/- stepper clamp.
 * Rollback: delete this file, its test, and src/molecules/SpendCard.tsx.
 */
import { clampAmount } from './amountInput';

export interface RulerConfig {
  min: number;
  max: number;
  /** Value change per tick. */
  step: number;
  /** Pixels between two ticks. */
  tickGap: number;
}

/** Number of ticks, both ends included. */
export function tickCount({ min, max, step }: RulerConfig): number {
  return Math.floor((max - min) / step) + 1;
}

/** Snap any value to the nearest tick and keep it in range. */
export function snapValue(value: number, cfg: RulerConfig): number {
  const { min, max, step } = cfg;
  const ticks = Math.round((clampAmount(value, min, max) - min) / step);
  return clampAmount(min + ticks * step, min, max);
}

/** Scroll offset (px) at which `value` sits under the centre mark. */
export function valueToOffset(value: number, cfg: RulerConfig): number {
  return ((snapValue(value, cfg) - cfg.min) / cfg.step) * cfg.tickGap;
}

/** Value under the centre mark for a scroll offset. Offsets outside the ruler clamp to the ends. */
export function offsetToValue(offset: number, cfg: RulerConfig): number {
  const idx = Math.round(offset / cfg.tickGap);
  return clampAmount(cfg.min + idx * cfg.step, cfg.min, cfg.max);
}

/** The "+" / "-" buttons. Always returns a value on a tick, inside [min, max]. */
export function stepValue(value: number, direction: 1 | -1, cfg: RulerConfig): number {
  return snapValue(snapValue(value, cfg) + direction * cfg.step, cfg);
}

/** True when a label shows under this tick index (every `every` ticks, starting at the first). */
export function isLabelTick(index: number, every: number): boolean {
  return every > 0 && index % every === 0;
}
