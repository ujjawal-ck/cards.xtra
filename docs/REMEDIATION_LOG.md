# Remediation log, pass 1 (2026-11-03)

This pass follows `docs/GAP_AUDIT.md`. It uses the same issue numbers where they exist. Figma file `P7UcoZYBnfyefmJIA8wcM7`.

**Verdict: NOT READY for production. READY WITH EXCEPTIONS for the stakeholder demo.**

## How it was verified

- **TypeScript:** 0 app errors (was 3). Storybook errors are unchanged: its packages are not installed.
- **Web export:** builds. It used to fail because `@lottiefiles/dotlottie-react` was missing.
- **Playwright (390×844, web export):** onboarding → login sheet → type number → Privacy Policy → in-app back. Passes, with no runtime errors.
- **Not tested at runtime:** every signed-in screen. The sandbox has no staging API keys (`.env` is not in the repo), so login cannot finish. Those fixes were checked by type-check and code review only. They need a device pass on staging.

## Fixed

| ID | Sev | Area | Defect | Fix | Verified |
|---|---|---|---|---|---|
| B-1 | P1 | Build | 3 TS errors in animation transforms | `as const` on transform arrays (`PromoTopSheet`, `GreetingScreen`) | tsc |
| B-2 | P1 | Build | Web export broken | Added the `@lottiefiles/dotlottie-react` peer dependency | export + Playwright |
| D-1 (P0 #3) | P0 | Eligibility | The verdict said "eligible" for any income of ₹50k or more, even when the API rejected the card. Home and the detail sheet used different rules. | One shared classifier in `src/lib/eligibilityVerdict.ts`, used by Home, the iOS sheet and the Android screen. The API eligible set is the only way a card can be eligible. | tsc, review |
| D-2 | P0 | Eligibility | API failure silently fell back to income, and could show "eligible" | Both checkers now show "We couldn't check your eligibility right now. Please try again." and commit nothing | tsc, review |
| D-3 | P1 | Eligibility | Every ineligible user saw "Your pin code is not serviceable" | No default reasons. "Salary is below the required amount" shows only when it is true. | tsc, review |
| D-4 | P2 | Eligibility | The Maybe copy said "₹50,000/month" for every card | Uses the card's own income bar | tsc, review |
| D-5 | P1 | Eligibility | The "Explore N cards" carousels on the Maybe and Ineligible sheets could not be tapped | Tapping a card closes the result sheet and opens that card's detail | tsc, review |
| D-6 | P2 | Search | Zero results showed a blank panel | Figma "No matching results" state (4367:243584), with the illustration | tsc, review |
| D-7 | P2 | Login | The Privacy Policy link did nothing | Closes the sheet, opens the policy, and reopens the sheet with the typed number on return | Playwright |
| D-8 | P1 | Analytics | `share` was never fired | Fired on a completed OS share | tsc |
| D-9 | P1 | Analytics | Apply with no URL logged `card_apply` and opened nothing | No log when there is no link | tsc |
| D-10 | P3 | Copy | The footer said "get cash back" and the maybe strip said "might qualify" | Now matches Figma | tsc |
| M-1 | P1 | Offers | Every coupon store showed the code "MCCK300" | Shows the real code from the API `included` block, or hides the block | tsc, review |
| M-2 | P1 | Offers | "Upto 90% Off" and "+5 Offers" were hardcoded for every store | Shows the real coupon title, or hides the line | tsc, review |
| M-3 | P1 | Offers | Upsell timer frozen at 01:23:59, with a fake ₹150 condition | Hidden until the API sends real values | tsc, review |
| M-4 | P1 | Offers | A store with no cashback URL still had a live CTA and logged `offer_shop` | CTA disabled, no log | tsc, review |
| M-5 | P2 | Earnings | The Get Help row did nothing | Opens `GetHelp` | tsc |
| M-6 | P1 | Earnings | A new user saw "You have ₹0.0 pending" | Shows the "No Cashback Yet!" sheet (2898:164825) | tsc, review |
| M-7 | P2 | Withdraw | The sub-line said "Cashback" in the rewards flow | Matches the payment type | tsc |
| M-8 | P2 | Withdraw | No inline errors for a bad email, mismatched emails or a bad mobile number | Figma copy (3283:51858, 52088, 52824) | tsc, review |
| M-9 | P1 | Analytics | `withdraw_success` was never fired | Fired on the success screen | tsc |
| M-10 | P1 | Withdraw | Profile → Withdraw skipped the Earnings checks and `withdraw_start` | Now goes to the Earnings tab | tsc |
| A-1 | P2 | Account | No inline error for an invalid email or mobile number | Figma copy ("Kindly enter a valid…"). Mobile numbers must start with 6–9. | tsc, review |
| A-2 | P2 | Account | The Delete button was disabled instead of showing an error | Figma 3919:38344 behaviour | tsc, review |
| A-3 (P0 #4) | P0 | Missing cashback | Rejected claims disappeared | Rejected card (4129:26811) with the reason from `comments`. The tab count matches the rows. | tsc, review |
| A-4 | P1 | Account | Name edits were silently thrown away | Saved locally via `setDisplayName`. Still not written to the backend. | tsc, review |
| A-5 | P1 | Build | `expo-image-picker` plugin and iOS permission string were missing | Added to `app.json` | JSON valid |
| A-6 | P2 | Missing cashback | Invoice caption promised PDF, and nothing enforced the 2MB limit | Caption corrected, 2MB check added | tsc, review |
| A-7 | P3 | Orders | The delayed step was amber; Figma uses saffron | Uses the brand tone | tsc |

## Open: blocked or needs a decision

| ID | Sev | Issue | Blocker | Next action |
|---|---|---|---|---|
| P0 #1 | P0 | Delete account and email/mobile change call no API, and any OTP passes | No endpoint is documented | Backend: share the delete, contact-change and OTP endpoints. Play Store needs real deletion. |
| P0 #2 | P0 | Click-outs open with an empty `id=` if the profile hasn't loaded | Needs agreed click and source params | Tracking team: confirm the param spec, then gate the CTA on the profile |
| P0 #5 | P0 | Staging keys ship in the bundle, and there is no prod config | Server proxy | Name an owner and date for the proxy |
| P0 #6 | P0 | Cashback-guard needs a Play declaration | Product decision | Decide v1 or v1.1 |
| P0 #7 | P0 | No crash reporting | Needs a native build | Add Sentry or Crashlytics |
| M-11 | P1 | The Bank Transfer row does nothing | Flow not built (`submitBankPayment` exists) | Build the 4 bank frames plus OTP and success copy |
| M-12 | P2 | Rewards pending and paid show a hardcoded ₹0.0 | The API has no split | Backend: add `rewards_pending` and `rewards_paid` |
| M-13 | P2 | No Copy Code button | No clipboard library | Approve adding `expo-clipboard` (works in Expo Go) |
| M-14 | P2 | The store-not-available / Notify Me state (3832:31632) is missing | Needs a Notify Me API | Interim label "Cashback Unavailable on X" is not Figma copy. Confirm it. |
| A-8 | P2 | No "Not eligible for cashback" card (4129:26831) | The Resolved bucket can't tell tracked from not-eligible | Backend: add an outcome field |
| A-9 | P2 | `comments` is assumed to hold the rejection reason | Unverified | Check on staging |
| D-11 | P2 | Terms & Conditions link on login | No T&C page or URL exists | Legal: provide the URL |
| D-12 | P2 | No pre-apply T&C sheet (5873:27578), and no redirect interstitials | Not built | Next pass (audit P1) |
| D-13 | P3 | The search illustration is a 224px raster | The Figma CDN is blocked from the sandbox | Re-export node 4369:244199 at 3x |
| C-1 | — | CLAUDE.md says the primary button is orange. Figma 6851:26627 shows "Get OTP" in Cobalt, and the code matches Figma. | Spec conflict | Design: confirm which is right and update the losing doc |
| C-2 | — | OTP length: 6 in code, 4 in Figma | Backend fact | Confirm and align Figma |
| C-3 | — | Eligibility before Apply: mandatory or skippable | Product decision | A/B the gate on the apply-click vs approval-rate trade-off |
