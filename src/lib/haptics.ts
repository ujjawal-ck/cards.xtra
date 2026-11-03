/**
 * haptics — one place for all tactile feedback (expo-haptics).
 *
 * Centralised so the whole app speaks one haptic language and matches
 * platform conventions (Apple HIG / Android). Wired into the shared
 * interactive atoms (Button, Switch, Checkbox, Radio, Chip, Selector,
 * OtpInput, tabs) so most interactions get correct feedback for free;
 * screens add outcome feedback (success / error / warning) at the moment
 * an action actually resolves.
 *
 * Semantic guide (best-practice mapping):
 *   • impact('light')   — a tap on a control (buttons, list items, each OTP digit)
 *   • impact('medium')  — a primary/CTA confirm tap (slightly more substantial)
 *   • selection()       — value changed (toggle, checkbox/radio, chip, tab, picker)
 *   • success()         — an action succeeded (OTP verified, payment placed)
 *   • warning()         — a soft-negative outcome (maybe-eligible, needs attention)
 *   • error()           — an action failed (wrong OTP, validation/network error)
 *
 * Everything is fire-and-forget and never throws: haptics are an
 * enhancement, so a failure (unsupported device, web, denied) is swallowed
 * and the interaction proceeds normally. No-op on web.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticKind =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'soft'
  | 'rigid'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error'
  | 'none';

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

// Run a haptic without ever letting its failure surface to the caller.
function run(fn: () => Promise<void>): void {
  if (!SUPPORTED) return;
  fn().catch(() => {
    /* haptics are best-effort — ignore unsupported / denied / busy */
  });
}

const IMPACT = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  soft: Haptics.ImpactFeedbackStyle.Soft,
  rigid: Haptics.ImpactFeedbackStyle.Rigid,
} as const;

export const haptics = {
  impact(level: keyof typeof IMPACT = 'light') {
    run(() => Haptics.impactAsync(IMPACT[level]));
  },
  selection() {
    run(() => Haptics.selectionAsync());
  },
  success() {
    run(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    );
  },
  warning() {
    run(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    );
  },
  error() {
    run(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    );
  },
};

/**
 * Dispatch a haptic by its semantic kind — used by atoms that accept a
 * `haptic` prop so a caller can pick the feel (or 'none' to silence it).
 */
export function triggerHaptic(kind: HapticKind): void {
  switch (kind) {
    case 'none':
      return;
    case 'selection':
      return haptics.selection();
    case 'success':
      return haptics.success();
    case 'warning':
      return haptics.warning();
    case 'error':
      return haptics.error();
    default:
      return haptics.impact(kind);
  }
}

// ---------------------------------------------------------------------------
// Haptic profiles — the app's tactile "personality"
// ---------------------------------------------------------------------------
// One tuned feel per interaction *event*, all in one place, so each kind of
// interaction has its own character and the whole app can be retuned from a
// single map. Add an event here, then call `play('<event>')` at the site.
//
// A value can be a single HapticKind, or a SEQUENCE (Step[]) for a composite,
// more expressive feel (e.g. a soft lead-in then a firm landing). Sequences
// are timed with setTimeout — fine for short, 2–3 step "signatures".
export type HapticStep = { kind: Exclude<HapticKind, 'none'>; delay?: number };
export type HapticPattern = HapticKind | HapticStep[];

export const HAPTIC_PROFILE = {
  // — Navigation & selection —
  tabSwitch: 'light', // bottom-nav tab change — crisp, frequent
  searchOpen: 'light', // tapping a search bar to open search
  searchResultTap: 'selection', // choosing a search result
  filterScrollTick: 'selection', // micro tick while scrolling the filter list
  filterSelect: 'selection', // toggling a filter tile / category
  pagerSwipe: 'selection', // swiping between cards in the detail pager

  // — Bottom sheet —
  sheetExpand: 'rigid', // snap up to full — firm "locked in"
  sheetCollapse: 'soft', // ease back down — soft, gentle

  // — CTAs —
  buttonPrimary: 'medium', // solid / primary CTA confirm
  buttonSecondary: 'light', // secondary / tertiary tap
  toggle: 'selection', // switch / checkbox / radio

  // — Outcomes (a small signature for the celebratory one) —
  success: [{ kind: 'soft' }, { kind: 'success', delay: 90 }], // anticipation → pop
  warning: 'warning',
  error: 'error',
} as const satisfies Record<string, HapticPattern>;

export type HapticEvent = keyof typeof HAPTIC_PROFILE;

// Play a timed sequence of primitives (a composite "signature").
export function sequence(steps: HapticStep[]): void {
  let elapsed = 0;
  for (const step of steps) {
    elapsed += step.delay ?? 0;
    if (elapsed <= 0) {
      triggerHaptic(step.kind);
    } else {
      // best-effort timing; haptics are non-critical so drift is fine
      setTimeout(() => triggerHaptic(step.kind), elapsed);
    }
  }
}

/**
 * Fire the haptic profile for a semantic event — the recommended entry point
 * for interaction feedback (`play('tabSwitch')`, `play('sheetExpand')`, …).
 */
export function play(event: HapticEvent): void {
  const pattern = HAPTIC_PROFILE[event];
  if (Array.isArray(pattern)) sequence(pattern as HapticStep[]);
  else triggerHaptic(pattern as HapticKind);
}
