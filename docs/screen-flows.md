# Screen flows

What appears on each screen, how users get there and leave, the data behind it, and what they see when things succeed or fail. A visual version lives on the "Cards.xtra Screen Flows" artifact. APIs are detailed in `api-reference.md`.

About 46 routes are reachable in production. Not reachable (nothing navigates to them): `FoundationCheck` (dev), `Login`, `Otp`, `NameInput` (replaced by the login sheet and signup fields), `ReviewUs`, `WriteReview`, `ProfilePaymentHistory*`, `MissingCashbackTrack`, `MissingCashbackTicketStatusReview`, `MissingCashbackTicketList*`.

## Screens

### Launch and login

| Screen | Shows | In → Out | States |
|---|---|---|---|
| **Splash** | Lottie intro | App start → Home if signed in or onboarded before, else Onboarding (on animation end or 7 s) | Session still loading → Onboarding |
| **Onboarding** | 3 auto-advancing slides ("Find The Perfect Card in Seconds", "Don't Just Apply. Earn Cashback", "Explore Deals & Offers on 1500+ Brands"), **Get Started**, "Already on CashKaro? **Log in**" | Splash (first launch), or any "Log in" prompt (`{login:true}` opens the sheet at once) → Get Started: Home as guest · Log in: login sheet | `{login:true}` + dismiss → back where they came from |
| **Login sheet** (inside Onboarding) | Phone: "Log in or Sign up", Mobile Number, **Get OTP**, Terms (plain text) + Privacy Policy (link). OTP: "Enter OTP", "OTP sent on +91 … **Change**", 6 boxes, 30 s resend. New number: Full name + Email, **Verify & create account** | → existing user: Home or back to origin · new user: Greeting | Errors: API message, "Could not send OTP…", "Could not verify OTP…", "Enter your name and email to create your account.", "Enter a valid email" |
| **Greeting** | "Hi <Name>", "Welcome to the CARDS.xtra" | New signup → Home after 3 s or tap | |

### Home and cards

| Screen | Shows | In → Out | States |
|---|---|---|---|
| **Home** | Video hero + search, help and bell icons; filter row (Category, Filters, **Eligibility** toggle); "Top picks for you", "Find the best card by category", "More to explore"; card tiles with **Apply Now** | Tab → card detail, search, filters, eligibility, Notifications, Get Help | Loading skeleton · "Couldn't load cards / Check your connection…" + Retry · "No cards match your filters" + Clear filters · eligibility groups (Eligible / Maybe / Ineligible) |
| **Card detail** (iOS sheet, Android full screen) | Card art, name, cashback badge, "Learn how it works?", benefits + **View all benefits**, best for, fees, eligibility tabs, inline eligibility checker, FAQ, recommended cards, sticky **Apply Now** with eligibility strip | Tile / search / store page → Apply, All benefits, How it works, Share | Benefits skeleton · eligibility result banners · a failed eligibility call silently falls back to the income rule |
| **Search** | "Search by card name"; Popular searches; Banks and Cards results | Home → bank filter or card detail | "No results for “q”" + bank/card hint |
| **Filters** | Category, Annual Fee, Card Network, Banks; **Apply Filter** with count | Home → filtered list | |
| **Eligibility checker** | PIN, monthly income, Salaried / Self-employed, **Check Eligibility** (+ Clear when saved) | Toggle, pencil, Apply with no details → result sheet or filtered list | "Enter your 6-digit PIN code" / "Enter a valid…" / "Enter your monthly income"; details kept in memory only |
| **Result sheets** | Eligible ("Congrats! You're eligible…", Apply Now), Maybe ("You may be eligible…", Continue to Apply), Ineligible ("We're Sorry!…", Continue to Apply) | Apply flow → click-out | Ineligible shows on every Apply |
| **Log in to earn** | "Log in to earn cashback", **Log in** / **Apply (Shop) without cashback** | Any click-out while signed out | Signed in without a profile id: "Couldn't open this right now…" |
| **All card benefits** | Categorised benefits | Card detail → back | "Couldn't load benefits…" / "Benefit details aren't available…" |
| **Share / How it works** | Share tiles (system share) / 3 steps | Card detail, Get Help | |

### Offers

| Screen | Shows | In → Out | States |
|---|---|---|---|
| **Offers** | Saffron header, "Search stores & categories", category strip, 2-column store grid, promo (once per session, only when stores exist) | Tab → store page, search | Skeleton · "Couldn't load offers" + Try again · "No offers here yet…" + **Explore cards** (production today) |
| **Store page** | Banner, about, cashback details + rates, benefits or offer how-to, tracking timelines, terms, best cards to use, similar stores, FAQ, sticky **Earn Cashback on <Brand>** | Grid / search → click-out, info sheets, card detail | Spinner · "Couldn't load this store" + Try again (CTA hidden) |

### Earnings, withdraw, orders

| Screen | Shows | In → Out | States |
|---|---|---|---|
| **Earnings** | Total, Cashback / Rewards cards, Confirmed (**Withdraw**), Pending (Know Why?), Paid (View); My Order Details, Missing Cashback, Get Help | Tab → withdraw gate, orders, claims, sheets | Skeleton · "Couldn't load your earnings" + Try again · guest: "See every rupee you earn" + Log in |
| **Withdraw gate** | Payment processing / "Cashback Not Confirmed" / "No Cashback Yet!" / "Minimum ₹250 to withdraw" | Withdraw (Earnings, Profile) → method select | "Couldn't load your balance" |
| **Method select** | UPI · Bank Transfer (Coming soon) · Amazon / Flipkart gift card; Cashback and/or Cashback + Reward sections | → UPI / gift card | Amounts "—" while loading |
| **UPI / Amazon / Flipkart details** | UPI ID, or mobile ×2, or email ×2; T&C checkbox; **Get Paid** | → OTP | Inline validation; "Could not send OTP" |
| **Verify OTP** | "OTP sent to <masked>", **Edit details**, 6 boxes (auto-submit) | → Success | "Enter a valid OTP", "Connection problem", "Payment failed", time-out → "Couldn't confirm your withdrawal" + Go to Earnings |
| **Success** | Method-specific confirmation, **Continue Shopping** | → Home | No swipe back |
| **Orders** | "Don't see your order here?", filters, order cards | Earnings → order detail, missing cashback | "Couldn't load your orders" · "No matching results" · "No orders yet" |
| **Order detail** | Status masthead, amount, order ID, date, journey timeline, **Need Help** | Orders, claims → missing cashback | "Couldn't load this order." + Retry |

### Missing cashback

| Screen | Shows | In → Out | States |
|---|---|---|---|
| **Claims list** | In Review / Closed / Others tabs; claim cards; "Have more cashback to track?" | Earnings, Profile → intake, add details, order detail | "Couldn't load your claims" · per-tab empty copy |
| **Did you shop?** | Yes / No | Get Help, Orders, claims banner → stores or feedback | Lookup failed → retry alert |
| **Where did you shop?** | Stores visited in the last 30 days | → choose date | Retry · "Oops!" empty |
| **Choose date → Order ID → Amount** | Dates visited; order ID with format hint; amount | → outcome | Format/validation errors; server messages |
| **Outcome screens** | Cashback Tracked (View Details) · Under Auto-Tracking · Claim Submitted · New user? (B1) · Category (C1) · Invoice upload (C2) → Ticket raised | → claims list | Invoice: permission, "Please add at least one invoice screenshot." |

### Profile and account

| Screen | Shows | In → Out | States |
|---|---|---|---|
| **Profile** | Name, masked contact, **Edit Profile**; My Earnings, Withdraw, Missing Cashback; Never Miss Cashback, Get Help, Call Us; Privacy Policy; **Logout** | Tab | Guest: "Your CashKaro account" + Log in; help rows stay |
| **Account settings** | Name, email, mobile, Delete Account | Edit Profile | **Demo only:** Save Changes, edit contact and delete account call no API and accept any OTP |
| **Logout** | "Log out?" Yes / No | → Home as guest | |
| **Get Help** | How Cards.xtra Works?, Your Cashback, Missing Cashback or Rewards, Payment related, Unable to Login? | Home, Earnings, Profile | Guests are asked to log in for missing cashback |
| **Never Miss Cashback** | Reminder switch, usage-access and notification steps, "Works with Amazon · Flipkart · AJIO" | Profile, Home nudge, Orders pip (Android) | iOS: "available on the Android app build only" |
| **Notifications** | "You're all caught up" | Home bell | Always empty (no API) |
| **Privacy Policy** | Cards.xtra policy | Profile, login sheet, Never Miss Cashback | |

## Key paths

**A. First launch and login**
- Splash → Onboarding → **Get Started** → Home (guest) ✓
- Onboarding → **Log in** → Get OTP
  - ✓ registered → OTP → Verify → Home (or back to where the login started)
  - ✓ new number → OTP + name + email → Verify & create account → Greeting → Home
  - ✗ wrong / expired OTP → message, resend after 30 s · ✗ network → "Could not send / verify OTP"
- Session expiry → silent refresh ✓ · refresh rejected → signed out, guest views ✗

**B. Card → apply**
- Home → card → detail → **Apply Now**
  - No eligibility details → checker → result sheet (eligible / maybe / ineligible) → Apply / Continue to Apply
  - Signed in → link with user + click id opens ✓ · profile id unavailable → "Couldn't open this right now" ✗
  - Guest → "Log in to earn cashback" → Log in (then tap Apply again) or Apply without cashback

**C. Offers → shop**
- Offers → category → store → **Earn Cashback on <Brand>** → same click-out rules as B
- ✗ "Couldn't load offers / this store" + Try again · production today: "No offers here yet" → Explore cards

**D. Withdraw**
- Withdraw → gate: in progress / ₹0 / below ₹250 → explanatory sheet ✗ · ok → method → details → Get Paid → OTP → ✓ Success → Home
- ✗ invalid details, OTP not sent, wrong OTP, payment failed, time-out (blocked from resubmitting; told to check Earnings)

**E. Missing cashback**
- Claims list → Did you shop? → Yes → store → date → order ID (validated) → amount → submit
- Outcome: tracked ✓ · auto-tracking ✓ · queued ✓ · needs more: new-user question / category / invoice → ticket ✓
- ✗ no visits in 30 days (Oops), lookup failed (retry), validation and server errors; Back after submit returns to the claims list, never the filled form

**F. Profile**
- Edit Profile → account settings (demo only today) · Logout → Home as guest · Get Help topics · Never Miss Cashback setup (Android)

## Gaps found while mapping

1. Account settings, edit contact and delete account are demo flows (no API, any OTP passes); on Android, Back from "Account Deleted" returns to the OTP screen while still signed in.
2. Support emails differ: the Oops screen says contact@cardsxtra.com, the store-list empty state says contact@cashkaro.com.
3. Home has no empty state if the catalogue returns 0 cards with no filters.
4. A failed eligibility call silently falls back to an income rule.
5. After "Log in to earn", the pending click is dropped; the user taps Apply again.
6. A new user who signs up from "Log in to earn" lands on Home, not the card they came from.
7. Similar-stores tiles on the store page don't do anything when tapped.
