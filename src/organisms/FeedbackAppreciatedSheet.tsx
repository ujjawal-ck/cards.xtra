/**
 * FeedbackAppreciatedSheet — organism
 *
 * "Your Feedback is Appreciated" confirmation bottom sheet (Figma 3632:193594),
 * shown after the WhatWentWrongFeedbackSheet is submitted. A titled header,
 * a green seal-check badge, a thank-you paragraph, and a single cobalt
 * "Ok, Got It" CTA that dismisses it.
 *
 * The seal badge is drawn inline (no matching asset in src/assets/icons) and
 * tinted with colors.feedback.success.default so it stays token-bound.
 *
 * Composition mirrors the other sheets: <BottomSheetModal> +
 * <BottomSheetHeader> + reused <Button>. Imperative API: ref.present().
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

import { Text, Button } from '../atoms';
import { BottomSheetHeader } from './BottomSheetHeader';
import { colors, spacing, radius } from '../tokens';

export interface FeedbackAppreciatedSheetProps {
  /** Fired when "Ok, Got It" is tapped (after the sheet dismisses). */
  onDone?: () => void;
}

const SEAL_SIZE = 96;

export const FeedbackAppreciatedSheet = forwardRef<
  BottomSheetModalRef,
  FeedbackAppreciatedSheetProps
>(function FeedbackAppreciatedSheet({ onDone }, ref) {
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

  const handleDone = useCallback(() => {
    sheetRef.current?.dismiss();
    onDone?.();
  }, [onDone]);

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
        <BottomSheetHeader title="Your Feedback is Appreciated" showStroke />

        <View
          style={{
            paddingHorizontal: spacing[24],
            paddingTop: spacing[32],
            paddingBottom: spacing[24],
            gap: spacing[24],
            alignItems: 'center',
          }}
        >
          <SealCheck size={SEAL_SIZE} />
          <Text variant="body16Regular" color={colors.text.primary} align="center">
            Thank you for sharing the details. Our team will get back to you
            within 48 hours, maybe even sooner.
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingBottom: insets.bottom + spacing[14],
          }}
        >
          <Button
            label="Ok, Got It"
            variant="solid"
            tone="second"
            size={52}
            fullWidth
            onPress={handleDone}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export type FeedbackAppreciatedSheetRef = BottomSheetModalRef;

// ----------------------------------------------------------------------------
// SealCheck — a green multi-point seal badge with a white check. Drawn inline
// (no asset in src/assets/icons). The seal outline is generated once from a
// star polygon so the points are evenly spaced; both the fill and the check
// use semantic tokens (success green / white).
// ----------------------------------------------------------------------------
const SEAL_POINTS = 11;
const SEAL_OUTER = 47;
const SEAL_INNER = 39;
const SEAL_CENTER = 50; // viewBox is 100×100
// Check stroke weight in the 100-unit viewBox (a bold tick inside the badge —
// component-spec art value, not a border token which tops out at ~2px).
const SEAL_CHECK_STROKE = 8;

function buildSealPath() {
  const step = Math.PI / SEAL_POINTS;
  let d = '';
  for (let i = 0; i < SEAL_POINTS * 2; i++) {
    const r = i % 2 === 0 ? SEAL_OUTER : SEAL_INNER;
    const a = i * step - Math.PI / 2;
    const x = SEAL_CENTER + r * Math.cos(a);
    const y = SEAL_CENTER + r * Math.sin(a);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return `${d}Z`;
}

const SEAL_PATH = buildSealPath();

function SealCheck({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d={SEAL_PATH} fill={colors.feedback.success.default} />
      <Path
        d="M33 51 L45 63 L68 38"
        stroke={colors.text.inverse}
        strokeWidth={SEAL_CHECK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
