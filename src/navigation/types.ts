/**
 * Navigator param lists.
 * Kept in a separate file so screens can `import type` them without
 * pulling in the navigator implementations (avoids circular deps).
 */
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CalculateSpends } from '../api/types';

/**
 * Accumulating state for one Missing Cashback claim, threaded through the flow
 * screens via nav params. Only serializable primitives (logo is a URI string,
 * not an ImageSourcePropType). Fields fill in as the user advances:
 *   retailers → {storeId,storeName,storeLogoUri,group,trackingSpeed}
 *   dates     → +exitDate, +exitId
 *   orderId   → +orderId
 *   amount    → +orderAmount, then submit → +queueId
 */
export interface McClaimDraft {
  storeId: string;
  storeName: string;
  storeLogoUri?: string;
  group: string; // A | B1 | B2 | C1 | C2 | D
  trackingSpeed: string;
  exitDate?: string;
  exitId?: string;
  orderId?: string;
  orderAmount?: string;
  queueId?: string;
}

/** Which contact field the email/mobile change flow is editing. */
export type EditContactField = 'email' | 'mobile';

export type RootStackParamList = {
  /** Lottie splash that plays once on app launch, then replaces itself
   *  with Login (replace, not navigate — user can't swipe back to it). */
  Splash: undefined;
  // Design-token verification screen. Registered in dev builds only.
  FoundationCheck: undefined;
  /** First-launch onboarding only. Login elsewhere uses the app-wide sheet
   *  (auth/LoginSheetProvider). */
  Onboarding: undefined;
  /** Post-OTP name capture for a fresh signup ("what should we call you?").
   *  No params — the entered name is stored via AuthContext and passed forward
   *  to Greeting. Cross-fades in from the OTP step; cross-fades to Greeting. */
  NameInput: undefined;
  /** Animated greeting showpiece shown once after NameInput, then dissolves
   *  into MainTabs (auto-advance or tap). `name` is what the user just chose. */
  Greeting: { name: string };
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  /** Notifications list reached from the Home header's bell (Figma 5784:25661). */
  Notifications: undefined;
  /** "We're here to help!" landing reached from the Profile "Get Help" row
   *  (Figma 3632:194974). */
  GetHelp: undefined;
  /** Android-only Cashback Reminder setup (accessibility + overlay permissions). */
  CashbackGuard: undefined;
  /** Withdraw flow (nested native stack) — entry from Earnings. The stack
   *  starts at the method-select screen, which reads live earnings.
   *  `bucket` pre-sets the type (Earnings page); omitted = all buckets
   *  (Profile entry). */
  WithdrawStack: { bucket?: WithdrawEntryBucket } | undefined;
  /** Brand/store page reached from the Offers tab. `slug` is the CashKaro
   *  offer unique_identifier (e.g. "flipkart"); omitted falls back to demo.
   *  `category` is the Offers category label the store was opened from (e.g.
   *  "Fashion") — drives the "Best cards to use here" floor's card match. */
  OffersBrandAmazon:
    | { slug?: string; hasCoupons?: boolean; category?: string }
    | undefined;
  /** Missing-cashback help intake landing — "Did You Shop?" Yes/No (Figma
   *  3424:71413). New flow entry from Profile / Earnings / Get Help. */
  MissingCashbackHelp: undefined;
  /** No-visits state reached from "Did You Shop? → Yes" when the retailer
   *  list is empty (Figma 3632:194517). */
  MissingCashbackOops: undefined;
  /** "Did You Shop?" missing-cashback ticket list (Profile → Missing Cashback).
   *  `backTo` controls the header back arrow: 'orders' (default) lands on the
   *  Orders list — correct when arriving at the END of the raise-a-claim flow;
   *  'back' does a plain goBack() — correct when opened from the Earnings /
   *  Profile "Missing Cashback" menu row. */
  MissingCashbackDidYouShop: { backTo?: 'orders' | 'back' } | undefined;
  /** Raise/track step reached from the "Did You Shop?" CTA (Figma 4129:23675). */
  MissingCashbackTrack: undefined;
  /** Retailer list — flow entry, "Where did you shop?" v2 (Figma 4129:23675). */
  MissingCashbackWhereDidYouShop: undefined;
  /** Month/date picker — "Choose the date" v2 (Figma 4129:23861). */
  MissingCashbackChooseDate: { draft: McClaimDraft };
  /** Enter order ID — validates against the store's order-id format (4129:25275). */
  MissingCashbackEnterOrderId: { draft: McClaimDraft };
  /** Enter order amount, then submit to the queue (Figma 4129:25287). */
  MissingCashbackEnterAmount: { draft: McClaimDraft };
  /** B1: new-vs-existing user (PUT user_type) (Figma 4129:25311). */
  MissingCashbackNewUserCheck: { draft: McClaimDraft };
  /** C1: category select (PUT category; "Other" → invoice). */
  MissingCashbackCategorySelect: { draft: McClaimDraft };
  /** C1-"Other" / C2: invoice upload → raise ticket. */
  MissingCashbackInvoiceUpload: { draft: McClaimDraft };
  /** After a ticket is raised — "allow 8–10 business days". */
  MissingCashbackTicketSuccess: { ticketId?: string } | undefined;
  /** Submit result — cashback tracked / added to queue / under auto-tracking. */
  MissingCashbackResult: {
    variant: 'tracked' | 'queued' | 'tracking';
    title: string;
    message: string;
    cashbackId?: number;
  };
  /** Live claims list (3 tabs) — the single consolidated list. */
  MissingCashbackTicketStatusReview: undefined;
  /** Demo references (superseded by the live DidYouShop list). */
  MissingCashbackTicketListClosed: undefined;
  MissingCashbackTicketListTracked: undefined;
  /** Orders list (Figma 4049:131896). */
  OrdersList: undefined;
  /** Order detail — one screen (Figma 3834:51156 + states). `id` fetches the
   *  live order via `/users/orders/:id`; `status` is the legacy demo fallback
   *  used only when no `id` is passed. */
  OrdersDetail:
    | { id?: string; status?: 'pending' | 'delayed' | 'cancelled' | 'confirmed' | 'paid' }
    | undefined;
  /** All Card Benefits page (Figma 5873:27486) — reached from the card
   *  detail's "View all benefits". `alias` is the BankKaro card_alias used
   *  to fetch the categorized benefits. */
  AllCardBenefits: { alias?: string; cardName?: string } | undefined;
  /** Rejection flow, part B: every card the user CAN get, organised around the
   *  card they were told they cannot get. `eligibleAliases` are BankKaro card
   *  aliases; `reasonKind` tunes the context tags. */
  CardsYouCanGet: {
    rejectedCardId: string;
    eligibleAliases: string[];
    reasonKind?: 'income' | 'employment' | 'other';
    /** Where the user came from. 'rejection' (default): the "we're sorry" sheet, the
     *  list is the cards they CAN get. 'bounce': "View all cards" on the Home rail;
     *  eligibility may be unknown, so the copy does not claim they can get the cards. */
    source?: 'rejection' | 'bounce';
    /** 'bounce' only: true when the user's eligibility result is known. */
    eligibilityKnown?: boolean;
  };
  // ── Card tools (Home tools row). Results are read from useCardSavings, keyed
  // by `spends`; a result is never passed through navigation. ──
  /** Spend questions, one per screen. 'ultimate' ends on ToolResults, 'beat' on
   *  BeatMyCardResult (needs `cardAlias`, the user's own card). */
  SpendQuiz: { next: 'ultimate' | 'beat'; cardAlias?: string };
  /** Ranked cards for one spend profile. `tool` names the entry for analytics and copy. */
  ToolResults: {
    tool: 'ultimate' | 'category' | 'brands';
    spends: CalculateSpends;
    title: string;
    /** One honest line under the title, e.g. how brands were counted. */
    subtitle?: string;
  };
  /** Beat my card, step 1: pick the card the user has. */
  BeatMyCardPick: undefined;
  /** Beat my card, result: the user's card against the best other card. */
  BeatMyCardResult: { cardAlias: string; spends: CalculateSpends };
  /** Best card for brands: pick up to 5 brands and a monthly spend for each.
   *  `brandId` (a TOOL_BRANDS id) preselects the brand the Home tile was showing. */
  BestForBrands: { brandId?: string } | undefined;
  /** Find best card for a category: pick a category and a monthly spend. */
  BestForCategory: { categoryId?: string } | undefined;
  /** Card advisor: one question at a time, three cards after the first answer.
   *  `source` says where it was opened from (analytics only). */
  Advisor: { source?: 'search' | 'search_no_results' } | undefined;
  /** __DEV__ only: every state and size of the card advisor avatar. */
  AdvisorAvatarDemo: undefined;
  /** Profile → Payment History list (Figma 3396:51078). */
  ProfilePaymentHistory: undefined;
  /** Profile → Payment History details (Figma 3396:51408). */
  ProfilePaymentHistoryDetails: undefined;
  /** Profile → Payment History empty state (Figma 3416:62381). */
  ProfilePaymentHistoryEmpty: undefined;
  /** Review Us page reached from Profile → Review Us. `submitted` is set when
   *  returning from WriteReview to surface the "submitted successfully" toast
   *  (Figma "rating-filled" 3741:53612). */
  ReviewUs: { submitted?: boolean } | undefined;
  /** Write Review form reached from ReviewUs → "Write a Review" (Figma
   *  "with-comment" 3713:52291). Submitting returns to ReviewUs. */
  WriteReview: undefined;
  /** Privacy Policy page reached from Profile → Privacy Policy (Figma
   *  3685:197516). Includes the Play-Store-required Usage Access disclosure. */
  PrivacyPolicy: undefined;
  /** Account Settings / "Edit Profile" (Figma 3396:26619). `updated` +
   *  `newValue` are set when returning from a successful email / mobile
   *  change — they drive the success message + updated field display. */
  AccountSettings: { updated?: EditContactField; newValue?: string } | undefined;
  /** Email/mobile change — step A: verify identity OTP (Figma 3395:21424). */
  EditContactVerifyIdentity: { field: EditContactField };
  /** Email/mobile change — step B: enter the new value (Figma 3395:23867). */
  EditContactEnterNew: { field: EditContactField };
  /** Email/mobile change — step C: verify the new value OTP (Figma 3395:23891). */
  EditContactVerifyNew: { field: EditContactField; newValue: string };
  /** Delete Account landing — T&C + consent (Figma 3396:28372). */
  DeleteAccount: undefined;
  /** Delete Account OTP gate (Figma 3396:28591). */
  DeleteAccountOtp: undefined;
  /** Account Deleted terminal success (Figma 3396:29405). */
  AccountDeleted: undefined;
};

export type TabParamList = {
  Home: undefined;
  Offers: undefined;
  Earnings: undefined;
  Profile: undefined;
};

/**
 * Withdraw flow (nested under the RootStack `WithdrawStack` route).
 *   WithdrawMethodSelect → (UPI)  WithdrawEnterUPI → WithdrawVerifyOTP ┐
 *                       → (gift)  WithdrawGiftCard ────────────────────┴→ WithdrawSuccess
 * `amount` (₹) is the chosen bucket's value, threaded as the single
 * source of truth; `maskedMobile` is the OTP target on the verify screen;
 * `variant` selects the gift-card screen's masthead copy + bucket.
 */
/** Bucket an entry point pre-sets on the method-select screen. */
export type WithdrawEntryBucket = 'cashback' | 'rewards';
export type WithdrawGiftCardVariant = 'cashback' | 'rewards' | 'combined';
export type WithdrawMethod = 'upi' | 'amazon' | 'flipkart' | 'bank';
export type WithdrawPaymentType = 'cashback' | 'rewards' | 'cashback_and_rewards';
/** Which method's terms the WithdrawTerms screen shows. */
export type WithdrawTermsVariant = 'upi' | 'bank' | 'amazon' | 'flipkart';

/**
 * Everything the OTP screen needs to submit the payment after verifying.
 * Serializable only (carried as a nav param).
 */
export interface WithdrawDraft {
  method: WithdrawMethod;
  paymentType: WithdrawPaymentType;
  amount: number;
  paymentMethodId: number;
  upiId?: string;
  email?: string;
  mobile?: string;
}

export type WithdrawStackParamList = {
  WithdrawMethodSelect: { bucket?: WithdrawEntryBucket } | undefined;
  // Detail screens — receive the bucket amount + paymentType; the
  // payment_method_id is read from usePaymentInfo inside the screen.
  WithdrawEnterUPI: { amount: number; paymentType: WithdrawPaymentType };
  WithdrawAmazon: { amount: number; paymentType: WithdrawPaymentType };
  WithdrawFlipkart: { amount: number; paymentType: WithdrawPaymentType };
  // Gift-card chooser for the rewards / combined buckets.
  WithdrawGiftCard: { amount: number; variant: WithdrawGiftCardVariant };
  // Shared OTP screen — verifies, then submits `draft`.
  WithdrawVerifyOTP: {
    draft: WithdrawDraft;
    otpGuid: string;
    maskedMobile: string;
  };
  WithdrawSuccess: { amount: number; method: WithdrawMethod };
  /** Method-specific terms & conditions (reached from each detail screen's
   *  consent link). `variant` picks which copy to show. */
  WithdrawTerms: { variant: WithdrawTermsVariant };
};
