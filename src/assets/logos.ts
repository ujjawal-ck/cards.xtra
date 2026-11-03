/**
 * Logo SVG registry — the brand wordmarks live in
 * src/assets/images/logos/ as both PNG (for Image-based callers) and
 * SVG (for crisp, tintable rendering via react-native-svg). This file
 * exposes the SVG variants as React components.
 *
 * Spec sizes:
 *   small → 114 × 56
 *   big   → larger variant (uses its native viewBox; pass width/height)
 *
 * Theme:
 *   light → white-toned mark (use on dark surfaces — masthead)
 *   dark  → dark-toned mark  (use on light surfaces — frosted bar)
 *
 * Usage:
 *   import { logos } from '../assets/logos';
 *   const Logo = logos.lightSmall;
 *   return <Logo width={114} height={56} />;
 */
import LogoLightSmall from './images/logos/logo-light-small.svg';
import LogoLightBig from './images/logos/logo-light-big.svg';
import LogoDarkSmall from './images/logos/logo-dark-small.svg';
import LogoDarkBig from './images/logos/logo-dark-big.svg';
import LogoBrandColor from './images/logos/logo-brand-color.svg';

export const logos = {
  lightSmall: LogoLightSmall,
  lightBig: LogoLightBig,
  darkSmall: LogoDarkSmall,
  darkBig: LogoDarkBig,
  /** Full-colour stacked lockup (cobalt X mark over "CARDS.xtra"), native
   *  viewBox 175 × 117.6. For light surfaces — used on the post-OTP greeting. */
  brandColor: LogoBrandColor,
} as const;

export type LogoName = keyof typeof logos;
