# DS-ADD(ds-expansion-1, 2026-11-17): design-system additions manifest

Last updated 2026-11-18: "Used by today" cells for Skeleton, RankedCardRow and QuizStep, and a "Changes after the batch" section at the end of this file.

Batch id: `ds-expansion-1`. Date: 2026-11-17. Source: designer audit (`ds-expansion-designer.md`, sections 3.4 to 3.9, 4.1, 4.2). The user approved new semantic token NAMES that point at existing primitives, for this batch only. No new raw colour, size or font value was added. Nothing here was run on a device.

## (a) Parts

| Part | Layer | File | What it gives | Used by today | Rollback |
|---|---|---|---|---|---|
| StatDelta | atom | `src/atoms/StatDelta.tsx` | A value with a stated direction (icon + word) and an optional reference line. Replaces `CompareStat` (deleted). | CompareCard, DsAdditionsGallery | Delete file + export line in `src/atoms/index.ts` |
| RankBadge | atom | `src/atoms/RankBadge.tsx` | Round rank number. | RankedCardRow, gallery | Delete file + export line |
| StepProgress | atom | `src/atoms/StepProgress.tsx` | Determinate bar with label and "2 of 6"; fill animates with `motion.duration.base`. | QuizStep, gallery | Delete file + export line |
| Skeleton | atom | `src/atoms/Skeleton.tsx` | Generic pulsing block (same pulse as AmountSkeleton, `motion.duration.pulse`). AmountSkeleton / HomeSkeleton not refactored. | EarningsScreen, ToolResultsScreen, BeatMyCardResultScreen, gallery | Delete file + export line |
| GainBand | molecule | `src/molecules/GainBand.tsx` | Flat tone band across the top of a card: icon, amount + caption, or Viewed state. | CompareCard, gallery | Delete file + export lines in `src/molecules/index.ts` |
| CompareCard | molecule | `src/molecules/CompareCard.tsx` | Card for a "compare with another card" row: band, art + name, two StatDelta rows, pressed state + haptic, full screen-reader label. | CrossSellRail (feature), gallery | Delete file + export lines |
| RankedCardRow | molecule | `src/molecules/RankedCardRow.tsx` | One ranked result row: rank, art, name, headline rupee value, reason, eligibility, compare toggle, apply. | ToolResultsScreen, BeatMyCardResultScreen, gallery | Delete file + export lines |
| AmountInput | molecule | `src/molecules/AmountInput.tsx` + `src/lib/amountInput.ts` | Rupee field with live Indian grouping, min / max, period, presets. Not wired into EligibilityCheckerSheet. | gallery | Delete both files, test, export lines |
| BarBreakdown | molecule | `src/molecules/BarBreakdown.tsx` | Ranked horizontal bars, every bar labelled. | gallery | Delete file + export lines |
| StackedBar | molecule | `src/molecules/StackedBar.tsx` | One stacked bar, `spacing[2]` gaps, labelled legend. | gallery | Delete file + export lines |
| QuizStep | organism | `src/organisms/QuizStep.tsx` | One-question-per-screen shell: back, StepProgress, skip, title, body slot, FooterButtons footer. | SpendQuizScreen (not in gallery: needs a full screen) | Delete file + export lines in `src/organisms/index.ts` |
| chartMath (helper) | lib | `src/lib/chartMath.ts` | Width maths for bars, stacked bars, progress. | BarBreakdown, StackedBar, StepProgress | Delete with its users + test |
| DsAdditionsGallery | screen | `src/screens/DsAdditionsGallery.tsx` | One sample of each part for FoundationCheck. | FoundationCheck (`__DEV__` only) | Delete file + the two blocks in FoundationCheck |

## (b) Token additions

| Name | Value (primitive) | File | Used by |
|---|---|---|---|
| `motion.duration.fast` | 120 ms | `src/tokens/motion.ts` (new) | none yet |
| `motion.duration.base` | 220 ms | same | StepProgress |
| `motion.duration.slow` | 320 ms | same | none yet |
| `motion.duration.pulse` | 650 ms | same | Skeleton |
| `motion.easing.standard` | `Easing.inOut(Easing.quad)` (the easing AmountSkeleton uses) | same | StepProgress, Skeleton |
| `colors.data.series1` | `primitives.cobalt[500]` | `src/tokens/colors.ts` | BarBreakdown, StackedBar |
| `colors.data.series2` | `primitives.violet[400]` | same | StackedBar |
| `colors.data.series3` | `primitives.sky[500]` | same | StackedBar |
| `colors.data.positive` | `primitives.fern[500]` | same | StackedBar (series option) |
| `colors.data.negative` | `primitives.ruby[500]` | same | StackedBar (series option), gallery |
| `colors.data.muted` | `primitives.slate[600]` | same | StackedBar (series option) |
| `colors.data.track` | `primitives.cobalt[50]` | same | BarBreakdown, StepProgress |

The primitives are exported from `colors.ts`, so the new names reference them (no hex retyped). Not added: `colors.*.textStrong`, `sizing.railCardW`.

## (c) Existing files edited (each edit is one marked block, insert-only)

| File | Inserted |
|---|---|
| `src/atoms/index.ts` | Exports of StatDelta, RankBadge, StepProgress, Skeleton |
| `src/molecules/index.ts` | Exports of GainBand, CompareCard, RankedCardRow, AmountInput, BarBreakdown, StackedBar |
| `src/organisms/index.ts` | Export of QuizStep |
| `src/tokens/index.ts` | Export of `motion` |
| `src/tokens/colors.ts` | The `data` block inside `colors` |
| `src/screens/FoundationCheck.tsx` | One import, and one JSX section rendering DsAdditionsGallery |

`Chip.tsx` was not touched: the rail keeps its local lens chips and only gained a larger touch target.

## (d) How to roll back

1. Find everything: `grep -rn "DS-ADD(ds-expansion-1" src docs`
2. Order: (1) users of a part first: the CompareCard block in `src/organisms/CrossSellRail.tsx` (a feature file, not marked: switch it back to local markup or remove it) and the gallery (`DsAdditionsGallery.tsx` + its two blocks in `FoundationCheck.tsx`); (2) the parts, with their export blocks; (3) the token blocks (`colors.data`, `motion`) last; (4) this file.
3. The batch is meant to be one git commit of its own, so `git revert <sha>` also works. The cross-sell feature files (`src/lib/crossSell*.ts`, `useCrossSellRail.ts`, `CrossSellRail.tsx`, the Home wiring) are NOT part of this batch and are not marked; revert them separately.

## (e) Not added, and why

- ComparisonTable, CompareTray, Rail, AnimatedAmount, ReasonList, SortSheet: deferred by the brief (later batches).
- Further parts in the report (SummaryEquation, Stepper, SpendSlider, Grid selection limit, FilterMenu refactor): not in this batch.
- `Chip` tinted-surface prop: not needed, the rail keeps local chips.
- External packages: none installed.
- Design-system gaps found: no arrow-up / arrow-down / back glyphs (chevron-down and chevron-right are rotated 180 degrees); no light purple gradient token (bands use flat tones now); `DividerVertical` has a fixed height (the compare card no longer needs a divider); `Chip` has no 44dp touch option.

---

# DS-ADD(ds-figma-1, 2026-11-17): Figma integration manifest (great.cards file Q7235KVU3sU3HOTiibOXhv)

Batch id: `ds-figma-1`. Date: 2026-11-17. The user approved new semantic token names for this work. Nothing here was run on a device.

**Source quality.** Pass 1 (Figma MCP, rate limited) read only `cashback-tag` (1046:2276333); the other parts were built from pictures. Pass 2 (same day) read values from the Figma web Properties panel in a signed-in Chrome tab. The full table of values is in `~/Desktop/Professional/mini appas/data/figma/specs-2026-11-17.md` (factory project). Pass 2 corrected the batch-1 parts and built the missing ones. Style rule: STRUCTURE and METRICS (sizes, padding, gap, radius, border width, type size and weight) come from Figma; COLOUR ROLES come from our tokens (no Figma hex was copied, no SF Pro, our copy says "Rewards").

## (a) Parts

"Values" column: **Figma values** = metrics read from the panel in pass 2. **Pictures** = still built from the overview image or not compared.

| Part | Layer | File | Figma node | New or extends | Values | Rollback |
|---|---|---|---|---|---|---|
| status-tag | atom | `Tag` (`status` prop) | 1042:2257749 (+ 52, 55, 58, 61) | Extends `Tag`. Status block now sets tone colours by role, `xxs` size, dot, radius 8 (Figma 6), hairline border, min height 24, padding 4 / 8, not a pill. Dot layer not read. | Figma values | Delete the `DS-ADD(ds-figma-1)` blocks in `src/atoms/Tag.tsx`; `STATUS_TAG_*` in `src/lib/tagVariants.ts` |
| general-tag | atom | none | 1050:2350315, 1050:2350317 | Covered by `Tag` (Default = `tone="gray" appearance="subtle"`, Category = `tone="info" appearance="subtle"`). Figma Default is a pill (radius full) with padding 4 / 10; Category radius 6, padding 4 / 8, border 1. `Tag` default is radius 4, padH 8: close, not exact. No code. | Figma values (not changed) | none |
| CashbackTag | atom | `src/atoms/CashbackTag.tsx` | 1046:2276333 | New (pass 1, read directly). Not changed in pass 2. The compare hero shows an instance with radius 6, padding 4 / 8, gap 4, border #FCD0BE, fill saffron 40% to 10%: consistent with the sm size here. | Figma values (pass 1) | Delete file + export lines in `src/atoms/index.ts` |
| CardTypeTag | atom | `src/atoms/CardTypeTag.tsx` | 1049:2331850 / 51 / 52 / 53 / 54 / 56 | New. Pass 2: per-placement metrics (table: square, 1 px, 4 / 8, min 20; general: radius 4, hairline, 6 / 8, min 24; on card: left corners 4, right 0). Invite Only General read; 2331855, 57, 58 not read (inferred same). | Figma values | Delete file + export lines |
| tag variant maps | lib | `src/lib/tagVariants.ts` (+ test) | 1042, 1049, 1046 | New helper. Now holds `STATUS_TAG_COLORS`, `STATUS_TAG_STYLE`, `CARD_TYPE_TAG_METRICS`. | Figma values | Delete with its users |
| WalletTag | atom | `src/atoms/WalletTag.tsx` | 1051:2368761 | New (pass 2). Wallet icon in an 18 holder + amount; radius 4, 1 px border, padding 4 / 6, gap 6. | Figma values | Delete file + export line |
| NumberBadge | atom | `src/atoms/NumberBadge.tsx` | 1051:2424099 (dark), 1300:9221 (light) | New (pass 2). 16 round count marker. `RankBadge` is 24 px and link-coloured: different job. | Figma values | Delete file + export line |
| TestimonialSavingsTag | atom | `src/atoms/TestimonialSavingsTag.tsx` | 148:281153 | New (pass 2). Gradient label between two gradient lines (uses `GradientText`). Right line mirrored (inferred). | Figma values (left line, label) | Delete file + export line |
| timer | atom | `Timer` (existing, not changed) | 1051:2405656 | Existing `Timer` matches: radius 4, padding 4 / 8, gap 4, error tone. Differences: Figma fill is the elevated surface (white) with a very light red border; ours is `tones.error.bgSubtle` with `tones.error.border`. `Timer` is in production: not changed. Shown in the gallery for comparison. | Figma values (compared only) | none |
| StepIndicator | atom | `src/atoms/StepIndicator.tsx` | 1196:257899 / 00 / 01 / 02 / 03 / 04, 1201:305694 | New (pass 2). Kinds done, current, locked, info, footprints, cashback, image. Footprints has no shoe glyph (dot instead). | Figma values | Delete file + export line |
| Stepper | molecule | `src/molecules/Stepper.tsx` + `src/lib/stepper.ts` (+ test) | 1202:337539 (milestone); 1967:16054, 1967:16130, 1967:15957 at root only | New (pass 2). Vertical, `currentIndex` gives done / current / locked, per-step `indicator` override for the other kinds. | Figma values (milestone); pictures for the other three kinds | Delete both files, test, export lines |
| CompareTable | molecule | `src/molecules/CompareTable.tsx` + `src/lib/compareTable.ts` (+ test) | 1192:209166, cells 1192:185944..185948 | New (pass 2). Pinned hero column + sideways scrolling value columns, header cells, selected column. Layout (rows = items, columns = attributes) is inferred. | Figma values (cells, root); layout inferred | Delete both files, test, export lines |
| BreakdownTable | molecule | `src/molecules/BreakdownTable.tsx` + `src/lib/breakdownTable.ts` (+ test) | 1179:1156004 (rows=3) | New (pass 1), corrected in pass 2: radius 16, padding / gap, header 12 / 16, type. "Better" word is ours. | Figma values | Delete both files, test, export lines |
| SpendCard | molecule | `src/molecules/SpendCard.tsx` + `src/lib/spendRuler.ts` (+ test) | 1480:1271291 (compact), 1480:1271302 (Large) | New (pass 1), corrected in pass 2: padding, gap, shadow, stepper box, tick pitch 10 / length 8, label every 5th tick, selected chip. New optional `size="large"`. Defaults changed: `step` 500, `labelEvery` 5 (were 250 and 10). Large: plus button, tick sizes and the overlapping image holder not read. | Figma values (compact); Large root, title and stepper box only | Delete both files, test, export lines |
| PodiumCompare | molecule | `src/molecules/PodiumCompare.tsx` + `src/lib/podium.ts` (+ test) | 1481:1963848 (You Win), 1481:1963892 (Equal, root only) | New (pass 1), corrected in pass 2: radius 16, padding top 16, gap 24, bars 128 wide with top radius 12, value type. New optional `onContextPress` (link + edit icon). Previous node id 2029:4455 was wrong. | Figma values | Delete both files, test, export lines |
| BigAmountCard | molecule | `src/molecules/BigAmountCard.tsx` | 1169:1057154 (With Tag) | New (pass 1), corrected in pass 2: radius 16, gap 14, shadow, amount type 28 bold, footer 6 / 16 with top border. Previous node id 2029:4152 was wrong. | Figma values | Delete file + export lines |
| Gallery block | screen | `src/screens/DsAdditionsGallery.tsx` | n/a | Marked blocks: imports and sample sections for the new parts (SpendCard large, WalletTag, NumberBadge, TestimonialSavingsTag, Timer, StepIndicator, Stepper, CompareTable). | n/a | Delete the `DS-ADD(ds-figma-1)` blocks in that file |

## (b) Token table (Figma variable → our token)

Roles, not names: Figma `color/surface/default` (#F2F7FD) is a tinted blue; our `colors.surface.default` is white. Figma `surface/elevated` (#FCFEFF) = our `surface.default`.

| Figma variable | Our token | New or existing |
|---|---|---|
| `color/surface/elevated` (#FCFEFF) | `colors.surface.default` | existing |
| `color/surface/default`, `color/background/elevated` (#F2F7FD), table header, number-input fill, wallet-tag fill | `colors.background.lavender` | existing |
| `color/background/default` (#F5F7FF), bigmoney footer, locked step fill | `colors.background.lavender` | existing |
| `color/border/default` (#C7D1FF) | `colors.border.subtle2` (used for every card, tag and table border) | existing |
| `color/border/subtle` (#E5EBFF), cell borders | `colors.border.subtle2` (cells), `colors.border.subtle3` (dividers inside tables) | existing |
| `color/border/strong` (#A3B0FF), tick major | `colors.border.strong` | existing |
| `color/text/primary / secondary / tertiary / inverse / disabled` | `colors.text.*` (same names) | existing |
| `color/text/link`, `color/action/primary/default` (#0064e0), selected chip, link buttons | `colors.text.link`, `colors.action.accent.default` (per the style rule) | existing |
| `color/feedback/success/*`, `warning/*`, `error/*`, `info/*` (subtle, border, text, default, on-color, hover) | `colors.feedback.<tone>.*` (same shade names) | existing |
| Neutral status fill `color/background/muted` | `colors.background.muted` | existing |
| `color/cashback/default`, `/subtle`, `bg_1` gradient | `colors.cashback.default`, `colors.cashback.tagBorder`, `gradients.saffronFade` | `tagBorder` NEW in pass 1; others existing |
| `color/surface/inverse` (#001C3D) | `colors.surface.inverse` | existing |
| Podium winner bar (green gradient), medal (purple) | `colors.data.positive`, `colors.data.series2` (flat) | existing |
| Card-type tones (Sage, Solar, Neutral gradients) | `colors.tones.success / warning / gray` (flat) | existing |
| Testimonial label gradient (Iris/700 to Azure/600) | `gradients.primary` | existing |
| `border-hairline` 0.6, `thin` 1, `light` 1.2, `medium` 1.5 | `borderWidth.hairline` (0.5), `thin`, `thin`, `thick` | existing |
| `radius/4 / 6 / 8 / 10 / 12 / 16 / 24 / 32 / full` | `radius.xs / sm (6 rounds to 8) / sm / md / lg / xl / 2xl / 3xl / full` | existing |
| `Shadow/onLight/sm` (0, 2, 4, #E5EBFF) | `elevation.light.sm` (blur 8, black): close, not identical | existing |
| `sizes/Icon/N` | `iconSize[N]` or `spacing[N]` (88, 52, 146, 172, 128, 18 are composed from the scale, with a comment) | existing |

No new token was added in pass 2. One token (`colors.cashback.tagBorder`) was added in pass 1. SF Pro was not added.

**Type map (Figma style → nearest Outfit variant).** Mobile/Label/md (Outfit 500 10) → `caption10Medium`; Label/lg (600 12) → `body12SemiBold`; Currency/md (700 16) → `body16Bold`; Currency/3xl (700 28) → `heading28Bold`; Body/md (sf-pro 500 14) → `body14Medium`; Body/sm (500 12) → `body12Medium`; Heading/sm (600 14) → `body14SemiBold`; Heading/lg (600 18) → `heading18SemiBold`; Body/lg (500 16) → `body16Medium`.
**Sizes we do not have (not invented):** 9 px (card-type table label, number-badge count, step text), 11 px (Body/xs: values, subtitles, footers; we use 10 or 12), ExtraBold at 9 / 10 with wide letter spacing (card-type and testimonial labels; we use `caption10SemiBold`), letter spacing steps `tight-1/2/4` and `wide-3/4`.

## (c) Existing files edited (insert-only marked blocks)

| File | Inserted |
|---|---|
| `src/tokens/colors.ts` | `cashback.tagBorder` (pass 1) |
| `src/atoms/Tag.tsx` | import, `status` prop, destructure entry, status block at the top of the function (pass 2 rewrote the block between its markers) |
| `src/atoms/index.ts` | exports of CashbackTag, CardTypeTag (pass 1); WalletTag, NumberBadge, TestimonialSavingsTag, StepIndicator (pass 2) |
| `src/molecules/index.ts` | exports of BreakdownTable, SpendCard, PodiumCompare, BigAmountCard (pass 1); CompareTable, Stepper (pass 2) |
| `src/screens/DsAdditionsGallery.tsx` | imports, `<FigmaBatchGallery />` call, the function (pass 1); pass 2 added a second import block and new sample sections inside the function |

Batch-owned files (rewritten in pass 2, not "existing files"): `CardTypeTag.tsx`, `BreakdownTable.tsx`, `SpendCard.tsx`, `PodiumCompare.tsx`, `BigAmountCard.tsx`, `tagVariants.ts` and its test. `CardTile`, `Timer`, `Timeline`, `ProcessSteps` and `tokenManager.ts` were not touched.

Note: lib files in this batch import `../tokens/spacing` and `../tokens/colors`, not the `../tokens` barrel, because the barrel loads `motion.ts` (reanimated), which jest cannot parse.

## (d) Overlaps to resolve

| Figma part | Overlaps | Recommendation |
|---|---|---|
| BreakdownTable | `CompareCard` stats (StatDelta rows), `BarBreakdown` | Keep BreakdownTable for "your card vs our pick" money lines (design-approved, has a net total). Keep `CompareCard` for the rail. Keep `BarBreakdown` for one card split by category. |
| SpendCard | `AmountInput` | Keep both. `AmountInput` for exact typing. `SpendCard` for coarse picking in steps (default range 0 to 10,000, step 500). |
| status-tag | `StatusBadge` (cashback lifecycle) | Keep both: `StatusBadge` is bound to order status names; `Tag status` is generic. |
| CashbackTag | `CashbackBadge` | Keep both for now. Decide with design which shape wins on card tiles. |
| PodiumCompare | `StackedBar`, `BarBreakdown` | Different job (two values, one winner). Keep. |
| Stepper / StepIndicator | `Timeline`, `ProcessSteps`, `StepProgress` | Compared in pass 2. `Timeline`: 44 px tone circles, 1 px dashed connector, dates, order status. `ProcessSteps`: 44 px orange square tiles, dotted connector, copy + caption. `StepProgress`: a bar, no steps. Stepper: 20 px markers, 4 px solid connector, done / current / locked from one index. Far enough apart to be a new part. Product call: if design wants one stepper, migrate `Timeline` to `StepIndicator` later. |
| WalletTag | `Tag` (icon-left, brand tone) | `Tag` cannot give the 18 px icon holder or 4 / 6 padding. New atom. |
| NumberBadge | `RankBadge` | RankBadge: 24 px, "Rank n". NumberBadge: 16 px count marker. Keep both. |
| timer | `Timer` | Existing `Timer` is the same part. Only the fill and border colour differ (see parts table). |
| general-tag | `Tag` | Same part; metrics differ slightly (see parts table). |

## (e) cc-listing-card (238:300571): what `CardTile` lacks

`CardTile` is NOT changed. Read from Figma: root radius 24, 1 px border, padding 16, gap 18; name Body/md 14; fee titles Label/md 10 tertiary, fee values Label/lg 12; category tags = general-tag Category (26 high); USP rows Body/sm 12 with a "+" bullet; two buttons 48 high, radius 12, padding 14 / 20: outline "Add to compare" with a trailing add icon, filled "View all details". Missing in `CardTile` (from the Figma structure; line-by-line metric comparison with `CardTile` was not done):
- a reward row with brand logos and a `CashbackTag` ("₹1,400 Rewards" with info) next to the name (`CardTile` has a cashback pill);
- a three-column fee strip with an "Eligibility / Check Now" column and vertical dividers (`CardTile` has Joining | Annual only);
- the secondary "Add to compare" button with an add icon next to the primary button (`CardTile` has "Apply Now" only);
- a 24 px corner radius (check `CardTile`'s card radius).

## (f) Not done

- Not read from Figma at all: status-tag dot layer; card-type-tag 1049:2331855, 57, 58 (inferred same as their rows); Equal variant inner layers of beat-my-card-graph; stepper image / cashback-rules / info inner layers (roots only); SpendCard Large plus button, ticks and image holder; hero cell name, image and button inside compare-table; testimonial right line; Info Table, GeneralTable, Detail Page Section Cards, blogCard, WalletActions, Order Details Card.
- Not built: folded corner of the On Card chip; shoe-prints glyph (footprints indicator draws a dot); medal glyph (star icon used); gradient fills (flat tones used everywhere); inner shadows on the cashback and done markers; the overlapping image holder on SpendCard Large and BigAmountCard (slot only in BigAmountCard).
- CompareTable: the inner layout is inferred (see its header). Check rows / columns orientation and the 88 x 88 value cell (ours is as tall as the hero) against the Figma file.
- Nothing was run on a device. Only `tsc` and `jest` ran. No tests of rendered output, no analytics.

## Changes after the batch, 2026-11-18

Made for the Home card tools (D24 to D26). Source: the file headers in `src/`. These edits are outside the two batch commits, so `git revert` of a batch does not undo them.

- `SpendCard` (`ds-figma-1`): new optional `title` (large size; an empty string shows no title) and `unit` (`'rupees'` or `'count'`, no rupee sign). The live value is committed if the card unmounts mid-drag.
- `QuizStep` (`ds-expansion-1`): new optional `onClose`, which adds a close (x) action to the header row.
- `PodiumCompare` (`ds-figma-1`): card art no longer paints over the value (the art overhang is reserved above each bar); no winner is marked when both values are 0 or less.
- `SearchBar` now exports `SEARCH_BAR_H`, read by the compact Home masthead.
- Used by the tool screens (`src/screens/tools/`), from a grep on 2026-11-18: `SpendCard` (SpendQuizScreen, BestForCategoryScreen, BestForBrandsScreen); `PodiumCompare`, `BreakdownTable`, `BigAmountCard` (BeatMyCardResultScreen); `RankedCardRow` (ToolResultsScreen, BeatMyCardResultScreen); `QuizStep` (SpendQuizScreen, which shows `StepProgress` through it). These parts are no longer gallery-only.
