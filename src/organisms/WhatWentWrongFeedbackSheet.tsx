/**
 * WhatWentWrongFeedbackSheet — organism
 *
 * "What Went Wrong?" feedback checklist (Figma 3632:193094), opened when the
 * user answers "No" to "Did You Shop?". A multi-select list of reasons (reused
 * <Choice type="checkbox"> rows) + a cobalt "Submit Feedback" CTA, disabled
 * until at least one reason is picked.
 *
 * There is no backend for this signal, so submission is surfaced to the caller
 * via onSubmit(reasons) — the screen records it as an analytics event and then
 * shows the FeedbackAppreciatedSheet.
 *
 * Composition: <BottomSheetModal> + <BottomSheetHeader> (title + stroke) +
 * <Choice> rows + reused <Button>. Selection state resets each time the sheet
 * is dismissed so a re-open starts clean.
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
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

import { Button } from '../atoms';
import { Choice } from '../molecules';
import { BottomSheetHeader } from './BottomSheetHeader';
import { colors, spacing, radius } from '../tokens';

/** The fixed reason list shown in the sheet (Figma 3632:193094). */
export const WHAT_WENT_WRONG_REASONS = [
  'I didn’t understand how cashback works',
  'I don’t find value in using CK',
  'No price difference',
] as const;

export interface WhatWentWrongFeedbackSheetProps {
  /** Fired with the picked reasons when "Submit Feedback" is tapped. The
   *  sheet dismisses itself first. */
  onSubmit?: (reasons: string[]) => void;
}

export const WhatWentWrongFeedbackSheet = forwardRef<
  BottomSheetModalRef,
  WhatWentWrongFeedbackSheetProps
>(function WhatWentWrongFeedbackSheet({ onSubmit }, ref) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModalRef>(null);
  useImperativeHandle(ref, () => sheetRef.current as BottomSheetModalRef);

  // One checked flag per reason. Reset on dismiss so a re-open starts clean.
  const [checked, setChecked] = useState<boolean[]>(() =>
    WHAT_WENT_WRONG_REASONS.map(() => false)
  );
  const anySelected = checked.some(Boolean);

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

  const handleSubmit = useCallback(() => {
    const reasons = WHAT_WENT_WRONG_REASONS.filter((_, i) => checked[i]);
    sheetRef.current?.dismiss();
    onSubmit?.(reasons);
  }, [checked, onSubmit]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      onDismiss={() => setChecked(WHAT_WENT_WRONG_REASONS.map(() => false))}
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
            paddingBottom: spacing[8],
            gap: spacing[12],
          }}
        >
          {WHAT_WENT_WRONG_REASONS.map((reason, i) => (
            <Choice
              key={reason}
              type="checkbox"
              checked={checked[i]}
              label={reason}
              onChange={(next) =>
                setChecked((prev) =>
                  prev.map((v, idx) => (idx === i ? next : v))
                )
              }
            />
          ))}
        </View>

        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingTop: spacing[12],
            paddingBottom: insets.bottom + spacing[14],
          }}
        >
          <Button
            label="Submit Feedback"
            variant="solid"
            tone="second"
            size={52}
            fullWidth
            disabled={!anySelected}
            onPress={handleSubmit}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export type WhatWentWrongFeedbackSheetRef = BottomSheetModalRef;
