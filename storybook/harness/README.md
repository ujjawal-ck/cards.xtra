# Storybook harness

Owner: the harness agent. Writers import from `storybook/harness` and `storybook/fixtures`. Writers do not edit these folders.

## 1. A screen state in five lines

```tsx
import { EarningsScreen } from '../../../src/screens/EarningsScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api, earningsFixture, reply } from '../../../storybook/fixtures';

export const Populated: Story = { tags: ['live'], render: () => <ScreenHarness name="Earnings" component={EarningsScreen} auth="signedIn" api={api.ok()} /> };
export const Zero: Story = { tags: ['live'], render: () => <ScreenHarness name="Earnings" component={EarningsScreen} auth="signedIn" api={api.ok({ earnings: earningsFixture.zero })} /> };
export const Offline: Story = { tags: ['live'], render: () => <ScreenHarness name="Earnings" component={EarningsScreen} auth="signedIn" api={api.offline()} /> };
export const EarningsDown: Story = { tags: ['live'], render: () => <ScreenHarness name="Earnings" component={EarningsScreen} auth="signedIn" api={api.ok({ earnings: reply.error(500) })} /> };
```

Set on the meta: `parameters: { layout: 'fullscreen', docs: { story: { inline: false } } }`. Harness stories share one fetch mock and one query cache, so a docs page must not render two of them at the same time.

Working examples: `stories/_harness/HarnessCheck.stories.tsx`.

## 2. Components

| Component | Use it for | Props |
|---|---|---|
| `ScreenHarness` | One real screen from `src/screens`, in a 390x844 frame | `name` (route name), `component`, `params?`, `api?`, `auth?`, `displayName?`, `namePending?`, `storage?`, `beforeMount?`, `width?`, `height?` |
| `ComponentHarness` | One component that calls `useNavigation`, `useQuery`, `useAuth` or `useLoginSheet` | `children`, `api?`, `auth?`, `displayName?`, `storage?`, `beforeMount?`, `frame?` (default `true` = 390x844; `{width,height}`; `false` = the parent must give a size) |
| `SheetHarness` | A gorhom `BottomSheetModal` sheet, presented on mount | `children: (ref) => <XSheet ref={ref} />`, `delayMs?` (300), `open?(ref)`, `backdrop?`, `providers?`, `api?`, `auth?` |
| `PhoneFrame` | A proposed screen composed from DS parts | `children`, `width?` (390), `height?` (844), `background?` (`colors.background.default`), `sheets?` (true) |

Props:
- `auth`: `'guest'` (default), `'signedIn'`, `'sessionExpired'`.
  - guest: empty secure store. `status` becomes `unauthenticated`.
  - signedIn: opaque tokens in `ck_access_token` / `ck_refresh_token`, a fixed `device_unique_id`. No refresh call. `status` becomes `authenticated`, then AuthProvider fetches the profile (answered by `api`).
  - sessionExpired: signedIn tokens, plus routes in front of `api`: every `/ck/users/*` and `/ck/payment/*` call answers 401 and `/ck/refreshtoken` answers 401 (code 2004). AuthContext then sets `sessionExpiredAt`, status drops to `unauthenticated`, and LoginSheetProvider calls `open()` on the login sheet (`login_sheet_open` event seen; the sheet itself not yet seen in a visible browser).
- `displayName`: writes `ck_display_name` (Home and Profile show it before `profile.fullname`). `namePending`: writes `ck_name_pending = '1'`.
- `storage`: any other secure-store keys. Names in `STORAGE_KEYS` (for example `STORAGE_KEYS.onboarded`, `STORAGE_KEYS.savedProfile`).
- `params`: route params (initialParams). The type is loose. For a checked object use `routeParams('ToolResults', { ... })`. For tool screens use `spends({ amazon_spends: 8000 })` or `spendsFixture.typical` (all 21 keys).
- `beforeMount`: runs after the reset and before the screen mounts. Use it to seed module state, for example `() => { getAdvisorSession().state = { answers: { opener: 'first' }, held: [] }; }`.

## 3. Navigation

The harness builds the app's navigator shape with stub screens:
- Root native stack with every `RootStackParamList` route.
- `MainTabs`: bottom tabs Home, Offers, Earnings, Profile. The tab bar is hidden.
- `WithdrawStack`: native stack with every `WithdrawStackParamList` route.

Your screen replaces the stub of its own route. A tab screen (`name="Earnings"`) and a withdraw screen (`name="WithdrawVerifyOTP"`) nest as in the app, so `getParent()`, `navigate('MainTabs', { screen: 'Home' })`, `reset`, `replace` and `popTo` work. A tap that navigates shows a stub page "→ RouteName" with its params.

## 4. API presets (`api` from `storybook/fixtures`)

| Builder | Result |
|---|---|
| `api.ok(overrides?)` | Every endpoint answered with `DEFAULT_ANSWERS` |
| `api.empty(overrides?)` | Orders, offers, claims, retailers, cards, calculate empty. Earnings ₹0. Payment info 400/5003 below threshold |
| `api.loading(overrides?)` | Every call hangs (skeletons) |
| `api.error(overrides?)` | Every call answers 500. GET calls retry 2 times with backoff, so the error state shows after 1 to 2 s |
| `api.offline(overrides?)` | `onlineManager` offline, every call fails like a dropped network. react-query pauses queries (`fetchStatus: 'paused'`) |
| `api.only(answers)` | Only these endpoints. Others log `[storybook] no fixture` |

Overrides: `{ <endpoint>: answer }`. An answer is one of:
- a plain object: sent as JSON with HTTP 200;
- `reply.error(status, body?)`, `reply.code(400, '5003', 'title', meta?)`: an HTTP error with a JSON:API `errors[]` body;
- `reply.hang()` (loading for this endpoint), `reply.network()` (network error for this endpoint);
- `reply.delay(ms, answer)`;
- `reply.once(first, then)` / `reply.sequence(a, b, c)`: different answers for consecutive calls (fail once, then succeed);
- a function `(req, call) => answer` (`req.path`, `req.query.get('filter[status]')`, `req.body`, `req.method`).

Second argument: `{ routes: ApiRoute[] }` for custom matchers in front of the table, `{ log: false }` to stop the console log.

Endpoint keys (`ENDPOINTS` in `harness/endpoints.ts`):
- CK auth: `loginOtp`, `login`, `signupOtp`, `signup`, `refreshToken`, `logout`
- CK user: `profile`, `earnings`, `orders`, `orderDetail`
- CK payments: `paymentInfo`, `payment` (paymentV1), `sendOtp`, `verifyOtp`
- CK offers: `offerCategories`, `offerCategoryTree` (miniapp `include=categories`), `cardRateStores` (home-categories-exclusive), `categoryOffers` (any other category path), `offerStore` (`/offers/:slug`)
- CK missing cashback: `mcRetailers`, `mcExitDates`, `mcQueue` (GET), `mcSubmit` (POST queue), `mcUpdate` (PUT queue/:id), `mcValidate`, `mcTicket`
- BK: `cards`, `cardDetail`, `initBundle`, `eligibility`, `calculate`

## 5. Fixtures

All in `storybook/fixtures`. Raw JSON from `src/api/__fixtures__` is cloned and scrubbed (`<redacted>` → `Test User`, `user@example.com`, `98XXXXXX10`; order ids → `CKORDER0001…`).

| Fixture | Variants |
|---|---|
| `profileFixture` | `default` (Test User), `blank` |
| `earningsFixture` | `typical` (default: ₹4,860 total, ₹1,240 + ₹350 confirmed), `rich` (doc), `zero` (staging), `cashbackOnly`, `rewardsOnly`, `belowThreshold`, `pendingOnly` |
| `ordersFixture` | `typical` (default: 6 rows, one per status), `doc`, `empty`, `pending` |
| `orderDetailFixture` | `pending` (default), `confirmed`, `paid`, `doc` (cancelled referral) |
| `paymentInfoFixture` | `default` (200, methods UPI 20, Amazon 12, Flipkart 13, IMPS 18), `belowThreshold` (400/5003 ₹250), `belowThreshold100`, `inProcess` (400/5002) |
| `sendOtpFixture` | `default` (sent to 98XXXXXX10), `rateLimited` (429) |
| `verifyOtpFixture` | `default`, `wrong` (200 with errors), `rateLimited` (429) |
| `paymentFixture` | `default` (Amazon accepted), `upi`, `alreadyPending` (400/5002) |
| `authFixture` | `otpSent`, `notRegistered` (400/2010 → signup), `otpRateLimited` (429), `tokens`, `wrongOtp` (400/7002), `refreshed`, `logout` |
| `offerCategoryTreeFixture` | `default` (All + 6 sub-categories), `noSubCategories`, `invalidCategory` (400 → app falls back to `offerCategories`) |
| `offerCategoriesFixture` | `default` (top-level fallback) |
| `categoryOffersFixture` | `default` (AJIO, Amazon Fashion, Shopsy, Tata CLiQ, Zop), `empty`, `homeExclusive` |
| `offerStoreFixture` | `default` (AJIO, answers any slug), `notFound` |
| `mcRetailersFixture` | `default` (Flipkart C2, Amazon), `allGroups` (A, B1, C1, C2, D), `empty` |
| `mcExitDatesFixture` | `default` (Aug 2022, order-id format), `recent`, `empty` |
| `mcQueueFixture` | `byStatus` (default, answers by `filter[status]`), `pending`, `resolved`, `empty`, `notFound` |
| `mcSubmitFixture` | `tracked`, `resolved`, `underTracking`, `pending` (default POST), `duplicate` |
| `mcValidateFixture` / `mcTicketFixture` | `valid`, `invalidOrderId` / `default` |
| `mcDraftFixture` | route params: `start`, `withDate`, `withOrderId`, `b1Queued`, `c1Queued`, `c2Queued` |
| `cardsFixture` | `default` (10 active cards + 1 inactive, local card art), `calculateJoin` (4 cards that join calculate rows), `empty`. Raw list: `BK_CARDS` |
| `initBundleFixture`, `cardRateStoresFixture` | bank names; CK card rates by `ck_store_id` |
| `cardDetailFixture` | `byAlias` (default, benefit tabs for any alias), `empty` |
| `eligibilityFixture` | `allEligible`, `partial` (default), `noneEligible`, `invalidPincode`. See `ELIGIBILITY_INPUTS` |
| `calculateFixture` | `league` (default, 9 rows), `trimmed`, `waiverLounge`, `empty` |
| `spendsFixture`, `spends()` | `typical`, `online`, `traveller`, `none`; `spends(partial)` fills all 21 keys |

Eligibility verdicts: the API returns only `eligible: true/false`. The app derives "maybe" (`classifyCardEligibility`): a rejected card is "maybe" when monthly income is 80% to 100% of its bar (annual fee ≥ ₹2,500 → ₹1,00,000; ≥ ₹500 → ₹50,000; else ₹25,000). With `partial`, SBI Cashback is rejected: income ₹45,000 → maybe, ₹30,000 → ineligible. HSBC Live+ is eligible.

Cards that join tool rows (calculate): `hdfc-regalia-gold` (80), `sbi-cashback-credit-card` (27), `hsbc-live-plus-credit-card` (50), `magnus-burgundy-credit-card` (173). Use one of these for `highlightAlias` / `cardAlias`.

## 6. Isolation (done for you on every mount)

Secure store cleared and seeded; `queryClient.cancelQueries()` + `clear()`; `focusManager.setFocused(true)`; `onlineManager` set by the api mode; `resetAdvisorSession()`; `__resetPayoutLock()`; `clearSavedSpends()`; `__resetContractReports()`. Calls from the previous story that resolve late get no answer.

Click-outs: `Linking.openURL` logs `[storybook] click-out <url>` and `Share.share` logs `[storybook] click-out share <url or message>`. Nothing opens.

## 7. Console

- `[storybook] api GET /ck/users/earnings → 200 (earnings)`: every answered call.
- `[storybook] no fixture for GET /…`: a call with no route (a missing fixture). The screen shows its network-error state.
- `[storybook] blocked network call to …`: a call to a host other than `storybook.invalid`.
- `[contract] <endpoint> drifted: …`: a fixture does not match the zod contract. Report it.

## 8. Known limits

- Setup runs once per mount. Changing props of a mounted harness (Controls panel) does not re-run it. Reload the story.
- Not resettable (no export in `src/`): OffersScreen `promoSeenThisSession` (the welcome promo shows once per page load), CardDetailScreenAndroid `pagerNudgeShown`, CardArt `decodedImageUris`, analytics super props.
- On web, `savedSpends` is memory only (`canPersist` false), so `storage` cannot seed saved tool spends; `recentSearches` and `savedProfile` reads are also skipped on web.
- `useWindowDimensions` / `Dimensions` return the iframe size, not the 390 frame.
- RN `<Modal>` sheets (ShareSheet, HowItWorksSheet) portal to `document.body`, outside the frame. Gorhom sheets portal to the provider inside the frame (design intent; not yet seen in a visible browser).
- `RollingAmount` (Earnings headline) renders "0" on web. `Platform.OS` is `'web'`: Android-only and iOS-only branches never render.
- The real floating tab bar (`TabNavigator`) and `StaggeredEntrance` are not mounted.
- `profile.mobile_number` is `98XXXXXX10` (contract rule). `normalizeIndianMobile` turns it into `9810`, so masked mobiles in AccountSettings and DeleteAccountOtp read short.
- Remote images in raw JSON fixtures (store logos on ckassets, card art on the BankKaro CDN in the calculate fixtures) still load as `<img>` requests. Fixtures written here use bundled assets for card art.
- Error states appear only after the app's own retries (GET: 2 retries with backoff).
