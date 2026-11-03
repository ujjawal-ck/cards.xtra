/**
 * CashbackNotConfirmedSheet — organism
 *   Figma earnings/day-n-pending/bottomsheet/cashback-not-confirmed
 *   (2898:166460)
 *
 * Shown when the user taps "Withdraw" on the Earnings screen while their
 * CONFIRMED balance is ₹0 — there's nothing to withdraw yet, only pending
 * cashback. A short info sheet, same composition pattern as
 * EarningsBreakupSheet (content-hugging, dynamic-sized).
 *
 * Content (vertical, centred):
 *   - BottomSheetHeader (drag handle only — no title, no stroke)  ← REUSED
 *   - Stopwatch+cash illustration — emoji placeholder (no asset ships;
 *     project convention is emoji for missing imagery).
 *   - Title "Cashback Not Confirmed" (heading20SemiBold)
 *     + body "You have <amount> pending in your Cards.xtra account."
 *       (body16Regular)
 *     + caption "Once confirmed, they can be withdrawn…" (body12Regular)
 *   - FooterButtons single, cobalt, "Ok, Got It" → dismiss             ← REUSED
 *
 * Imperative API: ref.present() / ref.dismiss() (mirrors @gorhom).
 *
 * Hex → token: black-@80% body copy → colors.text.secondary; scrim 0.72
 * per Figma.
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { View, Text as RNText } from 'react-native';
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

import { Text } from '../atoms';
import { BottomSheetHeader } from './BottomSheetHeader';
import { FooterButtons } from './FooterButtons';
import { colors, spacing, radius } from '../tokens';

export interface CashbackNotConfirmedSheetProps {
  /** Pending amount shown in the body, e.g. "₹123". Default "₹0.0". */
  pendingAmount?: string;
}

// Illustration placeholder — the Figma uses a 156-px 3D stopwatch+cash
// render; no asset ships, so a stopwatch emoji stands in. Sizes are
// component-spec values (image dimensions, not type), same pattern as
// the other emoji placeholders in this codebase.
const IMAGE_BOX = 156;
const EMOJI_SIZE = 96;

export const CashbackNotConfirmedSheet = forwardRef<
  BottomSheetModalRef,
  CashbackNotConfirmedSheetProps
>(function CashbackNotConfirmedSheet({ pendingAmount = '₹0.0' }, ref) {
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
        {/* Header — drag handle only (no title / stroke per Figma). */}
        <BottomSheetHeader />

        {/* Body */}
        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingVertical: spacing[20],
            gap: spacing[20],
            alignItems: 'center',
          }}
        >
          {/* Illustration placeholder */}
          <View
            style={{
              width: IMAGE_BOX,
              height: IMAGE_BOX,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RNText
              accessibilityLabel="Pending cashback"
              style={{ fontSize: EMOJI_SIZE, lineHeight: EMOJI_SIZE * 1.1 }}
            >
              ⏱️
            </RNText>
          </View>

          {/* Text block */}
          <View style={{ gap: spacing[24], alignItems: 'center', width: '100%' }}>
            <View style={{ gap: spacing[4], alignItems: 'center', width: '100%' }}>
              <Text
                variant="heading20SemiBold"
                color={colors.text.primary}
                align="center"
              >
                Cashback Not Confirmed
              </Text>
              <Text
                variant="body16Regular"
                color={colors.text.secondary}
                align="center"
              >
                You have {pendingAmount} pending in your Cards.xtra account.
              </Text>
            </View>
            <Text
              variant="body12Regular"
              color={colors.text.secondary}
              align="center"
            >
              Once confirmed, they can be withdrawn. Until then, grab deals &
              earn more!
            </Text>
          </View>
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

export type CashbackNotConfirmedSheetRef = BottomSheetModalRef;
