/**
 * EarnLoginSheet — organism
 *
 * Shown when a signed-out person taps a card's "Apply Now" or a store's
 * "Shop & Earn". Login is optional, but cashback is credited to a CashKaro
 * account, so this is the moment to ask: log in to earn, or continue without
 * cashback (never a dead end).
 *
 * Same composition as LogoutConfirmSheet: dynamic-sized gorhom modal, drag
 * handle, title + body, two Buttons. Imperative API: ref.present() / dismiss().
 */
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import type {
  BottomSheetModal as BottomSheetModalRef,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Button } from '../atoms';
import { BottomSheetHeader } from './BottomSheetHeader';
import { colors, spacing, radius } from '../tokens';

export type EarnLoginKind = 'card' | 'store';

export interface EarnLoginSheetProps {
  kind: EarnLoginKind;
  onLogin: () => void;
  onContinue: () => void;
}

const COPY: Record<EarnLoginKind, { body: string; continue: string }> = {
  card: {
    body: 'Cashback for this card is credited to your CashKaro account. You can still apply without logging in, but you won’t earn it.',
    continue: 'Apply without cashback',
  },
  store: {
    body: 'Cashback on this purchase is credited to your CashKaro account. You can still shop without logging in, but you won’t earn it.',
    continue: 'Shop without cashback',
  },
};

export const EarnLoginSheet = forwardRef<BottomSheetModalRef, EarnLoginSheetProps>(
  function EarnLoginSheet({ kind, onLogin, onContinue }, ref) {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModalRef>(null);
    useImperativeHandle(ref, () => sheetRef.current as BottomSheetModalRef);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.72} />
      ),
      []
    );

    const copy = COPY[kind];

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
          <BottomSheetHeader />
          <View
            style={{
              paddingHorizontal: spacing[16],
              paddingTop: spacing[8],
              paddingBottom: spacing[20],
              gap: spacing[8],
              alignItems: 'center',
            }}
          >
            <Text variant="heading20SemiBold" color={colors.text.primary} align="center">
              Log in to earn cashback
            </Text>
            <Text variant="body16Regular" color={colors.text.secondary} align="center">
              {copy.body}
            </Text>
          </View>
          <View
            style={{
              gap: spacing[8],
              paddingHorizontal: spacing[16],
              paddingTop: spacing[4],
              paddingBottom: insets.bottom + spacing[14],
            }}
          >
            <Button
              label="Log in"
              variant="solid"
              tone="main"
              size={52}
              fullWidth
              onPress={() => {
                sheetRef.current?.dismiss();
                onLogin();
              }}
            />
            <Button
              label={copy.continue}
              variant="subtle"
              tone="second"
              size={52}
              fullWidth
              onPress={() => {
                sheetRef.current?.dismiss();
                onContinue();
              }}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export type EarnLoginSheetRef = BottomSheetModalRef;
