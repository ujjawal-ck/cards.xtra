# Play Store release checklist (P0)

Things a store build needs that OTA updates cannot deliver. Do these before
the first production release that includes the P0 fixes.

## 1. This release needs a full build

The P0 work added two native libraries, so `eas update` alone will not reach
users. Run a new store build:

- `@react-native-firebase/crashlytics` (crash reports)
- `@react-native-firebase/remote-config` (A/B flags)

```bash
eas build --profile production --platform android
```

## 2. Environment variables on EAS

`.env` is gitignored, and EAS uploads the project the way git sees it, so
**EAS builds do not get your local `.env`**. Without this step the build
ships with empty API keys and every API call fails.

Create each variable once for the `production` and `preview` environments.
Keys are listed in `.env.example`.

```bash
eas env:create --environment production --name EXPO_PUBLIC_STAGE --value prod --visibility plaintext
```

```bash
eas env:create --environment production --name EXPO_PUBLIC_CK_API_KEY --value <key> --visibility sensitive
```

Repeat for `EXPO_PUBLIC_CK_BASIC_USER`, `EXPO_PUBLIC_CK_BASIC_PASS`,
`EXPO_PUBLIC_BK_PARTNER_KEY`, `EXPO_PUBLIC_CK_BASE_URL`,
`EXPO_PUBLIC_CK_TRACKING_HOST`, `EXPO_PUBLIC_BK_BASE_URL`.
`EXPO_PUBLIC_*` values end up inside the app bundle whatever the visibility
setting, so production secrets still need the server proxy (GAP_AUDIT P0 #5).

The Firebase config files (`google-services.json`, `GoogleService-Info.plist`)
are also gitignored now. Upload them as EAS file variables and point
`app.json` at them, or keep them in a private location the build machine can
read. Steps: https://docs.expo.dev/eas/environment-variables/

## 3. Play Console declarations for cashback-guard

`modules/cashback-guard` runs a foreground service that checks which app is
in the foreground and posts a "Activate cashback" notification when a partner
shopping app (Amazon, Flipkart, AJIO) opens. Play reviews both permissions
it uses.

| Permission | Play Console form | What to declare |
|---|---|---|
| `PACKAGE_USAGE_STATS` (Usage access) | App content → Sensitive permissions. Usage access is not on the Play restricted list, but reviewers check the purpose and the in-app disclosure. | Core feature: remind the user to activate cashback when they open a partner shopping app. Only the foreground package name is read, compared against a fixed list of 3 partner apps, and never stored or sent anywhere. |
| `FOREGROUND_SERVICE_SPECIAL_USE` | App content → Foreground service permissions. Pick "Special use" and give a video. | Detect when a partner shopping app opens so we can remind the user to activate cashback. Runs only while the screen is on and unlocked, and the user can turn it off in the app. |
| `POST_NOTIFICATIONS` | None (runtime permission) | Already requested at runtime in `CashbackGuardScreen`. |

Also needed:

- **A demo video** (Play asks for one for special-use foreground services):
  turn on the feature in the app, open Amazon, show the notification, tap it.
- **Prominent disclosure:** `CashbackGuardScreen` must explain, *before* sending
  the user to the Usage access setting, what is read and why. Check the copy
  against Play's User Data policy before submitting.
- **Data safety form:** declare "App activity → Other actions" as collected
  on device only, not shared.
- **Real tracking links:** the merchant `fallbackUrl`s in
  `CashbackGuardService.kt` are still public store pages. Until partnerships
  supply app-to-app tracked deep links, tapping the notification may not
  attribute the order. Decide whether this ships in v1 (open product decision).

Fallback if review rejects it: the feature is self-contained. Remove the
`CashbackGuard` route and the `NeverMissCashbackNudge` / `CashbackPip`
entry points, and drop the module from the build. Nothing else depends on it.

## 4. Turn on the eligibility A/B test

Firebase console → `cardsxtra-miniapp` → A/B Testing → Create experiment →
Remote Config.

- Parameter: `eligibility_gate`. Variants: `mandatory` (control), `skippable`.
- Primary goal: `card_apply_outbound`.
- Secondary goals:
  - `eligibility_result` with `outcome = eligible`, as a proxy for approval quality.
  - `clickout_blocked`, which should stay near zero.
- Without an experiment, everyone gets `mandatory` (today's behaviour).
- For QA, set `EXPO_PUBLIC_FORCE_ELIGIBILITY_GATE=skippable` in `.env`.

## 5. Crashlytics check after first install

1. Install a preview build.
2. Use the app, then force a test crash from a debug menu (or wait for a real one).
3. Confirm the crash appears in Firebase → Crashlytics within about 5 minutes.
