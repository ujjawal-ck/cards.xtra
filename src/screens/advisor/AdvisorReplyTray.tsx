/**
 * AdvisorReplyTray: the reply area pinned under the chat.
 *
 *   choice question  one full-width option row per answer, stacked in the given order, with a
 *                    quieter "Not sure" row last. The rows scroll inside the tray when they are
 *                    taller than TRAY_MAX_RATIO of the window (the need question has up to 9).
 *   pincode question the six-digit input and "Check cards".
 *   no question      the end menu from the screen, as the same stacked rows.
 *
 * Above the scroll area, outside it: "Back" (when an answer exists) and "Using your saved details".
 * The screen keeps this tray above the keyboard (useKeyboardPadding on the wrapper).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input, Icon } from '../../atoms';
import { colors, spacing, borderWidth, sizing, iconSize } from '../../tokens';
import { AdvisorOptionRow } from './AdvisorOptionRow';
import { NOT_SURE } from '../../lib/advisor/types';
import type { AdvisorStep, QuestionId } from '../../lib/advisor/types';

/** The tray never takes more than this share of the window height; its content scrolls instead.
 *  A layout ratio, not a token value. */
const TRAY_MAX_RATIO = 0.46;
const PINCODE = /^[1-9]\d{5}$/;

/** One row of the end menu. */
export interface TrayMenuItem {
  key: string;
  label: string;
  /** Drawn like "Not sure". */
  quiet?: boolean;
  onPress: () => void;
}

/** Keep only digits, at most six. A Hindi keyboard can send Devanagari digits
 *  (०-९): they become 0-9, so the pincode check and the API get plain digits. */
function toPincodeText(text: string): string {
  return text
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/\D/g, '')
    .slice(0, 6);
}

export function AdvisorReplyTray({
  step,
  menu,
  usingSaved,
  onAnswer,
  onBack,
  onChangeSaved,
}: {
  step: AdvisorStep | null;
  /** The rows shown when no question is left. */
  menu: TrayMenuItem[];
  usingSaved: boolean;
  onAnswer: (questionId: QuestionId, value: string) => void;
  /** Removes the last answer. Absent when nothing is answered: no Back row. */
  onBack?: () => void;
  onChangeSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [pin, setPin] = useState('');

  // A new question starts empty (pincode) and at the top of the list (options). The scroll
  // indicator flashes once, so a long list shows that more rows sit below.
  const scrollRef = useRef<ScrollView>(null);
  const questionId = step?.question.id;
  useEffect(() => {
    setPin('');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    scrollRef.current?.flashScrollIndicators();
  }, [questionId]);

  let content: React.ReactNode;
  if (!step) {
    content = (
      <View style={{ gap: spacing[8] }}>
        {menu.map((item) => (
          <AdvisorOptionRow key={item.key} label={item.label} quiet={item.quiet} onPress={item.onPress} />
        ))}
      </View>
    );
  } else if (step.question.kind === 'choice') {
    content = (
      <View style={{ gap: spacing[8] }}>
        {step.options.map((o) => (
          <AdvisorOptionRow key={o.id} label={o.label} onPress={() => onAnswer(step.question.id, o.id)} />
        ))}
        {step.question.notSure ? (
          <AdvisorOptionRow label="Not sure" quiet onPress={() => onAnswer(step.question.id, NOT_SURE)} />
        ) : null}
      </View>
    );
  } else {
    const pinValid = PINCODE.test(pin);
    const pinWrong = pin.length === 6 && !pinValid;
    content = (
      <View style={{ gap: spacing[8] }}>
        <Input
          value={pin}
          onChangeText={(t: string) => setPin(toPincodeText(t))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="6-digit PIN code"
          accessibilityLabel={step.ask}
          hint={pinWrong ? 'Enter your 6-digit PIN code' : undefined}
          state={pinWrong ? 'error' : undefined}
        />
        <Button
          label="Check cards"
          variant="solid"
          tone="main"
          size={44}
          fullWidth
          disabled={!pinValid}
          onPress={() => onAnswer('pincode', pin)}
        />
      </View>
    );
  }

  return (
    <View
      style={{
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
      <ScrollView
        ref={scrollRef}
        style={{ flexGrow: 0, maxHeight: height * TRAY_MAX_RATIO }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        persistentScrollbar
      >
        {content}
      </ScrollView>
    </View>
  );
}
