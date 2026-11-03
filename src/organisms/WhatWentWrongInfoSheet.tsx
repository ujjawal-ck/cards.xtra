/**
 * WhatWentWrongInfoSheet — organism
 *
 * "What Went Wrong?" explainer bottom sheet (Figma 3632:194734), opened from
 * the "Learn More" link on the no-visits (Oops) screen. A read-only sheet:
 * a titled header with a bottom stroke, an explanatory paragraph, and a
 * single cobalt "Okay" CTA that dismisses it.
 *
 * Same composition as LogoutConfirmSheet: <BottomSheetModal> (dynamic-sized,
 * pan-to-close) + <BottomSheetHeader> (title + stroke) + a reused <Button>.
 * Imperative API: ref.present() / ref.dismiss().
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

import { Text, Button } from '../atoms';
import { BottomSheetHeader } from './BottomSheetHeader';
import { colors, spacing, radius } from '../tokens';

export interface WhatWentWrongInfoSheetProps {
  /** Support email surfaced in the body copy. */
  supportEmail?: string;
}

export const WhatWentWrongInfoSheet = forwardRef<
  BottomSheetModalRef,
  WhatWentWrongInfoSheetProps
>(function WhatWentWrongInfoSheet(
  { supportEmail = 'contact@cardsxtra.com' },
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
        <BottomSheetHeader title="What Went Wrong?" showStroke />

        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingTop: spacing[16],
            paddingBottom: spacing[24],
          }}
        >
          <Text variant="body16Regular" color={colors.text.primary}>
            We get commission (and pay you Cashback) only when you visit the
            website via CARDS.xtra and shop. If you shopped via CARDS.xtra over
            30 days ago, please reach out at {supportEmail}
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingBottom: insets.bottom + spacing[14],
          }}
        >
          <Button
            label="Okay"
            variant="solid"
            tone="second"
            size={52}
            fullWidth
            onPress={() => sheetRef.current?.dismiss()}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export type WhatWentWrongInfoSheetRef = BottomSheetModalRef;
