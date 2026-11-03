/**
 * SelectMonthSheet — organism (Figma 3416:63963, file P7UcoZYBnfyefmJIA8wcM7)
 *
 * RECONCILED against live Figma (node 3416:63963) via figma-local MCP.
 * Pure composition over the BottomSheet shell + its `month-picker` body
 * template: header (drag handle 44×4, "Select Month" Heading/18/SemiBold,
 * bottom stroke) over a px20/py24/gap24 list of Choice radio rows. No footer.
 *
 * Forwards a ref to the underlying BottomSheetModal so the host screen
 * opens it with `ref.current?.present()`.
 *
 * Token map (all inherited from the reused shell — verified, no new values):
 *   scrim 0.72 / pin-bottom / w360 / top radius['2xl']  → BottomSheet
 *   drag handle 44×4 (border.default) + title "Select Month"
 *     Heading/18/SemiBold (text.primary)                → BottomSheetHeader
 *   body px20 / py24 / gap24 + Choice radios            → BottomSheetBody 'month-picker'
 *   selected row   → Radio accent fill (action.accent.default #0741ef) +
 *                    label Body/14/Medium cobalt (Choice 'on' = border.focussed
 *                    = cobalt[500] = #0741ef — matches Figma)
 *   unselected row → Radio unchecked (border.default #d9e3ec) +
 *                    label Body/14/Regular text.primary (#262626)
 *
 * ── FIGMA RECONCILE VERDICTS ──────────────────────────────────────────────
 * FLAG 1 (layout/tokens/selected-state): ✅ CONFIRMED. Live Figma matches the
 *   reused month-picker template exactly — header copy/handle/stroke, body
 *   px20/py24/gap24, 4 radio rows, idx0 selected (accent radio + cobalt
 *   Body/14/Medium label), rest Body/14/Regular text.primary. No token gaps:
 *   every Figma variable resolves to an existing semantic token.
 *
 * FLAG 2 (onSelect / re-filter): ✏️ FIXED. The month-picker template now
 *   accepts optional `selectedIndex` + `onSelect`; SelectMonthSheet exposes
 *   `value` + `onChange` (and optional `options`) and forwards them so a tap
 *   propagates to the host screen and re-filters. Both props are optional —
 *   omit them and the sheet keeps its legacy uncontrolled (idx0) behaviour,
 *   so other template usages (`selector`, eligibility, etc.) are unaffected.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Imports: BottomSheet (which composes BottomSheetHeader + Choice).
 */
import React, { forwardRef } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheet } from './BottomSheet';

// Demo months — "February 2026" (index 0) is the selected row per Figma.
export const SELECT_MONTH_OPTIONS = [
  'February 2026',
  'September 2025',
  'July 2025',
  'June 2025',
];

export interface SelectMonthSheetProps {
  /** Month labels to list. Defaults to SELECT_MONTH_OPTIONS. */
  options?: string[];
  /**
   * Selected month index (controlled). Pass with `onChange` to make tapping
   * a month re-filter the host screen. Omit both for uncontrolled (idx 0).
   */
  value?: number;
  /** Fires the tapped month index. */
  onChange?: (index: number) => void;
}

export const SelectMonthSheet = forwardRef<BottomSheetModal, SelectMonthSheetProps>(
  function SelectMonthSheet({ options = SELECT_MONTH_OPTIONS, value, onChange }, ref) {
    return (
      <BottomSheet
        ref={ref}
        title="Select Month"
        template="month-picker"
        bodyProps={{ options, selectedIndex: value, onSelect: onChange }}
      />
    );
  }
);
