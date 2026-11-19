/**
 * BestForBrandsScreen: "Best card for brands".
 *
 * Step 1: pick up to MAX_BRANDS brands (search, category tabs, a tray of the picked ones).
 * Step 2: one monthly spend per brand, starting at 0. The user can type an exact amount or use the ruler.
 * End: ToolResults with per-key sums as `answers`. Brand runs are NOT saved to the saved profile.
 *
 * Honesty rule (product requirement): BankKaro knows only Amazon and Flipkart as brands.
 * Every other brand is counted in its category, so its card carries the `groupLabel`
 * and the screen and the results subtitle say so.
 *
 * `route.params.brandId` (a TOOL_BRANDS id) starts with that brand picked.
 * Design system gaps: no brand logos exist, so brand tiles are text only (BrandLogoTile needs an image).
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
import { Text, Chip, Input } from '../../atoms';
import { SpendCard, InlineMessage, Choice, TabPrimary } from '../../molecules';
import { Header, FooterButtons } from '../../organisms';
import { colors, spacing, radius, borderWidth } from '../../tokens';
import { analytics, Events } from '../../analytics';
import { MAX_BRANDS, TOOL_BRANDS, TOOL_CATEGORIES, spendsFromBrands } from '../../lib/cardTools';
import type { ToolBrand, ToolCategoryId } from '../../lib/cardTools';
import {
  BRANDS_HONEST_LINE,
  brandAnswers,
  brandTabs,
  brandsSubtitle,
  filterBrands,
  questionForBrand,
  toggleBrand,
} from '../../lib/toolFlows';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BestForBrands'>;
type Rt = RouteProp<RootStackParamList, 'BestForBrands'>;

const TABS: Array<{ id: ToolCategoryId | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  ...brandTabs().map((id) => ({ id, label: TOOL_CATEGORIES.find((c) => c.id === id)?.label ?? id })),
];

export function BestForBrandsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  // Pick order is kept: the spend cards show in the order the user picked.
  const [selected, setSelected] = useState<string[]>(() => {
    const id = route.params?.brandId;
    return id && TOOL_BRANDS.some((b) => b.id === id) ? [id] : [];
  });
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [monthly, setMonthly] = useState<Record<string, number>>({});
  const [showEmpty, setShowEmpty] = useState(false);

  useEffect(() => {
    analytics.track(Events.TOOL_START, { tool: 'brands' });
  }, []);

  const picked = useMemo(
    () => selected.map((id) => TOOL_BRANDS.find((b) => b.id === id)).filter((b): b is ToolBrand => !!b),
    [selected],
  );
  const limitReached = selected.length >= MAX_BRANDS;
  const visible = useMemo(() => filterBrands(TOOL_BRANDS, TABS[tabIndex].id, query), [tabIndex, query]);

  const goPrev = useCallback(() => {
    if (step === 2) {
      setStep(1);
      setShowEmpty(false);
    } else {
      navigation.goBack();
    }
  }, [step, navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step === 2) {
          goPrev();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [step, goPrev]),
  );

  const onSeeCards = () => {
    const picks = picked.map((b) => ({ brandId: b.id, monthly: monthly[b.id] ?? 0 })).filter((p) => p.monthly > 0);
    if (picks.length === 0) {
      setShowEmpty(true);
      return;
    }
    navigation.navigate('ToolResults', {
      tool: 'brands',
      spends: spendsFromBrands(picks),
      answers: brandAnswers(picks),
      // Only brands with a spend, so a column label never names a brand at 0.
      brandIds: picks.map((p) => p.brandId),
      title: 'Best cards for your brands',
      subtitle: brandsSubtitle(picks),
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
      <Header leading="back" title="Best card for brands" onLeadingPress={goPrev} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 1 ? (
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text variant="heading20SemiBold" color={colors.text.primary} accessibilityRole="header">
                {`Pick up to ${MAX_BRANDS} brands you spend on`}
              </Text>

              <Input
                placeholder="Search brands"
                value={query}
                onChangeText={setQuery}
                leadingIcon="search-outline"
                trailingIcon={query ? 'close' : undefined}
                onTrailingPress={() => setQuery('')}
                autoCorrect={false}
                accessibilityLabel="Search brands"
              />

              <TabPrimary
                tabs={TABS.map((t) => ({ label: t.label }))}
                activeIndex={tabIndex}
                onChange={setTabIndex}
                style={{ marginHorizontal: -spacing[16] }}
              />

              {picked.length > 0 ? (
                <View style={{ gap: spacing[8] }}>
                  <Text variant="body14Medium" color={colors.text.secondary}>
                    {`Picked ${picked.length} of ${MAX_BRANDS}`}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
                    {picked.map((b) => (
                      <Chip
                        key={b.id}
                        label={b.name}
                        state="selected"
                        trailingIcon="close"
                        onPress={() => setSelected((cur) => toggleBrand(cur, b.id))}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {limitReached ? (
                <InlineMessage tone="info" message={`You can pick up to ${MAX_BRANDS} brands. Remove one to pick another.`} />
              ) : null}

              {visible.length === 0 ? (
                <Text variant="body14Regular" color={colors.text.secondary}>
                  No brand matches your search.
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[12] }}>
                  {visible.map((b) => {
                    const on = selected.includes(b.id);
                    const disabled = !on && limitReached;
                    return (
                      <Choice
                        key={b.id}
                        type="checkbox"
                        checked={on}
                        disabled={disabled}
                        label={b.name}
                        onChange={() => setSelected((cur) => toggleBrand(cur, b.id))}
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
              )}
            </ScrollView>
            {picked.length > 0
              ? footer(`Enter spends for ${picked.length} ${picked.length === 1 ? 'brand' : 'brands'}`, () => setStep(2))
              : null}
          </>
        ) : (
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text variant="body14Regular" color={colors.text.secondary}>
                {BRANDS_HONEST_LINE}
              </Text>
              <Text variant="body14Regular" color={colors.text.secondary}>
                Enter what you spend on each brand in a month. Leave it at 0 if you do not spend here.
              </Text>
              {picked.map((b) => {
                const q = questionForBrand(b);
                return (
                  <View key={b.id} style={{ gap: spacing[6] }}>
                    <SpendCard
                      name={b.name}
                      value={monthly[b.id] ?? 0}
                      onChange={(v) => {
                        setMonthly((cur) => ({ ...cur, [b.id]: v }));
                        setShowEmpty(false);
                      }}
                      min={q?.min ?? 0}
                      max={q?.rulerMax}
                      step={q?.step}
                      typedEntry
                      typedMax={q?.max}
                    />
                    {!b.exact && b.groupLabel ? (
                      <Text variant="body12Regular" color={colors.text.tertiary}>
                        {b.groupLabel}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
              {showEmpty ? (
                <InlineMessage tone="warning" message="Add a spend above 0 for at least one brand." />
              ) : null}
            </ScrollView>
            {footer('See my cards', onSeeCards)}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
