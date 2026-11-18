/**
 * BestForBrandsScreen: "Best card for brands".
 *
 * Pick up to MAX_BRANDS brands, set a monthly spend on each, then open ToolResults.
 * Brand list, spend maths and limits live in src/lib/cardTools.ts.
 * Honesty rule (product requirement): BankKaro knows only Amazon and Flipkart as brands.
 * Every other brand is counted in its category, so its SpendCard carries the `groupLabel`
 * note and the results subtitle says so.
 *
 * `route.params.brandId` (a TOOL_BRANDS id) starts with that brand selected, spend 0.
 * Brands show by name only: the images in images.brands are promo tiles, not logos.
 * Parts: Header, Chip, SpendCard (compact),
 * InlineMessage (limit reached), FooterButtons. Not run on a device: check at 360 dp and 130% font.
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
import { SpendCard, InlineMessage } from '../../molecules';
import { Header, FooterButtons } from '../../organisms';
import { colors, spacing } from '../../tokens';
import { analytics, Events } from '../../analytics';
import { MAX_BRANDS, SPEND_QUESTIONS, TOOL_BRANDS, spendsFromBrands } from '../../lib/cardTools';
import type { ToolBrand } from '../../lib/cardTools';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BestForBrands'>;
type Rt = RouteProp<RootStackParamList, 'BestForBrands'>;

const NON_EXACT_SUBTITLE = 'Brands other than Amazon and Flipkart are counted by category, not by brand.';

/** The spend ruler limits for a brand come from the question of the key it fills. */
function rulerFor(brand: ToolBrand) {
  const q = SPEND_QUESTIONS.find((s) => s.key === brand.key);
  return { min: q?.min ?? 0, max: q?.max, step: q?.step };
}

export function BestForBrandsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  // Selection order is kept: the spend cards show in the order the user picked.
  const [selected, setSelected] = useState<string[]>(() => {
    const id = route.params?.brandId;
    return id && TOOL_BRANDS.some((b) => b.id === id) ? [id] : [];
  });
  const [monthly, setMonthly] = useState<Record<string, number>>({});

  useEffect(() => {
    analytics.track(Events.TOOL_START, { tool: 'brands' });
  }, []);

  const limitReached = selected.length >= MAX_BRANDS;
  const picked = useMemo(
    () => selected.map((id) => TOOL_BRANDS.find((b) => b.id === id)).filter((b): b is ToolBrand => !!b),
    [selected],
  );
  const canContinue = picked.some((b) => (monthly[b.id] ?? 0) > 0);

  const toggle = useCallback((id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_BRANDS ? cur : [...cur, id]));
  }, []);

  const onSeeCards = useCallback(() => {
    const picks = picked
      .map((b) => ({ brandId: b.id, monthly: monthly[b.id] ?? 0 }))
      .filter((p) => p.monthly > 0);
    const hasNonExact = picks.some((p) => TOOL_BRANDS.find((b) => b.id === p.brandId)?.exact === false);
    navigation.navigate('ToolResults', {
      tool: 'brands',
      spends: spendsFromBrands(picks),
      title: 'Best cards for your brands',
      subtitle: hasNonExact ? NON_EXACT_SUBTITLE : undefined,
    });
  }, [picked, monthly, navigation]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Best card for brands" onLeadingPress={() => navigation.goBack()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="body14Regular" color={colors.text.secondary}>
          Pick up to {MAX_BRANDS} brands and how much you spend on each in a month.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
          {TOOL_BRANDS.map((b) => {
            const isOn = selected.includes(b.id);
            const disabled = !isOn && limitReached;
            return (
              <Chip
                key={b.id}
                label={b.name}
                state={isOn ? 'selected' : disabled ? 'disabled' : 'default'}
                onPress={disabled ? undefined : () => toggle(b.id)}
              />
            );
          })}
        </View>

        {limitReached ? (
          <InlineMessage tone="info" message={`You can pick up to ${MAX_BRANDS} brands. Remove one to pick another.`} />
        ) : null}

        {picked.map((b) => {
          const ruler = rulerFor(b);
          return (
            <View key={b.id} style={{ gap: spacing[6] }}>
              <SpendCard
                name={b.name}
                value={monthly[b.id] ?? 0}
                onChange={(v) => setMonthly((cur) => ({ ...cur, [b.id]: v }))}
                min={ruler.min}
                max={ruler.max}
                step={ruler.step}
              />
              {!b.exact && b.groupLabel ? (
                <Text variant="body12Regular" color={colors.text.tertiary}>
                  {b.groupLabel}
                </Text>
              ) : null}
            </View>
          );
        })}
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
