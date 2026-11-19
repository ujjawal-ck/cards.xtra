# Cards.xtra Storybook

The design system and every user flow of the app, rendered from the real app code on the web. No request leaves the browser.

## Run
```bash
cd storybook
npm install          # once; uses the app's node_modules for React and React Native
npm run storybook    # dev server on :6006
npm run build        # static site in storybook/dist
npm run typecheck    # types of stories, harness, fixtures
```
The app's `node_modules` must exist at the repo root (`npm install` there first).

## What is inside
| Group | Content |
|---|---|
| Introduction | How to read the book, state tags |
| Foundations | 9 token pages, rendered from `src/tokens` |
| Components | 27 families, one overview page each (pick table, anatomy, do and don't), one story file per component |
| Patterns | 11 cross-cutting rules (loading, empty, error, offline, guest gate, session expiry, toast, click-out, OTP, eligibility, money confirmation) |
| Flows | 16 journeys, one file per step, one story per state |

Every story has one tag: `live` (in the app today), `proposed` (designed here, not built; it shows a ribbon), `hidden` (in code, not reachable), `demo` (reachable, no real API). Use the sidebar tag filter.

## How it works
- `.storybook/main.ts`: Vite plugins that make Metro-only code run on web (svg as components, `require()` of assets, reanimated web styles) and aliases that stub native-only modules (`mocks/`).
- `harness/`: `ScreenHarness`, `ComponentHarness`, `SheetHarness`, `PhoneFrame`. They mount the same providers as `App.js`, point the API at `https://storybook.invalid` and answer every call from `fixtures/`. See `harness/README.md`.
- `blocks/`: docs blocks in the gc-ds page shape (`PageHeader`, `PickTable`, `Anatomy`, `DoDont`, `StateTag`, `StateMatrix`).
- `CONTRACT.md`: the rules every story follows.
- `audit/`: the UX state matrix, PM flow inventory and FE inventory the stories were built from.
- `public/scan.js`: loads every story in a hidden frame and lists crashes. In the browser console on `/iframe.html`: `await import('/scan.js'); await window.__scan()`.

## Known limits on web
Rive and Lottie animations are empty boxes. `RollingAmount` and `GradientText` (masked view) can render wrong. RN `Modal` sheets cover the whole canvas, not the phone frame. Android-only parts render nothing. Sheets animate only when the tab is visible. Native `Alert` is drawn by a small web shim in `preview.tsx`.
