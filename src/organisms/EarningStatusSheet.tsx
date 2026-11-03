/**
 * EarningStatusSheet — organism
 *   Figma earnings/day-n-pending/bottomsheet/earning-status (2898:166477)
 *
 * Shown when the user taps "Know Why?" on the Earnings screen's Pending
 * row — explains why a pending amount can't be withdrawn yet. Content-
 * hugging info sheet, same composition pattern as EarningsBreakupSheet.
 *
 * Content (vertical, centred):
 *   - BottomSheetHeader (drag handle + "Earning Status" title + stroke) ← REUSED
 *   - Amount (display32Bold) + StatusBadge "Cashback Pending" (amber)   ← REUSED
 *   - Body "Cashback stays pending until the product return/cancellation
 *     period ends" (body17Regular)
 *   - FooterButtons single, cobalt, "Ok, Got It" → dismiss              ← REUSED
 *
 * Imperative API: ref.present() / ref.dismiss() (mirrors @gorhom).
 *
 * Hex → token: amber "Cashback Pending" badge = StatusBadge status='pending'
 * (colors.status.pending); black-@80% body copy → colors.text.secondary;
 * scrim 0.72 per Figma.
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
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

import { Text, StatusBadge } from '../atoms';
import { BottomSheetHeader } from './BottomSheetHeader';
import { FooterButtons } from './FooterButtons';
import { colors, spacing, radius } from '../tokens';

export type EarningStatusVariant = 'pending' | 'paid';

export interface EarningStatusSheetProps {
  /** Amount shown large, e.g. "₹1500.0". Default "₹0.0". */
  amount?: string;
  /** Which lifecycle state to explain. Default 'pending'. */
  variant?: EarningStatusVariant;
}

// Per-variant badge + body copy. 'pending' = amber "Cashback Pending"
// (Know Why?); 'paid' = cobalt "Cashback Paid" (Paid row's View).
const VARIANT_CONTENT: Record<
  EarningStatusVariant,
  { status: 'pending' | 'paid'; label: string; body: string }
> = {
  pending: {
    status: 'pending',
    label: 'Cashback Pending',
    body: 'Cashback stays pending until the product return/cancellation period ends',
  },
  paid: {
    status: 'paid',
    label: 'Cashback Paid',
    body: 'These are the earnings that have already been paid',
  },
};

export const EarningStatusSheet = forwardRef<
  BottomSheetModalRef,
  EarningStatusSheetProps
>(function EarningStatusSheet({ amount = '₹0.0', variant = 'pending' }, ref) {
  const content = VARIANT_CONTENT[variant];
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModalRef>(null);
  useImperativeHandle(ref, () => sheetRef.current as BottomSheetModalRef);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.72}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleComponent={() => null}
      backgroundStyle={{
        backgroundColor: colors.surface.default,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
      }}
    >
      <BottomSheetView>
        {/* Header — title + bottom stroke per Figma. */}
        <BottomSheetHeader title="Earning Status" showStroke />

        {/* Body */}
        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingVertical: spacing[20],
            gap: spacing[20],
            alignItems: 'center',
          }}
        >
          <View style={{ gap: spacing[10], alignItems: 'center' }}>
            <Text
              variant="display32Bold"
              color={colors.text.primary}
              align="center"
            >
              {amount}
            </Text>
            <StatusBadge
              status={content.status}
              label={content.label}
              style={{ alignSelf: 'center' }}
            />
          </View>

          <Text
            variant="body17Regular"
            color={colors.text.secondary}
            align="center"
          >
            {content.body}
          </Text>
        </View>

        {/* Footer — REUSED, cobalt single CTA per Figma. */}
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

export type EarningStatusSheetRef = BottomSheetModalRef;
