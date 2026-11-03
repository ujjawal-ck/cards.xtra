/**
 * LogoutConfirmSheet — organism
 *
 * Confirmation bottom sheet shown before signing the user out (tapping the
 * Logout control on the Profile screen). A reversible-action guard: "Do you
 * really want to log out?" with a No / Yes choice.
 *
 * Pure composition of existing pieces (same pattern as
 * CashbackNotConfirmedSheet):
 *   - <BottomSheetModal> (@gorhom) — dynamic-sized, pan-to-close, hidden
 *     default handle, 24-px top corners.
 *   - <BottomSheetHeader />  — drag handle only.                    ← REUSED
 *   - Title + body question.
 *   - Action row of two <Button> atoms:                             ← REUSED
 *       → "Yes" (left, hugs)  = cobalt OUTLINE pill — confirms the logout.
 *       → "No"  (right, fills/bigger) = cobalt SOLID pill — the safe choice.
 *
 * Imperative API: ref.present() / ref.dismiss() (mirrors @gorhom).
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

export interface LogoutConfirmSheetProps {
  /** Fired when the user confirms ("Yes"). The sheet dismisses first. */
  onConfirm?: () => void;
}

export const LogoutConfirmSheet = forwardRef<
  BottomSheetModalRef,
  LogoutConfirmSheetProps
>(function LogoutConfirmSheet({ onConfirm }, ref) {
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

  const handleYes = useCallback(() => {
    sheetRef.current?.dismiss();
    onConfirm?.();
  }, [onConfirm]);

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
        {/* Header — drag handle only. */}
        <BottomSheetHeader />

        {/* Body */}
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
            Log out?
          </Text>
          <Text variant="body16Regular" color={colors.text.secondary} align="center">
            Do you really want to log out of your account?
          </Text>
        </View>

        {/* Action row — two reused <Button> atoms.
            Yes (left, hugs) = cobalt outline pill confirming logout;
            No (right, flex:1 → bigger) = cobalt solid pill. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[12],
            paddingHorizontal: spacing[16],
            paddingTop: spacing[12],
            paddingBottom: insets.bottom + spacing[14],
          }}
        >
          <Button
            label="Yes"
            variant="outline"
            tone="second"
            size={52}
            onPress={handleYes}
            style={{ borderRadius: radius.full }}
          />
          <View style={{ flex: 1 }}>
            <Button
              label="No"
              variant="solid"
              tone="second"
              size={52}
              fullWidth
              onPress={() => sheetRef.current?.dismiss()}
              style={{ borderRadius: radius.full }}
            />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export type LogoutConfirmSheetRef = BottomSheetModalRef;
