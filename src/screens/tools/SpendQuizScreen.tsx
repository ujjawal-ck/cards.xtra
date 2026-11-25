/**
 * SpendQuizScreen: card tools, the 21 spend questions.
 *
 * One question per screen, in SPEND_QUESTIONS order. The category label sits above the
 * question, the hint under it. Every input starts at the saved answer or at 0. The user
 * can type an exact amount (up to the question `max`) or use the ruler (up to `rulerMax`).
 * "Skip to results" is on every question and needs at least one spend above 0.
 * Answers are saved on every Next and at the end. There is no review step.
 *
 *   next 'ultimate' -> ToolResults
 *   next 'beat'     -> BeatMyCardPick
 * `replace`, so Back from the result does not land on question 21.
 *
 * Analytics: no spend amount is ever sent, only step numbers and counts.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Button, Icon, StepProgress } from '../../atoms';
import { SpendCard, InlineMessage } from '../../molecules';
import { FooterButtons } from '../../organisms';
import { colors, spacing, iconSize, sizing } from '../../tokens';
import { analytics, Events } from '../../analytics';
import { SPEND_QUESTIONS, TOOL_CATEGORIES, buildSpends, hasAnySpend } from '../../lib/cardTools';
import type { SpendKey } from '../../lib/cardTools';
import { useSavedSpends } from '../../lib/savedSpends';
import { hasAnyAnswer } from '../../lib/toolFlows';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SpendQuiz'>;
type Rt = RouteProp<RootStackParamList, 'SpendQuiz'>;
type Answers = Partial<Record<SpendKey, number>>;

const TOTAL = SPEND_QUESTIONS.length;
const LAST = TOTAL - 1;
const ZERO_COPY = 'Leave it at 0 if you do not spend here.';

export function SpendQuizScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const tool = params.next; // 'ultimate' | 'beat' is also the analytics `tool`.

  const saved = useSavedSpends();
  // What the user changed in this run. The shown answer is the saved one under these edits.
  const [edits, setEdits] = useState<Answers>({});
  const answers = useMemo<Answers>(() => ({ ...saved.answers, ...edits }), [saved.answers, edits]);
  const [index, setIndex] = useState(0);
  const [showEmpty, setShowEmpty] = useState(false);

  // "Showing the spends you entered before": true when saved answers were there at load.
  const [prefilled, setPrefilled] = useState(false);
  const checkedPrefill = useRef(false);
  useEffect(() => {
    if (!saved.loaded || checkedPrefill.current) return;
    checkedPrefill.current = true;
    setPrefilled(hasAnyAnswer(saved.answers));
  }, [saved.loaded, saved.answers]);

  // One TOOL_START for each run. For 'beat' the pick screen skips its own when the quiz opened it.
  useEffect(() => {
    analytics.track(Events.TOOL_START, { tool });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = SPEND_QUESTIONS[index];
  const categoryLabel = TOOL_CATEGORIES.find((c) => c.id === question.group)?.label ?? '';
  const value = answers[question.key] ?? 0;

  const setAnswer = useCallback((key: SpendKey, v: number) => {
    setEdits((e) => ({ ...e, [key]: v }));
    setShowEmpty(false);
  }, []);

  const goPrev = useCallback(() => {
    if (index > 0) setIndex(index - 1);
    else navigation.goBack();
  }, [index, navigation]);

  // Android back follows the same path, only while this screen is in front.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (index > 0) {
          goPrev();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [index, goPrev]),
  );

  const finish = (completedAll: boolean) => {
    const spends = buildSpends(answers);
    if (!hasAnySpend(spends)) {
      setShowEmpty(true);
      return;
    }
    saved.save(answers);
    analytics.track(Events.TOOL_QUIZ_COMPLETE, {
      tool,
      answered: Object.values(spends).filter((v) => (v ?? 0) > 0).length,
      extended: completedAll,
    });
    if (tool === 'ultimate') {
      navigation.replace('ToolResults', { tool: 'ultimate', spends, answers, title: 'Your best cards' });
    } else {
      // Not reached: Home opens Beat my card on BeatMyCardPick, not through this quiz.
      navigation.replace('BeatMyCardPick');
    }
  };

  const onNext = () => {
    analytics.track(Events.TOOL_QUIZ_STEP, { tool, step: index + 1, total: TOTAL, skipped: value === 0 });
    // Save on every Next: the answers so far, merged with what was saved.
    saved.save(answers);
    if (index < LAST) {
      setIndex(index + 1);
      setShowEmpty(false);
    } else {
      finish(true);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[12],
            paddingHorizontal: spacing[16],
            paddingVertical: spacing[8],
          }}
        >
          <Pressable
            onPress={goPrev}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ width: sizing.touchMin, height: sizing.touchMin, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon
              name="chevron-right"
              size={iconSize[24]}
              color={colors.icon.actions}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <StepProgress value={index + 1} total={TOTAL} label={categoryLabel} />
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ width: sizing.touchMin, height: sizing.touchMin, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" size={iconSize[24]} color={colors.icon.actions} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: spacing[4] }}>
            <Text variant="heading24Bold" color={colors.text.primary} accessibilityRole="header">
              {question.question}
            </Text>
            {question.hint ? (
              <Text variant="body14Regular" color={colors.text.secondary}>
                {`For example: ${question.hint}`}
              </Text>
            ) : null}
            <Text variant="body14Regular" color={colors.text.secondary}>
              {ZERO_COPY}
            </Text>
          </View>

          {prefilled && index === 0 ? (
            <InlineMessage tone="info" message="Showing the spends you entered before." />
          ) : null}

          <SpendCard
            key={question.key}
            size="large"
            title=""
            name={question.label}
            unit={question.unit === 'visits' ? 'count' : 'rupees'}
            period={`per ${question.period}`}
            value={value}
            onChange={(v) => setAnswer(question.key, v)}
            min={question.min}
            max={question.rulerMax}
            step={question.step}
            typedEntry
            typedMax={question.max}
          />

          {showEmpty ? (
            <InlineMessage tone="warning" icon="desc-exclamation" message="Add at least one spend above 0 to see your cards." />
          ) : null}

          <Button
            label="Skip to results"
            variant="outline"
            tone="second"
            size={44}
            fullWidth
            onPress={() => finish(false)}
          />
        </ScrollView>

        <FooterButtons
          buttons="single"
          primaryLabel={index < LAST ? 'Next' : tool === 'ultimate' ? 'See my cards' : 'Pick your card'}
          onPrimary={onNext}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
