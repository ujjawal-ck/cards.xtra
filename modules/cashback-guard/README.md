# cashback-guard (Android only)

Detects when a **partner shopping app** comes to the foreground and shows a
one-tap **"Activate cashback"** bubble over it. Tapping it opens the tracked
affiliate link so the order is attributed to Cards.xtra.

This is a **local Expo module** — it lives under `modules/` and is picked up
automatically by Expo autolinking. It does **not** work in Expo Go (custom
native code), only in a real build (dev build or release APK).

---

## How detection works

A **foreground service** polls `UsageStatsManager` to read which app is in the
foreground. UsageStats has no callback, so polling is the only option — and to
keep it off the battery budget the loop runs **only while the screen is on and
unlocked** (a `SCREEN_OFF` / lock stops it; `SCREEN_ON` + `USER_PRESENT`
resumes it). The service shows a low-importance ongoing notification (required
for a foreground service) and keeps running with the RN app closed.

Detection is transition-based: when the foreground app *changes into* a partner
package the bubble shows; when it changes to anything else the bubble hides. So
closing a partner app and reopening it re-shows the bubble (subject to the
post-action cooldown).

> Earlier versions used an `AccessibilityService`. That is event-driven (lower
> battery) but Google rejects Accessibility used for non-accessibility purposes.
> UsageStats is the Play-acceptable path; the screen-on gating offsets its
> polling cost.

## What's inside

| File | Role |
|------|------|
| `android/.../CashbackGuardService.kt` | The brain. Foreground service: screen-gated UsageStats polling, posts the reminder notification, fires the tracked URL. Runs even when the RN app is closed. |
| `android/.../CashbackGuardModule.kt` | JS bridge: report permission status, open the two settings screens, start/stop the service, push tracking URLs. |
| `android/src/main/AndroidManifest.xml` | Declares the foreground service + `PACKAGE_USAGE_STATS`, `FOREGROUND_SERVICE*`, `POST_NOTIFICATIONS` (no overlay permission; the app blocks `SYSTEM_ALERT_WINDOW` in `app.json`). Merged into the app manifest at build. |
| `index.ts` | JS API consumed by `src/screens/CashbackGuardScreen.tsx`. |

## Partner packages (already wired)

- Amazon — `in.amazon.mShop.android.shopping`
- Flipkart — `com.flipkart.android`
- AJIO — `com.ril.ajio`

To add/remove a merchant, edit the `MERCHANTS` map in `CashbackGuardService.kt`.
(There is no longer a package-scoped XML to keep in sync — UsageStats reports
every app and the service filters against `MERCHANTS`.)

## ⚠️ Before it earns real cashback — replace the tracking URLs

Each merchant has a placeholder `fallbackUrl` (a public `cashkaro.com` store
page). The real per-user tracked URL is pushed from JS via `setMerchants`
(see `src/query/useCashbackGuard.ts`) using the offers API `cashback_url` with
the logged-in user id injected. **Note:** a `cashkaro.com` URL deep-links into
the installed CashKaro app rather than the merchant app. For "Activate" to open
the merchant app directly *with attribution*, partnerships must supply real
**app-to-app tracked deep links**; swap those into the offers data / fallback.

---

## Build & run (no Expo Go — needs a native build)

From the **worktree root** (`d:\dev\mini-app-accessibility`):

```bash
npm install
npx expo prebuild --platform android   # generates the native android/ project
npx expo run:android                    # build + install on a connected device/emulator
```

For a shareable APK to sideload (cloud build):

```bash
eas build -p android --profile preview   # eas.json "preview" already sets buildType=apk
```

## Granting permissions (one-time, on device)

The OS will not let the app grant these silently. The in-app
`CashbackGuardScreen` deep-links the user to both:

1. **Settings → Usage access → Cards.xtra → Allow**
2. **Settings → Notifications → Cards.xtra → Allow** (the reminder is a notification)

After both are granted the screen calls `startGuard()`. Open Amazon/Flipkart/
AJIO and the bubble appears (15-min cooldown per app after activate/dismiss;
auto-hides after 8s if ignored).

## Distribution note

`PACKAGE_USAGE_STATS` is a sensitive permission but is accepted for genuine
app-usage features (it surfaces a "Usage access" toggle the user grants
manually). This is far more Play-friendly than an AccessibilityService. You
still owe a clear privacy disclosure: the app reads only *which* of the partner
apps is in front — never screen content.
