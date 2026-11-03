/**
 * spacing.ts — Spacing, radius, border-width, and size tokens
 * SOURCE OF TRUTH: mini-app Figma "values" + "sizes" collections.
 */

// Spacing scale (px) — from Figma "values" collection
export const spacing = {
  0: 0, 2: 2, 4: 4, 6: 6, 8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 20: 20,
  24: 24, 32: 32, 40: 40, 48: 48, 64: 64, 80: 80, 96: 96, 128: 128,
} as const;

// Border radius (px)
export const radius = {
  none: 0, xs: 4, sm: 8, md: 10, lg: 12, xl: 16,
  '2xl': 24, '3xl': 32, '4xl': 48, full: 10000,
} as const;

// Border widths (px)
export const borderWidth = {
  0: 0, hairline: 0.5, thin: 1, iconDefault: 1.25,
  thick: 1.5, heavy: 2, extra: 3,
} as const;

// Icon sizes (px)
export const iconSize = {
  8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 20: 20,
  24: 24, 32: 32, 40: 40, 48: 48, 56: 56,
} as const;

// Avatar sizes (px)
export const avatarSize = {
  24: 24, 32: 32, 40: 40, 56: 56, 64: 64, 80: 80,
} as const;

// Media sizes (px) — heights for brand/partner logos, illustrations,
// and other contained image media. Distinct from iconSize because the
// usage is semantically different (logos, not icons) and the scale
// often diverges.
export const mediaSize = {
  16: 16, 24: 24, 32: 32, 40: 40, 48: 48, 56: 56, 64: 64,
} as const;

// Touch targets & component heights (px) — from Figma "sizes" collection
export const sizing = {
  touchMin: 44,
  touchComfortable: 48,
  containerMobile: 360,
  containerMaxWidth: 412,
  inputHeight: 44,
  headerHeight: 56,
  bottomNavHeight: 64,
  /** HelpTicketCard bank-logo box (Figma 4129:27646). Fixed 74×32 frame
   *  holding a card/logo image under a 1px border. 74 has no slot on the
   *  spacing/media scale, so it lives here as a named one-off; the height
   *  pairs with mediaSize[32]. */
  ticketLogoW: 74,
  ticketLogoH: 32,
} as const;
