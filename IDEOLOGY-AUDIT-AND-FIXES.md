# Code Health Report & Fix List
### How well our app follows its own rules — and what to clean up

*Audit date: 4 June 2026 · Whole codebase scanned (≈150 files) by 30 review passes, every finding double-checked against the actual source code.*

---

## The verdict (read this first)

**Our code is strong. It genuinely follows the rules we set for it.**

Think of our "ideology" as five house rules (explained below). We checked every file against them. The result: **8–9 out of 10 across the board.** The vast majority of files are clean. The problems we found are few, small, and — most importantly — they cluster into a handful of root causes we can fix once and benefit from everywhere.

Nothing here is a fire. There is no broken screen, no wrong brand colour shipped, no fake data. This is a "tidy the workshop" list, not a "rebuild the house" list.

### Scorecard

| Part of the app | Score | In plain words |
|---|---|---|
| **Atoms** (smallest pieces: buttons, text, icons) | 9/10 | Cleanest part of the whole app |
| **Molecules** (small combos: search bar, card tile) | 9/10 | Almost perfect |
| **Organisms** (big sections: headers, pop-up sheets) | 8/10 | Strong; a few "invented colours" in fancy hero areas |
| **Screens** (full pages) | 8/10 | Strong; mostly small size shortcuts |
| **The master lists** (colours, sizes, fonts) | 8/10 | Excellent foundation; one duplicate file |
| **Behind-the-scenes data** (API, lists) | 8/10 | Realistic data, no broken images; some copy-pasted helpers |

**Total issues found: 86.** Of those, **49 are tiny** (cosmetic shortcuts), 22 are medium, and 15 are worth prioritising. Only 2 things the reviewers initially flagged turned out to be false alarms — so the list you're reading is trustworthy.

---

## What "our ideology" actually means (for non-designers)

We have **five house rules**. Everything below is just "did we follow these?"

1. **Don't make things up.** Every colour, size, and spacing must come from a real design decision — never a guess.
2. **Use the master list, never type values by hand.** We keep central lists of approved colours, sizes, and fonts ("tokens"). A component must always *pick from the list* — never type `#ff6d1d` or `16 pixels` directly into its own code. (Why: change the list once, the whole app updates. Type values by hand, and you'd have to hunt through hundreds of files to change anything.)
3. **Reuse, never rebuild.** If a button already exists, use it. Never build a second one.
4. **Match the source of truth.** The app must match the Figma design and look right on a real phone.
5. **Rebuild cleanly, don't patch.** When something's wrong, rebuild that one piece properly instead of taping over it.

One extra detail about rule #2: our master colour list has **two layers** — a "raw paint cans" layer (every literal colour) and a "labelled by purpose" layer (e.g. *button colour*, *link colour*). Components are only allowed to use the **labelled** layer. Reaching into the raw paint cans directly is against the rules — even though it's still technically "from the list."

---

## What we're doing really well (so it's not all problems)

- **Colours are disciplined.** Almost no file types a colour by hand. Nearly everything pulls from the labelled list.
- **Fonts are perfect.** Every piece of text uses a named, approved text style. Nobody is hand-setting font sizes.
- **We don't make things up.** Files carry notes linking back to the exact Figma design, with the design values written down. Sample data is realistic (real Indian banks, real rupee amounts). No broken images anywhere.
- **Reuse is real.** The big store/offer pages are genuinely assembled from existing pieces, not rebuilt. The pop-up sheets share one engine.
- **Naming is clean.** Files are named for *what they are*, not where they sit. No "version 2" leftovers, no messy names.

This is exactly what the ideology is supposed to produce. The fixes below are about closing the last gaps.

---

## The fixes you need — in priority order

> **How to read each fix:** 🔴 = do first (helps most) · 🟡 = medium · ⚪ = nice-to-have.
> "Effort" is rough developer time. File names are clickable.

---

### 🔴 FIX 1 — Add the missing entries to our master lists
**This is the single highest-value fix. Do it first.**

**The problem in plain words:** A few components needed a colour or shadow that *wasn't on the master list yet* — specifically see-through colours (for shiny "glare" effects on cards), and certain shadow recipes. Because the right entry didn't exist, the components **improvised** and typed the value by hand. They're not being sloppy — they reached for a tool that wasn't in the box.

**Why it matters most:** This is the foundation that all 20–30 future apps will share. Add these missing entries **once**, and roughly ten of our bigger problems vanish at the source — *and* every future app gets them for free. Skip it, and every new app hits the same wall and improvises all over again.

**What to do:** Add to the master lists (`src/tokens`): the missing see-through colour steps, a few named "glare / overlay / shimmer" gradient entries, and the missing shadow recipes.

**Effort:** ~1–2 hours, one-time.

---

### 🔴 FIX 2 — Delete the leftover old building blocks
**The second highest-value fix, especially for the multi-app plan.**

**The problem in plain words:** When we rebuilt a few pieces to be better, the *old versions were left behind* — still sitting in the codebase, still exported. They're not used by the live app, but they're confusing clutter. Imagine keeping the old broken kettle next to the new one: someone will eventually grab the wrong one.

**Why it matters:** Every future app inherits this library. A developer (or a future me) browsing the parts shelf will see *two* "CardTile" building blocks and might pick the dead one. Cheap to delete now; 30 apps' worth of confusion if left.

**What to delete (all confirmed unused by the live app):**
- [src/molecules/CardTile.tsx](src/molecules/CardTile.tsx) — old card; replaced by the newer [src/organisms/CardTile.tsx](src/organisms/CardTile.tsx). *(Keep the data definitions inside it — those are still used. A developer should move them to a neutral file, then delete the old card itself.)*
- [src/atoms/Badge.tsx](src/atoms/Badge.tsx) — replaced by the more capable `Tag`.
- [src/atoms/OtpBox.tsx](src/atoms/OtpBox.tsx) — replaced by `OtpInput`.
- [src/screens/LoginScreen.tsx](src/screens/LoginScreen.tsx) and [src/screens/OtpScreen.tsx](src/screens/OtpScreen.tsx) — old login pages you can't actually reach anymore; the real login is the pop-up sheet on the Onboarding screen.

**Also fix these "rebuilt instead of reused" spots:**
- [OrdersDetail.tsx](src/screens/OrdersDetail.tsx#L248) builds its own divider line instead of using our `Divider` piece (twice).
- [WithdrawTerms.tsx](src/screens/withdraw/WithdrawTerms.tsx#L49) builds its own bullet list instead of using our `DiscBulletList`.
- [methodRow.tsx](src/screens/withdraw/methodRow.tsx#L35) builds its own info icon instead of using our existing icon.
- A number-formatting helper (`groupIndian`) is **copy-pasted into 4 files** ([earningsMapper.ts](src/api/earningsMapper.ts#L37) and others) — it should live in one shared place.

**Effort:** ~2–3 hours.

---

### 🔴 FIX 3 — Replace the "invented colours" with the now-complete master list
**Do this right after Fix 1 (it depends on the new entries existing).**

**The problem in plain words:** A handful of components type a colour directly in their own code, or reach into the "raw paint cans" instead of the "labelled" layer. Once Fix 1 adds the missing labelled entries, these can simply point at them.

**Where (the main offenders):**
- [CardDetailMasthead.tsx](src/organisms/CardDetailMasthead.tsx#L344) — the shiny card "glare" effect types its colours by hand (5 of them) + a hand-typed black shadow.
- [HomeHeader.tsx](src/organisms/HomeHeader.tsx#L74) — builds a see-through blue by hand.
- [CardDetailSheet.tsx](src/organisms/CardDetailSheet.tsx#L1359) — the card shimmer types 3 colours by hand.
- [EligibleSheet.tsx](src/organisms/EligibleSheet.tsx#L72) — the celebration confetti reaches into raw paint cans (9 colours).
- [CardTile.tsx](src/organisms/CardTile.tsx#L90) — the gold "Invite Only" badge uses raw paint cans + one hand-typed gold.
- [ShareSheet.tsx](src/organisms/ShareSheet.tsx#L163) — two share buttons use raw paint cans.
- [HomeScreen.tsx](src/screens/HomeScreen.tsx#L146) — the grey "loading skeleton" blocks use raw paint cans.

**What to do:** Swap each for the matching labelled entry (most now exist after Fix 1; the confetti palette may need its own small named set).

**Effort:** ~2–3 hours.

---

### 🟡 FIX 4 — Replace hand-made shadows with approved shadow recipes
**The problem in plain words:** Several places "hand-roll" a drop shadow — typing in the blur, darkness, and offset directly — instead of using one of our approved shadow recipes. Some even have a code comment admitting "an approved one almost matches, but I tweaked it for looks."

**Why it matters:** Shadows should be consistent across the app. Five slightly-different hand-made shadows look subtly off next to each other.

**Where:** [HowToGetOfferCard.tsx](src/organisms/HowToGetOfferCard.tsx#L40), [BottomNav.tsx](src/organisms/BottomNav.tsx#L277), [MastheadHeader.tsx](src/organisms/MastheadHeader.tsx#L206), [Tooltip.tsx](src/molecules/Tooltip.tsx#L230), [TermsAndConditions.tsx](src/molecules/TermsAndConditions.tsx#L158), and the gold pill in [CardTile.tsx](src/organisms/CardTile.tsx#L104).

**What to do:** Add the few missing shadow recipes to the master list (part of Fix 1), then point these at them.

**Effort:** ~1–2 hours.

---

### ⚪ FIX 5 — Tidy the hand-typed sizes (the long tail of small stuff)
**The problem in plain words:** This is the bulk of the 49 tiny issues. Many components type a size directly — like `74 pixels` — when either (a) that exact size **already exists** on the approved size list and was just missed, or (b) it's a genuinely new size that should be **added** to the list with a name, instead of typed inline.

**Examples of "the size already existed, just missed it":**
- `74` → we already have a name for this (`sizing.ticketLogoW`) — used by hand in [BrandLogoTile.tsx](src/atoms/BrandLogoTile.tsx#L44) and [BrandLogo.tsx](src/molecules/BrandLogo.tsx#L54).
- `48` → already `mediaSize[48]` — typed by hand in [methodRow.tsx](src/screens/withdraw/methodRow.tsx#L29).
- `10` → already `spacing[10]` — typed by hand in [AmountActionRow.tsx](src/molecules/AmountActionRow.tsx#L61) *(with a comment that wrongly claims it doesn't exist — it does)*.
- `0.4` (a fade amount) → already `opacity[40]` — re-typed in Button, Chip, Input, TextArea, Checkbox, Radio.

**What to do:** A developer can sweep these in one pass — swap the hand-typed numbers for the list names, and add any genuinely-new sizes to the list. Low risk, improves consistency, makes future re-theming painless.

**Effort:** ~2–4 hours (it's volume, not difficulty). Can be done gradually.

---

### ⚪ FIX 6 — Housekeeping
**Small structural tidy-ups:**
- **Two files both named "gradients"** ([src/tokens/gradients.ts](src/tokens/gradients.ts) and [src/theme/gradients.ts](src/theme/gradients.ts)) — having two with the same name is confusing. Merge into one, or rename one clearly.
- **One file has a lowercase name** ([methodRow.tsx](src/screens/withdraw/methodRow.tsx)) — our rule is capital-first names (`MethodRow.tsx`). It's also a reusable piece living in the wrong folder (it should sit with the other "molecules," not buried inside a screen).

**Effort:** ~1 hour.

---

## One thing that is NOT a fix (we checked)

Some buttons across the app use **blue (Cobalt)** as their main action colour instead of **orange (Saffron)** — including the login buttons and the "Submit" buttons. Our written rule says orange is the primary colour. **You confirmed this is intentional and decided per-screen by the Figma design**, not a blanket rule. So this is **not a violation** — no action needed beyond the normal habit of matching each button to its specific Figma screen. (Worth a quick glance at the Onboarding screen, which uses both colours, just to confirm each matches its design.)

---

## Suggested order of work

1. **Fix 1** (add missing master-list entries) — *unlocks Fixes 3 & 4, benefits all future apps.*
2. **Fix 2** (delete old leftovers) — *cheap now, prevents 30 apps of confusion.*
3. **Fix 3** (swap invented colours) — *clears most of the remaining "bigger" issues.*
4. **Fix 4** (shadows) — *quick consistency win.*
5. **Fix 5 & 6** (size tidy-up + housekeeping) — *gradual, low-priority polish.*

**Total effort to do everything: roughly 1–1.5 focused days.** Fixes 1–3 alone (about half a day) resolve nearly all the meaningful issues.

---

## Bottom line

We set ourselves strict, ambitious rules — and the code actually keeps them. The gaps we found are mostly the *library outgrowing its own master list* (easily fixed by topping up the list) and *tidiness after upgrades* (deleting old versions). Fix those, and this becomes a genuinely clean, reuse-ready foundation for every category app to come.

*No code was changed to produce this report — it's read-only. Each fix can be done as its own small, phone-tested pass whenever you're ready.*
