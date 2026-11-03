/**
 * opacity.ts — Opacity scale + alpha overlay colors (from Figma "opacity" collection).
 * SOURCE: Figma P7UcoZYBnfyefmJIA8wcM7. Numeric names = the percentage value.
 *
 * `opacity` = node-level opacity (0..1) for the `opacity` style prop.
 * `alpha` = rgba overlay colors (black/white at each step) for overlays/scrims/borders.
 */
export const opacity = {
  0: 0,        // fully transparent · invisible
  8: 0.08,     // hover overlay · tappable surfaces
  12: 0.12,    // pressed state · subtle dividers
  16: 0.16,    // card outlines · light borders
  24: 0.24,    // medium borders · soft scrims
  32: 0.32,    // soft scrims · disabled chrome
  40: 0.40,    // disabled state · medium scrim
  50: 0.50,    // modal scrim · standard overlay
  80: 0.80,    // heavy scrim · image protection
  90: 0.90,    // near-opaque · scrolled-header translucency
  100: 1,      // fully opaque
} as const;

export const alpha = {
  black: {
    8: 'rgba(0,0,0,0.08)',  12: 'rgba(0,0,0,0.12)', 16: 'rgba(0,0,0,0.16)',
    24: 'rgba(0,0,0,0.24)', 32: 'rgba(0,0,0,0.32)', 40: 'rgba(0,0,0,0.40)',
    50: 'rgba(0,0,0,0.50)', 80: 'rgba(0,0,0,0.80)',
  },
  white: {
    8: 'rgba(255,255,255,0.08)',  12: 'rgba(255,255,255,0.12)', 16: 'rgba(255,255,255,0.16)',
    24: 'rgba(255,255,255,0.24)', 32: 'rgba(255,255,255,0.32)', 40: 'rgba(255,255,255,0.40)',
    50: 'rgba(255,255,255,0.50)', 80: 'rgba(255,255,255,0.80)',
  },
} as const;
