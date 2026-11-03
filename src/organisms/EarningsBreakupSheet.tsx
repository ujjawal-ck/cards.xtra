/**
 * EarningsBreakupSheet — organism
 *   Figma earnings/day-n-confirmed/bottomsheet/cashback-status (2898:166495)
 *        earnings/day-n-confirmed/bottomsheet/rewards-breakup  (2898:165012)
 *
 * One sheet, two variants (the Figma nodes are identical apart from the
 * title and the row amounts):
 *   variant='cashback' → title "Cashback Status"
 *   variant='rewards'  → title "Rewards Breakup"
 *
 * Tapping the Cashback / Rewards stat card on the Earnings masthead opens
 * this. Content (content-hugging sheet — no scroll-to-expand, it's a short
 * info sheet so it uses @gorhom's dynamic sizing):
 *   - BottomSheetHeader (drag handle + title + bottom stroke)   ← REUSED
 *   - Three amount + status rows (Confirmed / Pending / Paid),   ← REUSED
 *     each a ListRow type='amount-status' with a Divider between.
 *     Row 1 carries the "Available for Withdrawal" biline.
 *   - Legend: three coloured-dot rows explaining each status.
 *   - FooterButtons single, cobalt, "Ok, Got It" → dismiss.      ← REUSED
 *
 * Imperative API: ref.present() / ref.dismiss() (mirrors @gorhom), same
 * pattern as EligibilityCheckerSheet / SelectMonthSheet.
 *
 * Hex → token (every value via src/tokens):
 *   #26a651 → colors.feedback.success.default  (Confirmed + Pending dots)
 *   #ff6d1d → colors.action.primary.default     (Paid dot)
 *   #ffffff → colors.surface.default
 *   24 rad  → radius['2xl']
 *
 * NOTE on legend copy: the Figma reuses the cashback legend verbatim on the
 * Rewards sheet (it literally reads "Confirmed Cashback" etc. there), and
 * the third bullet is labelled "Confirmed Cashback" in both — a design
 * typo, since its dot is saffron and the copy describes paid earnings. We
 * keep the legend faithful to Figma but fix that one label to "Paid
 * Cashback" so it matches its row's "Paid" badge.
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type {
  BottomSheetModal as BottomSheetModalRef,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Divider } from '../atoms';
import { ListRow } from '../molecules';
import { BottomSheetHeader } from './BottomSheetHeader';
import { FooterButtons } from './FooterButtons';
import { colors, spacing, radius } from '../tokens';

export type EarningsBreakupVariant = 'cashback' | 'rewards';

export interface EarningsBreakupSheetProps {
  variant?: EarningsBreakupVariant;
  /** Confirmed / withdrawable amount, e.g. "₹1500.0". */
  confirmed?: string;
  /** Pending amount, e.g. "₹0.0". */
  pending?: string;
  /** Already-paid amount, e.g. "₹0.0". */
  paid?: string;
}

const TITLE: Record<EarningsBreakupVariant, string> = {
  cashback: 'Cashback Status',
  rewards: 'Rewards Breakup',
};

// Legend rows — dot colour + bold label + body copy. Matches the Figma
// (which reuses the cashback wording on both sheets); only the third
// label is corrected from "Confirmed" → "Paid".
const LEGEND: Array<{ dot: string; label: string; body: string }> = [
  {
    dot: colors.feedback.success.default,
    label: 'Confirmed Cashback:',
    body: ' Earnings after the return/cancellation period, which is available for withdrawal via bank transfer, UPI or NEFT. You will need a minimum of ₹250 confirmed Cashback to proceed.',
  },
  {
    dot: colors.feedback.success.default,
    label: 'Pending Cashback:',
    body: ' Earnings before the return/cancellation period.',
  },
  {
    dot: colors.action.primary.default,
    label: 'Paid Cashback:',
    body: ' Earnings that have already been paid to you.',
  },
];

// Legend dot — small filled circle, sat in a fixed-width column so the
// wrapped body text hangs to its right (matches the Figma 16-px icon slot).
const LEGEND_DOT = spacing[8]; // 8
const LEGEND_DOT_COL = spacing[16]; // 16

function LegendRow({
  dot,
  label,
  body,
}: {
  dot: string;
  label: string;
  body: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing[4] }}>
      <View
        style={{
          width: LEGEND_DOT_COL,
          alignItems: 'center',
          // Nudge the dot down so it centres on the first text line
          // (body14 line-height 20 → dot 8 → ~6px top inset).
          paddingTop: spacing[6],
        }}
      >
        <View
          style={{
            width: LEGEND_DOT,
            height: LEGEND_DOT,
            borderRadius: radius.full,
            backgroundColor: dot,
          }}
        />
      </View>
      <Text
        variant="body14Regular"
        color={colors.text.primary}
        style={{ flex: 1 }}
      >
        <Text variant="body14Bold" color={colors.text.primary}>
          {label}
        </Text>
        {body}
      </Text>
    </View>
  );
}

export const EarningsBreakupSheet = forwardRef<
  BottomSheetModalRef,
  EarningsBreakupSheetProps
>(function EarningsBreakupSheet(
  { variant = 'cashback', confirmed = '₹0.0', pending = '₹0.0', paid = '₹0.0' },
  ref
) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModalRef>(null);
  useImperativeHandle(ref, () => sheetRef.current as BottomSheetModalRef);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // The three status rows, top → bottom (Confirmed carries the biline).
  const rows = useMemo(
    () =>
      [
        { value: confirmed, biline: 'Available for Withdrawal', status: 'confirmed' as const },
        { value: pending, status: 'pending' as const },
        { value: paid, status: 'paid' as const },
      ],
    [confirmed, pending, paid]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      // Content-hugging info sheet — dynamic sizing measures the body so
      // there's no awkward 58% gap and no scroll-to-expand (this isn't a
      // browse sheet). enableDynamicSizing is on by default in gorhom v5;
      // set explicitly for clarity.
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      // Hide gorhom's default handle — BottomSheetHeader renders the
      // visual handle per spec (same trick the other sheets use).
      handleComponent={() => null}
      backgroundStyle={{
        backgroundColor: colors.surface.default,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
      }}
    >
      <BottomSheetView>
        {/* Header — REUSED */}
        <BottomSheetHeader title={TITLE[variant]} showStroke />

        {/* Body — status rows + legend */}
        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingVertical: spacing[24],
            gap: spacing[32],
          }}
        >
          {/* Status rows */}
          <View style={{ gap: spacing[12] }}>
            {rows.map((row, i) => (
              <React.Fragment key={row.status}>
                <ListRow
                  type="amount-status"
                  value={row.value}
                  biline={row.biline}
                  status={row.status}
                />
                {i < rows.length - 1 ? <Divider style="solid" /> : null}
              </React.Fragment>
            ))}
          </View>

          {/* Legend */}
          <View style={{ gap: spacing[8] }}>
            {LEGEND.map((item) => (
              <LegendRow key={item.label} {...item} />
            ))}
          </View>
        </View>

        {/* Footer — REUSED. Cobalt single CTA per Figma (button/accent-bg). */}
        <FooterButtons
          buttons="single"
          color="second"
          primaryLabel="Ok, Got It"
          onPrimary={() => sheetRef.current?.dismiss()}
          style={{ paddingBottom: insets.bottom }}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export type EarningsBreakupSheetRef = BottomSheetModalRef;
