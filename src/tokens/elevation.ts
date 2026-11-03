/**
 * elevation.ts — Shadow / elevation tokens (from Figma effect styles "Shadow/*").
 * SOURCE: Figma P7UcoZYBnfyefmJIA8wcM7, 18 local effect styles.
 *
 * RN note: React Native shadows differ by platform.
 *  - iOS uses shadowColor/shadowOffset/shadowOpacity/shadowRadius.
 *  - Android uses `elevation` (a single number) + shadowColor (API 28+).
 * Each token below provides iOS fields + an approx Android `elevation`.
 * Figma spread is ignored (RN iOS has no spread). Use via spread into a style:
 *   <View style={[styles.card, elevation.light.md]} />
 */
type Shadow = {
  shadowColor: string; shadowOffset: { width: number; height: number };
  shadowOpacity: number; shadowRadius: number; elevation: number;
};
const s = (y: number, blur: number, opacity: number, color = '#000000', androidEl = blur): Shadow => ({
  shadowColor: color, shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity, shadowRadius: blur, elevation: androidEl,
});

export const elevation = {
  light: {
    xs: s(1, 2, 0.06),  sm: s(2, 8, 0.08),  md: s(4, 16, 0.10),
    lg: s(8, 24, 0.12), xl: s(16, 32, 0.14),
    up: s(-4, 16, 0.10),
    // glow — soft, generous, low-opacity diffusion ("excess light" look).
    // Large blur + small offset + a gentle Android elevation so the shadow
    // reads as a soft halo on both platforms, not a hard drop. Used on the
    // Review Us counter tiles and review cards.
    glow: s(6, 24, 0.10, '#000000', 5),
  },
  neutral: {
    xs: s(1, 2, 0.10),  sm: s(2, 8, 0.14),  md: s(4, 16, 0.18),
    lg: s(8, 24, 0.22), xl: s(16, 32, 0.26),
    up: s(-4, 16, 0.18),
  },
  brand: { // saffron-tinted glow
    xs: s(1, 2, 0.08, '#ff6d1d'),  sm: s(2, 8, 0.12, '#ff6d1d'),
    md: s(4, 16, 0.16, '#ff6d1d'), lg: s(8, 24, 0.20, '#ff6d1d'),
    xl: s(16, 32, 0.24, '#ff6d1d'), up: s(-4, 16, 0.16, '#ff6d1d'),
  },
} as const;
