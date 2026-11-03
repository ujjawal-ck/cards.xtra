# Design Brief — Building a New Category App on the Shared System
### What to tell the design team (works for shoes, or any future category)

*Plain-language brief. Hand this to whoever designs the Figma screens for a new app.*

---

## The one-sentence version

> **We are NOT designing a new app from scratch. We are reusing one shared design system and only designing what is genuinely new for this category.**

Most of the app already exists as reusable parts. Your job is to *reuse them*, and design fresh only where the category truly differs.

---

## What stays the same (do NOT redesign these)

For a shoes app (or any category), these are already built and should be reused **as-is**:

- **All the building blocks:** buttons, text, inputs, search bar, tiles/cards, tabs, lists, pop-up sheets, headers, bottom navigation.
- **The whole "plumbing" of flows:** login / OTP, profile, earnings, withdraw money, missing-cashback claims, account settings, search behaviour.
- **The design system itself:** the colour variables, the text styles, the spacing/size scale, corner radii, shadows.

If you find yourself rebuilding any of these, stop — it already exists.

## What is actually new for a new category

Realistically, only this changes:

1. **The home / landing page** — the category's hero and its featured content.
2. **The product/listing content** — shoes instead of credit cards (images, names, prices, filters that make sense for shoes).
3. **Brand colours** *(optional)* — if shoes use a different brand colour, we change it in **one place** (the colour variables) and the whole app re-skins. You do **not** repaint every screen.
4. **A few category-specific pieces** — e.g. a shoe-size picker or colour-swatch selector, *if* shoes need something cards never did.

That's it. Everything else is assembly of existing parts.

---

## The rules for the design team (so the code comes out clean)

These four habits are what make the reuse actually work:

1. **Use the shared components, not detached copies.** Place the real library components (with their variants/properties) onto your screens. Don't copy-paste a flattened picture of a button — use the actual component.
2. **Bind every value to a variable.** Every colour, spacing, corner radius, and text style must point at a **variable** from the shared system — never a hand-typed hex or pixel number. (A hand-typed number can't be reused in code; a variable can.)
3. **If you need something that doesn't exist yet, flag it — don't invent a one-off.** Need a colour or size that isn't in the system? Tell us. We add it to the *shared* system so every app gets it. Inventing a stray value breaks the reuse for all 30 apps.
4. **Name layers and components for what they are.** "CardTile / image", "Button / primary" — not "Frame 247" or "Home thing". Clear names = accurate code.

---

## The structure checklist (confirm before handing a screen over)

A screen is ready to build when all of these are true:

- ☐ Built from **real shared components** (not detached/flattened copies).
- ☐ **Every** colour, space, radius, and text style is bound to a **variable**.
- ☐ Layers and pages are **named meaningfully**.
- ☐ Anything genuinely new is **flagged to us** to add to the shared system first.

---

## How to hand a screen to the build

For each screen or component you want built:

1. Right-click the frame in Figma → **Copy link to selection**.
2. Send us that link.
3. We read the real design data live and assemble it from existing shared parts — building a new part only when you've flagged one as genuinely new.

---

## The mental model to share with the team

> The credit-card app already filled the **box of LEGO bricks**. A shoes app is **building a new model from the same bricks** — plus a small handful of new bricks made only when shoes truly need them. We design the *new shapes*, never re-mould the bricks.

This is what lets app #2 through app #30 be fast, consistent, and cheap. Every time someone reuses instead of rebuilds, the whole plan gets stronger.
