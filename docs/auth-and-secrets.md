# Auth, tokens and secrets

> **Last updated 2026-11-23:** Rewritten for the BFF (decision 2026-11-17). Checked against the code at `e4d37a1`. The Firebase section was not re-checked.

How a person logs in or signs up, which tokens exist, where secrets live, and what still needs a decision. Code: `src/api/cashkaro.ts`, `src/api/http/tokenManager.ts`, `src/auth/AuthContext.tsx`, `src/auth/tokenStore.ts`, `src/auth/LoginSheetProvider.tsx`, `src/config/env.ts`, `bff/src/proxy.js`, `bff/src/tokens.js`.

## The rule in one line

The app calls only the cards.xtra BFF. A call with an `Authorization` header carries the user token, and the BFF forwards it unchanged. A call without one is a guest call, and the BFF adds its own CashKaro site token. The BFF adds `x-api-key` to every CashKaro call and `partner-token` to every BankKaro call.

## Login and signup, end to end

Login is optional (see `decision.md` D12). The phone + OTP sheet opens from onboarding ("Already on CashKaro? Log in") or from any "Log in" prompt.

1. **Request OTP.** `POST /ck/loginotp?device=App` (guest), body `{ data: { type: "user_otp", attributes: { mobile_number } } }`. Response `data.id` = `otp_guid`, `data.attributes.otp_expire_sec` (180 s seen on production). The backend sends the code by SMS. The BFF limits OTP routes to 30 per IP and 5 per mobile number in 10 minutes (429 with `Retry-After: 600`).
2. **New number.** If `/loginotp` fails with "not registered", the app calls `POST /ck/signupotp` with the same body and switches to signup mode. Any other error is shown to the user.
3. **Enter code.** 6-digit OTP. Pasted text ("OTP: 123456", "123 456") is cleaned to digits. "Resend OTP" unlocks after 30 s and calls the same OTP endpoint again (one request at a time; the newest `otp_guid` wins). The OTP is sent as a digit string, so a leading zero is kept.
4. **Signup details.** For a new number the same step asks for a name only. The app generates the email (`dummyEmail`) and a random password (D16). Nobody types either.
5. **Verify.**
   - Existing user: `POST /ck/login`, attributes `mobile_number`, `otp_guid`, `otp`, `device_info`.
   - New user: `POST /ck/signupV1`, attributes `fullname`, `email`, `password`, `mobile_number`, `otp_guid`, `otp`, `referral_user`, `device_info`. The BFF sets `ip_address` from `x-forwarded-for` and, when `SIGNUP_PASSWORD` is set, replaces the password with it.
   - Response `data.attributes.access_token` and `refresh_token`.
6. **Session saved.** Both tokens go to `expo-secure-store` (Android Keystore / iOS Keychain). Profile and earnings are prefetched. Returning users go back to where they started; new users see the greeting.

Failure cases the user sees: invalid or expired code ("Could not verify OTP…" or the API message), network failure, too many OTP requests (429), number rejected by `/loginotp` for another reason. Getting a new code clears the old one.

## Tokens

| Token | Who holds it | How it's obtained | Stored | Lifetime / refresh |
|---|---|---|---|---|
| CashKaro site token | BFF | `GET /token` with `x-api-key` (Basic auth if set) | BFF memory, per running copy | Until JWT `exp` − 2 min (fallback 25 min). On a 401 about the token: re-mint once and retry |
| BankKaro partner JWT | BFF | `POST /token` with the partner key in the body | BFF memory, per running copy | Until `exp` − 2 min (fallback 50 min). On 401/403: re-mint once and retry |
| User access token | App | `/login` or `/signupV1` | Secure store | Refreshed when its JWT `exp` is less than 2 min away, and on any user-call 401 (refresh once, retry once) |
| User refresh token | App | Same | Secure store | `POST /refreshtoken` is single-flight. A rotated refresh token is kept. If refresh returns 401 or code 2004, the session ends and the user is signed out. A 403 does not sign out (the gateway also sends 403 for a bad API key). A network failure keeps the session |

Also in secure store: a random per-install device id (used in `device_info` and as the analytics identity), the CashKaro user id, the display name, the "name pending" flag and the "onboarding seen" flag. Logout calls `POST /ck/users/logout`, then clears the tokens, user id, display name, saved profile and saved spend answers. The device id and onboarding flag stay.

## Where secrets live

- **BFF** (Vercel sensitive environment variables; `bff/.env.local` for local runs; template `bff/.env.example`): `CK_BASE_URL`, `CK_API_KEY`, `CK_APP_VERSION`, `CK_BASIC_USER`, `CK_BASIC_PASS`, `BK_BASE_URL`, `BK_PARTNER_KEY`, `SIGNUP_PASSWORD`.
- **App** (`.env`, gitignored; template `.env.example`): `EXPO_PUBLIC_STAGE`, `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_CK_TRACKING_HOST`, `EXPO_PUBLIC_CK_APP_VERSION`. None of these is a secret. Every `EXPO_PUBLIC_*` value is compiled into the bundle, so a secret must never go there.
- The BFF never exposes `/token` and forwards only the allowlisted routes in `bff/src/routes.js`. It logs method, route, status and time only, never bodies or tokens.
- Never commit real keys, phone numbers or emails.

## Device info sent at login and signup

`device_info` (`buildDeviceInfo` in `src/api/cashkaro.ts`) sends only the documented fields: `fcm_id` and `device_unique_id` are the per-install device id (there is no FCM registration yet), `imei_number` is the documented zeros placeholder, `device_client` is the real OS, plus `app_version` and `os_version`. No location, network type or advertising id is sent. Staging `/login` accepts this block.

## Signup IP field

`/signupV1` requires `ip_address`. The BFF sets it from the caller's `x-forwarded-for`. The app no longer calls `api.ipify.org`.

## Firebase Analytics

- `@react-native-firebase/analytics` is installed and registered as a sink in `src/analytics/ga4Sink.ts` (loaded lazily from `App.js`, never in Expo Go). All screens call `analytics.track(Events.X, …)` (`src/analytics/events.ts`), so the backend can change without touching screens.
- Identity: the per-install device id at launch; after login, the CashKaro account id (from `/users/profile`) becomes GA4's `user_id` and a `ck_user_id` user property; on logout it reverts to the device id. No phone, email, name or UPI ID is sent with events.
- **Gap:** `google-services.json` belongs to a placeholder project (`local-qa-placeholder`), so events go nowhere; the iOS `GoogleService-Info.plist` is missing. **Follow-up:** get the real Firebase project (Android + iOS apps for `com.cardsextra.miniapp`), agree the event plan (screen views, `card_apply`, `click_out`, login/signup funnel, withdraw, claims), and decide whether events also go to CashKaro's analytics.

## Open items

- Rate limit: the BFF keeps OTP counts in memory per running copy, so the real limit is higher. Move to a shared store before launch.
- Hosting: the BFF runs on a personal Vercel Hobby account. Move it to a company team before launch.
- Signup password: with `SIGNUP_PASSWORD` set, every new account gets the same password. Confirm with CashKaro that password login cannot be used on these accounts.
- SMS: OTPs are sent through the backend's SMS gateway; the mini app's own sender is pending, plus a way to switch SMS off for test numbers.
- Real Firebase project and event plan.
