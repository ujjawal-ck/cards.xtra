/**
 * EditSpendsSheet: edit the spend answers in place, from a result screen.
 *
 * Lists the questions for `keys` (default: all 21), each under its category
 * label, as a compact SpendCard with the question hint. Starts from `answers`
 * every time it opens. "Update results" calls `onSubmit` with the full new
 * answers (`answers` with the edits on top) and closes the sheet.
 * `present(focusKey)` opens the sheet and scrolls to that question.
 * Optional `onAddCategory`: when set, a "+ Add a category" row ends the list
 * and calls it after submitting the edits in the sheet (the screen decides
 * where the user adds the category).
 *
 * The list is a BottomSheetFlatList, so only the rulers near the screen are
 * mounted (21 rulers at a few hundred ticks each are too many views at once).
 * SpendCard is used through its original props only (no typed entry). When a
 * saved answer is above the question's `rulerMax`, the ruler is made longer
 * for that card (`rulerRange`, up to the typed `max`) so the value is not cut.
 * Not verified: SpendCard scrolls its ruler to the value on mount; if a
 * platform reports that scroll as a momentum end, an answer that is not on a
 * whole step may be snapped to the nearest step when the sheet opens.
 *
 * Built like EligibilityCheckerSheet: BottomSheetModal, BottomSheetHeader as
 * the handle, BottomSheetFooter for the sticky CTA. Not run on a device:
 * check the ruler drag inside the sheet.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
  type BottomSheetFlatListMethods,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Button } from '../atoms';
import { SpendCard } from '../molecules';
import { colors, spacing, radius, borderWidth, opacity } from '../tokens';
import { BottomSheetHeader } from './BottomSheetHeader';
import type { SpendKey, SpendQuestion } from '../lib/cardTools';
import { editSheetItems, rulerRange, type EditSheetItem } from '../lib/leagueView';

export interface EditSpendsSheetProps {
  /** Which questions to list. Default: all 21. */
  keys?: SpendKey[];
  answers: Partial<Record<SpendKey, number>>;
  /** Called with the full new answers when the user confirms. The sheet closes itself. */
  onSubmit: (answers: Partial<Record<SpendKey, number>>) => void;
  /** When set, the list ends with a "+ Add a category" row that calls it. */
  onAddCategory?: () => void;
}

export interface EditSpendsSheetHandle {
  present(focusKey?: SpendKey): void;
  dismiss(): void;
}

type Answers = Partial<Record<SpendKey, number>>;

const SNAP_POINTS = ['90%'];
const CTA_H = 52;
// Same pan limits as CardDetailSheet: the sheet pans only on clear vertical
// moves, so the horizontal rulers keep their drags (Android ate them without).
const PAN_ACTIVE_OFFSET_Y: [number, number] = [-spacing[12], spacing[12]];
const PAN_FAIL_OFFSET_X: [number, number] = [-spacing[8], spacing[8]];

function periodText(q: SpendQuestion): string {
  if (q.unit === 'visits') return 'visits a year';
  return q.period === 'month' ? 'per month' : 'per year';
}

const QuestionItem = React.memo(function QuestionItem({
  question,
  value,
  onChange,
}: {
  question: SpendQuestion;
  value: number;
  onChange: (key: SpendKey, value: number) => void;
}) {
  const ruler = rulerRange(question, value);
  return (
    <View style={{ gap: spacing[6], paddingHorizontal: spacing[16], paddingBottom: spacing[12] }}>
      {question.hint ? (
        <Text variant="body12Regular" color={colors.text.secondary}>
          {`Like ${question.hint}`}
        </Text>
      ) : null}
      <SpendCard
        name={question.label}
        value={value}
        onChange={(v) => onChange(question.key, v)}
        min={question.min}
        max={ruler.max}
        step={question.step}
        typedEntry
        typedMax={question.max}
        useBottomSheetInput
        period={periodText(question)}
        unit={question.unit === 'visits' ? 'count' : 'rupees'}
      />
    </View>
  );
});

export const EditSpendsSheet = forwardRef<EditSpendsSheetHandle, EditSpendsSheetProps>(function EditSpendsSheet(
  { keys, answers, onSubmit, onAddCategory },
  ref,
) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const listRef = useRef<BottomSheetFlatListMethods>(null);
  const [draft, setDraft] = useState<Answers>({});
  const [presentSeq, setPresentSeq] = useState(0);
  const pendingFocus = useRef<SpendKey | undefined>(undefined);

  // Latest answers, so present() always starts from what the screen holds now.
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const items = useMemo(() => editSheetItems(keys), [keys]);

  useEffect(() => {
    if (presentSeq > 0) sheetRef.current?.present();
  }, [presentSeq]);

  useImperativeHandle(
    ref,
    () => ({
      present(focusKey?: SpendKey) {
        setDraft({ ...answersRef.current });
        pendingFocus.current = focusKey;
        setPresentSeq((s) => s + 1);
      },
      dismiss() {
        sheetRef.current?.dismiss();
      },
    }),
    [],
  );

  const scrollToFocus = useCallback(() => {
    const key = pendingFocus.current;
    pendingFocus.current = undefined;
    if (!key) return;
    const index = items.findIndex((i) => i.type === 'question' && i.id === key);
    // Land on the category heading above the question when there is one.
    const target = index > 0 && items[index - 1].type === 'group' ? index - 1 : index;
    if (target >= 0) listRef.current?.scrollToIndex({ index: target, animated: true, viewPosition: 0 });
  }, [items]);

  const onSheetChange = useCallback(
    (index: number) => {
      if (index >= 0) scrollToFocus();
    },
    [scrollToFocus],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0 });
      }, 100);
    },
    [],
  );

  const onChange = useCallback((key: SpendKey, value: number) => {
    setDraft((d) => (d[key] === value ? d : { ...d, [key]: value }));
  }, []);

  const submit = useCallback(() => {
    onSubmit({ ...answersRef.current, ...draft });
    sheetRef.current?.dismiss();
  }, [draft, onSubmit]);

  const renderItem = useCallback(
    ({ item }: { item: EditSheetItem }) =>
      item.type === 'group' ? (
        <Text
          variant="body14SemiBold"
          color={colors.text.secondary}
          style={{ paddingHorizontal: spacing[16], paddingTop: spacing[8], paddingBottom: spacing[8] }}
        >
          {item.label}
        </Text>
      ) : (
        <QuestionItem question={item.question} value={draft[item.question.key] ?? 0} onChange={onChange} />
      ),
    [draft, onChange],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={opacity[50]} />
    ),
    [],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.surface.default,
            paddingHorizontal: spacing[16],
            paddingTop: spacing[12],
            paddingBottom: insets.bottom + spacing[12],
            borderTopWidth: borderWidth.thin,
            borderTopColor: colors.border.subtle3,
          }}
        >
          <Button label="Update results" size={CTA_H} fullWidth onPress={submit} />
        </View>
      </BottomSheetFooter>
    ),
    [submit, insets.bottom],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      enableDynamicSizing={false}
      activeOffsetY={PAN_ACTIVE_OFFSET_Y}
      failOffsetX={PAN_FAIL_OFFSET_X}
      onChange={onSheetChange}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      handleComponent={() => null}
      backgroundStyle={{
        backgroundColor: colors.surface.default,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
      }}
    >
      <BottomSheetHeader title="Your spends" />
      <BottomSheetFlatList
        ref={listRef}
        data={items}
        keyExtractor={(item: EditSheetItem) => item.id}
        renderItem={renderItem}
        extraData={draft}
        initialNumToRender={6}
        windowSize={5}
        onScrollToIndexFailed={onScrollToIndexFailed}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          onAddCategory ? (
            <Pressable
              onPress={() => {
                // Keep the edits made in the sheet: submit them (this closes the sheet), then leave.
                submit();
                onAddCategory();
              }}
              accessibilityRole="button"
              accessibilityLabel="Add a category"
              hitSlop={spacing[8]}
              style={{ paddingHorizontal: spacing[16], paddingVertical: spacing[12] }}
            >
              <Text variant="body14SemiBold" color={colors.text.link}>
                + Add a category
              </Text>
            </Pressable>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: CTA_H + spacing[24] + insets.bottom + spacing[24] }}
      />
    </BottomSheetModal>
  );
});
