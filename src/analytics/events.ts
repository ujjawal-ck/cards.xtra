/**
 * events.ts — the analytics event taxonomy (single source of truth).
 *
 * Every event the app can fire is named here ONCE. Screens import these
 * constants instead of typing raw strings, so there's no drift or typos and
 * the whole tracking surface is auditable from one file.
 *
 * GA4 ALIGNMENT — names are written to GA4's rules so they map 1:1 the day the
 * Firebase/GA4 sink is switched on (see analytics.ts + README):
 *   - snake_case, must start with a letter, ≤40 chars, only [a-z0-9_]
 *   - never use a reserved prefix (firebase_, google_, ga_)
 *   - where a GA4 "recommended" event fits, we reuse its exact name (marked
 *     // GA4) so GA's built-in reports (engagement, funnels, search terms)
 *     light up automatically. Everything else is a custom event.
 *
 * Param-key / value limits (key ≤40 chars, string value ≤100, ≤25 params per
 * event) are enforced centrally in analytics.ts — keep call sites readable.
 */
export const Events = {
  // ── lifecycle ──────────────────────────────────────────────
  APP_OPEN: 'app_open', // GA4
  SCREEN_VIEW: 'screen_view', // GA4 — params: screen_name, screen_class

  // ── auth / onboarding ──────────────────────────────────────
  OTP_REQUESTED: 'otp_requested',
  OTP_RESEND: 'otp_resend',
  OTP_SUBMITTED: 'otp_submitted',
  // OTP verify rejected or failed. Params: flow ('login' | 'signup'), reason.
  OTP_FAILED: 'otp_failed',
  LOGIN: 'login', // GA4 — param: method
  SIGN_UP: 'sign_up', // GA4 — param: method
  SIGN_UP_NAME_SET: 'sign_up_name_set',
  LOGOUT: 'logout',
  ONBOARDING_GUEST_START: 'onboarding_guest_start', // "Get Started" without logging in
  LOGIN_PROMPT_TAP: 'login_prompt_tap', // param: source (earnings | profile | …)

  // ── cards (Home) ───────────────────────────────────────────
  SELECT_ITEM: 'select_item', // GA4 — card tile tapped
  VIEW_ITEM: 'view_item', // GA4 — card detail sheet opened
  CARD_VIEW_ALL_BENEFITS: 'card_view_all_benefits',
  // "Apply Now" tapped (intent). Params incl. gate_variant. The real
  // outbound to the bank is CARD_APPLY_OUTBOUND — count conversions on that.
  CARD_APPLY: 'card_apply',
  // Every outbound card / store click: kind, item_id, item_name, click_id,
  // attributed (bool), link_type (ck | partner). For reconciling with partners.
  CLICK_OUT: 'click_out',
  CARD_APPLY_OUTBOUND: 'card_apply_outbound', // bank page opened (the conversion)
  // A click-out we refused to open (no URL, or signed-in user id not loaded).
  // Params: surface, reason ('no_url' | 'no_user_id'), item_id.
  CLICKOUT_BLOCKED: 'clickout_blocked',
  // A network call failed for good (after retries). Params: endpoint_group,
  // method, status, error_kind, error_code, attempt, duration_ms. No PII.
  API_ERROR: 'api_error',
  SEARCH: 'search', // GA4 — param: search_term
  // A typed query returned zero cards. Params: query_length (never the text).
  SEARCH_NO_RESULTS: 'search_no_results',
  SEARCH_RESULT_SELECT: 'search_result_select',
  FILTER_APPLY: 'filter_apply',
  FILTER_CLEAR: 'filter_clear',
  CATEGORY_FILTER: 'category_filter',
  ELIGIBILITY_TOGGLE: 'eligibility_toggle',
  ELIGIBILITY_CHECK: 'eligibility_check',
  // Per-card verdict actually shown to the user. Params: item_id, outcome
  // ('eligible' | 'maybe' | 'ineligible'), gate_variant.
  ELIGIBILITY_RESULT: 'eligibility_result',
  // The CardGenius eligibility call failed. Params: surface.
  ELIGIBILITY_ERROR: 'eligibility_error',

  // ── offers ─────────────────────────────────────────────────
  SELECT_CONTENT: 'select_content', // GA4 — partner card tapped
  OFFER_CATEGORY_SELECT: 'offer_category_select',
  OFFER_SHOP: 'offer_shop', // outbound "Shop & Earn" click

  // ── earnings / withdraw ────────────────────────────────────
  WITHDRAW_START: 'withdraw_start',
  WITHDRAW_METHOD_SELECT: 'withdraw_method_select',
  WITHDRAW_SUBMIT: 'withdraw_submit',
  WITHDRAW_OTP_RESEND: 'withdraw_otp_resend',
  WITHDRAW_SUCCESS: 'withdraw_success',

  // ── missing cashback ───────────────────────────────────────
  MISSING_CASHBACK_START: 'missing_cashback_start',
  MISSING_CASHBACK_STEP: 'missing_cashback_step',
  MISSING_CASHBACK_SUBMIT: 'missing_cashback_submit',
  // "Did You Shop? → No" feedback (no backend for this signal yet, so it's
  // captured purely as an event). Params: reasons (comma-joined), reason_count.
  MISSING_CASHBACK_FEEDBACK: 'missing_cashback_feedback',

  // ── orders ─────────────────────────────────────────────────
  ORDER_SELECT: 'order_select',
  ORDERS_FILTER_APPLY: 'orders_filter_apply',

  // ── profile / account ──────────────────────────────────────
  PROFILE_MENU_SELECT: 'profile_menu_select',
  ACCOUNT_DELETE_START: 'account_delete_start',
  ACCOUNT_DELETE_SUBMIT: 'account_delete_submit',
  CONTACT_EDIT_START: 'contact_edit_start',
  CONTACT_EDIT_SUBMIT: 'contact_edit_submit',
  REVIEW_START: 'review_start',
  REVIEW_SUBMIT: 'review_submit', // params: rating (1–5), has_comment
  HELP_TOPIC_SELECT: 'help_topic_select',
  NOTIFICATION_OPEN: 'notification_open',
  NOTIFICATION_SELECT: 'notification_select',
  SHARE: 'share', // GA4 — params: method, content_type, item_id
  CASHBACK_GUARD_TOGGLE: 'cashback_guard_toggle',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

/** Allowed param value types. Keep payloads flat — GA4 takes scalars only. */
export type ParamValue = string | number | boolean | undefined | null;
export type EventParams = Record<string, ParamValue>;
