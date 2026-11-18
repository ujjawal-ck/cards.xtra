/**
 * AdvisorReplyTray: the reply area pinned under the chat.
 *
 *   choice question  the options as wrapping chips (plus "Not sure"). The content scrolls when it
 *                    is taller than TRAY_MAX_RATIO of the window (the need question has up to 9).
 *   pincode question the six-digit input and "Check cards".
 *   no question      "Start over".
 *
 * The screen keeps this tray above the keyboard (useKeyboardPadding on the wrapper).
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Chip, Button, Input } from '../../atoms';
import { colors, spacing, borderWidth, sizing } from '../../tokens';
import { NOT_SURE } from '../../lib/advisor/types';
import type { AdvisorStep, QuestionId } from '../../lib/advisor/types';

/** The tray never takes more than this share of the window height; its content scrolls instead.
 *  A layout ratio, not a token value. */
const TRAY_MAX_RATIO = 0.4;
const PINCODE = /^[1-9]\d{5}$/;

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
  usingSaved,
  onAnswer,
  onRestart,
  onChangeSaved,
}: {
  step: AdvisorStep | null;
  usingSaved: boolean;
  onAnswer: (questionId: QuestionId, value: string) => void;
  onRestart: () => void;
  onChangeSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [pin, setPin] = useState('');

  // A new pincode question starts empty.
  const questionId = step?.question.id;
  useEffect(() => {
    setPin('');
  }, [questionId]);

  let content: React.ReactNode;
  if (!step) {
    content = <Button label="Start over" variant="outline" tone="second" size={44} fullWidth onPress={onRestart} />;
  } else if (step.question.kind === 'choice') {
    const chipStyle = { minHeight: sizing.touchMin };
    content = (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
        {step.options.map((o) => (
          <Chip key={o.id} label={o.label} style={chipStyle} onPress={() => onAnswer(step.question.id, o.id)} />
        ))}
        {step.question.notSure ? (
          <Chip label="Not sure" style={chipStyle} onPress={() => onAnswer(step.question.id, NOT_SURE)} />
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
        style={{ flexGrow: 0, maxHeight: height * TRAY_MAX_RATIO }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </View>
  );
}
