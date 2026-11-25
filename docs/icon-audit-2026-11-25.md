# Icon audit: places that need an icon (2026-11-25)

Scope: Cards.xtra mini app, branch `claude/icon-audit` (same UI as `Anmol--changes`). Read only. Source: code in `src/`, the icon registry `src/atoms/Icon.tsx`, raster marks in `src/assets/icons/raster`, prior audits, and 3 Figma frames (2898:166477, 2898:166460, 3919:40162). The Figma MCP hit its rate limit after that, so all other rows are from code only.

How to read the table:
- Rule numbers: 1 siblings inconsistent, 2 empty icon slot, 3 stand-in or text glyph, 4 status without a visual cue, 5 action without affordance, 6 wrong icon.
- Impact = how often the user sees it x how much the missing cue hurts understanding.
- "Baked" = a `desc-*` / `nav-*` / `social-app-outline` icon. It ignores the `color` prop. Do not pass a colour token.
- Screens that no user can reach today are in "Not worth it" (ProfilePaymentHistory*, ReviewUs / WriteReview, CashbackGuard, Notifications list, `molecules/CardTile.tsx`, `data/partners.ts`).

## Table

| ID | Screen / component (file:line) | Element | Problem (rule) | Proposed icon | Size and colour token | Impact |
|---|---|---|---|---|---|---|
| I01 | Order detail timeline, `src/api/ordersMapper.ts:329` (fallback `src/screens/OrdersDetail.tsx:150`) | "Cashback cancelled" step indicator | 6. `desc-cross` has a baked red stroke (#D41000). The solid error circle is also #d41000, so the X is red on red and does not show. Figma 3919:40162 shows a white X. | `iconName: 'close'` | iconSize[24], colors.icon.inverse (Timeline sets it) | H |
| I02 | `ScreenState` organism, 38 call sites with no `image`. Main ones: `EarningsScreen.tsx:225,232,374,381,388`, `OrdersList.tsx:354,455,465`, `OffersScreen.tsx:533,554,569`, `OffersBrandAmazon.tsx:392,400`, `WithdrawScreen.tsx:318,325,332,344,346`, `MissingCashbackChooseDate.tsx:93`, `MissingCashbackDidYouShop.tsx:205`, `CardsYouCanGetScreen.tsx:287,298,483`, `tools/ToolResultsScreen.tsx:548,568,577,586,595`, `tools/BeatMyCardPickScreen.tsx:294,304,314,364`, `tools/BeatMyCardResultScreen.tsx:270,290,299,335`, `advisor/AdvisorScreen.tsx:437,445`, `advisor/AdvisorResultsScreen.tsx:154,164` | Offline, error and no-results states | 2. Text only. Figma section 27 has illustrations for "Connection lost" 4367:243565, "Something didn't go as planned" 4367:243459, "No matching results" 4367:243584. Only 3 states use `images.screenstate.*`. | DS GAP: export the 3 Figma illustrations into `images.screenstate`. Interim for the Earnings empty filter (`EarningsScreen.tsx:388`): existing illustration `images.screenstate.appOrders` (same as `OrdersList.tsx:473`) | 156 x 156 (ScreenState `ILLUSTRATION`) | H |
| I03 | Home tools row, `src/organisms/ToolsRow.tsx:97,104,111,120` | 4 tool tiles: Best card for category, Beat My Card, Ultimate Card, Best card for brand | 3. Stand-ins: `feat-discount-filled`, `star-filled`, `feat-sparkle-filled`, `cart-filled`. A star does not say "compare my card". STATE.md says designed icons are in the great.cards Figma. | DS GAP: 4 tool icons from great.cards Figma (tintable, #262626 stroke). Keep stand-ins until then. | iconSize[20], colors.tones[tone].text (current) | H |
| I04 | `src/molecules/RankedCardRow.tsx:99` (Advisor results, Beat My Card result) | Eligibility line, 'maybe' state | 6. 'maybe' ("You may get this card") uses the same `check-circle-outline` as 'eligible'. Only colour differs. Card detail uses `desc-exclamation` for "You might qualify" (`CardDetailSheet.tsx:545`). | `name={eligibility === 'eligible' ? 'check-circle-outline' : 'desc-exclamation'}` | iconSize[16]; eligible colors.feedback.success.text; maybe baked (no colour token) | H |
| I05 | `src/organisms/CashbackNotConfirmedSheet.tsx:132` (opens from Withdraw when only pending cashback) | Hero illustration | 3. Emoji "⏱️" placeholder. Figma 2898:166460 shows a stopwatch + cash illustration. | Interim `desc-pending` (hourglass + rupee). DS GAP: export the Figma illustration. | IMAGE_BOX (current), baked | H |
| I06 | `src/molecules/ListRow.tsx:115` (`Chevron`, used by menu-option `:476`, thumbnail-key-chevron `:209`, caption-cta `:435`) | Row chevron on Profile (6 rows), Earnings (3 rows), Get Help rows | 3. Text "›" scaled with font size. It renders thinner and off-centre next to the 24 px SVG menu icons. | `<Icon name="chevron-right" size={size} color={color} />` inside `Chevron` | iconSize[24] (caption-cta iconSize[20]), colors.text.secondary (caption-cta colors.text.link) | M |
| I07 | Apply CTAs: `src/organisms/CardDetailSheet.tsx:2070`, `src/molecules/LeagueCardRow.tsx:204`, `src/molecules/RankedCardRow.tsx:130`, `src/screens/tools/BeatMyCardResultScreen.tsx:479,509`, `src/organisms/SavingsBreakdownSheet.tsx:168` | "Apply Now" / "Apply now" button (goes out to the bank site) | 1 and 5. The Home card tile Apply (`CardFeeStrip.tsx:138`, `:240`) has a trailing chevron. These do not. | `icon="trailing" iconName="chevron-right"` (DS GAP: external-link would be more exact) | Button sets size and colour | M |
| I08 | `src/organisms/OrderCard.tsx:103-104` (Orders list) | Status glyph for confirmed and paid | 6. Confirmed and paid both use `check-circle-outline`. Paid is a different state (money sent). | paid: `wallet-outline` (same as Timeline paid step, `ordersMapper.ts:323`) | iconSize[24], colors.icon.actions | M |
| I09 | `src/screens/OrdersDetail.tsx:249` | Order ID row | 5. No copy affordance. Users need the order ID for a missing-cashback claim. `ListRow caption-value` has no trailing slot, so this needs a small row change and a copy handler. | `copy-outline` trailing, tappable | iconSize[16], colors.text.link (as `StoreOfferDetails` coupon copy) | M |
| I10 | `src/screens/withdraw/useOfflineSubmitGuard.tsx:61` (UPI, Amazon, Flipkart withdraw) | Offline warning Toast | 2. No tone icon. Other app Toasts pass `check-circle-filled` (`ReviewUsScreen.tsx:306`, `BeatMyCardPickScreen.tsx:273`). | `icon="desc-exclamation"` (DS GAP: wifi-off) | iconSize[20] (Toast), baked | M |
| I11 | InlineMessage with no `icon`: `tools/BestForBrandsScreen.tsx:178` (info), `:272` (warning); `tools/BestForCategoryScreen.tsx:165` (warning); `tools/SpendQuizScreen.tsx:189` (info), `:209` (warning); `advisor/AdvisorResultsScreen.tsx:211` (info); `advisor/AdvisorScreen.tsx:380` (warning) | Validation and info notes in the tools and advisor | 1 and 2. Eligibility sheets pass a tone icon to every InlineMessage. These pass none. | warning: `icon="desc-exclamation"`. info: DS GAP info-circle (see I20) | iconSize[24] (InlineMessage), baked | M |
| I12 | Form error hints with no `hintIcon`: `withdraw/WithdrawEnterUPI.tsx:124`, `withdraw/WithdrawAmazon.tsx:166`, `withdraw/WithdrawFlipkart.tsx:147,160`, `molecules/AmountInput.tsx:55`, `organisms/EligibilityCheckerSheet.tsx:509`, `withdraw/WithdrawVerifyOTP.tsx:294`, `auth/LoginSheetProvider.tsx:525` | Error hint under the field | 2 and 4. Error is shown by red text only. Input and OtpInput have a `hintIcon` slot. | DS GAP: tintable alert-circle. `desc-exclamation` is orange and `desc-cross` is a red X; neither reads as a field error. | iconSize[16], hint colour (Input sets it) | M |
| I13 | Back arrow drawn inline: `organisms/Header.tsx:159`, `organisms/MastheadHeader.tsx:243`, `organisms/MissingCashbackMasthead.tsx:83`, `screens/GetHelpScreen.tsx:214`, `screens/advisor/AdvisorChatHeader.tsx:72`, `molecules/SearchBar.tsx:451`; rotated `chevron-right` at `screens/tools/SpendQuizScreen.tsx:149` | Back control on almost every stack screen | 3. Six copies of a hand-drawn path plus one rotated chevron. Stroke and size differ (Header 32, others 24). | DS GAP: `arrow-left` (tintable). Then one `<Icon name="arrow-left">` in each file. | iconSize[24], colors.text.primary / icon colour of the host | M |
| I14 | Orders and Earnings chevrons drawn inline: `organisms/OrderRow.tsx:210`, `organisms/OrderCard.tsx:186`, `screens/OrdersList.tsx:409` | Row and banner chevrons | 3. Comments say "no chevron-right in registry". It is registered now. | `chevron-right` | OrderRow iconSize[24] colors.icon.actions; OrderCard iconSize[20] colors.icon.actions; OrdersList iconSize[24] colors.text.inverse | M |
| I15 | Missing-cashback and withdraw chevrons drawn inline: `molecules/TrackMoreBanner.tsx:75`, `screens/MissingCashbackDidYouShop.tsx:93`, `screens/MissingCashbackTrack.tsx:166`, `screens/withdraw/methodRow.tsx:203` | Banner, link and method-row chevrons | 3. Same as I14. | `chevron-right` | TrackMoreBanner / Track iconSize[20] colors.icon.inverse; DidYouShop iconSize[20] colors.text.link; methodRow iconSize[24] colors.text.secondary | M |
| I16 | Masthead chevrons drawn inline: `organisms/Masthead.tsx:498`, `organisms/EligibilityMasthead.tsx:682,878` | Earnings / eligibility masthead link chevron | 3. Same as I14. | `chevron-right` | iconSize[16], colors.text.inverse / colors.icon.inverse | M |
| I17 | `src/screens/MissingCashbackTicketSuccess.tsx:37-55` | Success page after a claim ticket | 1 and 2. No result icon. The sibling result page draws a 72 px tinted circle with an icon (`MissingCashbackResult.tsx:95`). | `check-circle-outline` in the same 72 px circle, success tone | 36 px glyph, colors.feedback.success.default on colors.feedback.success.subtle | M |
| I18 | `src/screens/MissingCashbackTicketSuccess.tsx:54` | "Learn More →" link | 3 and 1. Text arrow. The same link on Oops is a Button with a chevron (`MissingCashbackOops.tsx:76`). | `Button variant="link" icon="trailing" iconName="chevron-right"` | Button sets size and colour | M |
| I19 | `src/screens/MissingCashbackInvoiceUpload.tsx:275` | Remove-file button on an uploaded invoice | 3. Text "✕" in a 22 px dark circle. | `close` | iconSize[12], colors.text.inverse | M |
| I20 | Info icons: `organisms/Masthead.tsx:582,763` (Earnings masthead tooltip), `screens/WithdrawScreen.tsx:131` (method tooltip, `withdraw/methodRow.tsx:36`), `atoms/InfoCircleGlyph.tsx` | Info-circle triggers for tooltips | 3. Three inline info-circle drawings. The atom cannot be passed to icon slots (InlineMessage, Toast, Tag take an IconName). | DS GAP: register `info-circle-outline` (tintable) from `atoms/InfoCircleGlyph.tsx` path. This also unblocks I11 info notes and I27. | iconSize[16] / 18 (current), host colour | M |
| I21 | `src/screens/tools/BestForCategoryScreen.tsx:184` | 10 category tiles ("Choose the categories you spend on") | 1. Brand tiles in BestForBrands show a logo in `Choice leading` (`BestForBrandsScreen.tsx:192`). Category tiles show text only. | `leading={<Icon …/>}`: shopping `cart-outline`, fuel `feat-fuel-outline`, dining `feat-dining-outline`, food `feat-dining-outline`, travel `feat-travel-outline`, bills `feat-mobile-recharge-outline`. DS GAP: groceries, insurance, rent, education. | iconSize[24], colors.icon.features | M |
| I22 | `src/molecules/SearchBar.tsx:441,443` (search), `:513` (clear), `:337` (result chevron) | Offers and Home search bar | 3. Hand-drawn search, close and chevron glyphs. All three exist in the registry. | `search-outline`, `close`, `chevron-right` | iconSize[20]; colors.icon.disabled / colors.icon.actions / colors.icon.brand (current) | M |
| I23 | `src/api/ordersMapper.ts:263` (`STEP_PLACED_ICON`; fallback `OrdersDetail.tsx:105`) | "Order placed" timeline step | 6. Uses `cart-filled`. Figma 3919:40162 shows an outline cart. | `cart-outline` | iconSize[24], tone.solid (soft step) | L |
| I24 | `src/molecules/Toast.tsx:119` | Toast dismiss | 3. Text "×" (comment says no X icon ships; `close` is registered now). | `close` | iconSize[16], tone.text | L |
| I25 | `src/organisms/Header.tsx:169` (used by `WithdrawSuccess.tsx:140`, `AccountDeletedScreen.tsx:93`), `src/organisms/StoreCashbackDetails.tsx:410` | Close control | 3. Hand-drawn close glyph. | `close` | Header iconSize[24] host colour; StoreCashbackDetails iconSize[12] colors.text.primary | L |
| I26 | `src/screens/MissingCashbackResult.tsx:34-74` (`ResultGlyph`) | Result icon: tracked / tracking / queued | 3. Hand-drawn check, clock and info. | tracked `check-outline`, tracking `clock-outline`, queued DS GAP info-circle (I20) | 36 px, tone colour (current) | L |
| I27 | Forward arrows drawn inline: `molecules/HelpTicketCard.tsx:313`, `screens/MissingCashbackNewUserCheck.tsx:133`, `organisms/Grid.tsx:971`, `organisms/HowToGetOfferCard.tsx:118`, `organisms/StoreCashbackDetails.tsx:268` | "Add Details", "Learn More", "How to get this offer" link arrows | 3. Hand-drawn arrow. Other link CTAs use `chevron-right`. | DS GAP: `arrow-right`. Interim `chevron-right` | iconSize[12]-[20], colors.text.link / colors.icon.brand (current) | L |
| I28 | `src/screens/EarningsScreen.tsx:435`; `src/organisms/Carousels.tsx:842` (Home and store page "View all") | "View all orders", "View all" links | 5. Text only. Other "go" links carry a chevron (Oops Learn More, CardFeeStrip). | `icon="trailing" iconName="chevron-right"` on the Button; `<Icon name="chevron-right">` after the Carousels text | Button sets it; Carousels iconSize[16] colors.action.accent.default | L |
| I29 | `src/screens/withdraw/methodRow.tsx:57` (`GiftCardGlyph`, used at `WithdrawScreen.tsx:261,281`) | Amazon / Flipkart gift card method mark | 3. Composed by hand from two PNGs. The same combined mark ships as a raster icon and is unused. | `pay-combined` (raster) | mediaSize[32] (as other method icons) | L |
| I30 | `src/screens/tools/ToolResultsScreen.tsx:484` | "Find my card" chip next to "Search" chip | 1. "Search" has `search-outline`; "Find my card" has no icon. `nav-cards-outline` bakes a white stroke, so it is not usable here. | DS GAP: tintable card icon | iconSize per Chip size 32 | L |
| I31 | `src/screens/advisor/AdvisorResultsScreen.tsx:67` | "Likely to qualify" Tag | 1 and 4. The same fact in RankedCardRow has a check icon. The Tag has text only. | `icon="icon-left" iconName="check-circle-outline"` | Tag xs icon size, success tone | L |
| I32 | `src/organisms/MastheadHeader.tsx:142` (`ShareGlyph`, used by `OffersBrandAmazon.tsx:570`, `CardDetailSheet.tsx:1958`, `CardDetailScreenAndroid.tsx:895`) | Share button | 3. Hand-drawn share glyph. | DS GAP: `share-outline` | 24 px, host colour | L |
| I33 | `src/organisms/OrdersFilterMenu.tsx:232` (`CalendarGlyph`); `src/screens/MissingCashbackInvoiceUpload.tsx:221` (`PlusGlyph`) | Date filter calendar; "add invoice" plus | 3. Hand-drawn glyphs. | DS GAP: `calendar-outline`, `plus` | iconSize[16] / current, current colours | L |
| I34 | `src/screens/DeleteAccountScreen.tsx:109` | Delete-account hero | 3. Emoji "🥺" placeholder (GAP_AUDIT, Figma 3396:28372). | DS GAP: export the Figma illustration | EMOJI_SIZE box | L |

Counts: H 5, M 17, L 12 (34 rows).

## Not worth it (long tail)

- `molecules/InlineMessage.tsx:147` "×" dismiss: no app call site passes `onDismiss`.
- `atoms/Tag.tsx:220` `XCloseGlyph` and `atoms/Badge.tsx:176` (`desc-cross` with `color={fg}`, baked red): no app call site uses Tag close or Badge close.
- `molecules/StripAlert.tsx:150` chevron: app uses `layout="center"` only (`FooterButtons.tsx:167`), so the chevron never renders.
- `organisms/MastheadHeader.tsx:247` close glyph: no app call site uses `leading="close"`.
- `organisms/CashbackPip.tsx:374`, `organisms/NeverMissCashbackNudge.tsx:107` "✕", `screens/CashbackGuardScreen.tsx:257,330` "✓": hidden (`SHOW_CASHBACK_GUARD`, `SHOW_NEVER_MISS_CASHBACK`, `SHOW_NEVER_MISS_CASHBACK_NUDGE` are false).
- `screens/ProfilePaymentHistory.tsx:142` chevron-down glyph and `:157` InlineMessage with no info icon; `ProfilePaymentHistoryDetails.tsx:144,171`: unreachable (Profile row hidden).
- `screens/NotificationsScreen.tsx:172` empty state: list is always empty today.
- `molecules/CardTile.tsx:343` Apply with no chevron: the app imports `organisms/CardTile`.
- `data/partners.ts:7-28` emoji logos: no importer.
- `screens/AllCardBenefitsScreen.tsx:41` `StarSixGlyph`: matches Figma "Star 6"; `feat-sparkle-filled` is a different shape.
- `OrderCard.tsx:105-106` expired uses the same `desc-cross` as cancelled, and its baked red differs from the grey siblings: see open question 3.
- `HomeScreen.tsx:1342,1358` search chip `leadingIcon="wallet-outline"` for a card: hidden because `leadingImage` wins (`Chip.tsx:412`).
- `ListRow` bullet-point uses `feat-dot-filled` for Figma `feat-listing-point` (`CardDetailSheet.tsx:357`): close match, already flagged in code.

## Icons that exist but are unused

41 registry names have no live call site (comments, stories, `FoundationCheck` and `DsAdditionsGallery` excluded). The brief said about 19; the real count is higher because all `*-filled` feature icons and most `desc-*` icons are unused.

| Name | Row that would use it |
|---|---|
| `cart-outline` | I21, I23 |
| `desc-exclamation` (used 4x, but not where needed) | I04, I10, I11 |
| `desc-pending` | I05 |
| `pay-combined` (raster) | I29 |
| `desc-approve`, `desc-right`, `desc-confirm`, `desc-confirmed`, `desc-paid`, `desc-timeline`, `desc-cart`, `desc-missingcashback`, `desc-withdraw`, `desc-cashback`, `desc-rewards`, `desc-replacement` | no place today; candidates if design wants status glyphs (open question 3) |
| `feat-daily-outline` | no place (candidate for a tool icon, I03, only if design picks it) |
| `filter-sliders` | no place (Home and Orders use `filter-outline` / `filter-filled`) |
| `phone-off-outline`, `phone-off-filled` | no place (Get Help "Unable to Login?" moved to `help-user-off-outline` per Figma 3632:194976) |
| `social-app-outline` | no place (baked app logo; Get Help uses `images.help.appLogo`) |
| `social-facebook-outline`, `social-instagram-outline`, `social-whatsapp-outline` | no place (ShareSheet uses the filled set) |
| `nav-cards-outline`, `nav-cards-filled` | no place (no Cards tab; baked white, unusable on light surfaces) |
| `pay-amazon`, `pay-flipkart` (raster) | no place: byte-identical duplicates of `amazon`, `flipkart` |
| `feat-*-filled` (bank, celebration, dining, fuel, lounge, mobile-recharge, rewards, savings, travel) | no place (selected states use outline) |
| `bell-filled`, `clipboard-search-filled`, `copy-filled`, `headset-filled`, `message-filled` | no place (no selected state needs them) |

## DS gaps (icons we need but do not have)

1. `arrow-left` back arrow (I13). Highest reach: every stack screen.
2. `info-circle-outline`, tintable (I11, I20, I26). The path exists in `atoms/InfoCircleGlyph.tsx`; it only needs a registry entry.
3. Tintable `alert-circle` for field errors (I12) and offline/warning tone (I10).
4. Four Home tool icons from the great.cards Figma (I03).
5. ScreenState illustrations: connection lost, something went wrong, no results (I02); stopwatch + cash (I05); delete account (I34).
6. `arrow-right` (I27), `share-outline` (I32), `calendar-outline` and `plus` (I33), a tintable card icon (I30), `external-link` (I07), category icons for groceries, insurance, rent, education (I21).

## Open questions for design

1. Apply CTAs (I07): chevron to match the card tile, or a new external-link icon because the user leaves the app?
2. Does Figma show an icon in the Input error hint (I12)? If not, keep text-only and drop I12.
3. OrderCard status glyphs (I08): should paid be a wallet, and should expired differ from cancelled? Should these use the baked `desc-*` set (desc-pending, desc-confirm, desc-paid) instead of outline icons? StatusBadge in Figma 2898:166477 is dot plus label only, so this is a design call.
4. Order ID copy (I09): is a copy action wanted on Order detail? It adds behaviour, not only an icon.
5. HelpTicketCard: "tracked", "in-review" and "under-review" tickets show no status tag, while "NEED DETAILS" and "NOT TRACKED" do (`HelpTicketCard.tsx:215,235`). Add a tag with an icon for each state?
6. Get Help tiles "Payment related" and "Unable to Login?" (`GetHelpScreen.tsx:130-131`) start a phone call with no phone cue. Add `phone-outline` as a trailing hint?

## Status (2026-11-25 [claude])

Done on branch `claude/icon-audit` (commits 90e162c shared components, 24621d7 screens), with registry icons only:
I01, I04, I05 (interim `desc-pending`), I06, I07, I08, I10, I11 (warning tone only), I12, I14, I15, I16, I17, I18, I19, I21 (6 of 10 categories), I22, I23, I24, I25, I26 (tracked, tracking), I28, I29, I31.

Not done:
- I09 copy icon on Order ID: needs a copy action and the `expo-clipboard` dependency. A copy icon with no action would mislead.
- DS GAP rows, waiting for icon or illustration exports from Figma (the Figma MCP hit its rate limit): I02 ScreenState illustrations, I03 four Home tool icons, I13 `arrow-left`, I20 `info-circle-outline`, I21 groceries/insurance/rent/education, I27 `arrow-right`, I30 tintable card, I32 `share-outline`, I33 `calendar-outline` and `plus`, I34 delete-account illustration, I11 info-tone icon, I26 queued state.

Checked: `tsc` clean, Jest 71 suites 990 tests. Seen in Storybook: Profile menu chevrons, Orders chevrons. Not checked on a device.
