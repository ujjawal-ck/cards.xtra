# Cards.xtra: UI state matrix per flow

Audited 2026-11-19 on branch `claude/storybook` (worktree `cards.xtra-storybook`). Read-only code audit by the UX designer role. Nothing was run on a device or a simulator. Line numbers are from this branch.

## How to read this file

- `EXISTS`: the state renders today. Evidence is `file:line` of the code path.
- `PARTIAL`: the state is handled, but with a native `Alert`, ad-hoc text, a bare spinner where a `Skeleton` exists, or misleading copy.
- `MISSING`: no code path renders the state. The proposal uses only existing parts and semantic tokens.
- `DS GAP`: no existing part fits. The list at the end says what is needed.
- Screens that only `FoundationCheck` (dev) can reach, or that a decision hides (D4, D14, D23 in `docs/decision.md`), get rows but rank low.

## Existing parts the proposals use

- `ScreenState` (`src/organisms/ScreenState.tsx:23`): props `image`, `title`, `body`, `actionLabel`, `onAction`. No `variant` prop. One action only.
- Illustrations for `ScreenState`: only `images.screenstate.appOrders`, `.tracking`, `.confirmation` (`src/assets/images/index.ts:141`).
- `InlineMessage` (`message`, optional `title`, `primaryActionLabel`; tones from `colors.tones`: brand, gray, success, warning, error, info, purple, sky, rose; optional single action), `StripAlert`, `Toast` (`message`, `tone`, `actionLabel`; no title; no app-level host: it is mounted per screen, as in `src/screens/ReviewUsScreen.tsx:306`).
- `Skeleton` atom, `AmountSkeleton`, `HomeSkeleton`, `CardListSkeleton`.
- `FooterButtons` (`buttons` single, dual or dual-outline; `primaryLoading`, `primaryDisabled`), `Button` (`loading`), `Input` (`state="error"`, `hint`), `BottomSheet` + `BottomSheetHeader`.
- Copy that already exists for offline in the tools: "You're offline" / "Check your connection and try again." (`src/screens/tools/ToolResultsScreen.tsx:536`). Proposals reuse it.

## Systemic finding: offline cold start shows false empty and false ₹0

**Inferred from code reading, not reproduced on a device.** The repo's own comment says the same thing (`src/query/useCardSavings.ts:120`). TanStack Query v5 runs in `networkMode: 'online'` here (no override in `src/query/queryClient.ts:13`). When the device is offline and a query has no cache, the query is paused: `isPending` is true, but `isLoading` and `isError` are both false. Only `useCardSavings` handles this (`src/query/useCardSavings.ts:124`). Every other hook passes raw `isLoading` / `isError`, so screens fall through to their empty or ₹0 branch:

| Screen | What the user sees offline with no cache | Evidence |
|---|---|---|
| Earnings | Confirmed ₹0 and Pending ₹0 | `src/screens/EarningsScreen.tsx:96`, `:288`, `:300` |
| Home | Masthead and filters, no cards, no error | `src/screens/HomeScreen.tsx:354`, `:2244` |
| Offers | "No offers here yet" | `src/screens/OffersScreen.tsx:552` |
| Orders list | "No orders yet" | `src/screens/OrdersList.tsx:425` |
| Missing Cashback "Yes" | Oops screen (as if no store visits) | `src/screens/MissingCashbackHelp.tsx:72` |
| Cards you can get | "No cards to show" | `src/screens/CardsYouCanGetScreen.tsx:291` |
| Advisor | "No cards are available right now" | `src/screens/advisor/AdvisorScreen.tsx:445` |
| All card benefits | "Benefit details aren't available for this card." | `src/screens/AllCardBenefitsScreen.tsx:133` |
| Order detail | Detail body with empty values (neither spinner nor error) | `src/screens/OrdersDetail.tsx:198`, `:199` |
| Claims list | "No claims" empty state | `src/screens/MissingCashbackDidYouShop.tsx:168`, `:212` |
| Choose date | "We couldn't find any recent visits to {store}." | `src/screens/MissingCashbackChooseDate.tsx:92` |
| Profile | Blank name and contact | `src/screens/ProfileScreen.tsx:64` |

Condition: the query pauses only when NetInfo already reports offline before the first fetch. If the device drops mid-request, the fetch fails and the existing error state shows. Repro to confirm: airplane mode on, kill the app, cold start, open each tab. `MissingCashbackWhereDidYouShop` uses the retailers query that the Help screen already loaded, so it is not itemised.

A disabled query takes the same path. Account queries are disabled with no token (`src/query/useOrders.ts:25`), and an expired session clears the cache (`src/auth/AuthContext.tsx:193`). So an account-only screen left open when the session ends shows its empty state behind the login sheet (row in flow 7).

The global `OfflineBanner` (`src/molecules/OfflineBanner.tsx:16`, mounted at `App.js:204`) shows a strip, but the content under it is wrong. Engineering prerequisite (not a DS item): one shared helper that maps "paused with no data" to an offline flag, copied from `useCardSavings.ts:124`. With it, every screen below can show the same offline state.

Standard offline state (used by every MISSING offline row below):
`ScreenState` title "You're offline", body "Check your connection and try again.", actionLabel "Try again" (calls `refetch`). No illustration until the DS GAP "connection lost" image exists.

---

## 1. Launch and auth

| Screen | State | Status | Evidence or proposal |
|---|---|---|---|
| Splash | default (Lottie, 7 s safety exit) | EXISTS | `src/screens/SplashScreen.tsx:35`, `:63` |
| Splash | route: signed in or returning guest to tabs, first launch to Onboarding | EXISTS | `src/screens/SplashScreen.tsx:63` |
| Splash | offline at launch with a saved session | EXISTS | Session kept on a network failure: `src/auth/AuthContext.tsx:127` |
| Onboarding | default, "Get Started" as guest | EXISTS | `src/screens/OnboardingScreen.tsx:393`, `:398` |
| Onboarding | "Already on CashKaro? Log in" | EXISTS | `src/screens/OnboardingScreen.tsx:401` |
| Login sheet | invalid phone, CTA disabled | EXISTS | `src/auth/LoginSheetProvider.tsx:462` |
| Login sheet | requesting OTP | EXISTS | `src/auth/LoginSheetProvider.tsx:461` |
| Login sheet | send OTP failed | EXISTS | `src/auth/LoginSheetProvider.tsx:231`, `:466` |
| Login sheet | wrong OTP | EXISTS | `src/auth/LoginSheetProvider.tsx:519`, `:526` |
| Login sheet | resend timer and ready | EXISTS | `src/auth/LoginSheetProvider.tsx:520` |
| Login sheet | verifying OTP | EXISTS | `src/auth/LoginSheetProvider.tsx:564` |
| Login sheet | session expired (refresh token rejected) | PARTIAL | Sheet opens by itself (`src/auth/LoginSheetProvider.tsx:125`) but the title is always "Log in or sign up" (`:427`). The user does not know why. Proposal: same sheet, title "Please log in again", body (`body14Regular`, `text.secondary`) "You were logged out to keep your account safe. Your cashback is safe.", CTA unchanged. DS GAP: the sheet has no title or body slot per `source`. |
| Login sheet | offline when requesting OTP | PARTIAL | Shows the raw API error text at `src/auth/LoginSheetProvider.tsx:466`. Proposal: `InlineMessage` tone warning, message "You're offline. Connect to get your OTP." |
| NameInput | empty name, CTA disabled | EXISTS | `src/screens/NameInputScreen.tsx:331` |
| NameInput | extreme: 30 character cap | EXISTS | `src/screens/NameInputScreen.tsx:319` |
| Greeting | no name, falls back to "there" | EXISTS | `src/screens/GreetingScreen.tsx:65` |
| Greeting | extreme: long first name | PARTIAL | Name renders in `display40ExtraBold` with no line limit (`src/screens/GreetingScreen.tsx:184`). The backend `fullname` has no cap. Proposal: `numberOfLines={1}` with tail ellipsis on the name. |
| EarnLoginSheet | card and store copy | EXISTS | `src/organisms/EarnLoginSheet.tsx:35`, `:84` |
| EarnLoginSheet | continue without cashback | EXISTS | `src/organisms/EarnLoginSheet.tsx:110` |
| GuestPrompt | signed out card | EXISTS | `src/organisms/GuestPrompt.tsx:29` |
| App shell | offline strip | EXISTS | `src/molecules/OfflineBanner.tsx:16`, `App.js:204` |

## 2. Home and discovery

| Screen | State | Status | Evidence or proposal |
|---|---|---|---|
| Home | first load skeleton | EXISTS | `src/screens/HomeScreen.tsx:2871`, `:2884` |
| Home | refetch after bank filter | EXISTS | `src/screens/HomeScreen.tsx:2871` (`bankRefreshing`) |
| Home | category filter loading | EXISTS | `src/screens/HomeScreen.tsx:2082`, `:2370` |
| Home | catalogue error | PARTIAL | Ad-hoc text and a hand-built `Pressable` (`src/screens/HomeScreen.tsx:2244`). Proposal: `ScreenState` title "Couldn't load cards", body "Check your connection and try again.", actionLabel "Try again". |
| Home | offline, no cache | MISSING | Paused `useCards` gives an empty list with no message (`src/screens/HomeScreen.tsx:354`). Proposal: standard offline state in place of the card list; masthead and tools row stay. |
| Home | filters match nothing | EXISTS | `src/screens/HomeScreen.tsx:2320`, closest-card fallback `:1520` |
| Home | guest taps Apply | EXISTS | `src/lib/useClickOut.tsx:89` opens `EarnLoginSheet` |
| Home | extreme: long card name | EXISTS | `src/organisms/CardTile.tsx:187` (2 lines) |
| CrossSellRail | shown under the closed tile | EXISTS | `src/screens/HomeScreen.tsx:1265` |
| CrossSellRail | fewer than 2 picks or holdout: hidden | EXISTS | `src/screens/useCrossSellRail.ts:176` |
| SearchTopSheet | no results | EXISTS | `src/organisms/SearchTopSheet.tsx:417` |
| SearchTopSheet | catalogue not loaded (error or offline) | MISSING | Every query reads "No results" because only loaded sections count (`src/organisms/SearchTopSheet.tsx:211`). Proposal: in place of the no-results block, `InlineMessage` tone warning, message "Search needs a connection. Check your internet and try again.", action "Try again". |
| Offers | first load skeleton | EXISTS | `src/screens/OffersScreen.tsx:522` |
| Offers | pull to refresh | EXISTS | `src/screens/OffersScreen.tsx:459` |
| Offers | error | EXISTS | `src/screens/OffersScreen.tsx:533` |
| Offers | empty category (per `docs/UI_UX_AUDIT_2026-11-09.md`, production has 0 stores mapped, so this is the default today; not re-checked) | EXISTS | `src/screens/OffersScreen.tsx:552` |
| Offers | offline, no cache | MISSING | Falls into "No offers here yet" (`src/screens/OffersScreen.tsx:552`). Proposal: standard offline state. |
| PromoTopSheet | shown only when stores exist | EXISTS | `src/screens/OffersScreen.tsx:206`, `src/organisms/PromoTopSheet.tsx:196` |
| OffersBrandAmazon | loading | PARTIAL | Bare spinner (`src/screens/OffersBrandAmazon.tsx:362`). Proposal: `Skeleton` blocks in the page shape: hero `height={spacing[128]}`, then three `spacing[48]` rows, `radius="lg"`. |
| OffersBrandAmazon | store failed or missing | EXISTS | `src/screens/OffersBrandAmazon.tsx:365` |
| OffersBrandAmazon | guest Shop & Earn | EXISTS | `src/lib/useClickOut.tsx:89` |
| Store sections | no data: section hidden | EXISTS | `src/organisms/StoreFaq.tsx:46`, `src/organisms/StoreBestCards.tsx:120`, `src/organisms/StoreTermsConditions.tsx:110` |

## 3. Card detail and apply

| Screen | State | Status | Evidence or proposal |
|---|---|---|---|
| CardDetailSheet (iOS) | benefits loading | EXISTS | `src/organisms/CardDetailSheet.tsx:1138`, `:1370` |
| CardDetailSheet | card detail fetch failed | PARTIAL | Only `isPending` is read (`src/organisms/CardDetailSheet.tsx:1111`); on error the benefits fall back silently or hide. Proposal: `InlineMessage` tone warning in the benefits block, message "Couldn't load all benefits for this card.", action "Try again". |
| CardDetailScreenAndroid | benefits loading | EXISTS | `src/organisms/CardDetailScreenAndroid.tsx:304`, `:380` |
| CardDetailScreenAndroid | card detail fetch failed | PARTIAL | Same as iOS (`src/organisms/CardDetailScreenAndroid.tsx:288`). Same proposal. |
| Detail eligibility form | invalid form, CTA disabled | EXISTS | `src/organisms/CardDetailSheet.tsx:786` |
| Detail eligibility form | checking | EXISTS | `src/organisms/CardDetailSheet.tsx:785` |
| Detail eligibility form | API failed, no fallback verdict | EXISTS | `src/organisms/CardDetailSheet.tsx:712` |
| EligibilityCheckerSheet | pincode and income validation | EXISTS | `src/organisms/EligibilityCheckerSheet.tsx:292`, `:301` |
| EligibilityCheckerSheet | checking | EXISTS | `src/organisms/EligibilityCheckerSheet.tsx:383`, `:395` |
| EligibilityCheckerSheet | API failed | EXISTS | `src/organisms/EligibilityCheckerSheet.tsx:328`, `:448` |
| EligibleSheet | eligible | EXISTS | `src/screens/HomeScreen.tsx:2763` |
| MaybeSheet | maybe | EXISTS | `src/screens/HomeScreen.tsx:2811` |
| IneligibleSheet | rejected, with alternatives | EXISTS | `src/organisms/IneligibleSheet.tsx:130`, `src/screens/HomeScreen.tsx:2850` |
| IneligibleSheet | rejected, zero alternatives | PARTIAL | Blocks 2 and 3 are left out (`src/organisms/IneligibleSheet.tsx:130`), so the only ways out are Edit and Continue to Apply. Proposal: `InlineMessage` tone info, message "No other card fits these details yet. Try different details, or browse all cards.", plus `Button` variant outline "Browse all cards". |
| AllCardBenefits | loading | PARTIAL | Bare spinner (`src/screens/AllCardBenefitsScreen.tsx:129`). Proposal: 4 `Skeleton` rows, `height={spacing[48]}`, `radius="lg"`. |
| AllCardBenefits | error | PARTIAL | Text only, no retry (`src/screens/AllCardBenefitsScreen.tsx:133`). Proposal: `ScreenState` title "Couldn't load benefits", body "Check your connection and try again.", actionLabel "Try again". |
| AllCardBenefits | empty | EXISTS | `src/screens/AllCardBenefitsScreen.tsx:145` |
| AllCardBenefits | offline, no cache | MISSING | Falls into the empty copy (`src/screens/AllCardBenefitsScreen.tsx:133`). Proposal: standard offline state. |
| Apply click-out | guest | EXISTS | `src/lib/useClickOut.tsx:89` |
| Apply click-out | resolving the user id | MISSING | `src/lib/useClickOut.tsx:96` awaits a profile refetch with no feedback; the tap looks dead. Proposal: `FooterButtons` `primaryLoading` (or `Button` `loading`) on Apply Now until the link opens. No copy. |
| Apply click-out | redirect to bank or store | MISSING | Link opens with no hand-off (`src/lib/useClickOut.tsx:112`). Proposal: full-screen interstitial for 1 to 2 s, title "Taking you to {bank or store}", body "Your cashback is being tracked. Finish there to earn it." DS GAP: redirect interstitial (the cat animation `cat-redirecting.riv` lives only inside `src/organisms/FilterTransitionOverlay.tsx:136`). |
| Apply click-out | user id not resolved | PARTIAL | Native `Alert` (`src/lib/useClickOut.tsx:106`, `:132`). Proposal: `Toast` tone error mounted on the screen, message "Couldn't open this. We couldn't confirm your account, so cashback would not be tracked. Check your connection and try again." |
| Apply click-out | card or store has no URL | MISSING | Silent return (`src/lib/useClickOut.tsx:87`): a dead CTA. Proposal: `FooterButtons` `primaryDisabled` plus `InlineMessage` tone info, message "Applications for this card are paused. See similar cards below." |
| CardsYouCanGet | loading | EXISTS | `src/screens/CardsYouCanGetScreen.tsx:273` |
| CardsYouCanGet | error | EXISTS | `src/screens/CardsYouCanGetScreen.tsx:280` |
| CardsYouCanGet | no cards | EXISTS | `src/screens/CardsYouCanGetScreen.tsx:291` |
| CardsYouCanGet | filters match nothing | EXISTS | `src/screens/CardsYouCanGetScreen.tsx:478` |
| CardsYouCanGet | offline, no cache | MISSING | Falls into "No cards to show" (`src/screens/CardsYouCanGetScreen.tsx:291`). Proposal: standard offline state. |

## 4. Home tools

| Screen | State | Status | Evidence or proposal |
|---|---|---|---|
| BestForCategory | nothing selected, CTA hidden | EXISTS | `src/screens/tools/BestForCategoryScreen.tsx:206` |
| BestForCategory | step progress | EXISTS | `src/screens/tools/BestForCategoryScreen.tsx:129` |
| BestForBrands | brand limit reached | EXISTS | `src/screens/tools/BestForBrandsScreen.tsx:176`, `:188` |
| BestForBrands | search matches no brand | EXISTS | `src/screens/tools/BestForBrandsScreen.tsx:180` |
| BestForBrands | all spends 0 | EXISTS | `src/screens/tools/BestForBrandsScreen.tsx:101` |
| SpendQuiz | step progress and "Skip to results" | EXISTS | `src/screens/tools/SpendQuizScreen.tsx:156`, `:212` |
| SpendQuiz | extreme typed amount (capped at question max) | EXISTS | `src/screens/tools/SpendQuizScreen.tsx:204` |
| ToolResults | all spends 0 | EXISTS | `src/screens/tools/ToolResultsScreen.tsx:516` |
| ToolResults | loading | EXISTS | `src/screens/tools/ToolResultsScreen.tsx:522`, `:529` |
| ToolResults | offline | EXISTS | `src/screens/tools/ToolResultsScreen.tsx:536` |
| ToolResults | error | EXISTS | `src/screens/tools/ToolResultsScreen.tsx:545` |
| ToolResults | no cards returned | EXISTS | `src/screens/tools/ToolResultsScreen.tsx:554` |
| ToolResults | filters match nothing | EXISTS | `src/screens/tools/ToolResultsScreen.tsx:563` |
| ToolResults | compare needs 2 picks | EXISTS | `src/screens/tools/ToolResultsScreen.tsx:435`, `:441` |
| BeatMyCardPick | all spends 0 | EXISTS | `src/screens/tools/BeatMyCardPickScreen.tsx:156` |
| BeatMyCardPick | loading | EXISTS | `src/screens/tools/BeatMyCardPickScreen.tsx:163` |
| BeatMyCardPick | offline | EXISTS | `src/screens/tools/BeatMyCardPickScreen.tsx:178` |
| BeatMyCardPick | error | EXISTS | `src/screens/tools/BeatMyCardPickScreen.tsx:188` |
| BeatMyCardPick | empty list | EXISTS | `src/screens/tools/BeatMyCardPickScreen.tsx:197` |
| BeatMyCardPick | typed card not found | EXISTS | `src/screens/tools/BeatMyCardPickScreen.tsx:268` |
| BeatMyCardResult | all spends 0 | EXISTS | `src/screens/tools/BeatMyCardResultScreen.tsx:251` |
| BeatMyCardResult | loading | EXISTS | `src/screens/tools/BeatMyCardResultScreen.tsx:257` |
| BeatMyCardResult | offline | EXISTS | `src/screens/tools/BeatMyCardResultScreen.tsx:271` |
| BeatMyCardResult | error | EXISTS | `src/screens/tools/BeatMyCardResultScreen.tsx:280` |
| BeatMyCardResult | your card cannot be compared | EXISTS | `src/screens/tools/BeatMyCardResultScreen.tsx:299` |
| BeatMyCardResult | filters match nothing | EXISTS | `src/screens/tools/BeatMyCardResultScreen.tsx:316` |
| EditSpendsSheet | default and typed max | EXISTS | `src/organisms/EditSpendsSheet.tsx:237`, `:95` |
| SavingsBreakdownSheet | breakdown with lounge, fee waiver | EXISTS | `src/organisms/SavingsBreakdownSheet.tsx:266`, `:270` |
| SavingsBreakdownSheet | card not in the app: no Apply | EXISTS | `src/organisms/SavingsBreakdownSheet.tsx:144`, `:382` |
| ToolResults | extreme: league of every card (about 280 rows) | PARTIAL | Not checked on a device for scroll cost. No proposal until measured. |

## 5. Card advisor chat

| Screen | State | Status | Evidence or proposal |
|---|---|---|---|
| AdvisorScreen | catalogue loading | EXISTS | `src/screens/advisor/AdvisorScreen.tsx:433` |
| AdvisorScreen | catalogue error | EXISTS | `src/screens/advisor/AdvisorScreen.tsx:435` |
| AdvisorScreen | no cards | EXISTS | `src/screens/advisor/AdvisorScreen.tsx:445` |
| AdvisorScreen | offline, no cache | MISSING | Paused `useCards` falls into "No cards are available right now" (`src/screens/advisor/AdvisorScreen.tsx:445`). Proposal: standard offline state. |
| AdvisorScreen | checking eligibility | EXISTS | `src/screens/advisor/AdvisorScreen.tsx:372`, header `:426` |
| AdvisorScreen | eligibility check failed | EXISTS | `src/screens/advisor/AdvisorScreen.tsx:380`, header `:428` |
| AdvisorScreen | start over confirmation | PARTIAL | Native `Alert` (`src/screens/advisor/AdvisorScreen.tsx:269`). Proposal: `BottomSheet` + `FooterButtons` `buttons="dual"`, as `LogoutConfirmSheet`; title "Start over?", body "This clears all your answers.", primary "Start over", secondary "Keep going". |
| AdvisorReplyTray | multi-select: nothing picked | EXISTS | `src/screens/advisor/AdvisorReplyTray.tsx:128` |
| AdvisorReplyTray | multi-select: max reached | EXISTS | `src/screens/advisor/AdvisorReplyTray.tsx:110` |
| AdvisorEligibilityForm | wrong pincode | EXISTS | `src/screens/advisor/AdvisorEligibilityForm.tsx:49`, `:86` |
| AdvisorResults | loading | EXISTS | `src/screens/advisor/AdvisorResultsScreen.tsx:145` |
| AdvisorResults | error | EXISTS | `src/screens/advisor/AdvisorResultsScreen.tsx:152` |
| AdvisorResults | no cards fit | EXISTS | `src/screens/advisor/AdvisorResultsScreen.tsx:162` |
| AdvisorResults | offline, no cache | MISSING | Falls into "No cards to show" (`src/screens/advisor/AdvisorResultsScreen.tsx:162`). Proposal: standard offline state. |

## 6. Earnings and withdraw

| Screen | State | Status | Evidence or proposal |
|---|---|---|---|
| Earnings | guest | EXISTS | `src/screens/EarningsScreen.tsx:165` |
| Earnings | first load | EXISTS | `src/screens/EarningsScreen.tsx:96`, `:271`, `:287` |
| Earnings | error | EXISTS | `src/screens/EarningsScreen.tsx:199`, `:217` |
| Earnings | offline, no cache | MISSING | Shows Confirmed ₹0 and Pending ₹0 (`src/screens/EarningsScreen.tsx:288`, `:300`; masthead defaults `src/organisms/Masthead.tsx:505`). A user with money sees nothing to withdraw. Proposal: standard offline state in place of the masthead and rows, with body "Your balance will show when you're back online." Never render ₹0 for "unknown". |
| Earnings | signed in, session still restoring | MISSING | `useEarnings` is disabled until a token exists (`src/query/useEarnings.ts:17`), so `loading` is false (`src/screens/EarningsScreen.tsx:96`) and ₹0 can flash. Proposal: treat auth `status === 'loading'` as loading, so the existing `AmountSkeleton` path (`loading` prop) shows. No copy. |
| Earnings | extreme: ₹10,00,000+ all-time | PARTIAL | `RollingAmount` in `display36ExtraBold` (`src/organisms/Masthead.tsx:629`); D7 bans auto-shrink, and there is no step-down rule. Not checked on a device. DS GAP: long-amount rule. |
| Earnings transactions | loading | EXISTS | `src/screens/EarningsScreen.tsx:350` |
| Earnings transactions | error | EXISTS | `src/screens/EarningsScreen.tsx:356` |
| Earnings transactions | empty per filter | EXISTS | `src/screens/EarningsScreen.tsx:363` |
| EarningStatusSheet | pending "Know why" | EXISTS | `src/screens/EarningsScreen.tsx:304`, `:467` |
| EarningsBreakupSheet | values (₹0 defaults) | EXISTS | `src/organisms/EarningsBreakupSheet.tsx:174` |
| CashbackPip | Android only, hidden once set up | EXISTS | `src/organisms/CashbackPip.tsx:263`, `:265` |
| Withdraw gate | ₹0 confirmed | EXISTS | `src/screens/withdraw/useWithdrawGate.tsx:103` |
| Withdraw gate | below minimum | EXISTS | `src/screens/withdraw/useWithdrawGate.tsx:106` |
| Withdraw gate | payout already in process | EXISTS | `src/screens/withdraw/useWithdrawGate.tsx:100`, `:126` |
| Withdraw gate | balance could not load | PARTIAL | Native `Alert` (`src/screens/withdraw/useWithdrawGate.tsx:72`). Proposal: `Toast` tone error, message "Couldn't load your balance. Check your connection and try again.", `actionLabel` "Try again". |
| WithdrawMethodSelect | amount loading | EXISTS | `src/screens/WithdrawScreen.tsx:185`, `:195` |
| WithdrawMethodSelect | bank transfer not available | EXISTS | `src/screens/WithdrawScreen.tsx:243`, `src/screens/withdraw/methodRow.tsx:136` |
| WithdrawEnterUPI | invalid UPI | EXISTS | `src/screens/withdraw/WithdrawEnterUPI.tsx:117` |
| WithdrawEnterUPI | T&C not agreed, CTA disabled | EXISTS | `src/screens/withdraw/WithdrawEnterUPI.tsx:148` |
| WithdrawEnterUPI | sending OTP | EXISTS | `src/screens/withdraw/WithdrawEnterUPI.tsx:149` |
| WithdrawEnterUPI | send OTP failed | PARTIAL | Native `Alert` (`src/screens/withdraw/WithdrawEnterUPI.tsx:75`). Proposal: `InlineMessage` tone error above `FooterButtons`, message "We couldn't send the OTP. Please try again." |
| WithdrawAmazon | invalid mobile, mismatch | EXISTS | `src/screens/withdraw/WithdrawAmazon.tsx:148`, `:159` |
| WithdrawAmazon | CTA disabled, sending | EXISTS | `src/screens/withdraw/WithdrawAmazon.tsx:187`, `:188` |
| WithdrawAmazon | send OTP failed | PARTIAL | Native `Alert` (`src/screens/withdraw/WithdrawAmazon.tsx:99`). Same proposal as UPI. |
| WithdrawFlipkart | invalid email, mismatch | EXISTS | `src/screens/withdraw/WithdrawFlipkart.tsx:142`, `:154` |
| WithdrawFlipkart | CTA disabled, sending | EXISTS | `src/screens/withdraw/WithdrawFlipkart.tsx:181`, `:182` |
| WithdrawFlipkart | send OTP failed | PARTIAL | Native `Alert` (`src/screens/withdraw/WithdrawFlipkart.tsx:92`). Same proposal as UPI. |
| WithdrawGiftCard | pick Amazon or Flipkart | EXISTS | `src/screens/withdraw/WithdrawGiftCard.tsx:62`, `:68` |
| WithdrawVerifyOTP | wrong or expired OTP | EXISTS | `src/screens/withdraw/WithdrawVerifyOTP.tsx:214` |
| WithdrawVerifyOTP | verifying and paying (input blocked) | EXISTS | `src/screens/withdraw/WithdrawVerifyOTP.tsx:297`, `:303` |
| WithdrawVerifyOTP | payout failed | PARTIAL | Native `Alert` (`src/screens/withdraw/WithdrawVerifyOTP.tsx:177`). Proposal: `InlineMessage` tone error over the footer, title "Withdrawal didn't go through", message "Please try again in a few minutes.", action "Try again". |
| WithdrawVerifyOTP | outcome unknown (timeout after send) | PARTIAL | Native `Alert` (`src/screens/withdraw/WithdrawVerifyOTP.tsx:89`). A money state deserves a screen. Proposal: `ScreenState` image `screenstate.tracking`, title "We're confirming your withdrawal", body "This can take a few minutes. Don't request again until it shows in Earnings.", actionLabel "Go to Earnings". |
| WithdrawVerifyOTP | OTP session expired | PARTIAL | Native `Alert` (`src/screens/withdraw/WithdrawVerifyOTP.tsx:111`). Proposal: reuse the existing expired state of the same screen (`src/screens/withdraw/WithdrawVerifyOTP.tsx:214`) in place of the Alert. No new copy. |
| WithdrawVerifyOTP | network failure, resend failure | PARTIAL | Native `Alert` (`src/screens/withdraw/WithdrawVerifyOTP.tsx:134`, `:204`). Proposal: `InlineMessage` tone warning, message "Connection problem. Please try again." |
| WithdrawSuccess | success | EXISTS | `src/screens/withdraw/WithdrawSuccess.tsx:68`, `:118` |
| WithdrawTerms | static terms | EXISTS | `src/navigation/WithdrawStack.tsx:56` |
| PaymentProcessingSheet | payout in process | EXISTS | `src/screens/withdraw/useWithdrawGate.tsx:126` |
| Payment history | list and details (hidden, D4) | PARTIAL | Sample payouts (`src/screens/ProfilePaymentHistory.tsx:79`, `src/screens/ProfilePaymentHistoryDetails.tsx:73`); no API, no loading or error. Proposal when the API lands: `Skeleton` rows, `ScreenState` error "Couldn't load your payments" / "Check your connection and try again." / "Try again". |
| Payment history | empty (hidden, D4) | EXISTS | Standalone screen `src/screens/ProfilePaymentHistoryEmpty.tsx`, route `src/navigation/RootNavigator.tsx:244` |

## 7. Orders and missing cashback

| Screen | State | Status | Evidence or proposal |
|---|---|---|---|
| OrdersList | first load | PARTIAL | Bare spinner (`src/screens/OrdersList.tsx:403`). Proposal: 3 `Skeleton`, `height={spacing[80]}`, `radius="lg"`, as Earnings does at `src/screens/EarningsScreen.tsx:353`. |
| OrdersList | error | EXISTS | `src/screens/OrdersList.tsx:407` |
| OrdersList | filters match nothing | EXISTS | `src/screens/OrdersList.tsx:417` |
| OrdersList | no orders | EXISTS | `src/screens/OrdersList.tsx:425` |
| OrdersList | loading next page | EXISTS | `src/screens/OrdersList.tsx:454` |
| OrdersList | next page failed | PARTIAL | `isError` is checked before the rows (`src/screens/OrdersList.tsx:407`), so a failed page 2 likely replaces the whole list with the error block. Proposal: keep rows; list footer `InlineMessage` tone warning, message "Couldn't load more orders.", action "Try again". |
| OrdersList | offline, no cache | MISSING | Falls into "No orders yet" (`src/screens/OrdersList.tsx:425`). Proposal: standard offline state. |
| OrdersList | session expired while open | MISSING | The cache is cleared and `useOrders` is disabled, so "No orders yet" shows behind the login sheet (`src/screens/OrdersList.tsx:425`; the screen never reads auth status). Proposal: `GuestPrompt` with title "Log in to see your orders", body "Your orders and cashback are safe. Log in again to see them.", action "Log in". |
| OrderCard | extreme: long store name | EXISTS | `src/organisms/OrderCard.tsx:218` |
| OrdersDetail | loading | PARTIAL | Bare spinner (`src/screens/OrdersDetail.tsx:211`). Proposal: `Skeleton` masthead block `height={spacing[128]}`, plus 3 `spacing[48]` rows. |
| OrdersDetail | offline, no cache | MISSING | Neither spinner nor error shows (`src/screens/OrdersDetail.tsx:198`, `:199`); the body renders with empty values. Proposal: standard offline state. |
| OrdersDetail | error | PARTIAL | Text and link (`src/screens/OrdersDetail.tsx:215`). Proposal: `ScreenState` title "Couldn't load this order", body "Check your connection and try again.", actionLabel "Try again". |
| MissingCashbackHelp | checking store visits | EXISTS | `src/screens/MissingCashbackHelp.tsx:56`, `:149` |
| MissingCashbackHelp | store visit lookup failed | PARTIAL | Native `Alert` (`src/screens/MissingCashbackHelp.tsx:60`). Proposal: `InlineMessage` tone warning above the Yes/No buttons, message "Couldn't check your store visits.", action "Try again". |
| MissingCashbackHelp | offline, no cache | MISSING | Paused lookup counts as "no visits" and routes to Oops (`src/screens/MissingCashbackHelp.tsx:72`). Proposal: the same `InlineMessage` as the row above, message "You're offline. Connect to check your store visits." |
| MissingCashbackOops | no store visits in 30 days | EXISTS | `src/screens/MissingCashbackOops.tsx:57` |
| MissingCashbackDidYouShop | loading | PARTIAL | Bare spinner (`src/screens/MissingCashbackDidYouShop.tsx:200`). Proposal: 3 `Skeleton`, `height={spacing[80]}`, `radius="lg"`. |
| MissingCashbackDidYouShop | error | EXISTS | `src/screens/MissingCashbackDidYouShop.tsx:204` |
| MissingCashbackDidYouShop | empty per tab | EXISTS | `src/screens/MissingCashbackDidYouShop.tsx:212` |
| MissingCashbackDidYouShop | offline, no cache | MISSING | Falls into the empty state (`src/screens/MissingCashbackDidYouShop.tsx:168`). Proposal: standard offline state. |
| MissingCashbackWhereDidYouShop | loading | PARTIAL | Bare spinner (`src/screens/MissingCashbackWhereDidYouShop.tsx:99`). Proposal: 4 `Skeleton` rows, `height={spacing[48]}`, `radius="lg"`. |
| MissingCashbackWhereDidYouShop | error | PARTIAL | Inline text and link (`src/screens/MissingCashbackWhereDidYouShop.tsx:103`). Proposal: `ScreenState` title "Couldn't load your stores", body "Check your connection and try again.", actionLabel "Try again". |
| MissingCashbackWhereDidYouShop | no stores | EXISTS | `src/screens/MissingCashbackWhereDidYouShop.tsx:114` |
| MissingCashbackChooseDate | loading | PARTIAL | Bare spinner (`src/screens/MissingCashbackChooseDate.tsx:77`). Proposal: `Skeleton` rows as above. |
| MissingCashbackChooseDate | error | PARTIAL | Inline text and link (`src/screens/MissingCashbackChooseDate.tsx:81`). Proposal: `ScreenState` title "Couldn't load your visit dates", body "Check your connection and try again.", actionLabel "Try again". |
| MissingCashbackChooseDate | no dates, CTA disabled | EXISTS | `src/screens/MissingCashbackChooseDate.tsx:92`, `:149` |
| MissingCashbackChooseDate | offline, no cache | MISSING | Reads "We couldn't find any recent visits" (`src/screens/MissingCashbackChooseDate.tsx:92`), which is false. Proposal: standard offline state. |
| MissingCashbackEnterOrderId | format error, submitting | EXISTS | `src/screens/MissingCashbackEnterOrderId.tsx:142`, `:169` |
| MissingCashbackEnterAmount | invalid amount, submit error | EXISTS | `src/screens/MissingCashbackEnterAmount.tsx:59`, `:76` |
| MissingCashbackEnterAmount | submitting | EXISTS | `src/screens/MissingCashbackEnterAmount.tsx:142` |
| MissingCashbackNewUserCheck | submitting | EXISTS | `src/screens/MissingCashbackNewUserCheck.tsx:152`, `:161` |
| MissingCashbackCategorySelect | submitting, submit error | EXISTS | `src/screens/MissingCashbackCategorySelect.tsx:166`, `:66` |
| MissingCashbackInvoiceUpload | no file | EXISTS | `src/screens/MissingCashbackInvoiceUpload.tsx:81` |
| MissingCashbackInvoiceUpload | uploading, upload failed | EXISTS | `src/screens/MissingCashbackInvoiceUpload.tsx:237`, `:130` |
| MissingCashbackInvoiceUpload | photo permission denied | PARTIAL | Native `Alert` with no way to settings (`src/screens/MissingCashbackInvoiceUpload.tsx:59`). Proposal: `InlineMessage` tone warning, message "Allow photo access to attach your invoice.", action "Open settings" (`Linking.openSettings`). |
| MissingCashbackInvoiceUpload | file too large or wrong type | MISSING | The copy promises limits (`src/screens/MissingCashbackInvoiceUpload.tsx:174`) but nothing checks them. Proposal: `InlineMessage` tone error under the thumbnails, message "This file is too big. Use a file under 2 MB." or "Use a JPG, PNG, PDF or BMP file." |
| MissingCashbackResult | tracked, auto-tracking, submitted | EXISTS | `src/screens/MissingCashbackResult.tsx:36`, `:60` |
| Claims list | claim not tracked (rejected), with reason | EXISTS | Mapped at `src/api/missingCashbackMapper.ts:375`, listed at `src/screens/MissingCashbackDidYouShop.tsx:226`, reason drawn at `src/molecules/HelpTicketCard.tsx:270` |
| MissingCashbackTrack (dev only) | populated | PARTIAL | Hardcoded titles (`src/screens/MissingCashbackTrack.tsx:84`, `:92`); reachable only from the dev ticket lists. Keep out of "real" stories until wired. |
| MissingCashbackTicketSuccess | ticket raised | EXISTS | `src/screens/MissingCashbackTicketSuccess.tsx:41` |
| Ticket lists, status review (dev only) | populated | PARTIAL | Hardcoded sample (`src/screens/MissingCashbackTicketListTracked.tsx:75`). Keep out of Storybook "real" stories until wired. |
| CashbackGuard | iOS: not available | EXISTS | `src/screens/CashbackGuardScreen.tsx:135` |
| CashbackGuard | permissions granted or not, re-check | EXISTS | `src/screens/CashbackGuardScreen.tsx:224`, `:233`, `:263` |
| NeverMissCashbackNudge | hidden with no orders | EXISTS | `src/organisms/NeverMissCashbackNudge.tsx:55` |
| WhatWentWrongFeedbackSheet | nothing ticked, CTA disabled | EXISTS | `src/organisms/WhatWentWrongFeedbackSheet.tsx:139` |
| WhatWentWrongInfoSheet | info | EXISTS | `src/organisms/WhatWentWrongInfoSheet.tsx:78` |
| FeedbackAppreciatedSheet | thanks | EXISTS | `src/organisms/FeedbackAppreciatedSheet.tsx:84` |

## 8. Profile and account

| Screen | State | Status | Evidence or proposal |
|---|---|---|---|
| Profile | guest | EXISTS | `src/screens/ProfileScreen.tsx:134` |
| Profile | profile loading | PARTIAL | Name and contact render empty (`src/organisms/Masthead.tsx:282`) while `useProfile` loads (`src/screens/ProfileScreen.tsx:64`). Proposal: `Skeleton` `width="60%"` `height={spacing[24]}` for the name and `width="40%"` `height={spacing[16]}` for the contact. |
| Profile | offline, no cache | MISSING | Same blank name and contact as loading (`src/screens/ProfileScreen.tsx:64`). Proposal: keep the loading `Skeleton`s, plus `InlineMessage` tone warning, message "You're offline. Your details will show when you're back online." |
| Profile | profile failed | MISSING | `isError` is never read (`src/screens/ProfileScreen.tsx:64`). Proposal: `InlineMessage` tone warning under the masthead, message "Couldn't load your details.", action "Try again". Menu rows stay usable. |
| Profile | extreme: long name | PARTIAL | Name has no line limit (`src/organisms/Masthead.tsx:341`); contact has one (`:347`). Proposal: `numberOfLines={1}` with tail ellipsis. |
| LogoutConfirmSheet | confirm | EXISTS | `src/organisms/LogoutConfirmSheet.tsx:121`, `:130` |
| AccountSettings | no change, Save disabled | EXISTS | `src/screens/AccountSettingsScreen.tsx:204` |
| AccountSettings | saving | MISSING | Save only goes back (`src/screens/AccountSettingsScreen.tsx:205`); no write API. Proposal (after the API): `FooterButtons` `primaryLoading`. No copy. |
| AccountSettings | save failed | MISSING | No API. Proposal: `InlineMessage` tone error above the footer, message "Couldn't save your changes. Please try again." |
| AccountSettings | contact changed | EXISTS | `src/screens/AccountSettingsScreen.tsx:187` |
| AccountSettings | profile loading | PARTIAL | Email reads empty (`src/screens/AccountSettingsScreen.tsx:90`). Proposal: `Skeleton` in the field, `height={spacing[48]}`. |
| EditContactEnterNew | invalid entry | PARTIAL | CTA disabled only (`src/screens/EditContactEnterNewScreen.tsx:86`), no message. Proposal: `Input` `state="error"`, hint "Enter a valid email ID" or "Enter a valid 10-digit mobile number". |
| EditContactEnterNew | already registered | MISSING | No server check. Proposal: `Input` `state="error"`, hint "This email ID is already linked to another account." (or "This mobile number ...") |
| EditContactVerifyIdentity, EditContactVerifyNew | resend timer | EXISTS | `src/screens/EditContactVerifyIdentityScreen.tsx:88`, `src/screens/EditContactVerifyNewScreen.tsx:106` |
| EditContactVerifyIdentity, EditContactVerifyNew | wrong OTP, verifying | MISSING | Any 6 digits pass (`src/screens/EditContactVerifyIdentityScreen.tsx:103`, `src/screens/EditContactVerifyNewScreen.tsx:121`). Proposal (after the API): `OtpInput` `state="error"` with hint "Wrong OTP. Please try again.", `FooterButtons` `primaryLoading` while verifying. |
| DeleteAccount (hidden, D23) | checkbox not ticked | EXISTS | `src/screens/DeleteAccountScreen.tsx:155` |
| DeleteAccountOtp (hidden, D23) | wrong OTP, deleting | MISSING | Any code passes (`src/screens/DeleteAccountOtpScreen.tsx:127`). Proposal (after the API): as EditContact, plus `FooterButtons` `primaryLoading` with no copy. |
| AccountDeleted (hidden, D23) | done | EXISTS | `src/screens/AccountDeletedScreen.tsx:109` |
| Notifications | empty (no feed API) | EXISTS | `src/screens/NotificationsScreen.tsx:172` |
| GetHelp | guest taps Missing Cashback | EXISTS | `src/screens/GetHelpScreen.tsx:121` |
| GetHelp | call cannot open | PARTIAL | Failure is swallowed (`src/screens/GetHelpScreen.tsx:99`). Proposal: `Toast` tone warning, message "Couldn't start the call. Please call us from your phone app." |
| ReviewUs, WriteReview (hidden, D14) | rating required | EXISTS | `src/screens/WriteReviewScreen.tsx:174` |
| ReviewUs, WriteReview (hidden, D14) | "submitted" toast | PARTIAL | Toast says submitted (`src/screens/ReviewUsScreen.tsx:306`) but the text is discarded. Keep hidden until an endpoint exists. |
| PrivacyPolicy | static | EXISTS | `src/navigation/RootNavigator.tsx:249` |

---

## (a) Top 25 missing states

Rank = how often a user hits it x how bad it is. Money and attribution errors weigh most.

| # | Flow | State | Status | Why it ranks here |
|---|---|---|---|---|
| 1 | 6 | Earnings offline or no cache: shows ₹0 Confirmed and Pending | MISSING | Wrong money figure on a main tab; users think cashback vanished and raise tickets. |
| 2 | 2 | Home offline, no cache: blank card list, no message | MISSING | First screen of every cold start on a bad network; looks broken. |
| 3 | 3 | Apply click-out: no feedback while the user id resolves | MISSING | Revenue CTA looks dead; double taps and drop-off. |
| 4 | 3 | Apply click-out: no redirect interstitial | MISSING | Nothing tells the user cashback is tracked at the hand-off (DS GAP). |
| 5 | 1 | Session expired: generic "Log in or sign up" sheet | PARTIAL | Every user whose refresh token dies sees an unexplained login prompt. |
| 6 | 7 | Missing Cashback offline: routed to "Oops, no visits" | MISSING | Tells a real shopper they have no claim; lost claims and trust. |
| 7 | 7 | Orders list, order detail, claims list, choose date offline: false empty | MISSING | False empty for orders and claims the user knows exist. |
| 8 | 6 | Withdraw outcome unknown after timeout: native Alert | PARTIAL | Money in limbo; a full state prevents a double payout request. |
| 9 | 6 | Withdraw payout failed: native Alert | PARTIAL | Money path; the error disappears on tap. |
| 10 | 3 | Apply click-out: card or store has no URL, silent no-op | MISSING | Dead revenue CTA. |
| 11 | 3 | Apply click-out: user id not resolved, native Alert | PARTIAL | Revenue path; generic system dialog. |
| 12 | 2 | Offers offline: "No offers here yet" | MISSING | False empty on a main tab. |
| 13 | 2 | Search when the catalogue is not loaded: "No results" for every query | MISSING | Misleads the user that cards do not exist. |
| 14 | 6 | Withdraw gate: balance could not load, native Alert | PARTIAL | Blocks withdraw with a system dialog. |
| 15 | 6 | Withdraw send OTP failed (UPI, Amazon, Flipkart): native Alert | PARTIAL | Three forms on the money path. |
| 16 | 7 | Orders list: failed next page likely replaces the list | PARTIAL | Users with many orders lose the list on a scroll. |
| 17 | 8 | Profile failed: no state; loading shows blank name | MISSING | Profile tab looks empty. |
| 18 | 3 | IneligibleSheet with zero alternatives: no way forward | PARTIAL | Rejected user hits a dead end (against D22 intent). |
| 19 | 3 | Card detail fetch failed: benefits fall back silently | PARTIAL | User decides on incomplete benefits. |
| 20 | 7 | Invoice upload: no size or type check | MISSING | Upload fails late after the user picked files. |
| 21 | 7 | Invoice upload: permission denied, no settings link | PARTIAL | User is stuck once they tap "Don't allow". |
| 22 | 3, 5 | Cards you can get, Advisor, Advisor results offline: false "No cards" | MISSING | Lower traffic than Home, same false-empty problem. |
| 23 | 6, 7 | Earnings ₹0 flash while the session restores; Orders list "No orders yet" after the session expires | MISSING | Short or rare, but on money and order screens. |
| 24 | 2 | Home catalogue error: ad-hoc text, not `ScreenState` | PARTIAL | Works, but off-pattern for Storybook and Figma. |
| 25 | 6, 1, 8 | Extreme values: ₹10,00,000+ masthead, long names on Greeting and Profile | PARTIAL | Rare, but breaks the layout where it shows. |

Not in the top 25 because they are hidden by a decision or need an API first: AccountSettings save, EditContact and DeleteAccount OTP errors, Payment History loading and error, Write Review endpoint.

## (b) DS gaps

1. **Connection lost and generic error illustrations for `ScreenState`.** Figma has "Connection lost" (4367:243565) and "Something didn't go as planned" (4367:243459). Code has only `appOrders`, `tracking` and `confirmation`. Needs two exported assets in `images.screenstate`.
2. **App-level toast host.** `Toast` exists but each screen mounts its own (`src/screens/ReviewUsScreen.tsx:306`). Replacing the native `Alert` calls (click-out, withdraw, gate, Help) needs one provider with `show({ tone, message, actionLabel, onActionPress })`.
3. **Redirect interstitial.** A full-screen "Taking you to {bank or store}" state for Apply and Shop & Earn. The cat animation exists only inside `FilterTransitionOverlay` (`src/organisms/FilterTransitionOverlay.tsx:136`). Needs an organism that reuses it with a title and body slot.
4. **Login sheet copy per source.** The sheet has one fixed title (`src/auth/LoginSheetProvider.tsx:427`). Needs an optional title and body for `session_expired` (and later other sources).
5. **`ScreenState` second action.** Some states need "Try again" plus a secondary link (for example "Go to Earnings", "Contact us"). Today it takes one action only.
6. **Long-amount rule for display numbers.** `display36ExtraBold` in the earnings masthead has no step-down for 8+ digit amounts, and D7 forbids auto-shrink. Needs a documented rule, for example step down to the existing `display32Bold` or `heading28ExtraBold` above a set character count.
7. **Shared offline-aware query state (engineering, not visual).** Not a DS part, but every offline proposal depends on it: one helper that turns "paused with no data" into `isOffline`, as `src/query/useCardSavings.ts:124` does.
