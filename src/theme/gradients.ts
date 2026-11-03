/**
 * Brand gradients & decorative illustration colours.
 *
 * Why this file lives outside src/tokens: tokens/ is the locked semantic
 * layer (see CLAUDE.md). The gradients here compose primitives into
 * named brand surfaces so screens still consume *named* values, never
 * raw stops. If/when colors.ts is unlocked, move these into a
 * `colors.gradient.*` block and delete this file.
 */
import { primitives } from '../tokens';

export const gradients = {
  /** Login + OTP hero — dark navy to teal. */
  authHero: [primitives.cobalt[1000], primitives.sky[500]] as const,
  /** Home header — cobalt to violet. */
  homeHeader: [primitives.cobalt[500], primitives.violet[500]] as const,
  /** Twilight Iris — Violet→Cobalt. Fills the gradient "call you?" span on the
   *  NameInput screen. Mapped to the nearest existing primitives: the Violet
   *  ramp into the Cobalt accent — a dusky purple settling into brand blue. */
  twilightIris: [primitives.violet[500], primitives.cobalt[500]] as const,
  /** Premium — Cobalt→Violet (the DS "gradient/premium" style). Fills the
   *  user's first name on the greeting. Stops map 1:1 to existing primitives:
   *  cobalt[400] → violet[500] → violet[400]. */
  premium: [
    primitives.cobalt[400],
    primitives.violet[500],
    primitives.violet[400],
  ] as const,
} as const;

/**
 * Illustration colours for the "floating cards" decoration in hero
 * surfaces. Illustration content, not UI surfaces — kept distinct from
 * the action / surface semantic tokens.
 */
export const decorativeCardColors = [
  primitives.saffron[500],
  primitives.violet[500],
  primitives.fern[500],
  primitives.sky[400],
] as const;
