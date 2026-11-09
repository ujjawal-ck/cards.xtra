# Architecture: what ships, what's fetched, caching, permissions

How Cards.xtra is put together at runtime: which content is bundled in the app and which comes over the network, how data and images are cached, how the app behaves offline, and which Android permissions it declares and why. Verified against the code and the built APK (`dist/Cards.xtra-1.0.0.apk`) on 9 Nov 2026.

## Runtime picture

```
Phone (Expo SDK 54 · React Native 0.81, new architecture)
 ├─ JS bundle (6.95 MB, embedded in the APK) — screens, copy, Lottie, SVG icons
 ├─ Native resources — 531 PNGs, hero video, Rive file, fonts (Outfit, 5 weights)
 ├─ Secure storage — session tokens, device id, display name, flags
 └─ Network
     ├─ CK Mini Apps  https://ckminapps.com/v1       login, profile, earnings, orders, offers, withdraw, claims
     ├─ BankKaro      https://platform.bankkaro.com/partner   card catalogue, card benefits, eligibility
     ├─ CK image CDN  https://asset21.ckassets.com   store logos / banners (host normalised from asset11)
     ├─ BankKaro card images (URLs from the API)
     ├─ Expo Updates  https://u.expo.dev             OTA check on every launch
     ├─ Firebase Analytics (placeholder project today)
     └─ api.ipify.org                                 public IP at signup only
```

Because `expo-updates` checks for an over-the-air update on every launch (`EXPO_UPDATES_CHECK_ON_LAUNCH=ALWAYS`), anything "bundled" below (JS, copy, Lottie, images in the JS bundle) can be replaced without a store release, as long as native code doesn't change.

## What ships in the app vs what comes over the network

| Area | Source | Notes |
|---|---|---|
| Native splash | Bundled `assets/splash-icon.png` on `#012BCF` (`app.json`) | |
| Animated splash | Bundled Lottie `src/assets/animations/splash-animation.json` | |
| Onboarding slides | Bundled Lottie `onboarding-1/2/3.json`, backdrop image; headlines hardcoded in `OnboardingScreen.tsx` | Unused `onboarding-*.png` are still bundled. |
| Login sheet art | Bundled SVG logos | |
| Home hero | Bundled MP4 `src/assets/videos/home-hero.mp4` (516 KB), muted loop via `expo-video` | Hero copy is baked into the video: it can't be edited without a new video. |
| Home card list, tags, benefit text, fees | BankKaro `GET /cardgenius/cards` | Benefit/tag **icons** are local SVGs chosen by tag id. |
| Card images | BankKaro `card.image` URLs | 28 bundled card PNGs are not used by any live path. |
| Bank logos | BankKaro `init-bundle` `bank_data[].logo` | Falls back to card art / static bank names. |
| Card rewards ("Flat ₹X") | CashKaro `home-categories-exclusive` store rates, else BankKaro `commission` | CK category is empty on production. |
| Category carousel tiles | Bundled `images.filters.*` + hardcoded labels and tag ids (`src/data/filterOptions.ts`) | Tag ids matched against BankKaro `tags`. |
| Card detail benefits | BankKaro `GET /cardgenius/cards/{alias}` `product_benefits[].html_text` | |
| Card detail FAQ | Hardcoded (4 Q&As in `CardDetailSheet.tsx`) | |
| Eligibility values | BankKaro card fields (age, income, CIBIL, new-to-credit, existing customer); check via `POST /cardgenius/eligiblity` | |
| Offers category strip | Labels/order from CashKaro (`miniapp` tree, fallback `/offers/categories`); icons and colours bundled | |
| Offers grid tiles | CashKaro `image_url` | |
| Store page logo, banners, terms, rates, FAQ, how-to | CashKaro `GET /offers/{slug}` | "Did you know" cards bundled. Coupons are **not** fetched (see Known issues). |
| Promo banner on Offers | Bundled PNG (785 KB) | |
| Earnings, orders, profile | CashKaro user APIs | Masthead backgrounds and empty-state art bundled. |
| Get Help topics, Privacy policy, Withdraw terms | Bundled (`GetHelpScreen.tsx`, `privacyContent.ts`, `withdraw/termsContent.ts`); support phone in `src/config/support.ts` | |
| Notifications | Empty list in code (no API) | |
| Filter transition animation | Bundled Rive file (`cat-redirecting.riv`) | Rive's native engine adds ~10 MB to the APK for this one animation. |

**Asset sizes** (`src/assets`, 23.8 MB): PNG 109 files / 18 MB (largest: help masthead 1.6 MB, onboarding-3 1.4 MB, store page 1.1 MB), SVG 117 / 3.6 MB (`pay-combined` 874 KB, payment-processing illustration 690 KB, Flipkart logos 597 KB each), Lottie 4 / 1.7 MB, MP4 516 KB. Every PNG registered in `src/assets/images/index.ts` is bundled whether used or not.

**Fonts:** Outfit (5 weights, ~276 KB) from `@expo-google-fonts/outfit`, bundled and loaded at startup; the app shows a blank view until they load.

## Caching

| Data | Policy | On disk? |
|---|---|---|
| All API queries (React Query) | staleTime 5 min, gcTime 30 min, retry once (not on 401/403), refetch on app focus | No (no query persister) |
| Screen re-focus | `useRefetchOnFocus` refetches on every screen focus once data exists (ignores staleTime) | — |
| Payment info | staleTime 30 s | No |
| Missing-cashback retailers, exit dates, claims | staleTime 0, always refetch on mount | No |
| Orders | keeps previous data while a new filter loads | No |
| User-scoped queries | Key includes the access token, so a token refresh starts a fresh cache entry | No |
| Card benefits | Neighbouring cards prefetched | No |
| Card art (detail) | `expo-image` `cachePolicy="memory-disk"`; Home prefetches all card image URLs | Yes (expo-image disk cache) |
| Card art on Home tiles, store tiles, logos, banners | React Native `Image` / `RemoteImage`, no explicit policy | Platform HTTP/image cache |
| CashKaro app token | Memory, 30 min | No |
| BankKaro partner token | Memory, re-minted on 401 | No |
| Public IP | Memory for the session | No |
| Session + flags | Secure store: `ck_access_token`, `ck_refresh_token`, `device_unique_id`, `ck_display_name`, `ck_name_pending`, `onboarding_seen`, nudge/reminder flags | Yes (logout clears all but device id and onboarding flag) |
| Cashback reminder tracking URLs | Android SharedPreferences `cashback_guard_prefs` | Yes |

## Offline behaviour

Nothing from the API is saved to disk, so a cold start without network has no data; within a session the last data stays for 30 minutes.

| Screen | What the user sees offline |
|---|---|
| Home | Bundled hero, category tiles and footer; card list replaced by "Couldn't load cards / Check your connection and try again." + Retry. |
| Offers | "Couldn't load offers" + Try again (copy says "on our side", not the connection). |
| Store page | "Couldn't load this store" + Try again. |
| Earnings | **No error state: values fall back to ₹0**, which reads as a zero balance (Known issues). |
| Profile | Saved display name; email and mobile blank. |
| Missing cashback | Alert with retry. |

## Android permissions

From the merged manifest of the built APK (target SDK 36).

| Permission | Added by | Used? | Needed? |
|---|---|---|---|
| INTERNET, ACCESS_NETWORK_STATE | App template, Firebase, expo-image/video/updates | Yes | Yes |
| WAKE_LOCK | Firebase Analytics | Indirectly | Acceptable |
| VIBRATE | Template, `expo-haptics` | Yes (haptics) | Yes |
| READ_EXTERNAL_STORAGE (max SDK 32) | Template, image picker | Yes, invoice upload on Android ≤ 12 | Yes, as scoped |
| PACKAGE_USAGE_STATS | `modules/cashback-guard` | Yes, Never Miss Cashback (opt-in, sends user to Usage Access settings) | Only if the reminder ships; needs a Play declaration |
| FOREGROUND_SERVICE, FOREGROUND_SERVICE_SPECIAL_USE | `modules/cashback-guard` | Yes (reminder service) | Only for the reminder; special-use needs Play justification |
| POST_NOTIFICATIONS | `modules/cashback-guard` | Yes, but **never requested at runtime** (user must enable in Settings) | Yes, for the reminder |
| USE_BIOMETRIC, USE_FINGERPRINT | `expo-secure-store` (androidx.biometric) | No | Harmless |
| BIND_GET_INSTALL_REFERRER_SERVICE | Firebase | Indirectly (attribution) | Optional |
| **SYSTEM_ALERT_WINDOW** (draw over apps) | Expo template | No (reminder moved to notifications) | **No: remove** |
| **CAMERA** | `expo-image-picker` | No (library picker only) | **No: remove**; also marks camera as a required feature, hiding the app from devices without one |
| **RECORD_AUDIO** | `expo-image-picker` plugin | No | **No: remove**; marks microphone as required |
| **WRITE_EXTERNAL_STORAGE** | Template, image picker | No | **No: remove** (no effect on Android 11+) |
| **ACTIVITY_RECOGNITION** | `expo-sensors` | No (only the accelerometer, which needs no permission) | **No: remove** |
| **AD_ID, ACCESS_ADSERVICES_AD_ID, ACCESS_ADSERVICES_ATTRIBUTION** | Firebase Analytics | No (no ads) | **No: remove** (else Play requires an advertising-ID declaration) |

**Removed (9 Nov 2026):** all permissions in bold above are blocked via `android.blockedPermissions` in `app.json` and `expo-image-picker` options `cameraPermission: false` / `microphonePermission: false`. The merged release manifest now contains only INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, VIBRATE, READ_EXTERNAL_STORAGE (max SDK 32), PACKAGE_USAGE_STATS, FOREGROUND_SERVICE(+SPECIAL_USE), POST_NOTIFICATIONS, USE_BIOMETRIC/FINGERPRINT, the install-referrer binding and AndroidX's internal receiver permission, and no required hardware features. The privacy policy and the cashback-guard README no longer mention the overlay permission. Still to test on a phone: invoice upload (gallery) and the reminder.

**iOS** (no `ios/` folder yet): plugins would add photo-library, camera, microphone and motion usage strings by default; only photo library is needed.

## Known issues found during this mapping

1. **Placeholder coupon content** on store pages: "Upto 90% Off across categories", "See +5 Offers" and a default code chip "MCCK300" are hardcoded; coupons are never fetched.
2. **Earnings offline shows ₹0** instead of an error.
3. **POST_NOTIFICATIONS is never requested**, so on Android 13+ the reminder can't post until the user finds the setting.
4. Unneeded permissions above.
5. Dead assets (28 card PNGs, onboarding PNGs) and the dev launcher's barcode scanner (880 KB models) inflate the APK.
