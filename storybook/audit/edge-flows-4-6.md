# Edge cases and loaders: flows 4 (tools and shared result), 5 (card advisor), 6 (offers)

Last updated: 2026-11-19 [claude]. Read only audit. Branch `claude/storybook`. Not run on a device or in a browser: every row comes from code reading (`file:line` from `grep -n`) and the built story index `storybook/dist/index.json` (2026-11-19 18:11).

## How to read this file

- Status: `STORY` (a story id covers it), `LIVE-NO-STORY` (the app handles it; file:line; needs a live story), `MISSING` (the app does not handle it; a proposal with existing DS parts and copy), `N/A` (why).
- Story ids are the full ids from `storybook/dist/index.json`. A proposed story is named `<File>` `<Export>`; its target file is in "Stories to add".
- Harness: `auth` + `api` preset or override, as in `storybook/harness/README.md`. `width={360}` is a `ScreenHarness` prop; `useWindowDimensions` still returns the iframe size.
- DS parts used by proposals (no new parts): `ScreenState` (one action), `InlineMessage` (`tone`, `message`, `title`; with a button: `action="single"` + `primaryActionLabel`, as at `src/screens/advisor/AdvisorScreen.tsx:380`), `Tag` (`size="xxs"`, `tone`), `FooterButtons` (`primaryLoading`, `primaryDisabled`), `Button` (`loading`), `Skeleton`, `Text`, `PhoneFrame`.

### Call counts under the mock (needed for fail-then-retry stories)

The transport retries before the screen sees an error, so `reply.once(fail, ok)` never shows the error state.

| Endpoint | Transport | Query layer | Calls before the error state | Evidence |
|---|---|---|---|---|
| `calculate` (POST, idempotent) | 45 s timeout, 1 retry | `retry: false` | 2 | `src/api/bankkaro.ts:68`, `:69`; `src/query/useCardSavings.ts:97` |
| `cards`, `offerCategoryTree`, `categoryOffers`, `offerStore` (GET) | 15 s timeout, 2 retries | no retry for `ApiError` | 3 | `src/api/http/client.ts:50`, `:51`; `src/query/queryClient.ts:18` |
| `eligibility` (POST, idempotent) | 15 s, 2 retries on 5xx or network | `retry: 1` (any error) | 6 on 5xx, 2 on 4xx (to verify in the console log) | `src/screens/advisor/useAdvisor.ts:118` |

Worst case wait for `calculate`: two 45 s timeouts plus a backoff under 1 s, so about 90 s (a 429 Retry-After, capped at 16 s at `src/api/http/client.ts:101`, follows a fast reply, so it does not stack on a timeout). The wait line says "up to a minute" (`src/screens/tools/ToolResultsScreen.tsx:526`).

---

## 0. Shared: the calculate call (`useCardSavings`), used by ToolResults, BeatMyCardPick, BeatMyCardResult

The three screens show the same branch for these edges. Their own tables below list only what differs.

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| Offline at cold start, no cache | STORY | `flows-4-shared-result-league-table--offline`; `src/query/useCardSavings.ts:124` | Pick list and beat result: add `Offline` stories (sections 5, 6) |
| Offline with cache (same spends seen before) | LIVE-NO-STORY | `src/query/useCardSavings.ts:124` (`data` defined, so not offline): the cached list shows; the global `OfflineBanner` is not mounted in the harness | `LeagueTable` `OfflineWithCache`: `api.offline()`, `beforeMount` seeds `queryClient.setQueryData(['bk','calculate', spendsKey(SPENDS)], { list: rankByNetValue(mapCalculateResponse(calculateFixture.league)), loadMs: 0 })` |
| Connection drops during calculate | STORY | Same branch as `flows-4-shared-result-league-table--error` (`ApiError` kind `network`) | Optional: `api.ok({ calculate: reply.network() })` |
| Slow network, over 5 s | STORY | `flows-4-shared-result-league-table--loading`: wait line plus skeleton from the start (`src/screens/tools/ToolResultsScreen.tsx:522`, `:526`); no change over time | |
| Wait longer than the copy promises (over 60 s) | MISSING | Copy "up to a minute" vs about 90 s worst case (see above) | After 20 s, add under the wait line `InlineMessage tone="info"` message "Still checking. On a slow network this can take up to 2 minutes." Skeleton stays. Proposed story `StillCheckingProposed` |
| Timeout (45 s, then retry) | STORY | Ends in the error branch, `flows-4-shared-result-league-table--error` | No story: a real timeout needs 90 s |
| Retry after failure | LIVE-NO-STORY | "Try again" calls `refetch` (`src/screens/tools/ToolResultsScreen.tsx:542`) | `RetryAfterError`: `api.ok({ calculate: reply.sequence(reply.error(500), reply.error(500), calculateFixture.league) })` + TapScript `click: 'Try again'` at about 3 s |
| 5xx | STORY | `flows-4-shared-result-league-table--error` | |
| 401 (partner token) | STORY | Token re-minted once (`src/api/http/tokenManager.ts:96`), then the error branch | |
| 429 | STORY | Retried with Retry-After, then the error branch | |
| 404 | STORY | Error branch | |
| Malformed body (`{ data: {} }`) | STORY (wrong state) | `mapCalculateResponse` returns `[]` (`src/lib/cardTools.ts:627`); `contract()` only reports (`src/api/schemas/validate.ts`), so the user sees "No cards came back for these spends", same as `flows-4-shared-result-league-table--empty` | Gap G9 |
| Catalogue (`cards`) fails, calculate works | LIVE-NO-STORY | `useCardSavings` keeps rows without `card` (`src/query/useCardSavings.ts:70`); no flag reaches the screen. Reach: only when the catalogue was never cached in this session (Home's own load also failed); a failed refetch keeps the old `cards.data` | Story `CatalogueFailedNoApply` (section 2). Gap G1 |
| Catalogue still loading, calculate done | LIVE-NO-STORY | Same: rows show without `card` until `cards` lands | Story `CatalogueSlowNoApply`: `api.ok({ cards: reply.hang() })` |
| Card in calculate but not in the app | STORY | `flows-4-shared-result-league-table--row-not-in-app`, `flows-4-shared-result-savings-breakdown-sheet--card-not-in-app` | |
| Card row with no alias | N/A | Dropped by the mapper (`src/lib/cardTools.ts:627` loop); never shown | |
| Null or missing fee | MISSING | `num(null)` is 0 (`src/lib/cardTools.ts:580`, `:593`), so `lifetimeFree` is true (`:606`): the row gets the "Lifetime free" tag and passes the "Lifetime free" filter | Live story `NullFeeShowsLifetimeFree` (calculate function answer that sets `annual_fees` and `joining_fees` to `null` on one row). Proposal: `Tag size="xxs" tone="gray" label="Fee not known"` in place of "Lifetime free"; the row is not in the "Lifetime free" filter. Gap G3 |

---

## 1. Input screens: BestForCategory (4a), SpendQuiz (4b and 4c), BestForBrands (4d)

These screens make no API call. Network, server and loader edges are N/A for all three.

| Screen | Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|---|
| All three | Network, server, loaders | N/A | No query in `BestForCategoryScreen.tsx`, `SpendQuizScreen.tsx`, `BestForBrandsScreen.tsx` | |
| All three | All spends 0 at the end | STORY | `flows-4a-best-for-category-questions--nothing-entered`, `flows-4c-ultimate-card-skip--skip-with-nothing-entered`, `flows-4d-best-for-brands-spends--nothing-entered` | |
| SpendQuiz | Typed amount above the max | LIVE-NO-STORY | Clamped to `typedMax` (`src/molecules/SpendCard.tsx:109`, `:186`); max ₹10,00,000 a month (`src/lib/cardTools.ts` `MAX_MONTHLY_SPEND`) | `QuizStep` `TypedAmountCapped`: `api.ok()`, TapScript `type: '99999999', into: 'Amazon amount'` |
| SpendQuiz | Saved spends present | LIVE-NO-STORY | Info line "Showing the spends you entered before." (`src/screens/tools/SpendQuizScreen.tsx:188`). `flows-4b-beat-my-card-spends--from-saved-spends` renders the pick list, not the quiz | `QuizStep` `FromSavedSpends`: needs a saved-spends seed (H3); `storage` cannot seed it on web |
| BestForCategory | Saved spends present | LIVE-NO-STORY | Answers start from saved spends (`BestForCategoryScreen.tsx` `answers` memo), no "entered before" line | `Questions (4a)` `FromSavedSpends`: needs the same seed (H3) |
| BestForBrands | Search matches no brand | LIVE-NO-STORY | `src/screens/tools/BestForBrandsScreen.tsx:182` | `BrandPick` `SearchNoMatch`: TapScript `type: 'zzz', into: 'Search brands'` |
| BestForBrands | Limit of 5 | STORY | `flows-4d-best-for-brands-limit-reached--five-brands-picked` | |
| SpendQuiz | Close (X) mid-quiz, return later | LIVE-NO-STORY | Close has no confirm (`SpendQuizScreen.tsx:159`); answers saved on each Next (`:120`); a new run starts at question 1 (`:52`) with the "entered before" line | Same story as `FromSavedSpends`. Open question Q6 |
| BestForCategory, BestForBrands | Leave mid-flow, return | LIVE-NO-STORY | Picks and brand amounts are component state; they are lost on leave (category answers are saved only at the end) | No story. Consciously not covered |
| All three | Android back mid-quiz | LIVE-NO-STORY | `BackHandler` steps back: `SpendQuizScreen.tsx:87`, `BestForCategoryScreen.tsx:79`, `BestForBrandsScreen.tsx:88` | Device check (web has no hardware back) |
| All three | Keyboard over the amount input | LIVE-NO-STORY | `KeyboardAvoidingView` with `behavior` undefined on Android (`SpendQuizScreen.tsx:132`, `BestForCategoryScreen.tsx:125`) | Device check: the footer CTA may sit under the keyboard on Android |
| All three | 360 dp (ruler, tiles) | LIVE-NO-STORY | Header comments say "check at 360 dp and 130% font" | `QuizStep` `Width360`: `width={360}`. 130% font: device check |

## 2. ToolResults: the league table (all four tools)

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| First load | STORY | `flows-4-shared-result-league-table--loading` | |
| Offline, error, empty | STORY | `flows-4-shared-result-league-table--offline`, `--error`, `--empty` | Section 0 rows |
| All spends 0 | LIVE-NO-STORY | `src/screens/tools/ToolResultsScreen.tsx:513` | `AllSpendsZero`: `params` with `spends: spendsFixture.none`, `answers: {}` |
| Recalculation after Edit spends | LIVE-NO-STORY | New spends give a new query key; the whole list is replaced by the skeleton (`ToolResultsScreen.tsx:332`, `:522`); the old result is not kept | `RecalculatingAfterEdit`: `api.ok({ calculate: reply.once(calculateFixture.league, reply.hang()) })` + TapScript `click: 'Annual spends', prefix: true`, `type: '12000', into: 'Amazon amount'`, `click: 'Update results'` |
| Edit spends while offline | MISSING | The new key is paused: "You're offline" replaces a good list (`ToolResultsScreen.tsx:533`) | Keep the old list; on top `InlineMessage tone="warning" action="single"` message "You're offline. These results are for your old spends." `primaryActionLabel="Try again"`. Proposed `EditOfflineProposed`. Needs `placeholderData` (engineering). Open question Q4 |
| Catalogue failed: no Apply anywhere (only when never cached this session) | LIVE-NO-STORY | Rows have no `card` (`src/query/useCardSavings.ts:70`); the sheet then says "You cannot apply for this card in this app." for a card the app sells (`src/organisms/SavingsBreakdownSheet.tsx:382`) | `CatalogueFailedNoApply`: `api.ok({ cards: reply.error(500) })` + TapScript `click: 'HSBC', prefix: true` at about 3 s. Proposal `CatalogueFailedProposed`: list top `InlineMessage tone="warning" action="single"` message "We couldn't load Apply links. Savings are still correct." `primaryActionLabel="Try again"` (refetches cards); sheet line "We couldn't load the Apply link for this card. Try again in a moment." Gap G1 |
| 1 card | LIVE-NO-STORY | Header reads "1 cards" (`ToolResultsScreen.tsx:578`) | `OneCard`: calculate function answer with one row. Fix copy to "1 card" (gap G10) |
| 219+ cards | LIVE-NO-STORY | FlatList windowing (`ToolResultsScreen.tsx:583`); far scroll retries up to 40 times (`:78`) | `LargeLeague`: calculate function answer that clones the 9 fixture rows to 220 with new aliases. Not perf proof (web) |
| Find my card far down | LIVE-NO-STORY | `findMine` + `onScrollToIndexFailed` (`ToolResultsScreen.tsx:263`, `:291`) | `FindMyCardFar` (in `04b-beat-my-card/FullRanking.stories.tsx`): the 220-row answer, `highlightAlias` on row 200, TapScript `click: 'Find my card'` |
| Find-in-list no match | LIVE-NO-STORY | "No match" (`ToolResultsScreen.tsx:428`) | `SearchNoMatch`: TapScript `click: 'Search'`, `type: 'zzz', into: 'Find a card or bank'` |
| Filters match nothing | STORY | `flows-4-shared-result-league-table--no-filter-match` | |
| Ties | LIVE-NO-STORY | Ranked by net, then savings, fee, alias (`src/lib/cardTools.ts` `rankByNetValue`); equal ₹ rows get ranks 1 and 2 | No story. Open question Q7 |
| Every card loses money (net below 0) | LIVE-NO-STORY | Headline "-₹X" in `text.primary` (`src/molecules/LeagueCardRow.tsx:156`) | `AllLoseMoney`: `params` with one tiny spend (`spends({ water_bills: 100 })`) and a calculate function answer with `total_savings_yearly` near 0 |
| Max spends (₹ crore totals) | LIVE-NO-STORY | Pill "Annual spends: ₹X a year" has no line limit (`ToolResultsScreen.tsx:403`) | `MaxSpends`: every key at its question max |
| Card art missing (not in app, no image) | LIVE-NO-STORY | Empty `surface.sunken` box (`src/molecules/LeagueCardRow.tsx:130`) | `CardArtMissing`: calculate function answer that removes `image` and `card_bg_image` on the not-in-app row |
| Card art fails to load | LIVE-NO-STORY | `RemoteImage` retries only ckassets hosts; a BankKaro CDN failure leaves the grey box (`src/atoms/RemoteImage.tsx:46`) | Same story, `image: 'https://storybook.invalid/x.png'` |
| Very long card name | LIVE-NO-STORY | `numberOfLines={2}` (`LeagueCardRow.tsx:133`) | Fold into `Width360` |
| 360 dp (sort chips, filter row, By category cells) | LIVE-NO-STORY | Horizontal ScrollViews (`ToolResultsScreen.tsx:449`, `:471`); cells wrap | `Width360`: `width={360}`, tab "By category" via TapScript |
| Guest taps Apply in the sheet | STORY | Same `useClickOut` path as `flows-3a-card-detail-and-apply-click-out--guest-earn-prompt` | Optional `ApplyGuestFromTools`: guest, TapScript row then `Apply now` |
| Apply with no feedback while the user id resolves | MISSING | `src/lib/useClickOut.tsx:99` | Proposal exists: `flows-3a-card-detail-and-apply-click-out--resolving-user-id-proposed`, `patterns-click-out--resolving-proposed` |
| Apply with no URL | MISSING | Silent return `src/lib/useClickOut.tsx:87` | Proposal exists: `flows-3a-card-detail-and-apply-click-out--empty-url-proposed` |
| Connection drops on Apply (signed in) | LIVE-NO-STORY | Profile refetch fails, native `Alert` (`src/lib/useClickOut.tsx:106`) | Proposal exists: `flows-3a-card-detail-and-apply-click-out--user-id-missing-proposed`. `Alert` is a no-op on web (`react-native-web` `Alert.alert` is empty) |
| Session expires on this screen | LIVE-NO-STORY | `sessionExpired` drops status to guest; Apply then opens EarnLoginSheet (`useClickOut.tsx:89`) | No new story: same as guest |
| 130% font | N/A in Storybook | Harness has no font-scale prop | Device check |

## 3. SavingsBreakdownSheet

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| Sellable card, not in app, user's own card | STORY | `flows-4-shared-result-savings-breakdown-sheet--sellable-card`, `--card-not-in-app`, `--users-own-card` | |
| Card saves nothing on these spends | LIVE-NO-STORY | "This card saves nothing on the spends you entered." (`src/organisms/SavingsBreakdownSheet.tsx:353`) | `SavesNothing`: `SheetHarness`, present a `LEAGUE` row copy with `lines: []` and `netYearly` 0 |
| Net below 0 (fee larger than savings) | LIVE-NO-STORY | "Your annual savings" shows "-₹X" | `NegativeNet`: row copy with `annualFeeCounted` above savings |
| Null fee row | MISSING | Gap G3 | Covered by the section 0 proposal |
| Catalogue failed | LIVE-NO-STORY | Wrong "You cannot apply" line (`:382`) | Story in section 2 |
| Apply button loading | MISSING | No loading prop passed (`SavingsBreakdownSheet.tsx:144` footer) | Use `Button loading` while `openClickOut` awaits; see `patterns-click-out--resolving-proposed` |

## 4. EditSpendsSheet

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| Open, edited, saved | STORY | `flows-4-shared-result-edit-spends-sheet--edit`, `flows-4-shared-result-edit-spends-sheet--saved` | |
| Network, server | N/A | No call in the sheet; the result screen recalculates (section 2) | |
| Submit with every spend 0 | LIVE-NO-STORY | Sheet accepts it (`src/organisms/EditSpendsSheet.tsx:172`); the screen shows "Enter at least one spend" | Covered by `AllSpendsZero` (section 2) |
| Typed amount above the max | LIVE-NO-STORY | `typedMax={question.max}` (`EditSpendsSheet.tsx:95`), clamp in SpendCard | `TypedMaxInSheet`: TapScript type into "Amazon amount" |
| Keyboard over the typed field | LIVE-NO-STORY | `useBottomSheetInput` (`EditSpendsSheet.tsx:96`) | Device check |

## 5. BeatMyCardPick

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| Loaded | STORY | `flows-4b-beat-my-card-pick-list--loaded` | |
| First load (up to about 90 s, only to pick the user's own card) | LIVE-NO-STORY | `src/screens/tools/BeatMyCardPickScreen.tsx:163` | `Loading`: `api.loading()`. Gap G7 |
| Offline at cold start | LIVE-NO-STORY | `:175` | `Offline`: `api.offline()` |
| Error | LIVE-NO-STORY | `:185` "Couldn't load cards" | `Error`: `api.ok({ calculate: reply.error(500) })` |
| No cards | LIVE-NO-STORY | `:195` "No cards to compare yet" (no action) | `Empty`: `api.ok({ calculate: calculateFixture.empty })` |
| All spends 0 | LIVE-NO-STORY | `:153` | `AllSpendsZero`: `params` with `spends: spendsFixture.none` |
| Search no match | LIVE-NO-STORY | `:268` | `SearchNoMatch`: TapScript `type: 'zzz', into: 'Search cards'` |
| User's card is not in the list | MISSING | Only "pick the closest card" (`:269`); no way out | List footer `Text variant="body14SemiBold" color={colors.text.link}` "I can't find my card", which opens ToolResults (`tool: 'ultimate'`, title "All cards") with the same spends. Proposed `MyCardMissingProposed`. Open question Q2 |
| Pick dropped after Edit spends | LIVE-NO-STORY | `pickedRow` is found again in the new league (`:124`); the CTA hides if the card left | No story (rare) |
| 219+ cards, many bank chips | LIVE-NO-STORY | Bank chip row scrolls | Fold into `LargeLeague` setup if wanted |
| Edit spends offline | MISSING | Same as section 2 | Same proposal |

## 6. BeatMyCardResult

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| Verdicts best wins, mine wins, equal, not found | STORY | `flows-4b-beat-my-card-result--best-wins`, `--mine-wins`, `--equal`, `--not-found` | `flows-4b-beat-my-card-result--best-wins` renders the "other card is not in the app" branch (rank 1 in the fixture is CRED IndusInd) |
| Other card wins and is in the app (Apply now) | LIVE-NO-STORY | `src/screens/tools/BeatMyCardResultScreen.tsx:443` | `BestWinsApplyable`: calculate function answer that drops the CRED row, `cardAlias: 'hdfc-regalia-gold'`. This is the main revenue branch |
| Best other card also loses money (no Apply) | LIVE-NO-STORY | `otherSaves` false hides Apply (`:443`) | `BestWinsNoApply`: answer where every other row has net below 0 |
| Not found and no card saves money | LIVE-NO-STORY | Copy at `:304` | `NotFoundNothingSaves`: `card-not-in-the-list` + all-loss answer |
| Loading | LIVE-NO-STORY | `:257` | `Loading`: `api.loading()` |
| Offline at cold start | LIVE-NO-STORY | `:268` | `Offline`: `api.offline()` |
| Error | LIVE-NO-STORY | `:277` "Couldn't compare cards" | `Error`: `api.ok({ calculate: reply.error(500) })` |
| All spends 0 | LIVE-NO-STORY | `:248` | `AllSpendsZero` |
| Filters match nothing | LIVE-NO-STORY | `:311` | `FilterNoMatch`: `calcAllPaid()` + TapScript `click: 'Lifetime free'` |
| Ties | STORY | `flows-4b-beat-my-card-result--equal` | |
| Slow (over 60 s) | MISSING | Same copy as section 0 | Same `StillChecking` proposal |

## 7. AdvisorScreen (chat)

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| Catalogue first load | LIVE-NO-STORY | Skeleton bubbles (`src/screens/advisor/AdvisorScreen.tsx:433`) | `CatalogueLoading`: `chat({}, api.loading())` |
| Catalogue error | STORY | `flows-5-card-advisor-chat--catalogue-error` | |
| Catalogue retry after error | LIVE-NO-STORY | "Try again" calls `refetch` (`:435`) | `CatalogueRetry`: `cards: reply.sequence(e, e, e, cardsFixture.default)` with `e = reply.error(500)` + TapScript `click: 'Try again'` |
| No cards in the catalogue | LIVE-NO-STORY | "No cards are available right now" (`:445`) | `NoCards`: `chat({}, api.ok({ cards: cardsFixture.empty }))` |
| Offline at cold start | MISSING | Paused `useCards` is not loading and not error (`src/screens/advisor/useAdvisor.ts:395`, `:397`), so the user sees "No cards are available right now" with no retry | Live `OfflineShowsNoCards`: `chat({}, api.offline())`. Proposed `OfflineProposed`: `ScreenState` title "You're offline", body "Check your connection and try again.", actionLabel "Try again" |
| Checking eligibility (typing dots) | LIVE-NO-STORY | Bubble with `AdvisorTypingDots` (`AdvisorScreen.tsx:372`), header "Checking your cards" (`:426`) | `CheckingEligibility`: `chat({ ...BROWSING, eligBridge: 'yes', eligForm: FORM_DONE }, api.ok({ eligibility: reply.hang() }))` |
| Eligibility slow (over 10 s, up to about 90 s) | MISSING | 6 tries of 15 s before the error (call-count table) | After 10 s add a second line in the bubble: "Still checking with the banks. This can take up to a minute." Proposed `CheckingLongProposed` |
| Eligibility error | STORY | `flows-5-card-advisor-chat--eligibility-error` | |
| Eligibility retry succeeds | LIVE-NO-STORY | `retryEligibility` (`AdvisorScreen.tsx:382`) | `EligibilityRetry`: eligibility function answer `(req, call) => call < 6 ? reply.error(500) : eligibilityFixture.partial` + TapScript `click: 'Try again'` (verify the count) |
| Eligibility while offline | MISSING | Paused query: `isFetching` false and `isError` false (`useAdvisor.ts:130`, `:131`), so no status and no verdict | `InlineMessage tone="warning"` message "You're offline. We'll check your cards when you're back." No action (the query resumes). Header status "Waiting for connection". Proposed `EligibilityOfflineProposed` |
| Eligibility 422 (server rejects a valid-looking pincode) | LIVE-NO-STORY | Same "Couldn't check right now. Try again" (`AdvisorScreen.tsx:382`); retry repeats the same 422 | Live `PincodeRejected`: `api.ok({ eligibility: eligibilityFixture.invalidPincode })`. Proposal: `InlineMessage tone="warning" action="single"` message "We couldn't check this pincode. Change it and try again." `primaryActionLabel="Change details"`. Open question Q5 |
| Return to a half-finished chat | STORY | Every `flows-5-card-advisor-chat--*` story seeds `getAdvisorSession()` (session restore) | |
| Start over | STORY | `flows-5-card-advisor-chat--start-over-confirm` (proposed); today native `Alert` (`AdvisorScreen.tsx:269`) | |
| Session expires in the chat | N/A | Chat uses no user endpoint; Apply goes through the card sheet (`flows-3a-card-detail-and-apply-click-out--*`) | |
| 360 dp (reply tray chips) | LIVE-NO-STORY | `AdvisorReplyTray` | `Width360Question`: `width={360}` on `flows-5-card-advisor-chat--question` setup |
| Keyboard over the eligibility form | LIVE-NO-STORY | `keyboardPadding` (`AdvisorScreen.tsx` body) | Device check |
| Android back mid-chat | LIVE-NO-STORY | Leaves; the chat is kept in `advisorSession` | Device check |

## 8. AdvisorResults

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| Loaded, sorted, free only, no cards | STORY | `flows-5-card-advisor-results--loaded`, `--sorted`, `--free-only`, `--no-cards` | |
| First load | LIVE-NO-STORY | `CardListSkeleton` (`src/screens/advisor/AdvisorResultsScreen.tsx:145`) | `Loading`: `api.loading()` |
| Error | LIVE-NO-STORY | `:152` | `Error`: `api.ok({ cards: reply.error(500) })` |
| Offline at cold start | MISSING | Paused query falls to "No cards to show. Go back and change an answer." (`:162`): wrong advice | Live `OfflineShowsNoCards`: `api.offline()`. Proposed `OfflineProposed`: standard offline `ScreenState` |
| 1 card | LIVE-NO-STORY | "1 card" handled | No story |

## 9. Offers tab

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| First load, loaded, promo, empty, error | STORY | `flows-6-offers-offers-tab--loading`, `--loaded`, `--promo-sheet`, `--empty-no-offers-yet`, `--load-error` | |
| Offline at cold start | STORY | `flows-6-offers-offers-tab--offline-shows-empty`, `flows-6-offers-offers-tab--offline-proposed` | |
| Offline with cache | LIVE-NO-STORY | Cached stores stay; focus refetch is paused (`src/query/useRefetchOnFocus.ts:49`) | `OfflineWithCache`: `api.offline()`, `beforeMount` seeds the category key with `mapCategoryOffers(categoryOffersFixture.default)` |
| Production category fallback (no `miniapp` parent, 400) | LIVE-NO-STORY | `src/query/useOffers.ts:46` falls back to top-level categories. This is the production path today | `CategoryFallback`: `api.ok({ offerCategoryTree: offerCategoryTreeFixture.invalidCategory })` |
| Retry after error | LIVE-NO-STORY | `reloadOffers` (`src/screens/OffersScreen.tsx:533`) | `RetryAfterError`: `categoryOffers: reply.sequence(e, e, e, categoryOffersFixture.default)` + TapScript `click: 'Try again'` |
| Error copy on a dropped network | LIVE-NO-STORY | Always "Something went wrong on our side" (`:539`), also for network errors | `NetworkDrop`: `api.ok({ categoryOffers: reply.network() })`. Proposal: when the error is network, body "Check your connection and try again." Gap G11 |
| Pull to refresh | LIVE-NO-STORY | `RefreshControl` (`:460`) | Device check |
| Search: results, no results | LIVE-NO-STORY | `SearchTopSheet` (`:576`) | `SearchResults`: TapScript click the search bar, `type: 'aj'`. `SearchNoResults`: `type: 'zzz'` |
| Search while the store index loads | MISSING | `isLoading` of `useAllOfferStores` is dropped (`:235`), so the no-results hint shows while stores load | Use the existing `noResultsHint` prop: "Still loading stores. Try again in a second." while loading. Live `SearchIndexLoading`: `categoryOffers: (req, call) => call === 0 ? categoryOffersFixture.default : reply.hang()`, then type. Proposed `SearchIndexLoadingProposed` |
| Store with no cashback amount | LIVE-NO-STORY | Tile CTA "Shop & Earn Cashback" with no rate (`src/api/offersMapper.ts:46`) | `StoreNoRate`: categoryOffers function answer with one store `cashback.amount: 0` |
| Very long store name, 360 dp | LIVE-NO-STORY | 2-column grid | `Width360`: `width={360}` + a long-name store in the answer |
| Guest vs signed in | N/A | Same tab for both; the gate is at Shop (section 10) | |
| Pagination | N/A | No paged endpoint; the grid renders the category list at once | |

## 10. Store page (`OffersBrandAmazon`, any slug; the Amazon page is the same screen)

| Edge | Status | Evidence | Proposal / story to add (harness) |
|---|---|---|---|
| Loading, loaded, error (not found), best cards, share | STORY | `flows-6-offers-store-page--loading`, `--loaded`, `--load-error`, `--best-cards`, `--share`, `flows-6-offers-store-page--loading-proposed` | |
| Opened with no slug (old Amazon entry) | LIVE-NO-STORY | `storeMissing` is true when there is no store (`src/screens/OffersBrandAmazon.tsx:116`): "Couldn't load this store" | `NoSlug`: `params={{}}` |
| Offline at cold start | LIVE-NO-STORY | Paused query is not loading (`:113`), so the error shows at once; "Try again" does nothing until online | `Offline`: `api.offline()` |
| 5xx | STORY | Same branch as `flows-6-offers-store-page--load-error` (`:366`) | |
| Shop tap, guest | LIVE-NO-STORY | EarnLoginSheet kind `store` (`src/lib/useClickOut.tsx:89`) | `GuestShop`: `auth="guest"` + TapScript `click: 'Earn Cashback on', prefix: true` |
| Shop tap, signed in | LIVE-NO-STORY | Click-out logged (`OffersBrandAmazon.tsx:557`) | `SignedInShop`: `auth="signedIn"`, same tap; console shows `[storybook] click-out` |
| Store with no `cashback_url` | MISSING | Footer CTA still shows (`:532`); `offer_shop` fires (`:553`), then `useClickOut` returns with nothing on screen (`useClickOut.tsx:87`) | Live `NoShopLinkToday`: offerStore function answer = `offerStoreFixture.default` with `data.attributes.cashback_url` deleted, `auth="signedIn"`, tap. Proposed `NoShopLinkProposed`: `FooterButtons primaryDisabled` + `InlineMessage tone="info"` message "Shopping through Cards.xtra isn't available for this store right now." (pattern `patterns-click-out--no-link-proposed`). Gap G2 |
| Store with no cashback amount | MISSING | Floor prints "Flat" / "Cashback" "Cashback" (`src/api/offersMapper.ts:57`, `src/organisms/StoreCashbackDetails.tsx:220`) | Live `NoCashbackRate`: offerStore answer with `cashback.amount: 0`. Proposal: hide the cashback floor; `InlineMessage tone="info"` message "The cashback rate for this store isn't available right now." Open question Q3 |
| Timelines missing | LIVE-NO-STORY | Tile shows "—" (`offersMapper.ts:242`) | Fold into `NoCashbackRate` setup |
| Session expires on this page | LIVE-NO-STORY | `sessionExpired` opens the login sheet; Shop then gates as guest | `SessionExpired`: `auth="sessionExpired"` |
| Profile fails on Shop (signed in) | LIVE-NO-STORY | Native `Alert` (`useClickOut.tsx:106`), not visible on web | Proposal exists: `flows-3a-card-detail-and-apply-click-out--user-id-missing-proposed` |
| Shop button loading while resolving | MISSING | No `primaryLoading` on the footer | Proposal exists: `patterns-click-out--resolving-proposed` |
| Best cards floor when the catalogue fails | LIVE-NO-STORY | Floor hides (`src/organisms/StoreBestCards.tsx:120`) | `BestCardsHidden`: `api.ok({ cards: reply.error(500) })` |
| Very long store name, 360 dp | LIVE-NO-STORY | Masthead and footer label "Earn Cashback on <name>" | `Width360LongName`: `width={360}` + long `name` |

---

## Stories to add

Ranked 1 to 60 by frequency x severity. Harness is guest and `api.ok()` unless the line says otherwise. Live stories render the real screen; proposed stories compose DS parts in `PhoneFrame` and never import from `src/screens`. `e` = `reply.error(500)`. `call` in a function answer is 0-based (`storybook/harness/apiMock.ts:50`).

### `stories/flows/04b-beat-my-card/Result.stories.tsx`
- [1] `BestWinsApplyable` (live): `calculate: (req) => ({ ...league, data: { savings: league.data.savings.filter((r) => r.seo_card_alias !== 'cred-indusind-bank-credit-card') } })`, `cardAlias: 'hdfc-regalia-gold'`. The main Apply branch.
- [5] `Loading` (live): `api.loading()`.
- [18] `Error` (live): `api.ok({ calculate: e })`.
- [32] `Offline` (live): `api.offline()`.
- [36] `BestWinsNoApply` (live): calculate answer where every row except `hdfc-regalia-gold` has `total_savings_yearly: 0` and a fee above 0.
- [48] `FilterNoMatch` (live): `api.ok({ calculate: calcAllPaid() })` + TapScript `click: 'Lifetime free'`.

### `stories/flows/06-offers/OffersTab.stories.tsx`
- [2] `CategoryFallback` (live): `api.ok({ offerCategoryTree: offerCategoryTreeFixture.invalidCategory })`. Production path today (`src/query/useOffers.ts:43`).
- [27] `SearchIndexLoading` (live): `categoryOffers: (req, call) => call === 0 ? categoryOffersFixture.default : reply.hang()` + TapScript click the search bar, `type: 'aj'`.
- [28] `SearchIndexLoadingProposed` (proposed): `SearchTopSheet` with hint "Still loading stores. Try again in a second."
- [34] `NetworkDrop` (live): `api.ok({ categoryOffers: reply.network() })`.
- [35] `RetryAfterError` (live): `categoryOffers: reply.sequence(e, e, e, categoryOffersFixture.default)` + TapScript `click: 'Try again'` at about 3 s.
- [42] `SearchResults` (live): TapScript click the search bar, `type: 'aj'`.
- [43] `SearchNoResults` (live): same, `type: 'zzz'`.
- [50] `StoreNoRate` (live): categoryOffers function answer, one store with `cashback.amount: 0`.

### `stories/flows/04-shared-result/LeagueTable.stories.tsx`
- [3] `StillCheckingProposed` (proposed): wait line, 4 skeleton rows, `InlineMessage tone="info"` "Still checking. On a slow network this can take up to 2 minutes."
- [13] `NullFeeShowsLifetimeFree` (live): calculate function answer, one row with `annual_fees: null`, `joining_fees: null`.
- [14] `NullFeeProposed` (proposed): the same row with `Tag size="xxs" tone="gray" label="Fee not known"`.
- [15] `RecalculatingAfterEdit` (live): `calculate: reply.once(calculateFixture.league, reply.hang())` + TapScript `click: 'Annual spends', prefix: true`, `type: '12000', into: 'Amazon amount'`, `click: 'Update results'`.
- [16] `RetryAfterError` (live): `calculate: reply.sequence(e, e, calculateFixture.league)` + TapScript `click: 'Try again'` at about 3 s.
- [25] `CatalogueFailedNoApply` (live): `api.ok({ cards: e })` + TapScript `click: 'HSBC', prefix: true` at about 3 s.
- [26] `CatalogueFailedProposed` (proposed): list with `InlineMessage tone="warning" action="single"` "We couldn't load Apply links. Savings are still correct." "Try again"; sheet line "We couldn't load the Apply link for this card. Try again in a moment."
- [37] `AllSpendsZero` (live): `params` with `spends: spendsFixture.none`, `answers: {}`.
- [38] `EditOfflineProposed` (proposed): old list, `InlineMessage tone="warning" action="single"` "You're offline. These results are for your old spends." "Try again".
- [44] `Width360` (live): `width={360}` + TapScript `click: 'By category'`.
- [46] `OneCard` (live): calculate function answer with the first row only.
- [49] `CatalogueSlowNoApply` (live): `api.ok({ cards: reply.hang() })`.
- [51] `CardArtMissing` (live): calculate function answer, the CRED row without `image` and `card_bg_image`.
- [52] `OfflineWithCache` (live): `api.offline()` + `beforeMount` seeds `['bk','calculate', spendsKey(SPENDS)]` with `{ list: rankByNetValue(mapCalculateResponse(calculateFixture.league)), loadMs: 0 }`.
- [56] `SearchNoMatch` (live): TapScript `click: 'Search'`, `type: 'zzz', into: 'Find a card or bank'`.
- [58] `AllLoseMoney` (live): `params` spends `spends({ water_bills: 100 })`, calculate function answer with `total_savings_yearly: 0` on every row.
- [59] `LargeLeague` (live): calculate function answer, the 9 rows cloned to 220 with new aliases.

### `stories/flows/04b-beat-my-card/PickList.stories.tsx`
- [4] `Loading` (live): `api.loading()`.
- [17] `Error` (live): `api.ok({ calculate: e })`.
- [24] `MyCardMissingProposed` (proposed): list end with `Text body14SemiBold text.link` "I can't find my card".
- [31] `Offline` (live): `api.offline()`.
- [47] `SearchNoMatch` (live): TapScript `type: 'zzz', into: 'Search cards'`.
- [53] `Empty` (live): `api.ok({ calculate: calculateFixture.empty })`.

### `stories/flows/06-offers/StorePage.stories.tsx`
- [6] `NoShopLinkToday` (live): `auth="signedIn"`, offerStore function answer = `offerStoreFixture.default` with `data.attributes.cashback_url` deleted, TapScript `click: 'Earn Cashback on', prefix: true`.
- [7] `NoShopLinkProposed` (proposed): `FooterButtons primaryDisabled` + `InlineMessage tone="info"` "Shopping through Cards.xtra isn't available for this store right now."
- [8] `GuestShop` (live): guest, TapScript `click: 'Earn Cashback on', prefix: true` (EarnLoginSheet kind store).
- [11] `NoCashbackRate` (live): offerStore answer with `cashback.amount: 0` and no `tracking_speed`.
- [12] `NoCashbackRateProposed` (proposed): cashback floor hidden, `InlineMessage tone="info"` "The cashback rate for this store isn't available right now."
- [19] `SignedInShop` (live): `auth="signedIn"`, same tap; console `[storybook] click-out`.
- [33] `Offline` (live): `api.offline()`.
- [55] `SessionExpired` (live): `auth="sessionExpired"`.

### `stories/flows/05-card-advisor/Chat.stories.tsx`
- [9] `CatalogueLoading` (live): `chat({}, api.loading())`.
- [10] `CheckingEligibility` (live): `chat({ ...BROWSING, eligBridge: 'yes', eligForm: FORM_DONE }, api.ok({ eligibility: reply.hang() }))`.
- [20] `OfflineShowsNoCards` (live): `chat({}, api.offline())`.
- [21] `OfflineProposed` (proposed): `ScreenState` "You're offline" / "Check your connection and try again." / "Try again".
- [29] `EligibilityOfflineProposed` (proposed): `InlineMessage tone="warning"` "You're offline. We'll check your cards when you're back."; header status "Waiting for connection".
- [30] `CheckingLongProposed` (proposed): checking bubble plus "Still checking with the banks. This can take up to a minute."
- [41] `PincodeRejected` (live): same answers as [10], `api.ok({ eligibility: eligibilityFixture.invalidPincode })`.

### `stories/flows/05-card-advisor/Results.stories.tsx`
- [22] `OfflineShowsNoCards` (live): `api.offline()`.
- [23] `OfflineProposed` (proposed): standard offline `ScreenState`.
- [39] `Loading` (live): `api.loading()`.
- [40] `Error` (live): `api.ok({ cards: e })`.

### `stories/flows/04-shared-result/SavingsBreakdownSheet.stories.tsx`
- [45] `SavesNothing` (live): `SheetHarness`, `present({ ...ROW_IN_APP, savings: { ...ROW_IN_APP.savings, lines: [], netYearly: 0 } })`.
- [57] `NegativeNet` (live): `present` a `ROW_IN_APP` copy with `yearlySavings` 500 and `annualFeeCounted` 2,500.

### `stories/flows/04c-ultimate-card/QuizStep.stories.tsx`
- [54] `TypedAmountCapped` (live): TapScript `type: '99999999', into: 'Amazon amount'`.

### `stories/flows/04b-beat-my-card/FullRanking.stories.tsx`
- [60] `FindMyCardFar` (live): the 220-row answer, `highlightAlias` on row 200, TapScript `click: 'Find my card'`.

Count: 60 stories (48 live, 12 proposed). Build ranks 1 to 30 first.

### Consciously not covered

- Tail cut to stay near 60 (setups in the section tables): `LeagueTable` MaxSpends; `EditSpendsSheet` TypedMaxInSheet; `Result` (4b) AllSpendsZero and NotFoundNothingSaves; `PickList` AllSpendsZero; `Questions` (4a) FromSavedSpends; `QuizStep` Width360 and FromSavedSpends (needs a saved-spends seed, H3); `BrandPick` SearchNoMatch; `Chat` NoCards, EligibilityRetry (6 failures, verify), CatalogueRetry; `StorePage` NoSlug, BestCardsHidden, Width360LongName; `OffersTab` OfflineWithCache.
- Device-only: Android hardware back (`BackHandler` in the three input screens), keyboard over amount inputs and the eligibility form, 130% font (no font-scale prop in the harness), pull to refresh, scroll cost of 219+ rows on a low-end phone, real 45 s timeouts.
- Native `Alert` states (click-out user id, Start over today): not visible on web; their proposals already exist (`flows-3a-card-detail-and-apply-click-out--user-id-missing-proposed`, `flows-5-card-advisor-chat--start-over-confirm`).
- Brand picks and category picks lost when the user leaves mid-flow: low frequency, no money impact.
- Ties in the league table (two rows with equal ₹, ranks 1 and 2): logged as Q7, no story.
- 429 and 401 on calculate: same error branch as `flows-4-shared-result-league-table--error`.
- Lounge visits rounding (1 visit a year is sent as 1 a quarter, `src/lib/cardTools.ts` `toApiValue`): a documented rule, not a state.

---

## Gaps and unsupported

| # | Gap | Evidence | Severity |
|---|---|---|---|
| G1 | When the catalogue never loaded in this session (Home's load failed too) or is still loading, every league row loses Apply, and the sheet says "You cannot apply for this card in this app." for cards the app sells. `useCardSavings` exposes no catalogue error, so the screen cannot tell. | `src/query/useCardSavings.ts:70`, `src/organisms/SavingsBreakdownSheet.tsx:382` | P0 money and attribution |
| G2 | Store page with no `cashback_url`: the CTA shows, `offer_shop` is logged, and the tap does nothing (no message, no `clickout_blocked` event). Same for a card with no `applyUrl` in tools and advisor. | `src/screens/OffersBrandAmazon.tsx:532`, `:553`; `src/lib/useClickOut.tsx:87` | P0 attribution |
| G3 | A null fee from calculate reads as ₹0, so the card shows "Lifetime free" and passes the "Lifetime free" filter. | `src/lib/cardTools.ts:580`, `:593`, `:606`; `src/lib/leagueView.ts:117` | P1 trust (money claim) |
| G4 | Store with no cashback amount prints "Flat" / "Cashback Cashback" on the brand page, and the CTA still says "Earn Cashback". | `src/api/offersMapper.ts:57`; `src/organisms/StoreCashbackDetails.tsx:220` | P1 trust |
| G5 | Advisor and Advisor results offline at cold start show "No cards" copy with no retry. Advisor eligibility offline shows nothing. | `src/screens/advisor/useAdvisor.ts:130`, `:131`, `:395`; `AdvisorScreen.tsx:445`; `AdvisorResultsScreen.tsx:162` | P1 trust |
| G6 | Calculate can take about 90 s; the copy says "up to a minute"; no "still checking" step. | `src/api/bankkaro.ts:68`; `src/api/http/client.ts:101`; `ToolResultsScreen.tsx:526` | P1 trust |
| G7 | Beat my card pick list waits for the full calculate call (about 3.7 MB) only to list cards the user may hold, and has no "my card is not here" exit. | `src/screens/tools/BeatMyCardPickScreen.tsx:163`, `:269` | P1 (drop-off before the reveal) |
| G8 | An edit of spends throws away the shown result (no previous data kept), so offline or error after an edit hides a good list. | `ToolResultsScreen.tsx:332`, `:522`, `:533` | P2 |
| G9 | A malformed calculate body shows "No cards came back for these spends", same as a real empty; only a contract log records it. | `src/lib/cardTools.ts:627`; `src/api/schemas/validate.ts` | P2 |
| G10 | Copy bug: "1 cards". | `ToolResultsScreen.tsx:578` | P2 polish |
| G11 | Offers error copy blames the server for a dropped network. | `src/screens/OffersScreen.tsx:539` | P2 |
| G12 | Offers search shows the no-results hint while the store index still loads. `SearchTopSheet` has no loading slot (DS gap); the `noResultsHint` string is the only lever. | `OffersScreen.tsx:235`, `:576` | P2 |
| G13 | Apply and Shop buttons have no loading state while the user id resolves (double taps). Proposal exists in `patterns-click-out--resolving-proposed`. | `src/lib/useClickOut.tsx:99` | P1 attribution |
| H1 | Harness: no font-scale prop, no keyboard, no hardware back, `Alert.alert` not visible, `useWindowDimensions` returns the iframe size. | `storybook/harness/README.md` section 8 | Storybook limit |
| H3 | Harness: saved tool spends cannot be seeded on web (memory only, no exported setter outside `useSavedSpends`), so the quiz "entered before" line has no story. Needs a harness `savedSpends` prop or a story-side component that calls `useSavedSpends().save()` before the screen mounts. | `src/lib/savedSpends.ts:116`; harness README section 8 | Storybook limit |
| H2 | Harness: no 219-row fixture and no null-fee or no-`cashback_url` fixture; stories must build function answers inline (as `calcTie()` does). Fail-then-retry needs the call counts above. | `storybook/fixtures/bk.ts:285`, `ck.ts` | Storybook limit |

## Open product questions (not decided here)

- Q1. When the catalogue fails, hide Apply (today), show a retry, or block the league until the catalogue loads? Owner: product owner.
- Q2. Beat my card: what does "I can't find my card" do (full ranking, a request form, or the closest card)? Should the pick list come from the catalogue instead of calculate?
- Q3. A store with no cashback rate or no `cashback_url`: list it, show it without Shop, or hide it from Offers?
- Q4. After an edit of spends offline or on error, keep the old result with a warning, or show the error alone (today)?
- Q5. Eligibility 422 for a pincode: is it "not serviceable" (a real "no") or a bad input? The copy differs.
- Q6. Spend quiz: should Close confirm, and should a new run resume at the last question?
- Q7. League ties: show the same rank for equal ₹, or keep 1 and 2?
- Q8. What "taking longer" time is right for calculate (20 s proposed), and should the user get a cancel?

## Counts

Rows per status across sections 0 to 10: STORY 30, LIVE-NO-STORY 80, MISSING 18, N/A 7 (counted from the tables above). Stories to add: 60 (48 live, 12 proposed).
