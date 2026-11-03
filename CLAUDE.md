# CLAUDE.md — mini-app (Cards.xtra, powered by CashKaro)

This file governs how code is generated in this repo. Read it fully before writing any code. Follow it exactly.

## What this project is

An **Expo / React Native** mobile app (iOS + Android) for a stakeholder demo. It is a credit-card-comparison app called **Cards.xtra, powered by CashKaro**. This is NOT a throwaway prototype — it is the real foundation of the production app, so code must be clean, token-bound, and structured to grow.

The builder is a senior product designer with deep design-system experience but **no coding experience**. Optimize for correctness and clarity. Never leave placeholders that require coding knowledge to fill in. Everything must run.

## Tech stack (already installed — do not reinstall)

- Expo SDK 54, React Native, JavaScript (the app entry is App.js; .ts/.tsx are fine for new files and tokens)
- Navigation: @react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs
- react-native-screens, react-native-safe-area-context
- Bottom sheet: @gorhom/bottom-sheet (+ react-native-gesture-handler, react-native-reanimated)
- Fonts: @expo-google-fonts/outfit, expo-font

babel.config.js must include 'react-native-reanimated/plugin' as the LAST plugin. App.js must have import 'react-native-gesture-handler'; as its FIRST line.

## Folder structure (atomic — already created under src/)

- src/tokens/ — design tokens (DONE — colors.ts, spacing.ts, typography.ts, index.ts). DO NOT modify.
- src/atoms/ — smallest components: Text, Button, Input, OtpBox, Tag, Chip
- src/molecules/ — combinations: SearchBar, CardTile, FilterRow, PartnerCard
- src/organisms/ — larger assemblies: CardList, PartnerGrid, CardDetailSheet
- src/screens/ — full screens: LoginScreen, OtpScreen, HomeScreen, OffersScreen, EarningsScreen, ProfileScreen
- src/navigation/ — navigators: RootNavigator (stack), TabNavigator (bottom tabs)
- src/assets/ — images

## TOKENS ARE LAW

Every color, spacing, radius, font size, and text style MUST come from src/tokens. Never hardcode a hex value, a pixel font size, or a magic spacing number. Import like: import { colors, spacing, radius, typography } from '../tokens'; (adjust depth).

- Colors: use the SEMANTIC layer only (colors.action.primary.default, colors.text.primary, colors.cashback.default, colors.surface.default, ...). Never use primitives.* directly in components.
- Type: apply a named style object, e.g. style={typography.heading20SemiBold}. Do not set fontFamily/fontSize/fontWeight by hand.
- Primary action color is Saffron orange (colors.action.primary.default = #ff6d1d). The blue (colors.action.accent.default = Cobalt #0741ef) is the ACCENT, used for links and secondary emphasis — NOT the primary button color. Get this right; it defines the brand.

If you need a value not in tokens, add it to the correct token file with a clear name and comment — never inline it.

## Naming rules

- React component files & exports: PascalCase (Button, CardTile, LoginScreen).
- Name components semantically (what it is), never contextually (where it sits): CardTile, not HomeCardThing.
- No redundant suffixes (ButtonComponent), no version markers (CardTileV2), no -web variants (mobile-only).
- Props camelCase. Variants as a variant prop (Button: primary | secondary | tertiary | accent | destructive), sizes as size (sm | md | lg).

## Fonts

Outfit, loaded at startup via @expo-google-fonts/outfit. App.js (or a font hook) loads: Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold and does not render the app until fonts are ready (splash/loading guard). The typography tokens already reference these exact family names.

## SCOPE — build ONLY this for the demo

Four-screen core flow + working bottom tab bar. Do not build other screens.

1. LoginScreen — branded hero (dark navy→teal gradient, Cards.xtra logo, "Find The Perfect Card in Seconds" faded heading, model image), white bottom area with "Log in or Sign up", phone Input, primary "Get OTP" Button, terms footer. "Get OTP" navigates to OtpScreen.
2. OtpScreen — same hero, "Enter OTP", "Sent to <number> · Change", 4 OtpBox digit cells, "Resend OTP in: 30s", primary "Submit" Button navigates into the Tab navigator (Home tab).
3. HomeScreen (Home tab) — gradient header (logo + notification bell with badge), "Earn Upto ₹2,000 Cashback" hero with floating card images, SearchBar, filter row (Category dropdown, Filters, Eligibility toggle), a vertical list of CardTiles, a horizontal "Find the best card by category" carousel. Tapping any CardTile opens the CardDetailSheet.
4. OffersScreen (Offers tab) — orange header with SearchBar, horizontal category circles (New on CashKaro, Fashion, Food & Grocery, ...), 2-column grid of PartnerCards (brand logo + image + blue "Shop & Earn upto X%" button).

Bottom tabs (4): Home, Offers, Earnings, Profile.
- Home & Offers: full (above).
- Earnings: real screen showing a "no earnings yet" empty state (simple, on-brand). Navigable; no interactions needed.
- Profile: real screen showing a profile landing layout (avatar, name, list of menu rows). Navigable; no interactions needed.

### NON-NEGOTIABLE INTERACTION — Card Detail bottom sheet

Tapping a CardTile on Home opens CardDetailSheet using @gorhom/bottom-sheet:
- Opens as a partial sheet (snap point ~55-60% of screen height) over Home.
- On the first upward scroll/drag, it expands to full screen (top snap ~95-100%) — the Blinkit / Zomato pattern.
- Content (scrollable, use the sheet's scroll component): card hero image, card name, cashback tag, a 2-col benefits grid, "Best for spending on" row, fees block (Annual / Joining), sticky "Apply Now" CTA (orange = primary).
- Must feel smooth. If anything is cut for time, cut detail-page content depth, never this interaction.

## Demo delivery

Must run via Expo Go (QR) on a physical phone, and export to web as backup. Keep Expo-Go-compatible (no custom native modules beyond the libraries listed).

## Build order

1. Atoms: Text, Button, Input, OtpBox, Tag, Chip.
2. App.js + font loading + gesture-handler import + NavigationContainer.
3. Navigation: RootNavigator (stack: Login -> Otp -> MainTabs), TabNavigator.
4. Molecules: SearchBar, CardTile, PartnerCard, FilterRow.
5. Screens: Login, Otp, Home (with CardDetailSheet), Offers, Earnings, Profile.
6. Wire CardTile -> CardDetailSheet. Verify scroll-to-expand.

After each step, ensure the app still runs (no red error screen). Use realistic placeholder data (Indian banks: HDFC, SBI, Axis; cashback ₹ values; partners: Amazon, Flipkart, Ajio) so the demo looks real. Use simple colored placeholder boxes / emoji for card and partner images where real assets aren't available — never leave broken image refs.

## When unsure

Prefer the simplest thing that runs and matches the design tokens. Ask the user to view it on their phone and report back rather than guessing at pixel perfection. Pixel-tightening is a fast follow, not a blocker.
