# Device test plan: api-hardening (Android)

Run on a physical Android phone over USB. Never paste API keys, tokens, OTPs or mobile numbers into chat or logs.

## Setup
1. On branch `api-hardening`, up to date (`git pull origin api-hardening`).
2. `adb devices` lists the phone as `device`.
3. `.env` and `google-services.json` are in the repo root (both gitignored; copy them from the main machine). Use `EXPO_PUBLIC_STAGE=staging` for these tests.
4. `npm ci`, `npm run typecheck`, `npx jest` (87 tests pass).

## Builds
- Dev client: `npx expo run:android` (needs Android SDK + JDK 17). Expo Go won't work because of the native Firebase modules.
- Release, to check R8 shrinking: `npx expo run:android --variant release`. Open every main screen: Home, card detail sheet, Offers, a store page, Earnings, Orders, Profile, Withdraw method select, Missing cashback. On a crash, capture `adb logcat -d *:E` and report the stack.

## Checks
| # | Check | Expected |
|---|---|---|
| 1 | API log lines | One `[api] GET users/orders 200 120ms #abcd1234` line per call. No token, OTP or mobile number in any line. |
| 2 | Login | Real SMS OTP (the user provides it). Earnings and Profile load. |
| 3 | Session refresh | 16 min after login, open Earnings or Orders: data loads, still logged in, logs show a `refreshtoken` call then 200s. |
| 4 | Startup validation | Kill and reopen the app: still logged in, no flash of the login screen. |
| 5 | Orders pagination | Scroll to the bottom of My Order Details: with more than 20 orders a spinner shows and more load. |
| 6 | Offline | Airplane mode on: "You're offline" banner, loaded data stays. Off: banner goes, data refetches. |
| 7 | Click-out | Shop on a store opens a URL containing `id=<user id>`. Don't buy anything. |
| 8 | Switch user | Log out, log in as a second test number: none of the first user's data shows. |
| 9 | Withdraw double tap | **Moves money.** Staging test account only, only with the user's explicit OK. Two quick taps on Submit send exactly one `POST payment/paymentV1`. |

Report a table: check, pass/fail/skipped, evidence, and the likely file for any bug.
