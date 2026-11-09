<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="src/assets/images/logos/logo-light-big.png">
    <img alt="Cards.xtra, powered by CashKaro" src="src/assets/images/logos/logo-dark-big.png" width="200">
  </picture>
</p>

<p align="center">
  <b>Find the right credit card, apply through a cashback-tracked link, earn on every store you shop.</b><br>
  React Native · Expo SDK 54 · TypeScript · Android first
</p>

<p align="center">
  <a href="https://github.com/ujjawal-ck/cards.xtra/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ujjawal-ck/cards.xtra/actions/workflows/ci.yml/badge.svg"></a>
</p>

---

## What it does

| | |
|---|---|
| **Discover cards** | A live catalogue from BankKaro with search, category and bank filters, and a card detail sheet that opens half-height and expands to full screen as you scroll. |
| **Check eligibility** | PIN code and income in, then eligible, maybe or ineligible cards out. The verdict always comes from the API; the app never guesses one. |
| **Apply and earn** | Every "Apply Now" and "Shop & Earn" goes through one click-out flow that attaches the CashKaro user, so the cashback is tracked. Guests are asked to log in first or continue without cashback. |
| **Shop partner stores** | Offer categories and store pages (Amazon, Flipkart, Myntra and more) with cashback rates, timelines, coupons and FAQs. |
| **Track and withdraw** | Earnings broken down by confirmed, pending and paid; withdrawal to UPI, Amazon Pay or Flipkart with OTP; missing-cashback claims; order tracking. |
| **Never miss cashback** | An optional Android reminder (native module) that nudges you when you open a partner app. |

Login is optional: people can browse as guests and sign in with phone + OTP when they want to earn.

## Built to production standard

- **Network layer you can trust:** one HTTP client with timeouts, retries for safe requests only, single-flight token refresh, response contracts checked with zod, and readable errors. Payouts can't be double-submitted, and a timeout after sending one shows "couldn't confirm" instead of "failed".
- **Works offline gracefully:** an offline banner, cached queries, and clear empty and error states on every screen.
- **Design system in code:** every colour, size and text style comes from `src/tokens`. Components are atomic (atoms → molecules → organisms → screens).
- **Measured:** a typed analytics layer (Firebase / GA4) with a guard that strips personal data before anything is sent. It covers the funnel: card views, eligibility, apply click-outs, store visits, withdrawals.
- **Checked on every push:** a type check and 87 unit and contract tests run in GitHub Actions.
- **Accessible:** screen-reader labels, no nested double announcements, and layouts tested at 360 dp width and 130 % font size.

## Quick start

You need Node 20+, Android Studio (SDK 36, JDK 17) and an Android phone with USB debugging.

```bash
npm install
cp .env.example .env        # then fill in the keys (ask the CashKaro / BankKaro teams)
npx expo run:android        # builds and installs the development build
```

The app uses native modules (Firebase, the cashback reminder), so it runs as a **development build**, not in Expo Go. Full setup, running on a phone, building a shareable APK and troubleshooting: [docs/development.md](docs/development.md).

| Command | What it does |
|---|---|
| `npm run android` | Build and run on a connected Android phone |
| `npm start` | Start Metro for an installed development build |
| `npm run web` | Run the web preview |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit and contract-fixture tests |

## How it's organised

```
src/
  tokens/        colours, spacing, radius, typography (the single source of truth)
  atoms/         Button, Input, OtpInput, Tag, Chip, Text, ...
  molecules/     CardTile, SearchBar, PartnerCard, FilterRow, OfflineBanner, ...
  organisms/     CardDetailSheet, EligibilityCheckerSheet, BottomNav, Masthead, ...
  screens/       one file per screen; withdraw/ holds the withdrawal flow
  navigation/    root stack, bottom tabs, route types
  api/           http/ client, CashKaro + BankKaro clients, schemas, mappers
  query/         React Query hooks used by screens
  auth/          session and secure storage
  analytics/     track() facade, event names, Firebase sink
  lib/           click-outs, money and phone formatting, masking
modules/cashback-guard/   Android native module for the cashback reminder
docs/                     full documentation (start at docs/index.md)
```

Two backends: the **CashKaro mini-app API** (`ckminapps.com`) for accounts, offers, earnings and payouts, and the **BankKaro partner API** for the card catalogue and eligibility. See [docs/architecture.md](docs/architecture.md) and [docs/api-reference.md](docs/api-reference.md).

## Documentation

| | |
|---|---|
| [docs/index.md](docs/index.md) | Map of every doc |
| [docs/development.md](docs/development.md) | Set up, run, test, build, ship |
| [docs/architecture.md](docs/architecture.md) | What ships in the app, caching, offline, permissions |
| [docs/screen-flows.md](docs/screen-flows.md) | Every screen with success and failure paths |
| [docs/api-reference.md](docs/api-reference.md) | Every endpoint the app calls |
| [docs/auth-and-secrets.md](docs/auth-and-secrets.md) | Login, tokens and where secrets live |
| [docs/decision.md](docs/decision.md) | Why things are built this way, and open decisions |
| [docs/production-readiness.md](docs/production-readiness.md) | What partners must configure before go-live |
| [CLAUDE.md](CLAUDE.md) | Code rules: tokens, naming, structure |

## Secrets

Keys live in `.env`, which is gitignored; `.env.example` lists them with empty values. Anything prefixed `EXPO_PUBLIC_` is compiled into the app bundle, so production keys should sit behind a server proxy before launch. Details: [docs/auth-and-secrets.md](docs/auth-and-secrets.md).
