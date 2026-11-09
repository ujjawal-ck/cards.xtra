# Development guide

How to set up, run, test and ship Cards.xtra. For why things are built the way they are, see `decision.md`; for the code rules (tokens, naming, structure), see `../CLAUDE.md`.

## Stack

- Expo SDK 54, React Native 0.81 (new architecture), TypeScript + JavaScript. Entry: `App.js` (gesture-handler import first, font loading, providers).
- Navigation: React Navigation 7 (native stack + custom bottom tabs).
- Data: TanStack React Query; session in `expo-secure-store`.
- UI: design tokens in `src/tokens` (colours, spacing, typography — "tokens are law"), Outfit font, `@gorhom/bottom-sheet`, Reanimated 4, Lottie, Rive (one animation), `expo-video` (Home hero).
- Native extras: Firebase Analytics (`@react-native-firebase/*`) and a local Expo module, `modules/cashback-guard` (Android "Never Miss Cashback" reminder). Because of these, the app runs in a **development build**, not Expo Go.

## Folder map

| Path | What's there |
|---|---|
| `src/tokens` | Colours (primitives + semantic), spacing, radius, typography, gradients. Don't change without design sign-off. |
| `src/atoms`, `src/molecules`, `src/organisms` | Components, smallest to largest (Button, Input, OtpInput… CardTile, SearchBar… CardDetailSheet, Masthead, BottomNav…). |
| `src/screens` | One file per screen; `src/screens/withdraw/*` is the withdraw stack. |
| `src/navigation` | `RootNavigator` (stack), `TabNavigator` (tabs + floating nav), route types, status-bar and sheet Back helpers. |
| `src/api` | HTTP client and one file per backend/domain (`cashkaro.ts`, `bankkaro.ts`, `payments.ts`, `missingCashback.ts`) plus mappers that turn API JSON into app models. |
| `src/query` | React Query hooks (`useCards`, `useEarnings`, `useOffers`…) that screens use. |
| `src/auth` | Session context and secure storage. |
| `src/lib` | Helpers: click-outs (`clickOut.ts`, `useClickOut.tsx`), money and phone formatting, masking. |
| `src/analytics` | `analytics.track()` facade, event names, Firebase sink. |
| `src/data` | Static content shipped in the app (filter options, offer-category icons, Amazon fallback copy). |
| `src/assets` | Images, icons (SVG), Lottie, video, logos. |
| `modules/cashback-guard` | Local native module (Android). |
| `docs` | This documentation (start at `index.md`). |

## Setup

1. Node 20+ (tested on Node 24), Android Studio with SDK 36 and JDK 17, an Android phone with USB debugging.
2. `npm install`
3. Create `.env` from `.env.example`:
   - `EXPO_PUBLIC_STAGE=prod` (production; `staging` points at a host that no longer resolves)
   - `EXPO_PUBLIC_CK_API_KEY`, `EXPO_PUBLIC_CK_BASIC_USER`, `EXPO_PUBLIC_CK_BASIC_PASS` (CashKaro mini-app; Basic auth is optional on production)
   - `EXPO_PUBLIC_BK_PARTNER_KEY` (BankKaro partner)
   - Ask the CashKaro / BankKaro teams; never commit `.env`. These values end up inside the app bundle (see `auth-and-secrets.md`).
4. `android/` is generated and gitignored. Create or refresh it with `CI=1 npx expo prebuild --platform android --no-install` (also after changing `app.json`, icons or splash).

## Run on a phone (development build)

1. Build and install the dev client once: `npx expo run:android` (or the Gradle debug build).
2. Start Metro: `npx expo start --dev-client --port 8082` (8082 avoids clashes with an old Metro on 8081).
3. Connect the phone: `adb reverse tcp:8082 tcp:8082`, then open the dev client and load `http://localhost:8082`.
4. If the first load times out on a slow machine, warm the bundle first:
   `curl -o /dev/null "http://localhost:8082/index.bundle?platform=android&dev=true&minify=false"`.

Login on production needs a real OTP. While the mini app's SMS sender is pending, read the code from the getcode lookup page (ask the team for access).

## Checks before committing

- Type check and tests: `npm run typecheck` and `npm test`. Both must pass with no errors; GitHub Actions runs them on every push (`.github/workflows/ci.yml`).
- Test on a real Android phone at 360 dp width and 130 % font size; check light status bar on blue/saffron headers and dark on white screens.
- No hardcoded colours, sizes or fonts in components (tokens only). No sample data in anything reachable (see `decision.md` D14).

## Build a shareable APK

```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```

- Output: `android/app/build/outputs/apk/release/app-release.apk` (copy to `dist/`, which is gitignored). About 97 MB today.
- First build takes ~20–40 min on Windows; with Gradle caches, ~2–5 min. Build intermediates take ~2.4 GB in `android/app/build` (safe to delete; the APK is all you need).
- The JS bundle is embedded, so no dev server is needed. Release builds are signed with the debug key: fine for testers, not for the Play Store (`decision.md` D5).
- Realme/ColorOS phones ask to confirm USB installs on screen ("Install via USB"); keep the phone unlocked.

## Ship to the stores

- EAS profiles in `eas.json`: `development`, `preview` (internal APK), `production` (app bundle, store distribution, OTA channel `production`, auto-increment version).
- Before a store release: real signing key, real Firebase project (and iOS plist), client-safe API keys, Terms & Conditions page, store listing and privacy answers. The full list lives on the build-status page (Go-live checklist).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Port 8081 in use | Run Metro on 8082 and `adb reverse tcp:8082 tcp:8082`. |
| Dev client "SocketTimeoutException" loading the bundle | Warm the bundle with curl (above), then Reload. |
| Gradle "No such host is known (repo.maven.apache.org)" | Network blip; re-run (cached tasks are skipped). |
| `INSTALL_FAILED_VERIFICATION_FAILURE` | The on-phone install prompt was declined or timed out; retry with the phone unlocked. |
| Disk full during builds | Delete `android/app/build`; the Gradle cache (`~/.gradle/caches`, ~14 GB) can also be cleared at the cost of re-downloading. |
| Offers shows only empty categories | Expected on production until stores are mapped to the mini-app key (`decision.md` D11). |
