# Figma reconciliation — RECONCILED against live design (2026-06-03)

These screens/components were originally built from the written spec while the hosted Figma MCP
was quota-blocked. They have now been reconciled **live** against the design file via the local
Figma Dev Mode MCP (`figma-local`, SSE `http://127.0.0.1:3845/sse`).

**File:** `P7UcoZYBnfyefmJIA8wcM7`

Legend: ✅ confirmed (matched Figma, no change) · ✏️ fixed (code changed to match Figma) ·
🚩 still-open (needs a human decision — asset export, token addition, or icon registration).

Each source file's header comment carries the same per-flag verdicts. `npx tsc --noEmit` passes
clean project-wide after the reconcile.

## Components
- **OrderRow** — `src/organisms/OrderRow.tsx` — nodes 4049:131984/132059/132186/132129
  - ✅ right-col width 208 (Figma-confirmed literal) · ✅ status=pill, tag=xs/pill · ✅ no inline ₹amount in row 1 (chevron only; referral row has no chevron) · ✅ inline chevron matches 24px Action glyph
  - ✏️ amount label/value weight: Figma `sectionTitle` is **ExtraBold**, not Bold → `body16Bold` changed to `heading16ExtraBold`
  - 🚩 `heading16ExtraBold` carries letterSpacing 0.4 vs Figma 0 — no zero-tracking ExtraBold/16 token exists (kept token).

- **Timeline** — `src/organisms/Timeline.tsx` — nodes 3919:40713 (paid), 3919:40162 (cancelled)
  - ✅ tone hexes match variable defs (success/error/text/icon) · ✅ dashed connector (1px, text.secondary, 80px) · ✅ icons are caller-supplied (component is icon-agnostic) · ✅ step copy/dates are caller-owned (live copy recorded; corrected in OrdersDetail)
  - 🚩 `warning` tone absent from both states → unverifiable, left for generic reuse · 🚩 Figma step-2 `right-circle` is unregistered (call sites use `check-circle-outline`).

- **Masthead** cashback-status — `src/organisms/Masthead.tsx` — node 3983:42533
  - Finding: Figma ships ONLY the **Pending** masthead frame; per-status washes are keyed off each status's badge tone family.
  - ✅ pending→warning.subtle · ✅ cancelled→error.subtle (ruby) · ✅ confirmed→success.subtle (fern) · ✅ amount ₹1900.9 / sub-copy / badge label
  - ✏️ **paid**: badge is **cobalt**, not green → bg changed to `feedback.info.subtle` · ✏️ **delayed**: badge is **saffron**, not amber → bg changed to `cashback.subtle`
  - 🚩 `requested` (violet) / `expired` (slate) have no `feedback.*.subtle` token → amber fallback kept (unused by orders/detail).

- **PaymentRecordCard** — `src/molecules/PaymentRecordCard.tsx` — node 3416:62137 (List card; brief's 62046 was the inline-message node)
  - ✏️ card border `borderWidth.thin` (1px) → **`borderWidth.hairline`** (0.5px) to match Figma `Border/hairline`
  - ✅ surface/radius.xl/padding/gap/divider/typography all match
  - 🚩 Figma node is a generic shared **"List"** component → recommend promoting this to a reusable `List` molecule (not renamed this pass). Live List has no trailing Info/View row — that path is an additive extension, kept.

- **SelectMonthSheet** — `src/organisms/SelectMonthSheet.tsx` — node 3416:63963
  - ✅ layout/handle/title/radio rows/selected-state all match (accent #0741ef = `action.accent.default`)
  - ✏️ **onSelect wired** end-to-end (additive optional props): `BottomSheetBody` gained optional `selectedIndex`/`onSelect` (other templates untouched); `SelectMonthSheet` now `forwardRef` with `options`/`value`/`onChange`. Caller `ProfilePaymentHistory` updated to drive it (also resolved that screen's stale month label).

## Screens
- **OrdersList** — `src/screens/OrdersList.tsx` — node 4049:131896
  - ✏️ Check-Status card: added border + XS shadow; top line → text.primary; "Check Status" is grey 12px, **not a blue link** · ✏️ filter control is **plain "Filter" text**, not a chip (removed Chip + toggle state) · ✏️ instruction band: full-bleed, Section-Orange tint, 12px · ✏️ header title "Orders" → "My Order Details"
  - ✅ inline `filter_alt` glyph (16px, unregistered) · ✅ referral/bonus use the CK dark logo (correct, not a placeholder) · ✅ hidden cntr 131907 is a design artifact — correctly not rendered
  - 🚩 no token for card bg #f7f9ff (used `background.muted`) or band #fff5ed (used `background.emphasis`) — near-identical nearest tokens kept.

- **OrdersDetail** — `src/screens/OrdersDetail.tsx` — node 3834:51156 + states 40017/40150/40310/40701
  - ✏️ order-summary is a **flat divider list** (not a card): Order Amount ₹569.5 / Order ID MYN-9876543210 / Transaction Date 20-12-2023, labels no-colon · ✏️ help card is static: heading "Note", accent "Need Help" button (width 124 ✅ real) · ✏️ timeline step titles/dates corrected (Sep 19,2025; "Confirmation  Pending") · ✏️ section title → "Your Cashback Journey" · ✏️ masthead demo data → TATA 1mg, ₹1900.9, delayed "Now Expected by Dec 30, 2025"
  - 🚩 delayed step indicator is orange info-circle (Timeline tones lack orange → used warning/amber) · 🚩 `right-circle` / `gethelp` icons unregistered → substituted `check-circle-outline` / `headset-outline`.

- **ProfilePaymentHistory** — `src/screens/ProfilePaymentHistory.tsx` — node 3396:51078
  - ✅ title: Figma reads "Personal Detailz" (placeholder/typo) → kept correct "Payment History" · ✅ month dynamic
  - ✏️ row values corrected (Request ID 1603798 / Date Paid 09-02-22 / Payment Mode "Amazon Pay  Balance" / Amount ₹80.80 / Reference 303312797342) · ✏️ inline message → **sky** tone (was info), real copy + "Important Information" title
  - 🚩 inline-message leading info-circle icon not rendered — no `info-circle` in registry and `InlineMessage.icon` takes an `IconName` (can't pass the `InfoCircleGlyph` atom).

- **ProfilePaymentHistoryDetails** — `src/screens/ProfilePaymentHistoryDetails.ts` — node 3396:51408
  - ✅ CTA: standalone Button (3396:51425 = "Save Changes") is a foreign artifact, correctly excluded; pinned footer is the real CTA
  - ✏️ footer is a **dual-outline accent row** "Download Excel" / "Download PDF" (was single "Done") · ✏️ inline message → **sky** tone + exact copy · ✏️ all 4 cards' rows corrected (Order Date / Details / Type / Cashback Amount) · ✏️ header title → "Request ID: 1818554"
  - Note: footer onPrimary/onSecondary are no-op stubs — wire real Excel/PDF export when available.

- **ProfilePaymentHistoryEmpty** — `src/screens/ProfilePaymentHistoryEmpty.tsx` — node 3416:62381
  - ✏️ copy split into two centered paragraphs per Figma (no trailing punctuation): "You have not requested any payment yet, hence no Payment History exists" / "Please check back after some time"
  - 🚩 **GATE (open)**: illustration node 3629:174357 is a CK-Blue receipt/bill SVG (132×128). No matching asset in the repo. A clean token-bound placeholder box (exact footprint) is rendered — **no broken ref**. Needs: export 3629:174357 → `src/assets`, register (suggested `images.screenState.noPaymentHistory`), swap the placeholder.
  - 🚩 recommend a reusable `ScreenState` (illustration + title + subtitle) component for this + other no-data screens (not built).

## Open items needing a human decision
1. **Asset export** — receipt empty-state illustration (node 3629:174357) for ProfilePaymentHistoryEmpty.
2. **Icon registration** — `right-circle`, `gethelp`/headset, `info-circle` (currently substituted/omitted).
3. **Token additions** (optional, pixel-exact) — section tints #f7f9ff / #fff5ed; per-status `feedback.*.subtle` for paid/delayed/requested/expired; a zero-tracking ExtraBold/16 type token.
4. **Component refactors** (recommended) — promote PaymentRecordCard → generic `List`; add a `ScreenState` molecule.
5. **Handlers** — Download Excel/PDF stubs in ProfilePaymentHistoryDetails.

## Routes
All wired in `src/navigation/types.ts` + `src/navigation/RootNavigator.tsx`.
