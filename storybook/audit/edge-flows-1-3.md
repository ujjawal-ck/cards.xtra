# Edge cases and loaders: flows 1, 2, 3a, 3b, 3c

Audited 2026-11-19 [claude] on branch `claude/storybook` (worktree `cards.xtra-storybook`). Product manager and UX designer lens.
Method: code reading only. Nothing was run in Storybook, on a device or in a simulator. Line numbers are from this branch.
Rows marked "inferred" follow from code paths that were read but not executed.
Row counts: STORY 65, LIVE-NO-STORY 65, MISSING 12, N/A 26. Stories to add: 47 (35 live, 12 proposed).
LIVE-NO-STORY split: 35 get a live story below, 8 are harness-blocked (font, keyboard, back, Linking), 8 are 360 dp rows that are buildable but cut to the tail, 14 are tail.

## How to read this file

Status rules (they drive the counts):
- `STORY`: a story exists that shows what the user sees. Existing proposed stories, `Patterns/*` and `Flows/10` stories count.
- `LIVE-NO-STORY`: the app renders something for this edge today (even a false empty, raw API text or a native Alert), but no story shows it. Evidence is `file:line`. When the render is wrong, a separate proposed story is listed too.
- `MISSING`: no code path handles the edge. The proposal uses only existing DS parts and tokens.
- `N/A`: does not apply, with a one-line reason.
- The old audits' PARTIAL maps to `STORY` or `LIVE-NO-STORY` plus a proposed fix.

Story ids: each screen gives its id prefix once. `--suffix` in a row means `<prefix>--suffix`.
Harness shorthand: `SH` = `ScreenHarness`, `CH` = `ComponentHarness`, `SHt` = `SheetHarness`, `PF` = `PhoneFrame` (proposed stories only; they never import `src/screens`).
Offline copy reused from `storybook/audit/ux-states.md` ("Standard offline state"): `ScreenState` title "You're offline", body "Check your connection and try again.", actionLabel "Try again".

## Facts that apply to every screen (read once)

| # | Fact | Evidence |
|---|---|---|
| G1 | Worst-case wait before an error. GET: 15 s per attempt, 2 retries with backoff, so about 46 s of skeleton or spinner before the error state. Eligibility POST is marked idempotent, so the same 46 s. Login OTP POSTs are not idempotent: one 15 s attempt, then "Request timed out. Check your connection and try again." | `src/api/http/client.ts:50`, `:51`, `:142`, `:195`, `:196`; `src/api/bankkaro.ts:55` |
| G2 | No screen in flows 1 to 3 shows a "taking longer" line. The only wait line in the app is in the tools (`ToolResultsScreen.tsx:522`, pattern `patterns-loading--wait-line`). | grep of in-scope files |
| G3 | No persisted query cache (no persister in `src/` or `App.js`). Every cold start with no network has no cache. "Offline with cache" exists only inside one app session (gcTime 30 min). | `src/query/queryClient.ts:13`, `:17` |
| G4 | Offline with no cache: queries pause. `isLoading` and `isError` are both false, so screens that read only those fall to their empty branch (false empty). | `src/lib/network.ts:23`; systemic finding in `ux-states.md` |
| G5 | 429 on a GET is retried like a 5xx (Retry-After honoured, capped at 16 s), then the screen shows its generic error. No screen in scope has 429-specific copy. | `src/api/http/client.ts:98`, `src/api/http/errors.ts:75` |
| G6 | `queryClient` does not retry ApiError; only the transport retries. A tap on "Retry" runs one more transport cycle (up to 46 s again). | `src/query/queryClient.ts:18` |
| G7 | Refocus refetch keeps old data on screen. If that refetch fails, `isError` is true while `data` still exists (TanStack v5). Screens that branch on `isError` first then replace or stack over good data (inferred). | `src/query/useRefetchOnFocus.ts`, `src/query/useCards.ts:62` |
| G8 | App text scales with the OS font setting, uncapped. | `src/atoms/Text.tsx:31` |

Harness limits that block device rows (details in "Gaps and unsupported"): no font scale, no keyboard, no Android back (BackHandler is a no-op in `storybook/.storybook/preview.tsx:6`), `Platform.OS` is `web`, `Linking.openURL` is stubbed. 360 dp IS buildable for every screen and sheet with the `android360` viewport global (`preview.tsx` PHONES), because `Dimensions` reads the iframe. `Alert.alert` is drawn as a DOM dialog (`preview.tsx:11`).

---

## Flow 1. Launch and login

### Splash
Id prefix: `flows-1-launch-and-login-splash`

| Edge | Status | Evidence | Proposal / story to add (harness setup) |
|---|---|---|---|
| First load (Lottie, 7 s safety exit) | STORY | `--default` | |
| Offline at cold start, saved session | STORY | `--offline-with-saved-session`; session kept on network failure `src/auth/AuthContext.tsx:127` | |
| Slow network while an expired access token refreshes | LIVE-NO-STORY | Bootstrap awaits the refresh POST (`AuthContext.tsx:131`, 15 s timeout). The 7 s safety exit (`SplashScreen.tsx:35`) can fire while `status` is still `loading`; `goNext` then routes by the onboarded flag only (`SplashScreen.tsx:64`). A signed-in user with no onboarded flag lands on Onboarding (inferred; rare because login sets the flag). | Tail. Login writes the onboarded flag (`src/auth/LoginSheetProvider.tsx:303`), so a user who logged in here goes to MainTabs; only a session with no flag lands on Onboarding. Setup if needed: `SH auth="signedIn" storage={{ [STORAGE_KEYS.accessToken]: <expired JWT> }}` (`storage` wins over the auth seed, `storybook/harness/storyState.ts:66`), `api.ok({ refreshToken: reply.delay(10000, authFixture.refreshed) })`. |
| Refresh token rejected at launch | LIVE-NO-STORY | Bootstrap clears the session but does not set `sessionExpiredAt` (`AuthContext.tsx:136` to `:140`), so no login sheet and no message: the user is silently a guest. | Live `RefreshRejectedAtLaunch`: `SH auth="signedIn" storage={{ [STORAGE_KEYS.accessToken]: <expired JWT> }} api={api.ok({ refreshToken: reply.code(401, '2004', 'Session expired') })}`. Open question Q3. |
| 5xx, 404, malformed | N/A | Splash makes no data call; only the refresh above. | |
| Data volume, loaders beyond Lottie | N/A | No list, no data. | |
| Guest vs signed in, first time vs returning | STORY | `--default` (guest), `--session-loading` (signed in) | |
| 360 dp, 130% font | N/A | Full-bleed Lottie, no text. | |

### Onboarding
Id prefix: `flows-1-launch-and-login-onboarding`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Slides, guest start, log in | STORY | `--slides`, `--guest-start`, `--login-tapped` | |
| Network, server, data volume | N/A | Static slides; no data call (`src/screens/OnboardingScreen.tsx:393`, `:401`). Login errors belong to the login sheet. | |
| 360 dp and 130% font | LIVE-NO-STORY | Layout reads `Dimensions.get('window').width` (`OnboardingScreen.tsx:120`) | 360: Buildable: set the story's `globals: { viewport: { value: 'android360' } }` (`storybook/.storybook/preview.tsx` PHONES), so `Dimensions` reads 360. Tail. 130% font: harness limit. |
| Android back on slide 2+ | LIVE-NO-STORY | No BackHandler in the screen; native stack default. | Harness limit. |

### Login sheet (phone, OTP, new-number name)
Id prefix: `flows-1-launch-and-login-login-sheet`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Phone invalid, CTA disabled | STORY | `--phone-invalid` | |
| Requesting OTP (button spinner) | STORY | `--phone-requesting-otp` | |
| Offline when requesting OTP | LIVE-NO-STORY | Transport text "Network error. Check your connection and try again." (`src/api/http/client.ts:145`) shown at `src/auth/LoginSheetProvider.tsx:231`, `:466` | Live `PhoneOfflineToday`: `CH auth="guest" api={api.ok({ loginOtp: reply.network() })}`, steps typePhone, tapGetOtp. Fix is `--offline-proposed` (STORY). |
| Slow network, OTP request times out | LIVE-NO-STORY | One 15 s attempt (POST, not idempotent), then "Request timed out. Check your connection and try again." (`client.ts:142`) | Live `PhoneTimeoutToday`: `api.ok({ loginOtp: reply.hang() })`; the story must wait 16 s. Same setup as `--phone-requesting-otp` at t < 15 s. |
| Slow network, no "taking longer" line | MISSING | G2 | Proposed `RequestingOtpSlowProposed`: `PhonePanelReplica` (in the file; props `title`, `body`, `message`, `tone`) with tone info, message "Still sending your OTP. This can take a few seconds.", shown after 5 s. |
| 5xx on OTP request | STORY | `--phone-send-failed` (shows "Request failed (500)", raw) | |
| 5xx copy fix | MISSING | Raw text from `messageFromBody` (`src/api/http/errors.ts:131`) | Proposed `ServerErrorProposed`: phone step replica with `InlineMessage` tone error, message "We couldn't send your OTP. Try again in a minute." |
| 429 rate limit | STORY | `--rate-limit-today`, `--rate-limit-proposed` | |
| Wrong OTP | STORY | `--otp-wrong` | |
| Connection drops on Verify | LIVE-NO-STORY | Login POST, no retry; "Network error…" on the OTP step (`LoginSheetProvider.tsx:319`, `:526`) | Live `OtpVerifyDropped`: `api.ok({ login: reply.network() })`, steps typePhone, tapGetOtp, typeOtp, tap "Verify & log in". |
| Verifying spinner | STORY | `--otp-verifying` | |
| Resend fails | LIVE-NO-STORY | Raw ApiError text (`LoginSheetProvider.tsx:263`) | Live `ResendFailed`: `api.ok({ loginOtp: reply.sequence(authFixture.otpSent, reply.error(500)) })`, steps typePhone, tapGetOtp, wait 31 s, tap Resend. |
| Signup (new number) fails on Verify | LIVE-NO-STORY | Raw ApiError text (`LoginSheetProvider.tsx:319`) | Live `SignupFailed`: `api.ok({ loginOtp: authFixture.notRegistered, signup: reply.error(500) })`, steps as `--success-new-number`. |
| New-number name missing | STORY | `--new-number-name-missing` | |
| Session expired opens the sheet | STORY | `--session-expired-proposed`, `patterns-session-expiry--today-sheet`, `flows-10-offline-and-session-session-expired--*` | |
| Success returning, success new number | STORY | `--success-returning`, `--success-new-number` | |
| Very long name (30-character cap) | N/A | Cap exists on hidden NameInput (`src/screens/NameInputScreen.tsx:319`); OTP-step name field: see Greeting long name. | |
| 360 dp | LIVE-NO-STORY | `Dimensions.get('window').width` (`LoginSheetProvider.tsx:107`) | Buildable: set the story's `globals: { viewport: { value: 'android360' } }` (`storybook/.storybook/preview.tsx` PHONES), so `Dimensions` reads 360. Tail. |
| Keyboard over inputs | LIVE-NO-STORY | Keyboard spacer `LoginSheetProvider.tsx:134` | Harness limit. |
| Android back closes the sheet | LIVE-NO-STORY | `src/navigation/SheetBackHandler.tsx:30` | Harness limit. |

### Greeting
Id prefix: `flows-1-launch-and-login-greeting`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Default, no name, long name | STORY | `--default`, `--no-name`, `--long-name` | |
| Long name at 360 dp | LIVE-NO-STORY | `display40ExtraBold`, no line limit (`src/screens/GreetingScreen.tsx:184`); no `Dimensions` read | Live `LongName360`: `SH width={360}` with the `--long-name` params. |
| Network, server, data volume | N/A | No data call; name from route params. | |

---

## Flow 2. Home and discovery

### Home
Id prefix: `flows-2-home-and-discovery-home`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| First load skeleton | STORY | `--loading` | |
| Offline at cold start, no cache | STORY | `--offline-today` (false empty), `--offline-proposed`, `flows-10-offline-and-session-paused-screens--home-offline` | |
| Offline with cache (same session) | STORY | List stays (`--loaded-guest`) and the app-level banner shows (`patterns-offline--banner`, `App.js:204`) | |
| Slow network (> 5 s) | LIVE-NO-STORY | Skeleton held opaque while `isLoading` (`src/screens/HomeScreen.tsx:2871`, `:2881`), up to about 46 s (G1). No message. | Live `SlowCatalogue`: `SH auth="guest" api={api.ok({ cards: reply.delay(8000, cardsFixture.default) })}`. |
| Slow network message | MISSING | G2 | Proposed `SlowCatalogueProposed`: `PF` with `HomeSkeleton` and, above the first skeleton tile, `Text` `body14Medium` `text.secondary`: "Still loading cards. Your connection seems slow." Show after 5 s. |
| Timeout | STORY | After about 46 s, same block as `--load-error` (G1) | |
| 5xx | STORY | `--load-error` (ad-hoc text + Pressable, `HomeScreen.tsx:2244`); fix `patterns-error-and-retry--home-catalogue-proposed` | |
| 429 | STORY | Retried, then same block as `--load-error` (G5) | |
| 401 / session expires while on Home | LIVE-NO-STORY | Catalogue is not account data, so the list stays; the login sheet opens by itself (`LoginSheetProvider.tsx:125`) | Live `SessionExpiredOnHome`: `SH auth="sessionExpired" api={api.ok()}`. The sheet is not yet seen in a visible browser (harness README). |
| Refocus refetch fails with cards on screen | LIVE-NO-STORY | Inferred (G7): `isError` block renders above the populated list, because the list data is not gated on `isError` (`HomeScreen.tsx:2244`, `:1595`) | Live `RefetchFailedWithCache`: `SH api={api.ok({ cards: reply.error(500) })} beforeMount={() => queryClient.setQueryData(['bk','cards'], <mapped CardModel[]>)}`. Verify the focus refetch runs on mount. |
| Refetch failed copy | MISSING | No "showing older data" state | Proposed `RefetchFailedProposed`: `PF`, list of `CardTile`s with, above it, `InlineMessage` tone warning, message "Couldn't refresh cards. Showing what we loaded earlier.", action "Try again". |
| Malformed response (`data` not an array) | STORY | Mapped to an empty list (`src/query/useCards.ts:41`), same render as `--empty-catalogue-today` | |
| Card with no reward (₹0) | N/A | Dropped before render (`useCards.ts:57`). | |
| Missing card art or art fails to load | LIVE-NO-STORY | Home tiles use RN `Image`; detail art uses `CardArt` with the card's placeholder colour behind (`src/organisms/CardArt.tsx:255`), skeleton removed on success or error (`:308`). `image` empty maps to `{ uri: '' }` (`src/api/cardMapper.ts:544`). | Live `BrokenCardArt`: `SH api={api.ok({ cards: { ...cardsFixture.default, data: BK_CARDS.map((c, i) => i < 2 ? { ...c, image: i ? '' : 'https://storybook.invalid/none.png' } : c) } })}`. Verify `''` does not keep the shimmer. |
| No cards at all | STORY | `--empty-catalogue-today`, `--empty-catalogue-proposed` | |
| Exactly 1 card | LIVE-NO-STORY | "1 card" (`HomeScreen.tsx:2297`); top picks get 1 card, rest empty (`:1540`) | Live `OneCard`: `api.ok({ cards: { ...cardsFixture.default, data: BK_CARDS.slice(0, 1) } })`. |
| 200+ cards | LIVE-NO-STORY | Virtualised `FlatList` (`HomeScreen.tsx:1910`, `:1995`); no pagination | Live `ManyCards`: `data` = `BK_CARDS` repeated to 200 with unique `id` and `card_alias`. Checks the count line and scroll. |
| Long card and bank names, 360 dp | LIVE-NO-STORY | Tile name 2 lines (`src/organisms/CardTile.tsx:187`, `:258`); fixtures have short names only | Live `LongNames360`: `SH width={360}` + one card renamed to a 70-character name and bank. |
| Filters match nothing | STORY | `--no-match-with-closest` | |
| Eligibility on, some eligible | STORY | `--loaded-eligibility-groups` | |
| Eligibility on, none eligible | LIVE-NO-STORY | Toggle path: no sheet when `eligibleCount` is 0 (`HomeScreen.tsx:2730`); list shows only "Ineligible Cards N" (`:1570`). No message. | Live `NoneEligibleGroups`: `api.ok({ eligibility: eligibilityFixture.noneEligible })`, steps as `--loaded-eligibility-groups` without the last tap. |
| None eligible copy | MISSING | No message for a zero-eligible result | Proposed `NoneEligibleProposed`: `PF`, above the "Ineligible Cards" `SectionRule`, `InlineMessage` tone info, message "No card fits these details yet. Edit your details or see cards you are closer to.", action "Edit details". Open question Q5. |
| Pull to refresh | N/A | Not built on Home (no `RefreshControl` in `HomeScreen.tsx`). Logged as a gap. | |
| Filter, category and bank reload skeletons | LIVE-NO-STORY | Timed client-side loaders, no network: filter bar 450 ms (`HomeScreen.tsx:644`, `:2082`), category rows 900 ms (`:661`, `:1945`), bank overlay 1000 ms (`:653`, `:2871`). `filters--transition` shows only the white overlay. | Tail (too short to read in a story). Open question Q9. |
| Pagination | N/A | Full catalogue in one call (`src/api/bankkaro.ts:43`). | |
| Guest vs signed in | STORY | `--loaded-guest`; Apply gate in flow 3a | |
| 130% font, Android back | LIVE-NO-STORY | G8 | Harness limit. |

### Search (SearchTopSheet)
Id prefix: `flows-2-home-and-discovery-search`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Popular, results, no results | STORY | `--popular`, `--results`, `--no-results-advisor-row` | |
| Catalogue loading, offline or failed | STORY | Every query reads "No results" (`src/organisms/SearchTopSheet.tsx:211`); same render as `--no-results-advisor-row`; fix `--catalogue-not-loaded-proposed` | |
| Search while the catalogue is still loading | MISSING | Same false "No results" (`SearchTopSheet.tsx:211`); no loading row | Proposed `CatalogueLoadingProposed`: `PF`, sheet replica with `Skeleton` rows (`height={spacing[48]}`, `radius="lg"`) x3 in place of results. No copy. |
| Very long query | LIVE-NO-STORY | "No results for “{query}”" wraps (`SearchTopSheet.tsx:424`) | Live `LongQuery`: `<Sheet value="hdfc regalia gold credit card lifetime free lounge" sections={[]} />`. |
| Many results (a bank with 30 cards) | LIVE-NO-STORY | ScrollView above the keyboard (`SearchTopSheet.tsx:226`) | Tail (see "Consciously not covered"). |
| Recent searches | N/A | `recentSearches` reads are skipped on web (harness README section 8). | |
| Server, 401 | N/A | Search is client-side over the loaded catalogue. | |
| 360 dp | LIVE-NO-STORY | Sheet height from `Dimensions` (`SearchTopSheet.tsx:148`); RN Modal covers the whole preview on web | Buildable: set the story's `globals: { viewport: { value: 'android360' } }` (`storybook/.storybook/preview.tsx` PHONES), so `Dimensions` reads 360. Tail. |
| Keyboard | LIVE-NO-STORY | Height capped at keyboard top (`SearchTopSheet.tsx:231`) | Harness limit. |

### Filters (FilterMenu, FilterTransitionOverlay)
Id prefix: `flows-2-home-and-discovery-filters`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Menu, applied, transition | STORY | `--menu-open`, `--applied`, `--transition` | |
| Network, server | N/A | Prop-only; options derive from the loaded catalogue. | |
| Catalogue empty or offline: Banks tab has no options | LIVE-NO-STORY | `bankOptions = []` (`src/organisms/FilterMenu.tsx:280`), Banks panel `:398` | Tail. |
| Long bank names | STORY | 2-line label (`FilterMenu.tsx:243`) | |
| 360 dp | LIVE-NO-STORY | 2-line rail labels (`FilterMenu.tsx:243`) | Buildable: set the story's `globals: { viewport: { value: 'android360' } }` (`storybook/.storybook/preview.tsx` PHONES), so `Dimensions` reads 360. Tail. |

### Eligibility checker (Home toggle and Apply gate)
Id prefix: `flows-2-home-and-discovery-eligibility-checker`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Empty, validation errors, checking, API error | STORY | `--empty`, `--validation-errors`, `--checking`, `--api-error` | |
| Offline or connection drops on Check | STORY | Same message as `--api-error` (`src/organisms/EligibilityCheckerSheet.tsx:328`, `:450`; `src/api/eligibility.ts:93`) | |
| Slow check (> 5 s) | STORY | `--checking` (hang); `Button loading` only (`EligibilityCheckerSheet.tsx:383`), up to about 46 s (G1) | |
| Slow check message | MISSING | G2 | Proposed `CheckingSlowProposed`: `PF` sheet replica, under the loading CTA `Text` `body12Regular` `text.secondary`: "Still checking with the banks. This can take a few seconds." |
| Invalid or unserved PIN (422) | LIVE-NO-STORY | Any API failure shows "We couldn't check your eligibility right now. Check your connection and try again." (`EligibilityCheckerSheet.tsx:328`). `eligibilityFixture.invalidPincode` (422) has no story. PIN `000000` passes the client check (`:291`). | Live `InvalidPincodeToday`: `SHt` checker, `api.ok({ eligibility: eligibilityFixture.invalidPincode })`, defaults PIN `000000`, income `₹75,000`, tap Check. |
| Invalid PIN copy | MISSING | No 422 mapping | Proposed `InvalidPincodeProposed`: `PF` sheet replica, PIN `Input state="error"` with `hint` "We couldn't find this PIN code. Check it and try again." No `InlineMessage`. |
| Income ₹0 | STORY | "Enter your monthly income" (`EligibilityCheckerSheet.tsx:300`) in `--validation-errors` | |
| Income ₹10,00,000+ a month (likely yearly typed) | LIVE-NO-STORY | No cap, no `maxLength` (`EligibilityCheckerSheet.tsx:509`); value goes to the API as monthly | Live `VeryHighIncome`: defaults income `₹15,00,000`, PIN `110001`, `api.ok({ eligibility: eligibilityFixture.allEligible })`, tap Check. |
| Very high income guard | MISSING | No hint | Proposed `VeryHighIncomeProposed`: income `Input` with non-error `hint` "That's ₹15,00,000 a month. Enter your monthly income, not yearly." Open question Q6 (threshold). |
| Keyboard over inputs | LIVE-NO-STORY | `useAnimatedKeyboard` spacer (`EligibilityCheckerSheet.tsx:203`, `:562`) | Harness limit. |
| 360 dp | LIVE-NO-STORY | Chips `flex:1` for 360 (`EligibilityCheckerSheet.tsx:525`) | Buildable: set the story's `globals: { viewport: { value: 'android360' } }` (`storybook/.storybook/preview.tsx` PHONES), so `Dimensions` reads 360. Tail. |
| Android back dismisses (drops a pending Apply) | STORY | `flows-3a-card-detail-and-apply-apply-gate--dismissed-drops-apply` | |

### Eligible sheet, multi-card mode (Home toggle path)
No story file of its own; it is a step inside `flows-2-home-and-discovery-home--loaded-eligibility-groups`.

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| "Congrats! You're eligible for N cards" | STORY | Mid-steps of `--loaded-eligibility-groups` | |
| Exactly 1 eligible card ("1 card") | LIVE-NO-STORY | Singular copy `HomeScreen.tsx:2767` to `:2769` | Live `EligibleCardsModeOne` in `ResultSheets.stories.tsx`: `<EligibleSheet hideReward cardImages={[one]} message={"Congrats!\nYou're eligible for 1 card"} ctaLabel="Great, Show Cards" />`. |
| Network, server | N/A | Prop-only. | |

### Notifications
Id prefix: `flows-2-home-and-discovery-notifications`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Always empty | STORY | `--always-empty` (`src/screens/NotificationsScreen.tsx:172`) | |
| Network, server, data volume, loaders, session | N/A | No API; static `ScreenState` (R19). | |
| 360 dp | N/A | Centred `ScreenState`, short copy. | |

---

## Flow 3a. Card detail and apply

### Card detail (iOS sheet and Android screen)
Id prefixes: `flows-3a-card-detail-and-apply-card-detail-ios-sheet` (iOS) and `flows-3a-card-detail-and-apply-card-detail-android-screen` (Android). Both have the same stories.

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Benefits loading (card with no tiles) | STORY | `--benefits-loading` (both) | |
| Detail fetch failed: benefits block hides | STORY | `--detail-fetch-failed` (both); `src/organisms/CardDetailSheet.tsx:1137`, `:1365`; fix `patterns-error-and-retry--benefits-error-proposed` | |
| Offline, card with no tiles | LIVE-NO-STORY | Paused query keeps `isPending` true, so the benefits skeleton shimmers until the network returns (`CardDetailSheet.tsx:1111`, `:1137`; Android `src/organisms/CardDetailScreenAndroid.tsx:288`, `:303`). No message (inferred). | Live `BenefitsOffline` (iOS file only): `SHt api={api.offline()}`, `card={NO_TILES}`. |
| Slow benefits (> 5 s) | STORY | `--benefits-loading` (hang) | |
| Null or text fees | LIVE-NO-STORY | Null or "N/A" → "—"; "Contact bank" shown as text (`src/api/cardMapper.ts:310` to `:313`) | Live `OddFees` (iOS file): `card` = model of a BK card with `annual_fee_text: null`, `joining_fee_text: 'Contact bank'`. |
| Missing card art, art fails to load | LIVE-NO-STORY | Placeholder colour + skeleton until `onLoadEnd` (`CardArt.tsx:255`, `:275`, `:308`) | Live `BrokenArt` (iOS file): card with `cardImage: { uri: 'https://storybook.invalid/none.png' }`. |
| Empty benefits (no tiles, detail empty) | STORY | Section not rendered (`CardDetailSheet.tsx:1365`); same visual as `--detail-fetch-failed` | |
| Inline eligibility: eligible, maybe, ineligible | STORY | `--inline-eligible`, `--inline-maybe`, `--inline-ineligible` | |
| Inline eligibility: API error | LIVE-NO-STORY | `InlineMessage` tone error (`CardDetailSheet.tsx:712`) | Live `InlineCheckError` (iOS file): `api.ok({ eligibility: reply.error(500) })`, defaults set, tap "Check". |
| Inline eligibility: invalid PIN (422) | LIVE-NO-STORY | Same connection copy (`CardDetailSheet.tsx:673`) | Tail; the fix is `InvalidPincodeProposed` above. |
| Inline eligibility: checking | LIVE-NO-STORY | Button `loading` (`CardDetailSheet.tsx:785`) | Tail; same pattern as `flows-2-home-and-discovery-eligibility-checker--checking`. |
| Apply tap with no feedback | STORY | `flows-3a-card-detail-and-apply-click-out--resolving-user-id-proposed`; `ApplyBar` Button has no `loading` (`CardDetailSheet.tsx:2067`) | |
| Session expires while the detail is open | LIVE-NO-STORY | Card data is public; the login sheet opens over it (`LoginSheetProvider.tsx:125`) | Tail; see `SessionExpiresAtApply` in Click-out. |
| Long card name | STORY | 2 lines (`CardDetailSheet.tsx:1335`, Android `:349`), in `--loaded` | |
| 360 dp | LIVE-NO-STORY | Both read `Dimensions` (`CardDetailSheet.tsx:979`, `CardDetailScreenAndroid.tsx:105`) | Buildable: set the story's `globals: { viewport: { value: 'android360' } }` (`storybook/.storybook/preview.tsx` PHONES), so `Dimensions` reads 360. Tail. |
| Android back closes the detail | LIVE-NO-STORY | `SheetBackHandler.tsx:30` | Harness limit. |
| Android pager nudge once per run | N/A | Module flag not resettable (`CardDetailScreenAndroid.tsx:142`; README section 8). | |

### Apply gate
Id prefix: `flows-3a-card-detail-and-apply-apply-gate`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Checker opened by Apply | STORY | `--checker-opened-by-apply` | |
| Checker dismissed drops Apply (R2) | STORY | `--dismissed-drops-apply` | |
| Checker API fails during the gate | STORY | Same render as `flows-2-home-and-discovery-eligibility-checker--api-error`; Apply stays pending until dismiss (`HomeScreen.tsx:2716`) | |
| Gate variant `skippable` | N/A | Experiment arm frozen per session (`HomeScreen.tsx:1195`); harness has no documented switch. Listed under gaps. | |
| Network beyond the checker | N/A | The gate itself makes no call. | |

### Result sheets (Eligible, Maybe, Ineligible)
Id prefix: `flows-3a-card-detail-and-apply-result-sheets`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Eligible, maybe, ineligible | STORY | `--eligible`, `--maybe`, `--ineligible` | |
| Eligible sheet with no reward value | LIVE-NO-STORY | Prop default `rewardHeadline = 'Flat ₹1400 Rewards'` (`src/organisms/EligibleSheet.tsx:135`). Home passes `undefined` when the hero card has no `cashbackValue` or is null (`HomeScreen.tsx:2782`). Rare today because `useCards.ts:57` drops no-reward cards, but a wrong money figure if it happens. | Live `EligibleNoRewardToday`: `<EligibleSheet cardImage={REGALIA.cardImage} rewardHeadline={undefined} … />`. Fix in gaps (engineering), not a design. |
| Maybe with 1 card ("Explore 1 Card") | LIVE-NO-STORY | `HomeScreen.tsx:2813` | Tail. |
| Network, server | N/A | Prop-only. | |
| 360 dp | LIVE-NO-STORY | Sheet content width follows the window (`src/organisms/EligibleSheet.tsx`, `MaybeSheet.tsx`, `IneligibleSheet.tsx`) | Buildable: set the story's `globals: { viewport: { value: 'android360' } }` (`storybook/.storybook/preview.tsx` PHONES), so `Dimensions` reads 360. Tail. |

### Click-out (Apply Now)
Id prefix: `flows-3a-card-detail-and-apply-click-out`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Guest: earn prompt | STORY | `--guest-earn-prompt` | |
| Signed in: link opens | STORY | `--signed-in` | |
| Guest logs in, Apply continues | LIVE-NO-STORY | `launchAfterLogin` (`src/lib/useClickOut.tsx:119`, `:152`) | Live `GuestLoginContinues`: `CH auth="guest" api={api.ok()}`; steps tap Apply, "Log in to earn cashback", typePhone, tapGetOtp, typeOtp, Verify. Expect one attributed `[storybook] click-out`. |
| Guest dismisses the login sheet after "Log in to earn" | LIVE-NO-STORY | `pending.current = null` before login (`useClickOut.tsx:149`); cancel drops the Apply with no message | Live `GuestLoginCancelled`: same, then close the login sheet. Expect no click-out. Open question Q2. |
| Slow profile: user id still resolving | LIVE-NO-STORY | `await profileQ.refetch()` with no feedback (`useClickOut.tsx:96` to `:99`); up to about 46 s (G1) | Live `ResolvingSlowToday`: `CH auth="signedIn" api={api.ok({ profile: reply.delay(8000, profileFixture.default) })}`; tap Apply at 1 s; link opens at about 8 s. Fix is `--resolving-user-id-proposed` (STORY). |
| Double tap on Apply while the user id resolves | LIVE-NO-STORY | No in-flight guard in `openClickOut` (`useClickOut.tsx:85` to `:115`); each call awaits its own refetch, then `launch` logs `CLICK_OUT` with a new click id (`:70`, `:72`). With a loaded profile the browser opens on the first tap, so the real window is the refetch wait. | Live `DoubleTapToday`: `CH auth="signedIn" api={api.ok({ profile: reply.delay(8000, profileFixture.default) })}`; taps on Apply at 1 s and 2 s. Expect two click-out logs with two click ids at about 8 s. Fix is the same `primaryLoading` as `--resolving-user-id-proposed`. |
| User id not resolved (profile 5xx, 403, 404, offline) | LIVE-NO-STORY | Native `Alert` "Couldn't open this right now" (`useClickOut.tsx:106`); Storybook draws it as a DOM dialog (`storybook/.storybook/preview.tsx:11`) | Live `UserIdMissingToday`: `CH auth="signedIn" api={api.ok({ profile: reply.error(500) })}`; tap Apply; the dialog shows after the retries. Fix is `--user-id-missing-proposed` (STORY). |
| Session expires at Apply | LIVE-NO-STORY | Profile refetch gets 401, refresh gets 401 (2004), session ends and the login sheet opens; the same tap also raises the Alert (`useClickOut.tsx:106`) (inferred) | Live `SessionExpiresAtApply`: `CH auth="signedIn" api={api.ok({ profile: reply.sequence(reply.network(), reply.network(), reply.network(), reply.error(401)), refreshToken: reply.code(401, '2004', 'Session expired') })}`. Verify the call count. |
| Empty URL | STORY | `--empty-url-today`, `--empty-url-proposed` | |
| Malformed URL, browser cannot open | LIVE-NO-STORY | `CLICK_OUT` and `addAppliedCard` run before `openUrl`; failure is swallowed (`useClickOut.tsx:72` to `:82`, `src/lib/openUrl.ts:11`) | Harness limit (Linking stubbed). Gap P0. |
| Redirect hand-off | STORY | `--redirect-proposed` | |
| Return from the bank | STORY | `--return-proposed` | |
| 360 dp, 130% font | N/A | The CTA lives on the detail; see Card detail. | |

### All card benefits
Id prefix: `flows-3a-card-detail-and-apply-all-card-benefits`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Loading (bare spinner) | STORY | `--loading`; fix `patterns-loading--benefits-proposed` | |
| Error (text only, no retry) | STORY | `--load-error` (`src/screens/AllCardBenefitsScreen.tsx:143`) | |
| Error with retry | MISSING | No action on the error text (`AllCardBenefitsScreen.tsx:133` to `:147`) | Proposed `LoadErrorProposed`: `PF`, `Header`, `ScreenState` title "Couldn't load benefits", body "Check your connection and try again.", actionLabel "Try again", then `FooterButtons` "Go back to card details". |
| Not available (empty) | STORY | `--not-available` | |
| Offline, no cache | LIVE-NO-STORY | Paused query: `isLoading` false, `categories` empty, so "Benefit details aren't available for this card." (false empty; `AllCardBenefitsScreen.tsx:129`, `:145`) | Live `OfflineToday`: `SH api={api.offline()}` with the same params as `--loaded`. |
| Offline fix | MISSING | | Proposed `OfflineProposed`: `PF`, `Header`, standard offline `ScreenState`, `FooterButtons` "Go back to card details". |
| 404 card not found | STORY | Same text as `--load-error` (`AllCardBenefitsScreen.tsx:143`) | |
| Many categories and long benefit text | LIVE-NO-STORY | Horizontal chips, wrapped text (`AllCardBenefitsScreen.tsx:86`, `:169`) | Tail. |
| Pull to refresh | N/A | Not built. | |
| 360 dp | LIVE-NO-STORY | Chip row and wrapped text (`AllCardBenefitsScreen.tsx:86`, `:169`) | Tail (`SH width={360}`). |

### How it works sheet, Share sheet
Id prefixes: `flows-3a-card-detail-and-apply-how-it-works-sheet`, `flows-3a-card-detail-and-apply-share-sheet`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Tracking steps; share tiles | STORY | `--tracking-steps`; `--tiles` | |
| Network, server, data volume | N/A | Static content; `Share.share` failure is swallowed (`src/organisms/ShareSheet.tsx:228`). | |
| 360 dp | N/A | RN `Modal` portals to `document.body` on web (README section 8). | |

---

## Flow 3b. Rejection

### Rejection sheet (IneligibleSheet)
Id prefix: `flows-3b-rejection-rejection-sheet`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Income reason with picks, generic reason | STORY | `--income-reason-with-picks`, `--generic-reason` | |
| Zero picks | STORY | `--zero-picks-today`, `--zero-picks-proposed` | |
| One pick | LIVE-NO-STORY | Full-width single pick (`src/organisms/IneligibleSheet.tsx:98`, `:140`) | Live `OnePick`: same as `--income-reason-with-picks` with `picks={REJECTION.picks.slice(0, 1)}`. |
| Network, server | N/A | Prop-only. | |
| 360 dp | LIVE-NO-STORY | Picks row (`IneligibleSheet.tsx:98`, `:140`) | Buildable: set the story's `globals: { viewport: { value: 'android360' } }` (`storybook/.storybook/preview.tsx` PHONES), so `Dimensions` reads 360. Tail. |

### Cards you can get (rejection)
Id prefix: `flows-3b-rejection-cards-you-can-get-rejection`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Loading, loaded, filter applied, no match, error | STORY | `--loading`, `--loaded`, `--filter-applied`, `--no-match`, `--load-error` | |
| No cards to show (no eligible alias, or rejected card not in the catalogue) | LIVE-NO-STORY | `ScreenState` "No cards to show" (`src/screens/CardsYouCanGetScreen.tsx:291`) | Live `NoCardsToShow`: `SH api={api.ok()} params={{ rejectedCardId: <id>, eligibleAliases: [], source: 'rejection' }}`. |
| Offline, no cache | LIVE-NO-STORY | Paused `useCards`: `isLoading` false, `rejected` undefined, so "No cards to show" (false empty; `CardsYouCanGetScreen.tsx:273`, `:291`) | Live `OfflineToday`: `SH api={api.offline()}` with the `--loaded` params. |
| Offline fix | MISSING | | Proposed `OfflineProposed`: `PF`, `Header` "Cards you can get", standard offline `ScreenState`. |
| Refocus refetch fails with a list on screen | STORY | Same render as `--load-error`: `isError` returns first and replaces a good list (`CardsYouCanGetScreen.tsx:280`) (inferred, G7) | |
| 1 card | LIVE-NO-STORY | Count line and one row (`CardsYouCanGetScreen.tsx:354`, `:473`) | Tail. |
| Long card name at 360 dp | LIVE-NO-STORY | "You wanted {name}" with no line limit (`CardsYouCanGetScreen.tsx:348`); no `Dimensions` read | Live `LongName360`: `SH width={360}`, catalogue with the rejected card renamed to 70 characters. |
| Card art fails in the context strip | LIVE-NO-STORY | RN `Image` on `surface.sunken`, no `onError` (`CardsYouCanGetScreen.tsx:336`) | Tail. |
| Apply from this page | STORY | Click-out stories (source `cards_you_can_get`, `CardsYouCanGetScreen.tsx:244`) | |

---

## Flow 3c. Bounce

### Cross-sell rail
Id prefix: `flows-3c-bounce-cross-sell-rail`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Lenses, other lens, viewed pick, one pick, hidden | STORY | `--lenses`, `--other-lens`, `--viewed-pick`, `--one-pick`, `--hidden-no-rail` | |
| Network, server | N/A | Computed from the loaded catalogue (`src/screens/useCrossSellRail.ts:161`). | |
| Rail opens below the visible area | N/A here | Listed under "Consciously not covered" in `pm-flows.md`. | |
| Long names at 360 dp | LIVE-NO-STORY | Header and pick names (`src/organisms/CrossSellRail.tsx:189`) | Tail. |

### Cards you can get (bounce)
Id prefix: `flows-3c-bounce-cards-you-can-get-bounce`

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Eligibility unknown, known | STORY | `--eligibility-unknown`, `--eligibility-known` | |
| Loading, error, offline, no cards | STORY | Same screen and code as flow 3b (`CardsYouCanGetScreen.tsx:273` to `:298`); rejection stories show these states | |
| Title "More cards to consider" at 360 dp | LIVE-NO-STORY | `CardsYouCanGetScreen.tsx:263` | Tail. |

---

## Stories to add

Ranked by frequency x severity (P0 money or attribution first). 47 stories (35 live, 12 proposed). Setup is `auth` + `api`. Steps reuse the helpers already in each file (`typePhone`, `tapGetOtp`, `typeOtp`, `clickByText`, `clickByPart`, `typeInto`).

### Rank (top 20 across files)
1. `ClickOut/ResolvingSlowToday` (live). P0: Apply looks dead for up to 46 s.
2. `ClickOut/DoubleTapToday` (live). P0: two click ids for one Apply.
3. `ClickOut/UserIdMissingToday` (live). P0: dead tap on web, OS dialog on device.
4. `Home/SlowCatalogue` (live) + `Home/SlowCatalogueProposed` (proposed). Every cold start on a slow network.
5. `CardsYouCanGetRejection/OfflineToday` (live) + `OfflineProposed`. False "No cards to show".
6. `AllCardBenefits/OfflineToday` (live) + `OfflineProposed`. False "not available".
7. `EligibilityChecker/InvalidPincodeToday` (live) + `InvalidPincodeProposed`. Wrong "check your connection" copy.
8. `Home/NoneEligibleGroups` (live) + `NoneEligibleProposed`. Silent zero-eligible result.
9. `ClickOut/SessionExpiresAtApply` (live). Login sheet plus Alert at the revenue tap.
10. `Home/RefetchFailedWithCache` (live, verify) + `RefetchFailedProposed`.
11. `ResultSheets/EligibleNoRewardToday` (live). Wrong money figure (rare).
12. `LoginSheet/PhoneOfflineToday` (live).
13. `LoginSheet/OtpVerifyDropped` (live).
14. `ClickOut/GuestLoginContinues` (live).
15. `Splash/RefreshRejectedAtLaunch` (live).
16. `EligibilityChecker/VeryHighIncome` (live) + `VeryHighIncomeProposed`.
17. `CardDetailIos/BenefitsOffline` (live).
18. `ClickOut/GuestLoginCancelled` (live).
19. `AllCardBenefits/LoadErrorProposed` (proposed).
20. `LoginSheet/SignupFailed` (live).

### By target file

`stories/flows/01-launch-and-login/Splash.stories.tsx`
- `RefreshRejectedAtLaunch` (live): `SH auth="signedIn" storage={{ [STORAGE_KEYS.accessToken]: <expired JWT> }} api={api.ok({ refreshToken: reply.code(401, '2004', 'Session expired') })}`.

`stories/flows/01-launch-and-login/LoginSheet.stories.tsx`
- `PhoneOfflineToday` (live): `CH auth="guest" api={api.ok({ loginOtp: reply.network() })}`; typePhone, tapGetOtp.
- `PhoneTimeoutToday` (live): `api.ok({ loginOtp: reply.hang() })`; typePhone, tapGetOtp; message after 15 s.
- `OtpVerifyDropped` (live): `api.ok({ login: reply.network() })`; typePhone, tapGetOtp, typeOtp, "Verify & log in".
- `ResendFailed` (live): `api.ok({ loginOtp: reply.sequence(authFixture.otpSent, reply.error(500)) })`; wait 31 s, tap Resend.
- `SignupFailed` (live): `api.ok({ loginOtp: authFixture.notRegistered, signup: reply.error(500) })`; steps as `SuccessNewNumber`.
- `ServerErrorProposed` (proposed): `PhonePanelReplica` (already in the file) with tone error, "We couldn't send your OTP. Try again in a minute."
- `RequestingOtpSlowProposed` (proposed): `PhonePanelReplica` tone info, message "Still sending your OTP. This can take a few seconds."

`stories/flows/01-launch-and-login/Greeting.stories.tsx`
- `LongName360` (live): `SH width={360}` with the `LongName` params.

`stories/flows/02-home-and-discovery/Home.stories.tsx`
- `SlowCatalogue` (live): `api.ok({ cards: reply.delay(8000, cardsFixture.default) })`.
- `SlowCatalogueProposed` (proposed): `PF` + `HomeSkeleton` + "Still loading cards. Your connection seems slow."
- `NoneEligibleGroups` (live): `api.ok({ eligibility: eligibilityFixture.noneEligible })`; steps as `LoadedEligibilityGroups` minus the last tap.
- `NoneEligibleProposed` (proposed): `PF`, `InlineMessage` tone info "No card fits these details yet. Edit your details or see cards you are closer to.", action "Edit details", then `SectionRule` "Ineligible Cards N" and `CardTile`s.
- `RefetchFailedWithCache` (live, verify): `api.ok({ cards: reply.error(500) })` + `beforeMount` seeds `['bk','cards']` with mapped cards.
- `RefetchFailedProposed` (proposed): `PF`, `InlineMessage` tone warning "Couldn't refresh cards. Showing what we loaded earlier.", action "Try again", over `CardTile`s.
- `SessionExpiredOnHome` (live): `SH auth="sessionExpired" api={api.ok()}`.
- `BrokenCardArt` (live): two cards with `image: ''` and `image: 'https://storybook.invalid/none.png'`.
- `OneCard` (live): `data: BK_CARDS.slice(0, 1)`.
- `ManyCards` (live): 200 cards from `BK_CARDS` with unique `id` and `card_alias`.
- `LongNames360` (live): `SH width={360}`, one card and bank renamed to 70 characters.

`stories/flows/02-home-and-discovery/Search.stories.tsx`
- `CatalogueLoadingProposed` (proposed): sheet replica in `PF` with 3 `Skeleton` rows (`height={spacing[48]}`, `radius="lg"`).
- `LongQuery` (live): `<Sheet value="hdfc regalia gold credit card lifetime free lounge" sections={[]} onAdvisorPress={() => {}} />`.

`stories/flows/02-home-and-discovery/EligibilityChecker.stories.tsx`
- `InvalidPincodeToday` (live): `api.ok({ eligibility: eligibilityFixture.invalidPincode })`, defaults PIN `000000`, income `₹75,000`, tap.
- `InvalidPincodeProposed` (proposed): sheet replica, PIN `Input state="error"` hint "We couldn't find this PIN code. Check it and try again."
- `VeryHighIncome` (live): `api.ok({ eligibility: eligibilityFixture.allEligible })`, income `₹15,00,000`, PIN `110001`, tap.
- `VeryHighIncomeProposed` (proposed): income `Input` hint "That's ₹15,00,000 a month. Enter your monthly income, not yearly."
- `CheckingSlowProposed` (proposed): sheet replica, loading CTA + "Still checking with the banks. This can take a few seconds."

`stories/flows/03a-card-detail-and-apply/ClickOut.stories.tsx`
- `ResolvingSlowToday` (live): `CH auth="signedIn" api={api.ok({ profile: reply.delay(8000, profileFixture.default) })}`; tap Apply at 1 s.
- `DoubleTapToday` (live): `CH auth="signedIn" api={api.ok({ profile: reply.delay(8000, profileFixture.default) })}`; Apply at 1 s and 2 s.
- `UserIdMissingToday` (live): `CH auth="signedIn" api={api.ok({ profile: reply.error(500) })}`; tap Apply; the shimmed Alert dialog shows.
- `SessionExpiresAtApply` (live, verify): `CH auth="signedIn" api={api.ok({ profile: reply.sequence(reply.network(), reply.network(), reply.network(), reply.error(401)), refreshToken: reply.code(401, '2004', 'Session expired') })}`.
- `GuestLoginContinues` (live): `CH auth="guest" api={api.ok()}`; Apply, "Log in to earn cashback", login steps.
- `GuestLoginCancelled` (live): same, then close the login sheet.

`stories/flows/03a-card-detail-and-apply/CardDetailIos.stories.tsx`
- `BenefitsOffline` (live): `SHt api={api.offline()}`, `card={NO_TILES}`.
- `OddFees` (live): card with `annual_fee_text: null`, `joining_fee_text: 'Contact bank'`.
- `BrokenArt` (live): card with `cardImage: { uri: 'https://storybook.invalid/none.png' }`.
- `InlineCheckError` (live): `api.ok({ eligibility: reply.error(500) })`, defaults set, tap "Check".

`stories/flows/03a-card-detail-and-apply/ResultSheets.stories.tsx`
- `EligibleNoRewardToday` (live): `EligibleSheet` with `rewardHeadline={undefined}`.
- `EligibleCardsModeOne` (live): `EligibleSheet hideReward` with one image, "Congrats!\nYou're eligible for 1 card", "Great, Show Cards".

`stories/flows/03a-card-detail-and-apply/AllCardBenefits.stories.tsx`
- `OfflineToday` (live): `SH api={api.offline()}` with the `Loaded` params.
- `OfflineProposed` (proposed): `PF`, `Header`, standard offline `ScreenState`, `FooterButtons` "Go back to card details".
- `LoadErrorProposed` (proposed): `PF`, `ScreenState` "Couldn't load benefits" / "Check your connection and try again." / "Try again".

`stories/flows/03b-rejection/RejectionSheet.stories.tsx`
- `OnePick` (live): `picks={REJECTION.picks.slice(0, 1)}`.

`stories/flows/03b-rejection/CardsYouCanGetRejection.stories.tsx`
- `NoCardsToShow` (live): `params={{ ..., eligibleAliases: [] }}`.
- `OfflineToday` (live): `SH api={api.offline()}`.
- `OfflineProposed` (proposed): `PF`, `Header` "Cards you can get", standard offline `ScreenState`.
- `LongName360` (live): `SH width={360}`, rejected card renamed to 70 characters.

Total: 47 stories (35 live, 12 proposed).

### Consciously not covered (tail)
Lower frequency x severity, or the same render as an existing story:
- Splash `ExpiredTokenSlowRefresh` (rare after `LoginSheetProvider.tsx:303`); Home filter, category and bank timed skeletons.
- 360 dp stories for Onboarding, Login sheet, Search, Filters, Checker, Card detail and the result sheets (buildable with the `android360` viewport).
- Search with many results (a bank with 30 cards); Filters Banks tab empty when the catalogue is empty; Filters at 360 dp.
- Card detail inline 422, inline checking; session expiry with the detail open.
- Maybe sheet with 1 card.
- All card benefits many categories, 360 dp.
- Cards you can get: 1 card, context-strip art failure; bounce title at 360 dp.
- Cross-sell rail long names at 360 dp.

---

## Gaps and unsupported

### App gaps

| # | Gap | Evidence | Severity |
|---|---|---|---|
| A1 | Apply has no in-flight guard and no loading state. While the profile refetch is awaited (up to 46 s), the tap looks dead, and a second tap later sends a second click-out with a new click id. | `src/lib/useClickOut.tsx:85` to `:115`; `ApplyBar` Button has no `loading` (`src/organisms/CardDetailSheet.tsx:2067`) | P0 |
| A2 | `CLICK_OUT` and `addAppliedCard` run before `openUrl`, and `openUrl` swallows a failure. Analytics counts a click-out that never opened, and the cross-sell rail treats the card as applied. | `useClickOut.tsx:72` to `:82`; `src/lib/openUrl.ts:11` | P0 |
| A3 | User id not resolved uses a native `Alert`: no retry, no event, no app-level toast host to replace it. | `useClickOut.tsx:106`, `:132`; DS gap 2 in `ux-states.md` | P0 |
| A4 | `EligibleSheet` default `rewardHeadline` is a fixed rupee figure. Any caller that passes `undefined` shows it. | `src/organisms/EligibleSheet.tsx:135`; `src/screens/HomeScreen.tsx:2782` | P0 (rare) |
| A5 | No "taking longer" line on any loader in flows 1 to 3; worst case about 46 s. | G1, G2 | P1 |
| A6 | Offline cold start shows false empties on All card benefits and Cards you can get (Home already proposed). No persisted cache, so every offline cold start hits it. | G3, G4; `AllCardBenefitsScreen.tsx:129`; `CardsYouCanGetScreen.tsx:273`, `:291` | P1 |
| A7 | Eligibility errors are not mapped by status. A 422 bad PIN says "check your connection". PIN `000000` passes the client check. | `EligibilityCheckerSheet.tsx:291`, `:328`; `CardDetailSheet.tsx:673` | P1 |
| A8 | Monthly income has no upper bound or `maxLength`. A yearly figure typed as monthly inflates eligibility. | `EligibilityCheckerSheet.tsx:509` | P1 |
| A9 | Zero eligible cards on the Home toggle: no sheet, no message. | `HomeScreen.tsx:2730`, `:1570` | P1 |
| A10 | Refresh rejected at launch logs the user out silently: no `sessionExpiredAt`, so no login sheet and no message. | `src/auth/AuthContext.tsx:136` to `:140` | P1 |
| A11 | The 7 s splash safety exit can run while the session bootstrap is still `loading` (slow refresh). Only a session with no onboarded flag reaches Onboarding; login sets the flag (inferred). | `src/screens/SplashScreen.tsx:35`, `:64`; `src/auth/LoginSheetProvider.tsx:303` | P2 |
| A12 | Login sheet shows transport or raw API text for 5xx, offline and timeout. | `src/auth/LoginSheetProvider.tsx:231`, `:263`, `:319` | P1 |
| A13 | Card detail benefits: an error hides the block; offline holds the skeleton with no message. | `CardDetailSheet.tsx:1111`, `:1137`; `CardDetailScreenAndroid.tsx:288` | P1 |
| A14 | A failed refocus refetch stacks the Home error block over a good list, and replaces a good list on Cards you can get (inferred). | `HomeScreen.tsx:2244`; `CardsYouCanGetScreen.tsx:280` | P2 |
| A15 | All card benefits: bare spinner, error text with no retry. | `AllCardBenefitsScreen.tsx:129` to `:147` | P2 |
| A16 | No pull-to-refresh on Home or All card benefits. | grep: no `RefreshControl` in either file | P2 |
| A17 | `ScreenState` has no illustration for offline or error, and one action only. | DS gaps 1 and 5 in `ux-states.md` | P2 |

### Harness and Storybook limits

| # | Limit | Effect on this audit | Evidence | Severity |
|---|---|---|---|---|
| H1 | No font-scale control. | 130% font rows cannot be stories. App text is uncapped (G8). Device QA. | `storybook/harness/README.md` section 2 (no prop); `src/atoms/Text.tsx:31` | P2 |
| H2 | No keyboard. | Keyboard-over-input rows (login, checker, search) are device QA only. | README section 8 | P2 |
| H3 | No Android back (BackHandler is a no-op); `Platform.OS` is `web`. | Back-button rows and Android-only branches cannot render. | `storybook/.storybook/preview.tsx:6`; README section 8 | P2 |
| H4 | 360 dp needs the viewport global, not `width`. | `ScreenHarness width={360}` resizes only the frame; screens and sheets that read `Dimensions` need `globals: { viewport: { value: 'android360' } }`. Not run in this audit. | `preview.tsx` PHONES; `LoginSheetProvider.tsx:107`, `OnboardingScreen.tsx:120`, `CardDetailSheet.tsx:979`, `SearchTopSheet.tsx:148` | P2 |
| H5 | `Linking.openURL` is stubbed. | Cannot show an open failure (A2). | README section 6 | P0 (blocks the A2 story) |
| H6 | `Alert.alert` is drawn as a DOM dialog. | `UserIdMissingToday` shows the real dialog copy. Not a limit; listed because older notes say Alert is invisible. | `storybook/.storybook/preview.tsx:11` | none |
| H7 | Timeout stories wait for the real 15 s per attempt. | A GET timeout story takes about 46 s; only the 15 s OTP timeout is listed. | `storybook/harness/apiMock.ts:181`; `src/api/http/client.ts:50` | P2 |
| H8 | No 200+ card fixture; no fixture with odd fees or broken art. | Stories build these inline from `BK_CARDS`. | `storybook/fixtures/bk.ts:147` | P2 |
| H9 | The eligibility gate experiment arm has no documented switch. | `skippable` gate not shown. | `src/screens/HomeScreen.tsx:1195`; README | P1 |
| H10 | `OfflineBanner` is mounted in `App.js`, not by `ScreenHarness`. | "Offline with cache" stories show the banner only when composed. | `src/molecules/OfflineBanner.tsx:13`; `App.js:204` | P2 |

## Open questions (not settled here)

1. Q1. Apply while the user id resolves: block the button with a spinner, or open the link unattributed after N seconds? Owner: product owner with the CashKaro tracking team.
2. Q2. Guest closes the login sheet after "Log in to earn": drop the Apply (today), or offer "Apply without cashback" again? Owner: product owner.
3. Q3. Refresh rejected at launch: tell the user ("You were logged out") or stay silent as a guest? Owner: product owner.
4. Q4. Should a failed background refresh keep the old list with a warning, or replace it with the error state? Owner: product owner.
5. Q5. Zero eligible cards on the Home toggle: show a message and a path (edit details, Cards you can get), or keep the plain Ineligible list? Owner: product owner.
6. Q6. Very high monthly income: at what figure does the app ask "monthly, not yearly?", and does it block or only hint? Owner: product owner with BankKaro.
7. Q7. Is the 46 s worst-case wait acceptable on Home, or should the catalogue call use a shorter timeout and fewer retries? Owner: engineering lead.
8. Q8. Should a `CLICK_OUT` be logged only after `Linking.openURL` resolves? It changes how click-outs are counted. Owner: analytics owner.
9. Q9. Home shows timed skeletons with no network call (450 ms filter bar, 900 ms category, 1000 ms bank). Keep them as a "results changed" cue, or drop them to cut wait? Owner: product owner with design.
