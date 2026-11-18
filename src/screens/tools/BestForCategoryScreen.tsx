/**
 * BestForCategoryScreen: "Find best card by category".
 *
 * Pick one category, set the monthly spend in it, then open ToolResults.
 * Categories, default spend and the spend maths live in src/lib/cardTools.ts.
 * Parts: Header, Chip (single select), SpendCard (compact), FooterButtons.
 * Not run on a device: check at 360 dp and 130% font.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Chip } from '../../atoms';
import { SpendCard } from '../../molecules';
import { Header, FooterButtons } from '../../organisms';
import { colors, spacing } from '../../tokens';
import { analytics, Events } from '../../analytics';
import { SPEND_QUESTIONS, TOOL_CATEGORIES, spendsForCategory } from '../../lib/cardTools';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BestForCategory'>;
type Rt = RouteProp<RootStackParamList, 'BestForCategory'>;

// Monthly rupee ruler: the widest monthly limit of any spend question, same step as the core questions.
const RULER_MAX = Math.max(...SPEND_QUESTIONS.filter((q) => q.period === 'month' && q.unit === 'rupees').map((q) => q.max));
const RULER_STEP = 500;

export function BestForCategoryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const initial = useMemo(
    () => TOOL_CATEGORIES.find((c) => c.id === route.params?.categoryId),
    [route.params?.categoryId],
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(initial?.id);
  const [monthly, setMonthly] = useState<number>(initial?.defaultMonthly ?? 0);

  useEffect(() => {
    analytics.track(Events.TOOL_START, { tool: 'category' });
  }, []);

  const category = TOOL_CATEGORIES.find((c) => c.id === categoryId);
  const canContinue = !!category && monthly > 0;

  const pick = useCallback((id: string) => {
    const next = TOOL_CATEGORIES.find((c) => c.id === id);
    if (!next) return;
    setCategoryId(id);
    setMonthly(next.defaultMonthly);
  }, []);

  const onSeeCards = useCallback(() => {
    if (!category) return;
    navigation.navigate('ToolResults', {
      tool: 'category',
      spends: spendsForCategory(category.id, monthly),
      title: 'Best cards for ' + category.label,
    });
  }, [category, monthly, navigation]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Find best card by category" onLeadingPress={() => navigation.goBack()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="body14Regular" color={colors.text.secondary}>
          Pick where you spend the most.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
          {TOOL_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              state={c.id === categoryId ? 'selected' : 'default'}
              onPress={() => pick(c.id)}
            />
          ))}
        </View>

        {category ? (
          <SpendCard
            key={category.id}
            name={category.label}
            value={monthly}
            onChange={setMonthly}
            min={0}
            max={RULER_MAX}
            step={RULER_STEP}
          />
        ) : null}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.surface.default }}>
        <FooterButtons
          buttons="single"
          size={52}
          shadow="on"
          strip="none"
          color="main"
          primaryLabel="See best cards"
          primaryDisabled={!canContinue}
          onPrimary={onSeeCards}
        />
      </View>
    </SafeAreaView>
  );
}
