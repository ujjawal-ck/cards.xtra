/**
 * DS-ADD(ds-figma-1, 2026-11-17): step states and connector kinds for the vertical Stepper.
 * Rollback: delete this file, its test, src/atoms/StepIndicator.tsx and src/molecules/Stepper.tsx.
 */

export type StepState = 'done' | 'current' | 'locked';
export type StepLineKind = 'done' | 'pending';

/**
 * State of each step from the index of the current step.
 * Steps before it are done, the step at it is current, steps after it are locked.
 * An index below 0 means nothing is done and nothing is current (all locked).
 * An index at or beyond the count means every step is done.
 */
export function stepStates(count: number, currentIndex: number): StepState[] {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const cur = Number.isFinite(currentIndex) ? Math.floor(currentIndex) : -1;
  return Array.from({ length: n }, (_, i) => (i < cur ? 'done' : i === cur ? 'current' : 'locked'));
}

/** The connector under a step is dark when that step is done (the path to the next step is walked), otherwise light. */
export function stepLineKind(state: StepState): StepLineKind {
  return state === 'done' ? 'done' : 'pending';
}
