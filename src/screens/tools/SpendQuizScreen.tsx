/**
 * SpendQuizScreen — card tools, spend questions.
 *
 * One question per screen (QuizStep + SpendCard large). The 6 core questions come
 * first, then a review step. "Add more spends" asks the other 15 and returns to the
 * review step. Answers stay in local state in the user's own unit (each question's
 * `period`); `buildSpends` turns them into the API body on continue.
 *
 *   next 'ultimate' -> ToolResults (the result is read from useCardSavings, never passed)
 *   next 'beat'     -> BeatMyCardResult (needs cardAlias; without it the screen goes back)
 * `navigate`, not `replace`, so Back from the result lands here with the answers intact.
 *
 * The two lounge questions count visits, so their SpendCard uses unit="count" (no rupee sign).
 * The screen title is the question, so the large SpendCard is given title="" and no logo.
 * In the extra questions Back from the first one returns to the review, and "Done" goes to the
 * review with the answers so far.
 * Analytics: no spend amount is ever sent, only step numbers and counts.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Button } from '../../atoms';
import { SpendCard, InlineMessage } from '../../molecules';
import { QuizStep, FooterButtons, Header } from '../../organisms';
import { colors, spacing, borderWidth } from '../../tokens';
import { formatINR } from '../../lib/money';
import { analytics, Events } from '../../analytics';
import { SPEND_QUESTIONS, buildSpends, hasAnySpend } from '../../lib/cardTools';
import type { SpendKey, SpendQuestion } from '../../lib/cardTools';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SpendQuiz'>;
type Rt = RouteProp<RootStackParamList, 'SpendQuiz'>;
type Answers = Partial<Record<SpendKey, number>>;

const CORE_COUNT = SPEND_QUESTIONS.filter((q) => q.core).length;
const ALL_COUNT = SPEND_QUESTIONS.length;

function describeSpend(q: SpendQuestion, value: number): string {
  if (q.unit === 'visits') return `${value} ${value === 1 ? 'visit' : 'visits'} a year`;
  return `${formatINR(value)} a ${q.period}`;
}

export function SpendQuizScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { next, cardAlias } = params;
  const tool = next; // 'ultimate' | 'beat' is also the analytics `tool`.

  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'review'>('question');
  const [extended, setExtended] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  // The pick screen already fires TOOL_START for 'beat'.
  useEffect(() => {
    if (next === 'ultimate') analytics.track(Events.TOOL_START, { tool: 'ultimate' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = extended ? ALL_COUNT : CORE_COUNT;
  const lastIndex = total - 1;
  const question = SPEND_QUESTIONS[index];

  const setAnswer = useCallback((key: SpendKey, value: number) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setShowEmpty(false);
  }, []);

  const goPrev = useCallback(() => {
    if (phase === 'review') {
      // `index` still points at the question the user left, so Back resumes there.
      setPhase('question');
    } else if (extended && index === CORE_COUNT) {
      setPhase('review');
    } else if (index > 0) {
      setIndex(index - 1);
    } else {
      navigation.goBack();
    }
  }, [phase, index, extended, navigation]);

  // Android back follows the same path, only while this screen is in front.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (phase === 'review' || index > 0) {
          goPrev();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [phase, index, goPrev]),
  );

  // Leave the quiz in one step, from any question or the review.
  const leaveQuiz = () => navigation.goBack();

  const leaveQuestion = (skipped: boolean) => {
    analytics.track(Events.TOOL_QUIZ_STEP, { tool, step: index + 1, total, skipped });
    if (index < lastIndex) setIndex(index + 1);
    else setPhase('review');
  };

  const onSkip = () => {
    setAnswer(question.key, 0);
    leaveQuestion(true);
  };

  const addMore = () => {
    setExtended(true);
    setShowEmpty(false);
    setIndex(CORE_COUNT);
    setPhase('question');
  };

  const onContinue = () => {
    const spends = buildSpends(answers);
    if (!hasAnySpend(spends)) {
      setShowEmpty(true);
      return;
    }
    analytics.track(Events.TOOL_QUIZ_COMPLETE, {
      tool,
      answered: Object.values(spends).filter((v) => (v ?? 0) > 0).length,
      extended,
    });
    if (next === 'ultimate') {
      navigation.navigate('ToolResults', { tool: 'ultimate', spends, title: 'Your best cards' });
    } else if (cardAlias) {
      navigation.navigate('BeatMyCardResult', { cardAlias, spends });
    } else {
      navigation.goBack();
    }
  };

  const entered = useMemo(
    () =>
      SPEND_QUESTIONS.map((q) => ({ q, value: answers[q.key] ?? 0 })).filter((r) => r.value > 0),
    [answers],
  );

  if (phase === 'review') {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
        <StatusBar style="dark" />
        <Header
          leading="back"
          title="Your spends"
          onLeadingPress={goPrev}
          trailingIcon="close"
          onTrailingPress={leaveQuiz}
        />
        <ScrollView contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}>
          <Text variant="body14Regular" color={colors.text.secondary}>
            We will use these spends. Questions you skipped count as 0.
          </Text>
          {entered.length === 0 ? (
            <Text variant="body14Medium" color={colors.text.primary}>
              No spends entered yet.
            </Text>
          ) : (
            <View>
              {entered.map(({ q, value }, i) => (
                <View
                  key={q.key}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: spacing[12],
                    paddingVertical: spacing[12],
                    borderTopWidth: i === 0 ? 0 : borderWidth.hairline,
                    borderTopColor: colors.border.subtle3,
                  }}
                >
                  <Text variant="body14Regular" color={colors.text.primary} style={{ flex: 1 }}>
                    {q.label}
                  </Text>
                  <Text variant="body14SemiBold" color={colors.text.primary}>
                    {describeSpend(q, value)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {showEmpty ? (
            <InlineMessage tone="warning" message="Add at least one spend to continue." />
          ) : null}
          {!extended ? (
            <Button label="Add more spends" variant="outline" tone="second" size={44} fullWidth onPress={addMore} />
          ) : null}
        </ScrollView>
        <FooterButtons
          buttons="single"
          primaryLabel={next === 'ultimate' ? 'See my cards' : 'See the result'}
          onPrimary={onContinue}
        />
      </SafeAreaView>
    );
  }

  const value = answers[question.key] ?? 0;
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <QuizStep
        step={index + 1}
        total={total}
        title={question.question}
        subtitle="Not sure? Skip it and we count it as 0."
        onBack={goPrev}
        onSkip={onSkip}
        onClose={leaveQuiz}
        primary={{ label: 'Next', onPress: () => leaveQuestion(false) }}
      >
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
          max={question.max}
          step={question.step}
        />
        {extended && index >= CORE_COUNT ? (
          <Button
            label="Done"
            variant="outline"
            tone="second"
            size={44}
            fullWidth
            onPress={() => setPhase('review')}
          />
        ) : null}
      </QuizStep>
    </SafeAreaView>
  );
}
