# Cards.xtra: handoff for the Chennai team

> Everything you need to build this app, put it on the Play Store, send
> updates, and work with analytics events. Written 14 Jul 2026.
> (Note: `HANDOFF.md` in this repo is a different file. It is an AI-session
> log, not for you. This file is the deployment handoff.)

---

## 1. What this app is

- Cards.xtra, powered by CashKaro: a credit-card comparison and cashback
  app. Built with Expo SDK 54 / React Native 0.81, new architecture on.
- It talks to two backends. CashKaro handles auth, offers, and payments.
  BankKaro (CardGenius) provides the card catalog. Config for both lives in
  `src/config/env.ts`.
- App id (Android package and iOS bundle): `com.cardsextra.miniapp`
- Firebase project: `cardsxtra-miniapp`, under the org account
- EAS project: owner `cashkaro`, id `64b72278-5c46-4e92-8d5f-f547507fe7a5`
- Design rule: every color, spacing value, and font comes from
  `src/tokens/`. Never type a hex code or pixel size by hand. Read
  `CLAUDE.md` for the full rules before touching UI code.

## 2. Recent changes you should know about

These were made in July 2026, just before this handoff:

1. **OTA updates are now wired.** `expo-updates` was installed, `app.json`
   got a `runtimeVersion` (fingerprint policy) and an `updates.url`, and the
   `preview` / `production` build profiles in `eas.json` each got a matching
   update channel. Before this, every change needed a full store release.
2. **Analytics README corrected.** It used to name a wrong Android package
   (`com.hpk22.miniapp`, an old placeholder). It now says
   `com.cardsextra.miniapp` everywhere. The actual `google-services.json`
   was always correct, so no rebuild is needed for this.
3. **App display name.** `app.json` `name` changed from "mini-app" to
   "Cards.xtra". This is the label under the icon on the phone. The `slug`
   is still `mini-app` because it is tied to the EAS project on the server;
   rename it only together with the project in the Expo dashboard.

## 3. Running it locally

```bash
npm install
npx expo start -c        # scan the QR with Expo Go on a real phone
```

Two things do not work inside Expo Go, because they are native modules:

- Firebase Analytics (GA4). Events go to the console log instead.
- Rive animations.

Both work only in a real build (dev build or store build). The app detects
Expo Go automatically and skips them, so nothing crashes.

To test everything for real, make a dev build once and install it on your
phone. It replaces Expo Go for testing:

```bash
eas build --profile development --platform android
```

## 4. Building and releasing to the Play Store

We use EAS, Expo's build and submit service. One-time setup:

```bash
npm i -g eas-cli
eas login                # cashkaro account
```

Release steps:

```bash
# 1. Build the store binary (AAB)
eas build --profile production --platform android

# 2. Send it to the Play Console
eas submit --profile production --platform android
```

Good to know:

- The very first upload must be done by hand in the Play Console: create
  the app listing and upload the first AAB there. After that, `eas submit`
  works. Give it a Google service-account JSON with release permission
  (set `serviceAccountKeyPath` in `eas.json` under `submit`).
- Version numbers: EAS bumps the internal `versionCode` automatically
  (`autoIncrement` plus `appVersionSource: "remote"`), so don't touch it.
  The user-facing version (`"1.0.0"` in `app.json`) you change by hand when
  you do a real release.
- Signing keys: let EAS create and store the release keystore. It offers
  this on the first production build; say yes. Never ship an APK built
  locally with `expo run:android`, because that one is debug-signed.
- Build profiles live in `eas.json`: `development` (dev client APK, for
  your own phone), `preview` (internal APK, for QA), and `production`
  (AAB for the Play Store).

## 5. OTA updates vs full releases

This is the most important section. There are two ways to ship a change.

### Way 1: OTA update (instant, no Play Store review)

For any change that is only JavaScript/TypeScript, which is most of this
app. Users get it the next time they open the app.

```bash
eas update --branch production --message "what you changed"
```

Safe to ship over OTA:

| Change | OK over OTA? |
|---|---|
| Adding or editing analytics events | Yes |
| Screen changes, new components, navigation | Yes |
| Text and copy changes | Yes |
| Bug fixes in app logic or API calls | Yes |
| Styling, tokens, colors, spacing | Yes |
| Images and fonts that are imported in JS | Yes |

### Way 2: full release (new build plus Play Store)

For anything native. OTA cannot ship native code.

| Change | Needs full release |
|---|---|
| Add, remove, or upgrade any native library (Firebase, Rive, reanimated, expo-video, sensors and so on) | Yes |
| Anything native in `app.json`: permissions, plugins list, package name, icon, splash | Yes |
| `google-services.json` / `GoogleService-Info.plist` changes | Yes |
| Expo SDK or React Native upgrade | Yes |
| App version bump | Yes |

### The safety net (already set up)

`app.json` uses `runtimeVersion: { "policy": "fingerprint" }`. In plain
words: Expo takes a fingerprint of all the native code in each build, and
an OTA update only reaches phones whose build has the same fingerprint. If
you change something native and forget to do a full release, your OTA
update simply won't reach anyone. Old builds are never given JS that their
native code can't run, so the failure mode is "nothing happens" rather
than a crash.

The practical rule: after any `npm install` of a new library or any
`app.json` change, do a full build and store release. For everything else,
`eas update` is enough.

Channels: production builds listen to the `production` branch and preview
builds to `preview` (set in `eas.json`), so you can test an OTA update on
the preview build first:

```bash
eas update --branch preview --message "trying the fix"
# happy? then:
eas update --branch production --message "the fix"
```

## 6. Analytics: how events work

Everything lives in `src/analytics/`. Read its `README.md` too.

Firing an event from any screen:

```ts
import { analytics, Events } from '../analytics';

analytics.track(Events.SELECT_ITEM, { item_id: card.id, item_name: card.name });
```

Adding a new event is one line in `src/analytics/events.ts`:

```ts
MY_NEW_EVENT: 'my_new_event',   // snake_case, letters/numbers/_ only, max 40 chars
```

then call `analytics.track(Events.MY_NEW_EVENT, {...})` wherever you need.
That's it. Adding events is pure JS, so it ships over OTA with no store
release.

How the plumbing works (you rarely need to touch it):

- `events.ts` is the full list of event names. Never type a raw string at
  a call site; add the name here first.
- `analytics.ts` cleans the data, enforces GA4 limits (25 params max,
  string values up to 100 chars), and sends to one or more "sinks".
- The sinks are the console log (always, in dev) and Firebase/GA4, which
  runs only in real builds and is auto-skipped in Expo Go.
- Names follow GA4 rules. Where GA4 has a standard event (`login`,
  `search`, `view_item`, `select_item` and so on) we use its exact name so
  GA's built-in reports fill up automatically.

Testing events on a device (dev build, not Expo Go):

```bash
adb shell setprop debug.firebase.analytics.app com.cardsextra.miniapp
```

then watch DebugView in the Firebase console (project `cardsxtra-miniapp`)
while tapping around.

Privacy, and this is a hard rule: never put a phone number, email, name,
UPI id, or address into any event param, user id, or user property. Send
opaque ids, counts, and booleans. If unsure, send `has_value: true`
instead of the value.

## 7. Secrets and environments: read before going live

`src/config/env.ts` holds the API hosts and keys for CashKaro and BankKaro.

- Right now it contains staging keys only, and they are committed to git.
  That was accepted for the demo phase.
- The `prod` block is empty. Fill it at cutover and flip `STAGE = 'prod'`.
- Understand this: any key inside the app can be extracted from the
  binary. There is no way to truly hide a client-side secret. For
  production, either put a server proxy in front of these APIs, or
  knowingly accept that the keys ship in the app. Decide with the backend
  team. Do not paste production secrets into this file without that
  conversation.
- If this repo ever becomes visible outside the team, rotate the staging
  keys.

## 8. Firebase setup status

- `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
  are in the repo root, registered to Firebase project `cardsxtra-miniapp`
  for app id `com.cardsextra.miniapp`. Already correct; nothing to change.
- These files are baked into the binary at build time, so changing them
  means a full release, not OTA.

## 9. Pre-launch checklist

- [ ] First production build made with the EAS-managed keystore (never local debug signing)
- [ ] First AAB uploaded by hand in Play Console; listing, screenshots, data-safety form done
- [ ] `prod` block in `src/config/env.ts` filled and `STAGE` flipped (after the proxy/keys decision, see section 7)
- [ ] Staging keys rotated if repo visibility changes
- [ ] Play Integrity / Firebase App Check turned on (Play Console plus Firebase console; not done yet)
- [ ] Events verified in GA4 DebugView on a real build
- [ ] One OTA update tested end to end on the `preview` channel, so the team has done it before it matters

## 10. Links

| What | Where |
|---|---|
| Code repo (private, ask for access) | https://github.com/hpk22/mini-app |
| Default branch | `master` (feature branches per person, e.g. `miniapp-hrutvij`) |
| EAS project dashboard (builds, updates, credentials) | https://expo.dev/accounts/cashkaro/projects/mini-app |
| EAS builds list | https://expo.dev/accounts/cashkaro/projects/mini-app/builds |
| EAS updates (OTA branches) | https://expo.dev/accounts/cashkaro/projects/mini-app/updates |
| Firebase console (GA4 events, DebugView) | https://console.firebase.google.com/project/cardsxtra-miniapp |
| GA4 DebugView | https://console.firebase.google.com/project/cardsxtra-miniapp/analytics/debugview |
| Play Console | https://play.google.com/console (listing exists only after the first manual upload) |

Access needed before you can do anything: the GitHub repo, the `cashkaro`
Expo org, and the `cardsxtra-miniapp` Firebase project. Ask for all three
on day one.

## 11. Quick answers

| Question | Answer |
|---|---|
| "I changed some screen text, how do I ship it?" | `eas update --branch production -m "copy fix"`, live in minutes |
| "I added a new analytics event, ship it?" | Same, OTA. Events are JS. |
| "I ran `npm install some-native-lib`" | Full release: `eas build` plus `eas submit`. After that, OTAs work again. |
| "OTA update isn't reaching users" | Their build's fingerprint doesn't match, meaning you changed native code. Do a full release. |
| "Events not showing in GA4" | You're in Expo Go, where Firebase is off. Use a dev/prod build and DebugView. |
| "Where do I add a color or size?" | `src/tokens/`, never hardcoded values (see `CLAUDE.md`) |
