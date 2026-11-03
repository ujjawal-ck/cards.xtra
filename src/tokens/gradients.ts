/**
 * gradients.ts — Gradient tokens (extracted from Figma named gradient styles)
 * SOURCE OF TRUTH: Figma file P7UcoZYBnfyefmJIA8wcM7, local paint styles "gradient/*".
 *
 * Render with expo-linear-gradient:
 *   import { LinearGradient } from 'expo-linear-gradient';
 *   import { gradients } from '../tokens';
 *   <LinearGradient {...gradients.premium} style={...} />
 *
 * Each entry provides `colors`, plus `start`/`end` points approximating the Figma angle.
 * (RN LinearGradient uses start/end unit coords, not degrees.) Radial uses a separate note.
 */

// Helper angle->start/end (unit square). 45deg = top-left to bottom-right, etc.
// Provided inline per gradient for clarity.

export const gradients = {
  // Brand
  primary:   { colors: ['#0036da', '#4670f6'],            start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // 45deg
  premium:   { colors: ['#4670f6', '#6f3ad8', '#8a54e7'], locations: [0, 0.55, 1], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  reward:    { colors: ['#ff6d1d', '#fecf2d'],            start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  urgent:    { colors: ['#da2760', '#ff3535'],            start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  /**
   * gradient.dark — deep violet band (violet[800] #341b7d → violet[600]
   * #5a2db8). The named "gradient/dark" style is EMPTY on the Figma side
   * (a Figma-side gap), so these stops/angle are reconstructed from the
   * "Did You Shop?" CTA banner (node 4129:27642): near-horizontal, a slight
   * bottom-left→top-right tilt (~13.7°), with stops at 14.6% / 85.4%.
   * start/end approximate the 13.7° tilt; `locations` carry the stop %s.
   */
  dark:      { colors: ['#341b7d', '#5a2db8'], locations: [0.146, 0.854], start: { x: 0, y: 0.62 }, end: { x: 1, y: 0.38 } },
  success:   { colors: ['#0f7a3e', '#3ddc84'],            start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },

  // Surfaces (vertical, 90deg)
  surfaceCool:    { colors: ['#f5f7f9', '#a6e2f4'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  surfaceWarm:    { colors: ['#ffffff', '#fad3e2'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  surfaceNeutral: { colors: ['#ffffff', '#d9e3ec'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  surfaceCalm:    { colors: ['#f0f3dc', '#dcf3df', '#f0f3dc'], locations: [0, 0.5, 1], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },

  // Accents / specials
  tagPills:     { colors: ['#ebf0ff', '#ffffff'], locations: [0, 0.75], start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  inviteOnly:   { colors: ['#783c2e', '#ffdf75', '#783c2e'], locations: [0, 0.5, 1], start: { x: 0.1, y: 1 }, end: { x: 0.9, y: 0 } }, // ~-74deg
  roseDeep:     { colors: ['#e66492', '#8f2549'], start: { x: 0, y: 1 }, end: { x: 0, y: 0 } }, // -90deg
  amberSaffron: { colors: ['#d9a100', '#8a3404'], start: { x: 0, y: 1 }, end: { x: 0, y: 0 } },
  cobaltToWhite:{ colors: ['#0741ef', '#ffffff'], start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  saffronFade:  { colors: ['#ffe6d6', '#ffffff', '#ffffff'], locations: [0, 0.79, 0.94], start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },

  /**
   * spotlight is RADIAL in Figma: #ffffff -> #ffc299@55% -> #ff6d1d.
   * expo-linear-gradient can't do radial. Use expo-linear-gradient's
   * RadialGradient if available, or approximate with a radial library.
   * Colors preserved here for whoever renders it:
   */
  spotlightRadial: { type: 'radial', colors: ['#ffffff', '#ffc299', '#ff6d1d'], locations: [0, 0.55, 1] },

  /**
   * gradient.warning — gold/amber RADIAL (center #e2b522 → edge #8d5b00).
   * Used as the bottom-sheet hero background on EligibilityMasthead's
   * 'maybe' variant. Same caveat as spotlightRadial — expo-linear-gradient
   * can't draw radial; render via react-native-svg's <RadialGradient/>
   * and reference the colors here.
   */
  warning: { type: 'radial', colors: ['#e2b522', '#8d5b00'], locations: [0, 1] },

  /**
   * gradient.errorRadial — red RADIAL (center #e85b5e → #ba4547 → edge
   * #8d2f31). Bottom-sheet hero background on EligibilityMasthead's
   * 'ineligible' variant (Figma 3762:85818). Raw inline radial in Figma
   * (no named style — same gap as `warning`); render via react-native-svg's
   * <RadialGradient/>.
   */
  errorRadial: { type: 'radial', colors: ['#e85b5e', '#ba4547', '#8d2f31'], locations: [0, 0.5, 1] },

  /**
   * gradient.slate150Cobalt150 — pale slate → pale lavender-blue,
   * vertical bottom→top. Used as the Selected-state bg on the
   * Selector atom (Figma 2839:201786). The Figma token name says
   * "slate-150 → cobalt-150" but the resolved `to` stop is #d7e1fe
   * (cobalt-150 is untokenized on the Figma side — same gap as
   * `warning` above). Verified against the live read.
   */
  slate150Cobalt150: {
    colors: ['#f5f7f9', '#d7e1fe'],
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
  },
} as const;
