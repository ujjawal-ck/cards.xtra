# Production readiness: mini-app configuration and integrations

What has to be configured on the CashKaro mini-app side (and with BankKaro) so the live setup works without remapping later, and what the app already does to stay stable when that configuration changes. Status as of 9 Nov 2026 (probed read-only against production).

## 1. Offers: stores and categories

**Today on production** (`https://ckminapps.com/v1`, mini-app key):
- `/offers/categories` returns 15 top-level CashKaro categories.
- Every valid category path returns `total_records: 0`. No stores are mapped to the mini-app key.
- The `miniapp` parent category the app was designed for returns `400` code `10003` ("Invalid Category").
- Store pages (`/offers/amazon`, `/offers/flipkart`, `/offers/myntra`, …) return `400` code `10001` ("Invalid Offer").

**What the app reads, so the backend can change without a release:**
- The category strip is built from the API (`src/data/offerCategories.ts`): first `GET /offers/category/miniapp?include=categories` (parent + sub-categories), and if that is rejected, `GET /offers/categories` (top-level, internal buckets removed). Labels, order and paths come from the API.
- Store grids come from `GET /offers/category/<path>`; store pages from `GET /offers/<store slug>` using the slug the grid returned.
- Only icons and accent colours are app-side. Known slugs have explicit icons; any other category gets an icon by keyword (fashion, beauty, electronics, travel, food, health, home…) with a generic fallback.

**Ask the CK mini-app team, so nothing needs remapping later:**
1. Create the `miniapp` parent category with its sub-categories, and keep the sub-category slugs stable once live (the app maps a few known slugs ending in `-ma` to icons; new ones fall back to keyword icons).
2. Map the stores we want to offer to the mini-app key under those sub-categories.
3. Confirm each store's `cashback_url` is the mini-app tracker (`…/visitretailer/app/<store id>?id=`) and that `id=` should carry the CashKaro user id (the app fills it at click time).
4. Confirm the response shape stays JSON:API with `include=categories` / `coupons,secondary_cashback,related_offers` as used today.
5. Agree what "All" means: the parent category's own store list (the app requests the parent path for the "All" tab).

## 2. Cards: click-outs and cashback rates

**Today:** all 281 BankKaro cards carry a `ck_store_id`. The app opens BankKaro's `network_url` (`track.techtrack.in/click?…&p1={user_id}&p2={click_id}`) with `p1` = CashKaro user id and `p2` = a per-click id, because no CashKaro tracking host is configured (`CK.trackingHost` in `src/config/env.ts` is empty for prod). Card cashback amounts come from BankKaro's commission because CashKaro's card-rate category (`home-categories-exclusive`) is empty on production.

**Ask the CK mini-app team (preferred route):**
1. The production click-out host for mini-app users, so cards open `https://<host>/visitretailer/app/<ck_store_id>?id=<user id>`. Setting it is a one-line config change; every card switches to CashKaro's tracker.
2. Map the card stores (`ck_store_id`s) to the mini-app key, including the card-rate category the app reads (`home-categories-exclusive`) or tell us the right category to read.
3. Confirm the card store redirect fills BankKaro's `{user_id}` / `{click_id}` on CashKaro's side so approvals are reported back.

**Or, with BankKaro directly:** agree that `p1` = CashKaro user id and `p2` = our click id, and how approved applications are reported to CashKaro so cashback is credited.

**How to verify once configured (read-only):** tap Apply Now on one card and Shop & Earn on one store while logged in, then call `GET /users/missingcashback/retailers` and `/users/missingcashback/exitclickdates/<store>`; both clicks should appear with today's date.

## 3. Auth, SMS and keys

- SMS: `/loginotp` sends a real SMS through the backend's gateway. Needs the mini app's own sender and a way to disable SMS for test numbers.
- Keys: the CashKaro API key and BankKaro partner key ship inside the app (`EXPO_PUBLIC_*`). Get client-scoped keys or a token server before public release.
- `device_info` placeholders and the signup `ip_address` (fetched from `api.ipify.org`): confirm what the backend uses them for. Details in `auth-and-secrets.md`.

## 4. Account features without APIs

| Feature | State in the app | Needs |
|---|---|---|
| Delete account | Screens only: the OTP step accepts any 4-digit code and shows "Account deleted" without deleting anything | Account deletion API (required by both app stores); until then hide the entry |
| Edit email / mobile | Screens validate input, save nothing | Profile update API, or hide the entry |
| Payment history | Hidden (screen has sample data) | Map `/payment/history` |
| Notifications | Honest empty state | Feed API |
| Review Us / Write Review | Hidden | Feedback API or store listing link |
| Terms & Conditions | Named as plain text on the login sheet | A Cards.xtra Terms page |

## 5. Analytics

`google-services.json` is a placeholder Firebase project, so events go nowhere, and the iOS config is missing. Needs the real Firebase project and an agreed event plan (see `auth-and-secrets.md`).

## 6. Home screen: product ideas grounded in the APIs

The Home list today is one long feed of all 281 cards (top picks, then the rest), with client-side filters. Ideas the existing APIs already support:

- **Spend-based "best card for you" (cashback calculator).** BankKaro exposes `POST /cardgenius/calculate` with a spend breakdown (amount per category, e.g. shopping, fuel, dining, travel, bills) and returns estimated rewards per card. It's wired in `src/api/bankkaro.ts` (`calculate`) but unused. A short "How do you spend each month?" step (4–6 sliders) could replace the endless feed with a ranked shortlist and a rupee estimate per card. Needs: the exact request/response contract from BankKaro and a spend-category list that matches `init-bundle` tags.
- **Server-side filters and sorting.** `POST /cardgenius/cards` (`filterCards`) accepts filters and sort; today the app filters on the phone. Server-side filtering would let us show counts per filter and sort by fees or rewards without loading all 281 cards.
- **Eligibility-first browsing.** The eligibility check (`POST /cardgenius/eligiblity`) already returns eligible card aliases; making "Show cards I'm eligible for" a first-class entry point (not a toggle) would shorten the feed for most users.
- **Popular cards.** `GET /cardgenius/popular-cards` exists and is unused; it could seed a short "Top picks" row instead of hand-picked ordering.
- **Category-first entry.** The "Find the best card by category" carousel could become the primary navigation (category → shortlist of 5–10), using card `tags`.

Each needs a product decision before build; none needs a new backend endpoint except confirming the calculate contract.
