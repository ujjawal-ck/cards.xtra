# Analytics

One place the whole app reports user behaviour. Screens call `analytics.track(...)`;
this layer cleans the data and fans it out to one or more **sinks** (backends).
Today the only sink is the dev console. **Turning on Google Analytics is a
one-file change here — no screen edits.**

## How it works

```
screen → analytics.track(Events.X, {...}) → [console sink] [GA4 sink (later)] ...
```

- `events.ts` — every event name + its params, written to GA4's naming rules.
- `analytics.ts` — the engine: sanitises names/values, merges super-props,
  enforces GA4 limits, fans out to sinks. Also `identify()` / `setUserProperties()`.
- `index.ts` — what you import.

## Using it (already wired across the app)

```ts
import { analytics, Events } from '../analytics';

analytics.track(Events.SELECT_ITEM, { item_id: card.id, item_name: card.name });
```

## Privacy — hard rule

**Never** pass phone, email, name, UPI id, or address as a param, user id, or
user property. Send opaque ids, counts, booleans, enums. If unsure, send a flag
(`has_value: true`) or a length — never the raw value. The backend user id used
in `identify()` must be the numeric/opaque account id, not the phone number.

## Google Analytics (GA4) — code is DONE, needs a build

GA4 for a mobile app = **Firebase Analytics**. The code side is already wired:

- `ga4Sink.ts` — the Firebase sink (handles GA4 reserved names + param types).
- `App.js` — registers it **only outside Expo Go** (`Constants.executionEnvironment`
  guard), so Expo Go keeps running on the console sink and the dev build gets GA4.
- `app.json` — `@react-native-firebase/app` plugin, iOS static frameworks, and
  `googleServicesFile` paths for both platforms.

**Firebase will NOT run in Expo Go** (native module — same as Rive). It only
activates in an EAS dev/prod build. Remaining steps (all in your hands):

1. Firebase console → create a project. Add an **Android app** (package
   `com.cardsextra.miniapp`) and an **iOS app** (bundle `com.cardsextra.miniapp`).
2. Download `google-services.json` (Android) + `GoogleService-Info.plist` (iOS),
   place both in the **project root** (next to `app.json`) and commit them
   (they're embedded in the binary anyway — not secrets).
3. `eas build --profile development --platform android` (or ios). Install the
   resulting build on your device (it replaces Expo Go for testing).
4. Open the app on the dev build, tap around, watch GA4 **DebugView** /
   **Realtime**. Enable Android debug events with:
   `adb shell setprop debug.firebase.analytics.app com.cardsextra.miniapp`

Event names already match GA4's recommended set (`screen_view`, `login`,
`sign_up`, `search`, `view_item`, `select_item`, `select_content`, `share`) so
GA's built-in reports populate automatically.
