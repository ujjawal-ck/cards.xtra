# Decision log

Decisions that shape how Cards.xtra is built, newest first. Each entry says what was decided, why, and what it costs. Open questions that still need an owner are at the end.

Format: **Decision** · date · commit(s) where it landed.

---

## D20. Home masthead keeps its current height
2026-11-09 · no code change

The Home header is ~40 dp taller than Figma (status-bar height counted twice), which pushes the first card's Apply below the fold. Shortening it re-crops the hero video, whose copy is baked in, so it stays as is.

## D19. OTP stays 6 digits
2026-11-09 · no code change

CashKaro production sends 6-digit codes, so the login and withdraw OTP inputs keep 6 boxes. Figma (4 boxes) should be updated to match.

## D18. Card detail stays full screen on Android
2026-11-09 · no code change

Android keeps the full-screen card detail (it replaced the sheet after the sheet's Android issues, see `android-card-interaction-issues.md`). iOS keeps the 55–60 % sheet that expands on scroll. This overrides the CLAUDE.md requirement for Android.

## D17. Saffron is the only solid button colour
2026-11-09 · see git log for “Saffron”

Every solid (filled) button is Saffron `action.primary`, including the places Figma draws Cobalt (Get OTP, Apply Filter, card tile Apply Now, missing-cashback steps, logout and login sheets). Cobalt stays for links, outline/secondary buttons, selected chips, and the partner “Shop & Earn upto X%” CTA, which CLAUDE.md specifies as blue.

- `Button` (`src/atoms/Button.tsx`): `tone="main"` and `tone="second"` both render Saffron when solid; `tone="accent"` is the opt-in Cobalt fill. Outline `tone="second"` keeps the cobalt-grey secondary style.
- Figma should be updated so design and build agree.

## D16. App icon and native splash come from the brand logo
2026-11-09 · `fd2990c`

The launcher icon, Android adaptive icon, favicon and the first (native) splash frame were Expo's grey placeholder. They now use the Cards.xtra mark from `src/assets/images/logos/logo-light-big.svg` on the app-logo blue `#012BCF` (the colour of `src/assets/images/help/help-app-logo.png`). The adaptive foreground keeps the mark inside Android's safe zone so circle/squircle masks never clip it, and the native splash background is the same blue so it flows into the animated (Lottie) splash.

- `android/` is generated (gitignored); the source of truth is `app.json` + `assets/*.png`. Regenerate with `CI=1 npx expo prebuild --platform android --no-install`.

## D15. Ask new users for their real name and email at signup
2026-11-09 · `214683c`, `c0bab4d`

`/signupV1` needs `fullname` and `email`. The app used to send a random handle ("Velvet Tiger") and a generated email (`cardsxtra.<phone>@cashkaro-demo.app`), so every new CashKaro account had fake contact details. Now the OTP step for a new number asks for full name and email; "Verify & create account" stays disabled until both are valid. The name also becomes the display name, so the separate "What should we call you?" step is skipped for these signups.

- Cost: one more step for first-time users. The password is still generated (login is OTP-only; nobody types it).

## D14. No fake data in anything a user can reach
2026-11-09 · `f6b9a1c`

Sample values from Figma had leaked into production paths as component defaults and fallbacks (a sample person and email while the profile loads, ₹1,500 earnings, a 2023 order, sample fees and "recommended" cards, Amazon sample store content, made-up reviews). Rule: components default to neutral values (`—`, `₹0`, empty), sections with nothing real hide, and a failed load shows an error with retry, never sample content.

- "Review Us" is hidden from Profile: its reviews and user count were made up and Write Review had no endpoint.
- Screens that still contain sample data are only reachable from the dev-only `FoundationCheck` screen.

## D13. Every click-out goes through one attributed path
2026-11-09 · `61de5aa`

Card "Apply Now" and store "Shop & Earn" are the revenue paths, so each click must be traceable to a CashKaro user. One hook (`src/lib/useClickOut.tsx`) handles every click-out:

- Signed out → "Log in to earn cashback" sheet, with "continue without cashback" so guests are never blocked.
- Signed in → resolve the CashKaro user id from `/users/profile` first; if it can't be resolved, don't open an unattributed link.
- CashKaro tracker links (`…/visitretailer/app/<id>?id=`) get `id=<user id>`.
- BankKaro `network_url` (production today) keeps its `{user_id}` / `{click_id}` placeholders and fills them per click (they used to be stripped). Pure builder in `src/lib/clickOut.ts`.
- Every click logs `click_out` (kind, item, click id, attributed, link type).

Preferred end state: a CashKaro tracking host in `src/config/env.ts` (`CK.trackingHost`) so cards also go through CashKaro's tracker. Until then, card cashback depends on BankKaro reporting `p1`/`p2` back to CashKaro.

## D12. Login is optional (guest mode)
2026-11-09 · `61de5aa`

The product owner asked to remove the mandatory login for now. "Get Started" enters the app as a guest; Home, card discovery, eligibility and Offers need no account. Login is asked for only where an account matters: Earnings and Profile show a login card, Get Help → Missing Cashback asks guests to log in, and click-outs ask "Log in to earn cashback". The existing phone + OTP sheet is reused (`Onboarding` with `{ login: true }`); after a successful login the user returns to where they were. Logout keeps the user in the app as a guest.

## D11. Offers falls back to production's top-level categories
2026-11-09 · `f2b73fb`

The Offers strip was built for a CashKaro parent category `miniapp`, which doesn't exist on production (`400` code `10003`), and no stores are mapped to the mini-app key yet. Instead of "Couldn't load offers", the app reads `/offers/categories`, drops internal buckets, and shows the real top-level categories with honest empty states and an "Explore cards" action. When a `miniapp` parent appears, the app switches back automatically; when stores are mapped, they appear without a code change.

## D10. Production backends: CK Mini Apps + BankKaro partner
2026-11-08 · `6870ad1`

- CashKaro: `https://ckminapps.com/v1` (the mini-app API, Postman "ck-miniapp-apis"), header `x-chkr-app-version: 4.9` (other versions get `401`). CashKaro's main API is not used.
- BankKaro: `https://platform.bankkaro.com/partner`.
- The old staging host `ckapistaging.lmssecure.com` no longer resolves.
- `EXPO_PUBLIC_STAGE` in `.env` selects the config (`src/config/env.ts`).

## D9. OTP codes come from the getcode page until SMS is configured
2026-11-08

While the mini-app SMS setup is pending, testers read login codes from the getcode lookup page. Note: `/loginotp` on production does send an SMS through the backend's gateway; the getcode page shows the same code.

## D8. Status bar is owned by the focused screen
2026-11-09 · `7e6190a`, `f10a237`

Tab screens stay mounted, so a plain `<StatusBar>` let the last-mounted screen win. All screens use `FocusAwareStatusBar` (`src/navigation/FocusAwareStatusBar.tsx`). For the search Modal, the dark style is applied before the Modal mounts, because Android copies the status-bar style into a Modal's window once, at creation.

## D7. No font-size caps or auto-shrink on Android
2026-11-09 · `7e6190a`

`maxFontSizeMultiplier` and `adjustsFontSizeToFit` both misbehave on React Native's new architecture on Android (text measured at one size and drawn at another; labels cut to one word). Layouts instead grow: `minHeight` instead of fixed heights, 2-line labels where needed, rows that scroll horizontally, and containers that size from the OS font scale (e.g. the Offers strip).

## D6. Bottom nav redesign
2026-11-09 · `aecbe24`

One sliding spotlight instead of a per-tab gradient (which rendered as a hard grey box on Android), dimmed inactive tabs (`text.inverseMuted`), equal full-height tap areas, no size "pop", tap the active tab again to scroll to top.

## D5. Release APK for testers is debug-signed
2026-11-09

`android/app/build.gradle` signs release builds with the debug keystore. Fine for sharing an APK with testers; a Play Store release needs a real signing key (EAS `production` profile exists) and a fresh install for anyone who had the debug-signed build.

## D4. Payment History is hidden
2026-11-09 · `7e6190a`

The screen still renders sample payouts; `/payment/history` exists but isn't mapped. The Profile row stays hidden and nothing links to the screen until it shows real data.

---

## Open decisions

| Question | Options | Notes |
|---|---|---|
| APK size | Keep 97 MB / slim to ~40–50 MB | arm64-only or app bundle, R8 shrinking, drop Rive, keep dev launcher out of release, WebP images. |
| Card click-out tracking | CashKaro tracking host / BankKaro direct with postback | Needs CK mini-app team and BankKaro. |
| Signup IP field | Keep `api.ipify.org` lookup / backend reads the request IP | See `auth-and-secrets.md`. |
| Analytics | Real Firebase project + event plan | `google-services.json` is a placeholder project today. |
