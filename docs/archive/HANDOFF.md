# HANDOFF — mini-app (Cards.xtra) session handoff

> For a fresh Claude chat to pick up where this one left off. Read this +
> `PROJECT_STATE.md` (repo map) + `CLAUDE.md` (build rules) before working.
> Snapshot: **2026-06-12**.

## Where things stand
- **Branch:** `devrana-amount-loading-shimmer` (off `miniapp-hrutvij`).
- **Working tree:** clean. All session work is **committed** (last = `52bc7fa`).
  Branch is **3 commits ahead** of `origin/miniapp-hrutvij`, **not pushed yet**.
- **Repo:** `github.com/hpk22/mini-app` (private). PRs go into `miniapp-hrutvij`.
- **Run on device:** `npx expo start -c` → scan QR in Expo Go on a physical
  iPhone (the user's pixel-accurate source of truth). `-c` after dep/asset
  changes. Three native-ish deps were added this session and are bundled in
  Expo Go: `expo-image`, `expo-haptics`, `@react-native-masked-view/masked-view`.

## BankKaro API status (RESOLVED 2026-06-12)
Earlier this session the card catalog failed to load (403 "Invalid partner
secret" — the staging key had been revoked server-side). **It is working again
now** with the **unchanged** key in `src/config/env.ts:42-43`:
- `POST platform.bankkaro.com/partner/token` → **200**, valid JWT (exp 2027).
- `GET /cardgenius/cards` → **200, 185 cards**. 171 carry `product_usps`
  (benefit tiles shown directly); **14 don't** → those use the per-card detail
  fallback (`useCardBenefits`) + skeleton added this session.
- No code change required. If it 403s again, the key was re-revoked — get a
  fresh staging partner key from BankKaro and paste into `env.ts`.
- The card-detail work (half-out hero, image prefetch, benefit skeleton/
  fallback, gyro) can now be verified live on device.

## What was built this session (all in commit `52bc7fa`)
**CardDetailSheet — "peeking hero" (the big one):**
- Card now sits **~40% above the sheet's top edge** at the partial snap, half
  out / half in (matched a user mock).
- `src/organisms/CardArt.tsx` (NEW) — the card visual (image+bg+shadow+glare+
  gyro tilt) extracted from `CardDetailMasthead` so the in-sheet hero and the
  floating rail render identically.
- `FloatingCardRail` (inside `CardDetailSheet.tsx`) — portaled **above** the
  gorhom sheet (**`FullWindowOverlay`** on iOS, `@gorhom/portal` on Android),
  pinned to the sheet's `animatedPosition`, mirrors the pager via `scrollX`,
  **crossfades** into the in-sheet hero as the sheet expands (`CROSSFADE_LO/HI`
  in CardArt). Masthead height shrinks at partial (`PARTIAL_H=150`) to pull the
  title up under the card.
- Stronger **gyro tilt** (rotate ±40°, parallax ±24, more glare/shadow, ~45Hz).

**Image performance + skeletons:**
- `CardArt` uses **expo-image** (`cachePolicy="memory-disk"` + fade-in) with a
  **pulsing skeleton** until loaded. Prefetch: next ~5 card images (rail) + ALL
  card images on Home load (`HomeScreen.tsx`).
- Benefit grid: cards whose list entry lacks USP tiles were showing **empty**
  boxes. Now `CardPage` fetches per-card **detail benefits** (`useCardBenefits`,
  with a new `prefetchCardBenefits`) as a fallback, prefetches adjacent cards,
  and `Grid` `'features'` has a **loading skeleton**.

**Offers screen:**
- Category strip: selecting a category **auto-advances** the strip (reveals
  right-side categories) and **re-themes the whole header** (status bar + search
  + strip) to that category's **accent color** (animated `interpolateColor`).
  Accents live in `OFFER_CATEGORIES` (`Masthead.tsx`), exported as
  `OFFER_CATEGORY_ACCENTS`.

**Floating BottomNav (all tabs, `TabNavigator.tsx`):**
- **White bottom-fade scrim** (`rgba(255,255,255,0)` → `0.9`) so content fades
  under the nav; reduced bottom gap (32→20).
- **Hide-on-scroll** added to **Offers** (Home already had it); resets to
  visible on tab change. **Earnings & Profile deliberately excluded** (no
  scroll depth).

**Earnings screen:**
- Slot-machine digits packed tighter (`hPad` in `RollingAmount.tsx`).
- Cashback/Rewards cards **flex to fill** with even gutters (16 sides / 12
  between).
- Confirmed/Pending/Paid **CTA vertically centered** — root cause was the
  `Button` atom defaulting to `alignSelf:'flex-start'`; `AmountActionRow` now
  passes `alignSelf:'center'`.

> Earlier commits this session: `d30f4d1` (earnings shimmer + slot-machine roll,
> home filter polish, **app-wide haptics** via `src/lib/haptics.ts`), `681044b`
> (merge of Hrutvij's `67b41ce`; kept our slot-machine over his count-up).

## Open items / next steps
- **Push + open PR** into `miniapp-hrutvij` when ready (3 commits ahead).
- **Verify on device** once a valid BankKaro key is in: the half-out card +
  crossfade, image prefetch speed, Offers theming, the nav fade/hide. Android
  pass for the rail (uses Portal there, not FullWindowOverlay — confirm
  layering).
- **Tunables the user may revisit:** `PARTIAL_H` (card→title gap), `0.4` split
  + `CROSSFADE_HI` (CardArt), gyro constants (CardArt), `hPad` (RollingAmount),
  `FADE_COLORS`/`fadeHeight`/`bottomOffset` (TabNavigator), offer accent hexes,
  the 450ms theme cross-fade.
- **Per-category accent colors** were curated blind (no image sampling) — user
  may want some tweaked to better match each category image.

## Repo gotchas
- **Nested `mini-app/` folder** at repo root = a clone-inside-the-clone with its
  own `.git` (untracked, `?? mini-app/`). Accidental. Leave it OUT of commits
  (stage explicit paths: `git add src/ package.json package-lock.json …`).
  Should eventually be deleted or gitignored.
- **`RootNavigator.tsx` initialRouteName = "FoundationCheck"** (a temp token
  screen) — revert to `Login`/`Splash` before any demo.
- **Working method (from the user):** they direct, send Figma nodes / phone
  screenshots; build token-bound (`src/tokens`), reuse components, describe
  alignment, no hardcoded values. They verify on the phone and report diffs.
- **This sandbox can reach the internet** (curl to APIs works) but cannot push
  to GitHub — pushes run from the user's machine.
