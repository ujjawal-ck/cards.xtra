/**
 * AdvisorChangeAnswerSheet: "Change an answer", opened from the end menu of the advisor chat.
 *
 * One row per answered question, in asking order: the question (small, secondary) above the
 * answer (primary). A tap calls `onPick`; the screen closes the sheet and rewinds to that
 * question. No second confirm: the helper line says later answers are cleared.
 *
 * Same build as the other simple sheets (LogoutConfirmSheet, EarningsBreakupSheet):
 * @gorhom BottomSheetModal with dynamic sizing, BottomSheetHeader for the handle and the title.
 * The rows scroll when they are taller than the window allows.
 *
 * Imperative API: ref.present() / ref.dismiss() (mirrors @gorhom).
 */
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../atoms';
import { BottomSheetHeader } from '../../organisms/BottomSheetHeader';
import { colors, spacing, radius, borderWidth, opacity, sizing } from '../../tokens';
import type { QuestionId } from '../../lib/advisor/types';

/** The sheet never grows past this share of the window; its rows scroll instead. A layout ratio. */
const SHEET_MAX_RATIO = 0.85;

export interface AdvisorChangeAnswerItem {
  questionId: QuestionId;
  ask: string;
  text: string;
}

export const AdvisorChangeAnswerSheet = forwardRef<
  BottomSheetModal,
  { items: AdvisorChangeAnswerItem[]; onPick: (questionId: QuestionId) => void }
>(function AdvisorChangeAnswerSheet({ items, onPick }, ref) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      maxDynamicContentSize={height * SHEET_MAX_RATIO}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleComponent={() => null}
      backgroundStyle={{
        backgroundColor: colors.surface.default,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
      }}
    >
      <BottomSheetScrollView>
        <BottomSheetHeader title="Change an answer" />
        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingBottom: insets.bottom + spacing[16],
            gap: spacing[8],
          }}
        >
          <Text variant="body14Regular" color={colors.text.secondary} align="center">
            Pick the answer to change. Later answers are cleared.
          </Text>
          {items.map((item) => (
            <Pressable
              key={item.questionId}
              onPress={() => onPick(item.questionId)}
              accessibilityRole="button"
              accessibilityLabel={`${item.ask} Your answer: ${item.text}. Change it.`}
              style={({ pressed }) => ({
                minHeight: sizing.touchMin,
                gap: spacing[2],
                paddingHorizontal: spacing[16],
                paddingVertical: spacing[10],
                borderRadius: radius.md,
                borderWidth: borderWidth.thin,
                borderColor: colors.border.default,
                backgroundColor: colors.surface.default,
                opacity: pressed ? opacity[80] : opacity[100],
              })}
            >
              <Text variant="body12Regular" color={colors.text.secondary}>
                {item.ask}
              </Text>
              <Text variant="body14Medium" color={colors.text.primary}>
                {item.text}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
