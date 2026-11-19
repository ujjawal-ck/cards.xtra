/**
 * AdvisorReplyTray: the reply area pinned under the chat.
 *
 *   choice question       one full-width option row per answer, stacked in the given order, with a
 *                         quieter "Not sure" row last. The rows scroll inside the tray when they are
 *                         taller than TRAY_MAX_RATIO of the window (the need question has up to 9).
 *   multi choice question the rows toggle. "Done" answers with the picks. An exclusive row and
 *                         "Not sure" answer at once.
 *   eligibility question  the form (AdvisorEligibilityForm) and "Check cards" or "Continue".
 *   no question           the end menu from the screen, as the same stacked rows.
 *
 * Top to bottom: "Back" (when an answer exists), "Using your saved details" and, for a multi
 * question, "Pick up to N": all fixed. Then the scroll area. Then the fixed footer button.
 * The screen keeps this tray above the keyboard (useKeyboardPadding on the wrapper).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Icon } from '../../atoms';
import { colors, spacing, borderWidth, sizing, iconSize } from '../../tokens';
import { AdvisorOptionRow } from './AdvisorOptionRow';
import { AdvisorEligibilityForm, useEligForm } from './AdvisorEligibilityForm';
import { encodeEligForm, encodeMulti } from '../../lib/advisor/answers';
import { NOT_SURE } from '../../lib/advisor/types';
import type { AdvisorStep, QuestionId } from '../../lib/advisor/types';
import { eligFormValue, type SavedInputs } from './advisorSession';

/** The tray never takes more than this share of the window height; its content scrolls instead.
 *  A layout ratio, not a token value. */
const TRAY_MAX_RATIO = 0.46;
/** With a fixed footer button under the scroll area, the scroll area gets less, so the chat
 *  above keeps the question in view. */
const TRAY_MAX_RATIO_WITH_FOOTER = 0.36;

/** One row of the end menu. */
export interface TrayMenuItem {
  key: string;
  label: string;
  /** Drawn like "Not sure". */
  quiet?: boolean;
  onPress: () => void;
}

export function AdvisorReplyTray({
  step,
  menu,
  usingSaved,
  onAnswer,
  onBack,
  onChangeSaved,
  savedForForm,
}: {
  step: AdvisorStep | null;
  /** The rows shown when no question is left. */
  menu: TrayMenuItem[];
  usingSaved: boolean;
  onAnswer: (questionId: QuestionId, value: string) => void;
  /** Removes the last answer. Absent when nothing is answered: no Back row. */
  onBack?: () => void;
  onChangeSaved: () => void;
  /** The saved details, when the user tapped "Change": they prefill the form. */
  savedForForm?: SavedInputs | null;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [picks, setPicks] = useState<string[]>([]);
  const { form, setForm, reset } = useEligForm(savedForForm ?? null);

  // A new question starts with no picks, the form from its draft, and the list at the top. The
  // scroll indicator flashes once, so a long list shows that more rows sit below.
  const scrollRef = useRef<ScrollView>(null);
  const questionId = step?.question.id;
  useEffect(() => {
    setPicks([]);
    reset();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    scrollRef.current?.flashScrollIndicators();
    // reset reads the props of this render: run only when the question changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  const question = step?.question;
  const multi = question?.kind === 'choice' ? question.multi : undefined;
  const atMax = !!multi && picks.length >= multi.max;
  const formValue = eligFormValue(form);

  let content: React.ReactNode;
  let footer: React.ReactNode = null;
  if (!step || !question) {
    content = (
      <View style={{ gap: spacing[8] }}>
        {menu.map((item) => (
          <AdvisorOptionRow key={item.key} label={item.label} quiet={item.quiet} onPress={item.onPress} />
        ))}
      </View>
    );
  } else if (question.kind === 'choice') {
    const toggle = (id: string) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    content = (
      <View style={{ gap: spacing[8] }}>
        {step.options.map((o) => {
          // An exclusive row answers at once, so it is no checkbox and the cap does not block it.
          const toggles = !!multi && !o.exclusive;
          const on = picks.includes(o.id);
          return (
            <AdvisorOptionRow
              key={o.id}
              label={o.label}
              selected={toggles ? on : undefined}
              disabled={toggles && atMax && !on}
              onPress={() => (toggles ? toggle(o.id) : onAnswer(question.id, o.id))}
            />
          );
        })}
        {question.notSure ? (
          <AdvisorOptionRow label="Not sure" quiet onPress={() => onAnswer(question.id, NOT_SURE)} />
        ) : null}
      </View>
    );
    if (multi) {
      footer = (
        <Button
          label={picks.length >= 2 ? `Done (${picks.length})` : 'Done'}
          variant="solid"
          tone="main"
          size={44}
          fullWidth
          disabled={picks.length === 0}
          onPress={() => onAnswer(question.id, encodeMulti(question, picks))}
        />
      );
    }
  } else {
    content = <AdvisorEligibilityForm form={form} onChange={setForm} />;
    footer = (
      <Button
        label={form.job === 'none' ? 'Continue' : 'Check cards'}
        variant="solid"
        tone="main"
        size={44}
        fullWidth
        disabled={!formValue}
        onPress={() => formValue && onAnswer('eligForm', encodeEligForm(formValue))}
      />
    );
  }

  return (
    <View
      style={{
        // When the keyboard leaves little room, the tray gives way and its scroll area shrinks,
        // so the footer button stays on screen.
        flexShrink: 1,
        gap: spacing[8],
        paddingTop: spacing[12],
        paddingHorizontal: spacing[16],
        paddingBottom: insets.bottom + spacing[12],
        borderTopWidth: borderWidth.thin,
        borderTopColor: colors.border.subtle3,
        backgroundColor: colors.surface.default,
      }}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to the last question"
          hitSlop={spacing[8]}
          style={{ alignSelf: 'flex-start', minHeight: sizing.touchMin, flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}
        >
          {/* The Icon atom has no left chevron: the right one, turned. */}
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron-right" size={iconSize[14]} color={colors.text.link} />
          </View>
          <Text variant="body12SemiBold" color={colors.text.link}>
            Back
          </Text>
        </Pressable>
      ) : null}
      {usingSaved ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing[8] }}>
          <Text variant="body12Regular" color={colors.text.secondary}>
            Using your saved details.
          </Text>
          <Pressable
            onPress={onChangeSaved}
            accessibilityRole="button"
            accessibilityLabel="Change saved details"
            style={{ minHeight: sizing.touchMin, justifyContent: 'center' }}
          >
            <Text variant="body12SemiBold" color={colors.text.link}>
              Change
            </Text>
          </Pressable>
        </View>
      ) : null}
      {multi ? (
        <Text variant="body12Regular" color={colors.text.secondary}>
          {step && step.options.filter((o) => !o.exclusive).length <= multi.max
            ? 'Pick one or more'
            : `Pick up to ${multi.max}`}
        </Text>
      ) : null}
      <ScrollView
        ref={scrollRef}
        style={{
          flexGrow: 0,
          flexShrink: 1,
          maxHeight: height * (footer ? TRAY_MAX_RATIO_WITH_FOOTER : TRAY_MAX_RATIO),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        persistentScrollbar
      >
        {content}
      </ScrollView>
      {footer}
    </View>
  );
}
