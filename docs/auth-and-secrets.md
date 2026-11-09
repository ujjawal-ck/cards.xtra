# Auth, tokens and secrets

How a person logs in or signs up, which tokens the app holds, where secrets live, and what still needs a decision. Code: `src/api/cashkaro.ts`, `src/api/bankkaro.ts`, `src/auth/AuthContext.tsx`, `src/auth/tokenStore.ts`, `src/screens/OnboardingScreen.tsx`, `src/config/env.ts`.

## Login and signup, end to end

Login is optional (see `decision.md` D12). The phone + OTP sheet opens from onboarding ("Already on CashKaro? Log in") or from any "Log in" prompt.

1. **App token.** Before any call that doesn't need a user, the app gets a CashKaro app token: `GET /token` with header `x-api-key` (Basic auth optional on production). Response `data.attributes.token`. Kept **in memory** for 30 minutes; re-fetched after that or after a restart.
2. **Request OTP.** `POST /loginotp?device=App`, body `{ data: { type: "user_otp", attributes: { mobile_number } } }`. Response `data.id` = `otp_guid`, `data.attributes.otp_expire_sec` (180 s seen on production). The backend sends the code by SMS.
3. **New number.** If `/loginotp` fails with "not registered", the app calls `POST /signupotp` with the same body and switches to signup mode. Any other error is shown to the user.
4. **Enter code.** 6-digit OTP. Pasted text ("OTP: 123456", "123 456") is cleaned to digits. "Resend OTP" unlocks after 30 s and calls the same OTP endpoint again (one request at a time; the newest `otp_guid` wins).
5. **Signup details.** For a new number the same step asks for full name and email (validated). Signup also needs the device's public IP (see below).
6. **Verify.**
   - Existing user: `POST /login`, attributes `mobile_number`, `otp_guid`, `otp`, `device_info`.
   - New user: `POST /signupV1`, attributes `fullname`, `email`, `password` (generated, never typed: login is OTP-only), `mobile_number`, `otp_guid`, `otp`, `ip_address`, `device_info`.
   - Response `data.attributes.access_token` and `refresh_token`.
7. **Session saved.** Both tokens go to `expo-secure-store` (Android Keystore / iOS Keychain). Returning users go back to where they started; new users see the greeting.

Failure cases the user sees: invalid or expired code ("Could not verify OTP…" or the API message), network failure, number rejected by `/loginotp` for another reason. Getting a new code clears the old one.

## Tokens the app holds

| Token | How it's obtained | Stored | Lifetime / refresh |
|---|---|---|---|
| CashKaro app token ("aws") | `GET /token` with `x-api-key` | Memory | 30 min cache in the app |
| User access token | `/login` or `/signupV1` | Secure store | ~15 min; on `401`/`403` the app calls `POST /refreshtoken` once (de-duplicated) and retries |
| User refresh token | Same | Secure store | If `/refreshtoken` itself returns `401`/`403`, the session is ended and the user is signed out |
| BankKaro partner token | `POST /token` on BankKaro with the partner key | Memory | Re-minted on `401` |

Also in secure store: a random per-install device id (used in `device_info` and as the analytics identity), the display name, and the "onboarding seen" flag. Logout calls `POST /users/logout` and clears tokens and display name (the device id and onboarding flag stay).

## Where secrets live

- `.env` (gitignored; template `.env.example`) holds `EXPO_PUBLIC_STAGE`, `EXPO_PUBLIC_CK_API_KEY`, `EXPO_PUBLIC_CK_BASIC_USER`, `EXPO_PUBLIC_CK_BASIC_PASS`, `EXPO_PUBLIC_BK_PARTNER_KEY`.
- **Risk:** every `EXPO_PUBLIC_*` value is compiled into the JavaScript bundle inside the APK. Anyone with the APK can extract the CashKaro API key and the BankKaro partner key. Keeping `.env` out of git keeps them out of the repo, not out of the app.
- **Recommendation before a public release:** ask CashKaro and BankKaro for client-scoped keys (rate-limited, revocable, limited to what the app needs), or put token minting behind a small server the app calls instead.
- Never commit real keys, phone numbers or emails (a code comment with a real test number was removed from history before the branch was pushed).

## Device info sent at login and signup

`device_info` is validated by the backend and rejects empty values, so the app fills fields it can't read with placeholders: `fcm_id`, `imei_number` and `advertising_id` are the per-install device id; `device_brand` and `device_model` are the OS name; `latitude`/`longitude` are `0.0`; `network_type` is always `wifi`. **Follow-up:** confirm with the CK mini-app team which of these fields they actually use, and whether placeholders are acceptable (no location or advertising id is collected, which is the privacy-friendly default).

## Signup IP field

`/signupV1` requires `ip_address` (login doesn't). A managed Expo app can't read its own public IP, so the app asks the third-party service `api.ipify.org` once (5 s timeout, cached) and falls back to `0.0.0.0`. **Follow-up:** ask the CK mini-app team what uses this field (fraud checks? signup source?). If it's for fraud, the server should read the IP from the request itself; then the app can drop the ipify call and the third-party dependency.

## Firebase Analytics

- `@react-native-firebase/analytics` is installed and registered as a sink in `src/analytics/ga4Sink.ts` (loaded lazily from `App.js`, never in Expo Go). All screens call `analytics.track(Events.X, …)` (`src/analytics/events.ts`), so the backend can change without touching screens.
- Identity: the per-install device id at launch; after login, the CashKaro account id (from `/users/profile`) becomes GA4's `user_id` and a `ck_user_id` user property; on logout it reverts to the device id. No phone, email, name or UPI ID is sent with events.
- **Gap:** `google-services.json` belongs to a placeholder project (`local-qa-placeholder`), so events go nowhere; the iOS `GoogleService-Info.plist` is missing. **Follow-up:** get the real Firebase project (Android + iOS apps for `com.cardsextra.miniapp`), agree the event plan (screen views, `card_apply`, `click_out`, login/signup funnel, withdraw, claims), and decide whether events also go to CashKaro's analytics.

## Open items

- Token handling gaps (code):
  - `/refreshtoken` reads only the new `access_token`; if the backend rotates the refresh token, the app keeps the old one. Confirm whether refresh tokens rotate.
  - The CashKaro app token is cached 30 min and never re-fetched on `401` (`resetAwsToken` exists but is unused), so a revoked app token fails until the cache expires.
  - `/users/sendotp`, `/users/verify` and `/payment/paymentV1` don't refresh-and-retry on `401` like the other user calls; an expired session there shows an error instead.
- SMS: OTPs are sent through the backend's SMS gateway; the mini app's own sender is pending, plus a way to switch SMS off for test numbers.
- Client-safe keys or a token server (above).
- What the signup IP and the placeholder `device_info` fields are used for.
- Real Firebase project and event plan.
