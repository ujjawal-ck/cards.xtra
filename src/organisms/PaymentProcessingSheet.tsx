/**
 * PaymentProcessingSheet — organism
 *   Figma Dev Handover - My Earnings / Payment Is Processing (mobile sheet
 *   2047:25399)
 *
 * Shown when the user taps "Withdraw" on the Earnings screen while a previous
 * payout is STILL in process — a new request is blocked until it settles. A
 * short info sheet, same composition pattern as CashbackNotConfirmedSheet /
 * EarningStatusSheet (content-hugging, dynamic-sized).
 *
 * Content (vertical, centred — gap 24):
 *   - BottomSheetHeader (drag handle only — no title, no stroke)        ← REUSED
 *   - Wallet+refresh illustration (illus-payment-processing.svg, 158×132)
 *     with the "5 Min to 72 Hrs" ETA pill overlapping its base.
 *   - Title "Payment Is Processing" (heading20SemiBold)
 *     + body "We've already got your payment request of <amount>, which will
 *       be done within 5 min to 72 hours." (body16Regular)
 *   - Note "Note - You can request another payment after this is completed :)"
 *   - FooterButtons single, cobalt, "Browse More Deals" → onBrowseDeals  ← REUSED
 *
 * Imperative API: ref.present() / ref.dismiss() (mirrors @gorhom).
 *
 * Hex → token: title/body #262626 / black@80% → text.primary / text.secondary;
 * ETA pill colours → colors.paymentProcessingPill; CTA #0036da = FooterButtons
 * color='second' (cobalt); scrim 0.72 per the sibling sheets.
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
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../atoms';
import { BottomSheetHeader } from './BottomSheetHeader';
import { FooterButtons } from './FooterButtons';
import { colors, spacing, radius, borderWidth } from '../tokens';

// Wallet + refresh-arc illustration (Figma imagevck, 220×184 source). Rendered
// at the sheet's 158×132 size. Imported directly (not via the square Icon atom)
// to preserve its aspect ratio.
const PaymentProcessingArt = require('../assets/icons/illus-payment-processing.svg').default;

const ART_W = 158;
const ART_H = 132;

export interface PaymentProcessingSheetProps {
  /** Amount of the in-process payment request, e.g. "₹100". Default "₹100". */
  amount?: string;
  /** Tapping "Browse More Deals". Defaults to just dismissing the sheet. */
  onBrowseDeals?: () => void;
}

export const PaymentProcessingSheet = forwardRef<
  BottomSheetModalRef,
  PaymentProcessingSheetProps
>(function PaymentProcessingSheet({ amount = '₹100', onBrowseDeals }, ref) {
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

  const handlePrimary = useCallback(() => {
    sheetRef.current?.dismiss();
    onBrowseDeals?.();
  }, [onBrowseDeals]);

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
            paddingBottom: spacing[24],
            gap: spacing[24],
            alignItems: 'center',
          }}
        >
          {/* Illustration + ETA pill. The pill overlaps the illustration's
              base, so the wrapper is sized to the art and the pill is absolutely
              positioned, nudged below the bottom edge. */}
          <View style={{ width: ART_W, height: ART_H, alignItems: 'center' }}>
            <PaymentProcessingArt width={ART_W} height={ART_H} />
            <LinearGradient
              colors={[
                colors.paymentProcessingPill.gradientStart,
                colors.paymentProcessingPill.gradientEnd,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                bottom: -10,
                paddingHorizontal: spacing[12],
                paddingVertical: spacing[2],
                borderRadius: radius.full,
                borderWidth: borderWidth.heavy,
                borderColor: colors.paymentProcessingPill.border,
              }}
            >
              <Text
                variant="body12SemiBold"
                color={colors.paymentProcessingPill.text}
                align="center"
              >
                5 Min to 72 Hrs
              </Text>
            </LinearGradient>
          </View>

          {/* Text block */}
          <View style={{ gap: spacing[16], alignItems: 'center', width: '100%' }}>
            <View style={{ gap: spacing[12], alignItems: 'center', width: '100%' }}>
              <Text
                variant="heading20SemiBold"
                color={colors.text.primary}
                align="center"
              >
                Payment Is Processing
              </Text>
              <Text
                variant="body16Regular"
                color={colors.text.secondary}
                align="center"
              >
                We've already got your payment request of {amount}, which will be
                done within 5 min to 72 hours.
              </Text>
            </View>
            <Text
              variant="body16Regular"
              color={colors.text.secondary}
              align="center"
            >
              <Text variant="body16SemiBold" color={colors.text.primary}>
                Note -
              </Text>{' '}
              You can request another payment after this is completed :)
            </Text>
          </View>
        </View>

        {/* Footer — REUSED, cobalt single CTA per Figma. */}
        <FooterButtons
          buttons="single"
          color="second"
          primaryLabel="Browse More Deals"
          onPrimary={handlePrimary}
          style={{ paddingBottom: insets.bottom }}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export type PaymentProcessingSheetRef = BottomSheetModalRef;
