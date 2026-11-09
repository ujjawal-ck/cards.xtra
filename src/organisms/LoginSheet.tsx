/**
 * LoginSheet — organism (Figma 1929:31026)
 *
 * Bottom sheet that slides up over the Onboarding screen with a
 * dim scrim + the Cards.xtra wordmark floating on the scrim. Replaces
 * the old standalone LoginScreen as the primary entry to OTP.
 *
 * Composition — pure reuse, no new components:
 *   - <BottomSheetModal>          (@gorhom/bottom-sheet)
 *   - Custom backdrop wrapper (extends gorhom's BottomSheetBackdrop
 *     with the Cards.xtra logo absolutely positioned ON the scrim —
 *     gorhom's stock backdrop doesn't accept children).
 *   - <BottomSheetHeader> organism, no title (drag handle only).
 *   - <Input> atom (Mobile Number field).
 *   - <Button> atom (cobalt "Get OTP", size 52, fullWidth).
 *   - <TermsAndConditions> molecule, text-only (checked='none').
 *
 * Imperative API:
 *   ref.present() / ref.dismiss() — mirrors @gorhom/bottom-sheet.
 *
 * Hex → token: every value via src/tokens — no inline hex / shadows.
 */
import React, {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import type {
  BottomSheetModal as BottomSheetModalRef,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Input, Button } from '../atoms';
import { TermsAndConditions } from '../molecules';
import { BottomSheetHeader } from './BottomSheetHeader';
import { logos } from '../assets/logos';
import { colors, spacing, radius } from '../tokens';
import { normalizeIndianMobile, PHONE_INPUT_MAX_LENGTH } from '../lib/phone';

// Logo dimensions — Figma fixed 124.972 × 98.503; rounded to clean px.
const LOGO_W = 125;
const LOGO_H = 98;
// Approx 40-px gap between the logo and the sheet's top edge per spec
// — used as the logo's bottom offset below the safe-area top.
const LOGO_OFFSET_TOP = spacing[64]; // 64 — safe-area aware via insets.top below.

export interface LoginSheetProps {
  /** Fired on Get OTP with the mobile number string (digits only). */
  onSubmit?: (phone: string) => void;
  defaultPhone?: string;
}

/**
 * Backdrop with logo — wraps gorhom's stock BottomSheetBackdrop in a
 * View, with the Cards.xtra wordmark absolutely positioned in the
 * upper area ON the scrim (pointerEvents:'none' so it doesn't block
 * tap-outside-to-dismiss). The standard BottomSheetBackdrop handles
 * the dim animation + tap behaviour for us.
 */
function LoginScrim(props: BottomSheetBackdropProps) {
  const insets = useSafeAreaInsets();
  const LogoLight = logos.lightBig;
  return (
    <View style={props.style} pointerEvents="box-none">
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + LOGO_OFFSET_TOP,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <LogoLight width={LOGO_W} height={LOGO_H} />
      </View>
    </View>
  );
}

export const LoginSheet = forwardRef<BottomSheetModalRef, LoginSheetProps>(
  function LoginSheet({ onSubmit, defaultPhone = '' }, ref) {
    const insets = useSafeAreaInsets();
    // Internal ref for the dismiss handlers, plus a callback ref that
    // also forwards the gorhom instance to the parent. Previously this
    // used `useImperativeHandle(ref, () => sheetRef.current as ...)` —
    // that captures a snapshot at the first render when the gorhom
    // ref is still null, so the parent's `.present()` was a no-op
    // until the next re-render (which never happened on a static
    // page like Onboarding).
    const sheetRef = useRef<BottomSheetModalRef | null>(null);
    const handleRef = useCallback(
      (node: BottomSheetModalRef | null) => {
        sheetRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<BottomSheetModalRef | null>).current =
            node;
        }
      },
      [ref]
    );

    const [phone, setPhone] = useState(defaultPhone);
    const isValid = phone.replace(/\D/g, '').length === 10;

    // Single snap point — sheet sizes for the form's natural height
    // plus the keyboard inset on focus. ~50% is enough for the four
    // blocks (heading + input + CTA + T&C) on most devices.
    const snapPoints = useMemo(() => ['52%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => <LoginScrim {...props} />,
      []
    );

    const handleSubmit = () => {
      if (!isValid) return;
      sheetRef.current?.dismiss();
      // Brief gap so the sheet's dismiss animation completes before
      // the caller's navigation kicks in (avoids gorhom race on iOS).
      setTimeout(() => onSubmit?.(phone), 200);
    };

    return (
      <BottomSheetModal
        ref={handleRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        // BottomSheetHeader (below) provides the visual drag handle;
        // hide gorhom's default. Same trick the project's other
        // sheets use.
        handleComponent={() => null}
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        {/* Header — REUSED BottomSheetHeader, no title, no stroke */}
        <BottomSheetHeader showStroke={false} />

        {/* Body */}
        <View
          style={{
            backgroundColor: colors.surface.default,
            paddingTop: spacing[24],
            paddingBottom: insets.bottom + spacing[20],
            paddingHorizontal: spacing[20],
            gap: spacing[24],
            alignItems: 'flex-start',
          }}
        >
          {/* 1. Heading block — centred, full width */}
          <View
            style={{
              width: '100%',
              alignItems: 'center',
              gap: spacing[4],
            }}
          >
            <Text
              variant="heading24SemiBold"
              color={colors.text.primary}
              align="center"
            >
              Log in or Sign up
            </Text>
            <Text
              variant="body14Regular"
              color={colors.text.secondary}
              align="center"
            >
              We will send an OTP to verify
            </Text>
          </View>

          {/* 2. Input — REUSED Input atom */}
          <View style={{ width: '100%' }}>
            <Input
              label="Mobile Number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) =>
                setPhone(normalizeIndianMobile(t))
              }
              maxLength={PHONE_INPUT_MAX_LENGTH}
            />
          </View>

          {/* 3. CTA — REUSED Button atom (cobalt) */}
          <Button
            label="Get OTP"
            variant="solid"
            tone="second"
            size={52}
            fullWidth
            disabled={!isValid}
            onPress={handleSubmit}
          />

          {/* 4. T&C — REUSED TermsAndConditions, text-only variant */}
          <TermsAndConditions
            checked="none"
            // 'multi-line' body wraps the long copy without truncation
            // on narrow screens; default 1-line clips.
            body="multi-line"
            label="By continuing, you agree to Cashkaro's Terms & Conditions and Privacy Policy"
          />
        </View>
      </BottomSheetModal>
    );
  }
);

export type LoginSheetRef = BottomSheetModalRef;
