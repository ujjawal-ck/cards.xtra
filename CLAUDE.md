# CLAUDE.md — Cards.xtra, powered by CashKaro

This file governs how code is generated in this repo. Read it fully before writing any code. Follow it exactly.

## What this project is

An **Expo / React Native** app (Android first; iOS not yet built) called **Cards.xtra, powered by CashKaro**: find a credit card, check eligibility, apply through a cashback-tracked link, shop partner stores for cashback, and withdraw earnings. It runs against production backends (CashKaro mini-app API and BankKaro partner API). This is the production app, so code must be clean, token-bound, tested and structured to grow.

The builder is a senior product designer with deep design-system experience but **no coding experience**. Optimize for correctness and clarity. Never leave placeholders that require coding knowledge to fill in. Everything must run.

Start with `README.md` and `docs/index.md`. Product decisions and their reasons live in `docs/decision.md`; add a dated entry when you make a new one.

## Tech stack (already installed — do not reinstall)

- Expo SDK 54, React Native 0.81 (new architecture), TypeScript + JavaScript (entry is App.js). Read the versioned Expo docs at https://docs.expo.dev/versions/v54.0.0/ before writing Expo code: the APIs have changed.
- Navigation: React Navigation 7 (native stack + custom bottom tabs)
- Data: TanStack React Query; session in expo-secure-store; response contracts with zod
- Bottom sheet: @gorhom/bottom-sheet (+ react-native-gesture-handler, react-native-reanimated)
- Fonts: @expo-google-fonts/outfit, expo-font
- Native extras: Firebase (`@react-native-firebase/*`) and the local module `modules/cashback-guard`. Because of these the app runs as a **development build**, not in Expo Go.

babel.config.js must include 'react-native-reanimated/plugin' as the LAST plugin. App.js must have import 'react-native-gesture-handler'; as its FIRST line.

## Folder structure (atomic)

- src/tokens/ — design tokens (colors.ts, spacing.ts, typography.ts, index.ts). Do not change without design sign-off.
- src/atoms/ → src/molecules/ → src/organisms/ — components, smallest to largest
- src/screens/ — one file per screen; src/screens/withdraw/ is the withdraw stack
- src/navigation/ — RootNavigator (stack), TabNavigator (tabs + floating nav), route types
- src/api/ — `http/` (client, errors, token manager, monitor), one file per backend/domain, `schemas/`, mappers
- src/query/ — React Query hooks used by screens
- src/auth/, src/analytics/, src/lib/, src/config/, src/data/, src/assets/
- docs/ — documentation; docs/archive/ holds older handoffs and logs (read-only history)

## TOKENS ARE LAW

Every color, spacing, radius, font size, and text style MUST come from src/tokens. Never hardcode a hex value, a pixel font size, or a magic spacing number. Import like: import { colors, spacing, radius, typography } from '../tokens'; (adjust depth).

- Colors: use the SEMANTIC layer only (colors.action.primary.default, colors.text.primary, colors.cashback.default, colors.surface.default, ...). Never use primitives.* directly in components.
- Type: apply a named style object, e.g. style={typography.heading20SemiBold}. Do not set fontFamily/fontSize/fontWeight by hand.
- Primary action color is Saffron orange (colors.action.primary.default = #ff6d1d), and it is the only solid button colour. The blue (colors.action.accent.default = Cobalt #0741ef) is the ACCENT, used for links and secondary emphasis — NOT a primary button color. Get this right; it defines the brand.

If you need a value not in tokens, add it to the correct token file with a clear name and comment — never inline it.

## Naming rules

- React component files & exports: PascalCase (Button, CardTile, HomeScreen).
- Name components semantically (what it is), never contextually (where it sits): CardTile, not HomeCardThing.
- No redundant suffixes (ButtonComponent), no version markers (CardTileV2), no -web variants (mobile-only).
- Props camelCase. Variants as a variant prop (Button: primary | secondary | tertiary | accent | destructive), sizes as size (sm | md | lg).

## Fonts

Outfit, loaded at startup via @expo-google-fonts/outfit. App.js loads Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold and does not render the app until fonts are ready. The typography tokens reference these exact family names.

## Rules for changes

- **Network:** every request goes through `src/api/http/client.ts`. Only GETs, or writes explicitly marked idempotent, are retried. Validate new responses with a schema in `src/api/schemas`.
- **Click-outs:** every card "Apply Now" and store "Shop & Earn" goes through `src/lib/useClickOut.tsx`, so the click is attributed to the CashKaro user and logged.
- **No fake data** in anything a user can reach. If real data isn't available, show an honest empty or error state (`organisms/ScreenState`).
- **Money:** keep exact amounts (₹99.60 must never become a withdrawable ₹100). Format with `src/lib/money.ts`.
- **Secrets:** keys come from `.env` (gitignored, see `.env.example`). Never commit keys, real phone numbers or emails.
- **Analytics:** add new event names to `src/analytics/events.ts`; never send personal data in event params.
- **Before committing:** `npm run typecheck` and `npm test` must pass (CI runs both on every push). For UI changes, check on a real Android phone at 360 dp width and 130 % font size.

## When unsure

Prefer the simplest thing that runs and matches the design tokens. Ask the user to view it on their phone and report back rather than guessing at pixel perfection.
