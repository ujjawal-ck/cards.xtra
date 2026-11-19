/**
 * BestForCategoryScreen: "Find best card by category".
 *
 * Step 1: pick the categories the user spends on (multi-select tiles, no amount).
 * Then one step per chosen category, in list order, with every question of that category.
 * Every input starts at the saved answer or at 0; the user can type an exact amount or use the ruler.
 * End: save only the keys of the chosen categories (merge), open ToolResults with those keys only.
 *
 * Design system gaps: no category illustrations exist, so the tiles are text only.
 * Not run on a device: check at 360 dp and 130% font.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, StepProgress } from '../../atoms';
import { SpendCard, InlineMessage, Choice } from '../../molecules';
import { Header, FooterButtons } from '../../organisms';
import { colors, spacing, radius, borderWidth } from '../../tokens';
import { analytics, Events } from '../../analytics';
import { TOOL_CATEGORIES, buildSpends, questionsForCategory } from '../../lib/cardTools';
import type { SpendKey } from '../../lib/cardTools';
import { useSavedSpends } from '../../lib/savedSpends';
import {
  categoryAnswers,
  categorySubtitle,
  hasAnyAnswer,
  keysForCategories,
  orderedCategories,
  toggleId,
} from '../../lib/toolFlows';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BestForCategory'>;
type Rt = RouteProp<RootStackParamList, 'BestForCategory'>;
type Answers = Partial<Record<SpendKey, number>>;

const ZERO_COPY = 'Leave it at 0 if you do not spend here.';

export function BestForCategoryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const saved = useSavedSpends();

  const [selected, setSelected] = useState<string[]>(() => {
    const id = route.params?.categoryId;
    return id && TOOL_CATEGORIES.some((c) => c.id === id) ? [id] : [];
  });
  // -1 is the pick step. 0 and up are the chosen categories, in list order.
  const [step, setStep] = useState(-1);
  const [edits, setEdits] = useState<Answers>({});
  const [showEmpty, setShowEmpty] = useState(false);

  useEffect(() => {
    analytics.track(Events.TOOL_START, { tool: 'category' });
  }, []);

  const chosen = useMemo(() => orderedCategories(selected), [selected]);
  const answers = useMemo<Answers>(() => ({ ...saved.answers, ...edits }), [saved.answers, edits]);
  const category = step >= 0 ? chosen[step] : undefined;
  const isLast = step === chosen.length - 1;

  const goPrev = useCallback(() => {
    if (step >= 0) {
      setStep(step - 1);
      setShowEmpty(false);
    } else {
      navigation.goBack();
    }
  }, [step, navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step >= 0) {
          goPrev();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [step, goPrev]),
  );

  const setAnswer = (key: SpendKey, v: number) => {
    setEdits((e) => ({ ...e, [key]: v }));
    setShowEmpty(false);
  };

  const onNextCategory = () => {
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    const a = categoryAnswers(selected, answers);
    if (!hasAnyAnswer(a, keysForCategories(selected))) {
      setShowEmpty(true);
      return;
    }
    saved.save(a);
    navigation.navigate('ToolResults', {
      tool: 'category',
      spends: buildSpends(a),
      answers: a,
      title: 'Your best cards',
      subtitle: categorySubtitle(selected),
    });
  };

  const footer = (label: string, onPress: () => void) => (
    <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.surface.default }}>
      <FooterButtons buttons="single" size={52} shadow="on" strip="none" color="main" primaryLabel={label} onPrimary={onPress} />
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Find best card by category" onLeadingPress={goPrev} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {category ? (
          <>
            <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[8] }}>
              <StepProgress value={step + 1} total={chosen.length} label={category.label} />
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text variant="heading20SemiBold" color={colors.text.primary} accessibilityRole="header">
                {`Your ${category.label} spends`}
              </Text>
              <Text variant="body14Regular" color={colors.text.secondary}>
                {ZERO_COPY}
              </Text>
              {questionsForCategory(category.id).map((q) => (
                <View key={q.key} style={{ gap: spacing[6] }}>
                  <SpendCard
                    name={q.label}
                    unit={q.unit === 'visits' ? 'count' : 'rupees'}
                    period={`per ${q.period}`}
                    value={answers[q.key] ?? 0}
                    onChange={(v) => setAnswer(q.key, v)}
                    min={q.min}
                    max={q.rulerMax}
                    step={q.step}
                    typedEntry
                    typedMax={q.max}
                  />
                  {q.hint ? (
                    <Text variant="body12Regular" color={colors.text.tertiary}>
                      {`For example: ${q.hint}`}
                    </Text>
                  ) : null}
                </View>
              ))}
              {showEmpty ? (
                <InlineMessage tone="warning" message="Add at least one spend above 0 to see your cards." />
              ) : null}
            </ScrollView>
            {footer(isLast ? 'Find my best card' : 'Next category', onNextCategory)}
          </>
        ) : (
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}
              showsVerticalScrollIndicator={false}
            >
              <Text variant="heading20SemiBold" color={colors.text.primary} accessibilityRole="header">
                Choose the categories you spend on
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[12] }}>
                {TOOL_CATEGORIES.map((c) => {
                  const on = selected.includes(c.id);
                  return (
                    <Choice
                      key={c.id}
                      type="checkbox"
                      checked={on}
                      label={c.label}
                      onChange={() => setSelected((cur) => toggleId(cur, c.id))}
                      style={{
                        flexGrow: 1,
                        flexBasis: '45%',
                        alignItems: 'center',
                        paddingVertical: spacing[16],
                        paddingHorizontal: spacing[12],
                        borderRadius: radius.xl,
                        borderWidth: on ? borderWidth.thick : borderWidth.thin,
                        borderColor: on ? colors.border.focussed : colors.border.default,
                        backgroundColor: colors.surface.default,
                      }}
                    />
                  );
                })}
              </View>
            </ScrollView>
            {selected.length > 0 ? footer('Enter spends', () => setStep(0)) : null}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
