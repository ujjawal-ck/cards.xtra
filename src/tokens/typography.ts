/**
 * typography.ts — Type scale tokens
 *
 * SOURCE OF TRUTH: mini-app Figma "typography" collection + local text styles.
 * Font family: Outfit (primary), SF Pro (fallback — native default on iOS).
 *
 * IMPORTANT — how fonts work in React Native vs Figma/CSS:
 *   In CSS you write { fontFamily: 'Outfit', fontWeight: 700 }.
 *   In React Native, each weight is a SEPARATE font, loaded by name:
 *     Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold,
 *     Outfit_700Bold, Outfit_800ExtraBold
 *   These names come from the @expo-google-fonts/outfit package (installed
 *   in the setup step). So we set `fontFamily` to the specific variant and
 *   do NOT use `fontWeight`.
 *
 * Each entry below is a complete RN text style object — drop it straight
 * onto a <Text style={typography.heading20SemiBold}> and it matches Figma.
 */

// Raw font family variant names (these are the keys we load at startup)
export const fontFamily = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semiBold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extraBold: 'Outfit_800ExtraBold',
} as const;

// Raw scales (px) — available if you need to compose custom styles
export const fontSize = {
  10: 10, 12: 12, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18, 20: 20,
  22: 22, 24: 24, 26: 26, 28: 28, 30: 30, 32: 32, 36: 36, 40: 40, 48: 48,
} as const;

export const letterSpacing = {
  extraTight: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  extraWide: 0.8,
} as const;

/**
 * The type scale — named EXACTLY to mirror your Figma text styles.
 * Naming: <category><size><weight>, e.g. Figma "Heading/20/Semi Bold"
 * becomes `heading20SemiBold`.
 */
export const typography = {
  // --- Display ---
  display40ExtraBold: { fontFamily: fontFamily.extraBold, fontSize: 40, lineHeight: 48, letterSpacing: -0.4 },
  display40Bold:      { fontFamily: fontFamily.bold,      fontSize: 40, lineHeight: 48, letterSpacing: -0.4 },
  display40SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 40, lineHeight: 48, letterSpacing: -0.4 },
  display36ExtraBold: { fontFamily: fontFamily.extraBold, fontSize: 36, lineHeight: 42, letterSpacing: -0.4 },
  display36Bold:      { fontFamily: fontFamily.bold,      fontSize: 36, lineHeight: 42, letterSpacing: -0.4 },
  display36SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 36, lineHeight: 42, letterSpacing: -0.4 },
  display32Bold:      { fontFamily: fontFamily.bold,      fontSize: 32, lineHeight: 40, letterSpacing: -0.4 },
  display32SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 32, lineHeight: 40, letterSpacing: -0.4 },
  display32Regular:   { fontFamily: fontFamily.regular,   fontSize: 32, lineHeight: 40, letterSpacing: -0.4 },

  // --- Heading ---
  heading30ExtraBold: { fontFamily: fontFamily.extraBold, fontSize: 30, lineHeight: 38, letterSpacing: 0 },
  heading30Bold:      { fontFamily: fontFamily.bold,      fontSize: 30, lineHeight: 38, letterSpacing: -0.4 },
  heading30SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 30, lineHeight: 38, letterSpacing: -0.4 },
  heading28ExtraBold: { fontFamily: fontFamily.extraBold, fontSize: 28, lineHeight: 36, letterSpacing: 0 },
  heading28Bold:      { fontFamily: fontFamily.bold,      fontSize: 28, lineHeight: 36, letterSpacing: -0.4 },
  heading28SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 28, lineHeight: 36, letterSpacing: -0.4 },
  heading26Bold:      { fontFamily: fontFamily.bold,      fontSize: 26, lineHeight: 34, letterSpacing: -0.4 },
  heading26SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 26, lineHeight: 34, letterSpacing: -0.4 },
  heading24ExtraBold: { fontFamily: fontFamily.extraBold, fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  heading24Bold:      { fontFamily: fontFamily.bold,      fontSize: 24, lineHeight: 32, letterSpacing: -0.4 },
  heading24SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 24, lineHeight: 32, letterSpacing: -0.4 },
  heading24Medium:    { fontFamily: fontFamily.medium,    fontSize: 24, lineHeight: 32, letterSpacing: -0.4 },
  heading22Bold:      { fontFamily: fontFamily.bold,      fontSize: 22, lineHeight: 30, letterSpacing: 0 },
  heading22SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 22, lineHeight: 30, letterSpacing: 0 },
  heading22Medium:    { fontFamily: fontFamily.medium,    fontSize: 22, lineHeight: 30, letterSpacing: 0 },
  heading22Regular:   { fontFamily: fontFamily.regular,   fontSize: 22, lineHeight: 30, letterSpacing: 0 },
  heading20Bold:      { fontFamily: fontFamily.bold,      fontSize: 20, lineHeight: 28, letterSpacing: 0 },
  heading20SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 20, lineHeight: 28, letterSpacing: 0 },
  heading20Medium:    { fontFamily: fontFamily.medium,    fontSize: 20, lineHeight: 28, letterSpacing: 0 },
  heading20Regular:   { fontFamily: fontFamily.regular,   fontSize: 20, lineHeight: 28, letterSpacing: 0 },
  heading18SemiBold:  { fontFamily: fontFamily.semiBold,  fontSize: 18, lineHeight: 26, letterSpacing: 0 },
  heading18Medium:    { fontFamily: fontFamily.medium,    fontSize: 18, lineHeight: 26, letterSpacing: 0 },
  heading18Regular:   { fontFamily: fontFamily.regular,   fontSize: 18, lineHeight: 26, letterSpacing: 0 },
  heading16ExtraBold: { fontFamily: fontFamily.extraBold, fontSize: 16, lineHeight: 24, letterSpacing: 0.4 },

  // --- Body ---
  body17SemiBold: { fontFamily: fontFamily.semiBold, fontSize: 17, lineHeight: 25, letterSpacing: 0 },
  body17Medium:   { fontFamily: fontFamily.medium,   fontSize: 17, lineHeight: 25, letterSpacing: 0 },
  body17Regular:  { fontFamily: fontFamily.regular,  fontSize: 17, lineHeight: 25, letterSpacing: 0 },
  body16Bold:     { fontFamily: fontFamily.bold,     fontSize: 16, lineHeight: 24, letterSpacing: 0.4 },
  body16SemiBold: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  body16Medium:   { fontFamily: fontFamily.medium,   fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  body16Regular:  { fontFamily: fontFamily.regular,  fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  body15SemiBold: { fontFamily: fontFamily.semiBold, fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  body15Medium:   { fontFamily: fontFamily.medium,   fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  body15Regular:  { fontFamily: fontFamily.regular,  fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  body14Bold:     { fontFamily: fontFamily.bold,     fontSize: 14, lineHeight: 20, letterSpacing: 0.4 },
  body14SemiBold: { fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 20, letterSpacing: 0.4 },
  body14Medium:   { fontFamily: fontFamily.medium,   fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  body14Regular:  { fontFamily: fontFamily.regular,  fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  body12SemiBold: { fontFamily: fontFamily.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  body12Medium:   { fontFamily: fontFamily.medium,   fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  body12Regular:  { fontFamily: fontFamily.regular,  fontSize: 12, lineHeight: 16, letterSpacing: 0 },

  // --- Caption ---
  caption10SemiBold: { fontFamily: fontFamily.semiBold, fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
  caption10Medium:   { fontFamily: fontFamily.medium,   fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
  caption10Regular:  { fontFamily: fontFamily.regular,  fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
} as const;
