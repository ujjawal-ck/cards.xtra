/**
 * DS-ADD(ds-expansion-1, 2026-11-17): motion durations and the standard easing.
 * Rollback: delete this file and its DS-ADD export block in src/tokens/index.ts.
 *
 * motion.ts — motion tokens
 *
 * Values are the ones already most used in src/ (650 pulse, 320, 220, 120).
 * The easing is the one AmountSkeleton / HomeSkeleton use for the pulse.
 */
import { Easing } from 'react-native-reanimated';

export const motion = {
  duration: {
    /** Press feedback, small toggles (ms). */
    fast: 120,
    /** Default UI transition, e.g. a progress fill (ms). */
    base: 220,
    /** Larger movement (ms). */
    slow: 320,
    /** One half-cycle of the loading pulse (ms). */
    pulse: 650,
  },
  easing: {
    standard: Easing.inOut(Easing.quad),
  },
} as const;
