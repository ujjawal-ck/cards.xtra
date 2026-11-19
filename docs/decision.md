# Decision log

Decisions that shape how Cards.xtra is built, newest first. Each entry says what was decided, why, and what it costs. Open questions that still need an owner are at the end.

Format: **Decision** · date · commit(s) where it landed.

---

## D30. Advisor chat: stacked answers, acknowledgements and quick tips
2026-11-19 · branch `claude/advisor`

The owner said the answer chips looked scattered, and asked for better copy, an acknowledgement of each answer and quick tips along the journey.

What changed:
- The reply tray shows the answers as one stack of full-width rows (`AdvisorOptionRow`). "Not sure" is the last row, drawn quieter. The tray takes at most 46% of the window height and scrolls after that.
- An answer can have one acknowledgement line (`ack` on the option in `src/lib/advisor/config.ts`, message id `k:<question id>`). It says what the advisor understood and what it does next. "Not sure" gets `notSureAck`. The pincode gets a count line only when the eligibility result is "likely" and no note is on the reveal.
- An acknowledgement is skipped when the answer made the engine relax a filter. The reveal note explains that case, and two lines would disagree.
- A quick tip (`tips` in the config, message id `t:<tip id>`, kind `agent-tip`) is one fact at one place in the journey. A tip id shows once in a chat. Five tips: pay the full bill (first card), monthly cashback caps, lifetime free against first year free, the check does not touch the credit report, wait after a rejection.
- New event `advisor_tip_view` (param `tip_id`), once for each tip in a chat.
- The "same cards" line shows only when the answer has no acknowledgement.

Evidence, and its limit: the owner asked for user research on Reddit before the build. That research did not happen. The built-in browser refuses reddit.com and the research agents read zero threads. The tips come from the earlier Reddit findings in the advisor doc and from card guides found by search. Treat the tip list as a first draft. `advisor_tip_view` and the answer rate after each tip are the check.

Copy rules that hold: an acknowledgement must not promise the final result ("I'll start with free cards", not "I'll keep it free"), because a later answer can relax a filter. A tip must state only what the app does: the eligibility check sends job type, income and pincode, and no PAN or phone number.

Checked on the iPhone 17 simulator (Expo Go, local BFF on BankKaro UAT, 2026-11-19): the first-card path from the opener to the eligibility result. Seen: every question as a stack; the acknowledgements after the opener, history, need, food type, UPI, the bridge and income; the `payfull` tip after history and the `softcheck` tip before the bridge; no acknowledgement after the pincode because the reveal had a relax note; the closing line. Type check clean, 590 Jest tests pass.

Not checked: the `caps`, `ltf` and `wait` tips on a device (unit tests only), "Not sure" on a device, the other three paths, the tray scroll on a 360 dp screen, 130% font, Android, a screen reader, and the two copy lines changed after the run (text only).

## D29. The card advisor is a chat, with a mascot
2026-11-19 · branch `claude/advisor` (`a6761dd`)

The owner asked for the advisor (D28) as a chat with a small animated card character. The advisor's questions and the cards sit on the left. The user's answers sit on the right. A reply tray at the bottom holds the answer chips or the pincode field. The engine and the config of D28 did not change.

How it works:
- The transcript is derived from the answers (`src/lib/advisor/transcript.ts`). No message list is stored. A message id never changes, so only new messages animate in.
- Only the last reveal carries cards, as a horizontal rail of up to three tiles. Each earlier reveal is one line. So the cards and the next question fit on one screen.
- A tap on one of the user's answers is a rewind: that answer and every later answer go. This replaces the answer pills of D28, where only that one answer was removed.
- The mascot is `CreditCardAdvisorAvatar` ("Swipey"): a credit card with a face, six states, sizes 48 to 300. It is drawn with SVG parts moved by Reanimated views. The body uses `gradients.premium` and the names in `colors.advisorAvatar`. Guide: `card-advisor-avatar.md`.
- The chat sets the mascot state from real events only (`avatarStateFor`): error when the catalogue or the eligibility check fails, thinking while the check runs, success for 2 seconds when cards turn "likely to qualify", speaking while a new advisor message arrives, listening while a question waits, idle otherwise.
- On Android and under reduce motion the mascot shows one still pose for each state, and messages appear with no entrance. This repo keeps Reanimated entrances to iOS.

Builder choices, open for the owner:
- The name "Swipey" shows in the chat header and the greeting.
- A rewind fires no analytics event. No event exists for it.
- No text to speech and no microphone. The app has neither, and one would need a new dependency. `audioLevel` is a plain prop; the mouth runs its own loop without it.

Checked on the iPhone 17 simulator (Expo Go, local BFF on BankKaro UAT, 2026-11-19, after the merge of `Anmol--changes`, `6f1f03c`): the first-card path in the chat from the first question to the eligibility result ("Likely to qualify" on the tile, then the closing line); the card rail and the auto-scroll; a rewind (a tap on the income answer removed it and the pincode, and the income question came back); "I have this" on a rail tile (the card left the rail, the next card moved up, earlier lines did not change); the one-line form of an earlier reveal. The mascot demo, before the merge: idle, listening, speaking, success and error at 48, 96, 160 and 300.

Not checked: the pincode tray above the on-screen keyboard (the simulator used a hardware keyboard, so no keyboard showed), the other three paths in the chat layout, the eligibility error state, saved eligibility details, the thinking state of the mascot, the Apply click-out, Android, a 360 dp screen, 130% font, a screen reader.

## D28. Card advisor: a guided card finder, opened from search
2026-11-19 · branch `claude/advisor`

This entry was written as D27 on the branch. The Home tools league table took D27 on `Anmol--changes` first, so this one is D28. Commit messages before the merge still say D27.

The owner asked for the advisor as a path of its own. It does not replace the Home inline questions and it does not use the card tools. Entry: a row in the search sheet (empty query, or no results) opens the `Advisor` screen. The advisor asks one tap question at a time and shows three cards after the first answer.

How it works:
- The engine runs on the device, on the catalogue the app already loads (`useCards`), plus the eligibility call. It adds no BankKaro route. BankKaro `POST /cardgenius/cards` is not used: seven of its behaviours are not confirmed.
- The state is the answers. Slots, filters, the next question and the cards are derived (`src/lib/advisor/engine.ts`). Questions, options and journey order are one config object (`src/lib/advisor/config.ts`, version 1), bundled with the app.
- Two proof levels: "Matches your answers" (filters) and "Likely to qualify" (only from the eligibility API result, through `classifyCardEligibility`). No savings number: that needs `calculate`, and no reveal waits on it.
- Fee, category, network and first card are hard filters. The UPI habit only moves RuPay cards up. When nothing matches, `closestCards` relaxes the filters and the screen says what was set aside.
- A question option that leaves no card is hidden. A question that cannot change the list is skipped.

Builder choices, open for the owner:
- "Under ₹20,000" is checked as ₹15,000. Every other income band uses its lower end.
- The advisor reads the saved eligibility details and never writes them, because a band is not the real income.
- "See all N cards" expands the list on the advisor screen. Home takes no filters through navigation.
- "I have a card and want a better one" runs at "matches" level only. Savings, lounge and forex are not built.
- "I have this" only removes the card from the list. It does not change the journey, and its event carries no card id (a card the user owns never goes to analytics).
- Not built: typed-query slot filling, "Not for me", the age question, resume on a later day, the cashback-or-points question.

Changed after the first simulator run (2026-11-19): the reason line never repeats the fee (the row always shows the fee line); the reason stays the same after the bridge, job and income answers; the card row is shorter (reward and "I have this" share one footer row); the pincode field turns Devanagari digits into 0 to 9.

Checked on the iPhone 17 simulator (Expo Go, local BFF on BankKaro UAT, 2026-11-19): the search row opens the advisor; the first-card path and the "something specific" path run to the end; the eligibility call returns and cards show "Likely to qualify"; a low income falls back to the cards that fit; a card opens the detail sheet. Seen once and not seen again in two later runs: the advisor went back to its first question after the fifth answer, and the screen then closed. Cause not known.

Not checked: Apply click-out, Android, a 360 dp screen, 130% font, the "better card" and "just exploring" paths, saved eligibility details, the eligibility error state, events in Firebase (the project is still a placeholder).

## D27. The four Home tools share one league table that shows every card with its sum
2026-11-18 to 2026-11-19 · branch `claude/tools-league-table`, merged into `Anmol--changes` (`2b2b958`, `0d358ef`, `ece3c8f`, `26ab260`)

The owner said the four Home tools were "very different" from great.cards, and then said: "leave ranking, we need to improve the 4 tool on home page using this". A teardown of great.cards showed one open league table with four doors. The owner approved the merge on 2026-11-19. All four tools now end on one result screen, `ToolResultsScreen`.

What is locked:
- All four tools end on one result screen that shows the sum for each card.
- Each row shows the sum: savings + milestones (+ lounge) - annual fee. Views: "Quick view" and "By category". Sort chips, find-in-list search, and the filters "Lifetime free" and "Include invite only" sit on top.
- Ranking is not changed. D26 holds.
- Saved spends are one store on the device. Logout clears them. Brand runs are not saved.

What is directional (the builder chose it, the owner has not confirmed it):
- The category starting spends and the even split of one amount are removed. This replaces the part of D25 that signed off those starting spends. The owner did not answer the direct question to reopen D25. The basis is the owner's instruction to follow great.cards.
- The screen lists every card the calculate call returns (219 on UAT), also loss-making, discontinued and invite-only cards. Three constants in `src/lib/cardTools.ts` switch this: `SHOW_CARDS_NOT_IN_APP`, `SHOW_LOSS_MAKING`, `SHOW_DISCONTINUED`. All are true.
- Apply moved from the rows into the breakdown sheet. One constant, `APPLY_ON_ROWS` in `ToolResultsScreen.tsx`, flips it.
- The app lists cards it does not sell. Those rows have no Apply and no card page.
- Beat my card asks for spends first, then the card. The full card list exists only after the calculation.

Costs: the app calls no great.cards endpoint. Brands are still counted by category, except Amazon and Flipkart, because the partner API rejects brand names. For the same spends, great.cards and the partner API on UAT rank cards differently. The cause is not known. Analytics meaning changed (see `screen-flows.md`, "Card tools").

## D26. Ranking is our sum plus the fee waiver and the lounge value
2026-11-18 · branch `claude/rank-waiver-lounge`

The owner approved a mix of our rule and BankKaro's `roi`. Net yearly value = yearly savings + extra benefits + lounge value - annual fee. The annual fee is not counted when the user's yearly spend reaches the card's waiver spend (`annual_fee_spends`). This replaces the sum in D24.

We compute the sum from named fields and do not read `roi`, because BankKaro has not documented it. On the UAT fixtures our number equals `roi` on every row (11 of 11). On two full UAT responses the same formula fits 218 of 219 cards each. The waiver rule is derived from data, not confirmed by BankKaro.

The joining fee is not counted, as in `roi`. Beat my card shows a "Lounge visits" row, shows the fee that is counted, and says when a fee is waived.

## D25. Hero video removed; tool rules signed off
2026-11-18 · branch `claude/remove-hero-video`

The owner said yes to four points on the Home tools (D24):
- The hero video goes: `HeroVideo`, `src/assets/videos/home-hero.mp4` and the `expo-video` dependency and plugin are removed. A build made before this change still carries the native module. The next dev build or prebuild drops it.
- The ranking rule and the starting spend for each category stay as built.
- The brands tile keeps rotating Myntra, Swiggy, Flipkart and Amazon. The note that only Amazon and Flipkart are exact stays on the picker and the results.
- The four tiles get designed icons. Open: the icons are not in the repo yet.

## D24. Home: compact masthead and a row of four card tools
2026-11-18 · branch `claude/home-tools`

This replaces D20. The owner decided the Home banner gave no utility for its size. Home now has a compact masthead (header and search bar, 128 dp plus the top inset, plain brand gradient) and one row of four tool tiles under it. The hero video is no longer used on Home; `HeroVideo`, the clip and `expo-video` stay in the repo until the owner decides to remove them (that needs a new dev build).

The four tools, in order: Best card for a category, Beat my card, Find my ultimate card, Best card for brands. A fifth tile was dropped by the owner. All four read one BankKaro `calculate` call (`src/query/useCardSavings.ts`, `src/lib/cardTools.ts`).

Rules behind the tools:
- Rank by net yearly value: yearly savings + extra benefits - annual fee. BankKaro's `roi` order is not used because it is not documented. The CashKaro apply Reward is one-time and is not in the ranking.
- A card whose net yearly value is 0 or less is never shown as a saving, and has no Apply on the Beat my card result.
- Brands: BankKaro has brand keys only for Amazon and Flipkart. Every other brand is counted in its category, and the picker and the results say so. The Home tile rotates Myntra, Swiggy, Flipkart and Amazon by the owner's choice.
- Calculate rows join to the app's cards by alias, then by id. Rows with no app card are dropped.
- No spend amount and no card the user owns goes to analytics.

Open: the deployed BFF needs the `calculate` route (it is in `bff/src/routes.js`, not deployed yet). The four tile icons are the nearest existing icons, not designed ones. The category starting spends in `TOOL_CATEGORIES` were chosen by the builder, not by data.

## D23. Delete Account is hidden; preview builds set the stage
2026-11-18 · `dc62fda`, `1b2cfa5`

Delete Account is hidden because the screens only simulate deletion (any 4-digit code, "Account deleted", nothing deleted). Show the link again once an account-deletion API exists. The EAS `preview` profile sets `EXPO_PUBLIC_STAGE=prod` and the BFF URL, and a release build with no stage logs a startup config problem. A local release build ignores `eas.json`: set both variables in the shell.

A switch for the money-out routes (withdraw, missing-cashback writes, ticket upload) was built and removed the same day (`6447b74` and its revert): the owner decided it is not needed. Those routes are open on the BFF.

## D22. Rejection shows a reason, 3 alternatives and a page of cards the user can get
2026-11-17 · `5263571`, `ee381e3`, `478be31`

When the eligibility check says no, the sheet shows why, a way to change details, 3 alternatives with different jobs (closest, highest Rewards, lifetime free) and "See all N cards you can get", which opens the "Cards you can get" screen. The reason comes only from the card's own income bar. Otherwise a generic line shows, so a wrong reason never reaches the user. "Continue to Apply" stays on the sheet: a rejection is not a hard stop. Costs: the reason covers income only (employment values are unknown); the flow has no flag and reaches all users; "Edit" does not focus the income field; "See all N" counts cards that have a cross-sell model.

## D21. Cross-sell rail under the tapped Home tile
2026-11-17 · `01ce49c`, `ee381e3`, `2717a36`, `f9c9056`

After a user closes a card without applying, a row of up to 3 alternatives opens under its tile. Each card states its gain against the card the user left. Picks come from all cards, never only the filtered list, and only from cards that pay Rewards with a net that is not negative. One rail per card per session, no limit per session. Flag: `crosssell_rail` (`rail` or `holdout`). PRD (private workspace): `~/Desktop/Professional/mini appas/docs/cross-sell-prd.md`. Costs: the net gate rests on `bk_commission`, which BankKaro has not confirmed. The flag default is `rail` and should be `holdout` before release. The cashback card list is a static snapshot of 30 aliases. Several analytics gaps block a readable 50/50 test (PRD section 8).

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

## D16. Signup asks for the name only; email and password are generated
2026-11-17 [claude] · user request. Partly replaces D15.

`/signupV1` needs `fullname`, `email` and `password`. New numbers now enter a name on the OTP step. The app generates the email (`cardsxtra.<phone>@cashkaro-demo.app`, the format used before D15) and, when the BFF has `SIGNUP_PASSWORD`, one static password for every new account. The BFF sets the password on `/signupV1`, so it is never in the app bundle. Without that variable, the app's random password goes through. Nobody types either. The flow is two steps: phone, then OTP (plus a name for a new number). The page copy was shortened.

- Static password (user choice, 2026-11-17; advised against): a shared password plus a guessable email lets anyone log in as any new user if password login is enabled for our key. The risk stays until the backend disables password login for this key or the password is made random per user (unset `SIGNUP_PASSWORD`).
- Cost: new accounts carry a placeholder email, so email OTP login, password reset and email notices do not reach the user. The domain `cashkaro-demo.app` is not confirmed as CashKaro's. Not tested against the live backend in this session.
- Revisit when: the backend confirms `signupV1` accepts this email, or collects email later (after the first apply or withdrawal).

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
| Cross-sell flag default | `holdout` in code, rail on through Remote Config / `rail` by default | The PM review says `rail` spoils the holdout. The owner decides before release. |
| Which commission field CashKaro earns | `bk_commission` / `commission` | The cross-sell earning gate uses `bk_commission`. Ask BankKaro. |
