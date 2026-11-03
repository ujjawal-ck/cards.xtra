/**
 * AllCardBenefitsScreen — Figma 5873:27486.
 *
 * Reached from the CardDetailSheet's "View all benefits" CTA. Pushed on the
 * ROOT stack over the tabs. The card-detail sheet's gorhom portal closes when
 * this page covers Home, so HomeScreen re-presents it (same card) when it
 * regains focus — both back actions (top arrow + footer CTA call goBack())
 * therefore return to the card detail, not the bare Home list.
 *
 * Composition:
 *   1. <Header leading="back">  (organism, REUSED) — "All Card Benefits".
 *   2. Category tab pills        (inline) — "All Benefits" + each benefit
 *      category present on the card (Welcome / Travel / Lounge / …). Black
 *      selected pill, white outlined rest. Horizontally scrollable.
 *   3. Benefit list              (inline) — blue "+" glyph + text rows,
 *      hairline-divided, for the active category.
 *   4. <FooterButtons>           (organism, REUSED) — saffron "Go back to
 *      card details" pinned to the bottom.
 *
 * Data: useCardBenefits(alias) → BankKaro product_benefits, mapped to tabs.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { Text } from '../atoms';
import { Header, FooterButtons } from '../organisms';
import { colors, spacing, radius, borderWidth, iconSize } from '../tokens';
import { useCardBenefits } from '../query/useCardBenefits';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AllCardBenefits'>;
type Rt = RouteProp<RootStackParamList, 'AllCardBenefits'>;

/** Blue 4-point sparkle bullet — Figma "Star 6" (filled, #0064E0). */
function StarSixGlyph({ color = colors.action.accent.default }: { color?: string }) {
  const s = iconSize[16];
  return (
    <Svg width={s} height={s} viewBox="0 0 9.16881 9.16881" fill="none">
      <Path
        d="M4.10174 0.369492C4.23494 -0.123164 4.93386 -0.123164 5.06707 0.369492L5.78648 3.03016C5.8329 3.20182 5.96699 3.33591 6.13864 3.38232L8.79931 4.10174C9.29197 4.23494 9.29197 4.93386 8.79931 5.06707L6.13864 5.78648C5.96699 5.8329 5.8329 5.96699 5.78648 6.13864L5.06707 8.79931C4.93386 9.29197 4.23494 9.29197 4.10174 8.79931L3.38232 6.13864C3.33591 5.96699 3.20182 5.8329 3.03016 5.78648L0.369492 5.06707C-0.123164 4.93386 -0.123164 4.23494 0.369492 4.10174L3.03016 3.38232C3.20182 3.33591 3.33591 3.20182 3.38232 3.03016L4.10174 0.369492Z"
        fill={color}
      />
    </Svg>
  );
}

export function AllCardBenefitsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<Rt>();
  const alias = params?.alias;

  const { data: categories = [], isLoading, isError } = useCardBenefits(alias);

  const [activeKey, setActiveKey] = useState<string>('all');
  // Keep the active tab valid as data arrives (default to the first tab).
  const active = useMemo(
    () => categories.find((c) => c.key === activeKey) ?? categories[0],
    [categories, activeKey]
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.surface.default }}
    >
      <StatusBar style="dark" />

      {/* 1. Header — REUSED back variant. */}
      <Header
        leading="back"
        title="All Card Benefits"
        onLeadingPress={() => navigation.goBack()}
      />

      {/* 2. Category tabs */}
      {categories.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[12],
              gap: spacing[8],
            }}
          >
            {categories.map((cat) => {
              const selected = cat.key === active?.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setActiveKey(cat.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={{
                    paddingVertical: spacing[8],
                    paddingHorizontal: spacing[16],
                    borderRadius: radius.full,
                    borderWidth: borderWidth.thin,
                    borderColor: selected
                      ? colors.surface.inverse
                      : colors.border.default,
                    backgroundColor: selected
                      ? colors.surface.inverse
                      : colors.surface.default,
                  }}
                >
                  <Text
                    variant="body14SemiBold"
                    color={selected ? colors.text.inverse : colors.text.primary}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* 3. Benefit list / states */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.action.primary.default} />
        </View>
      ) : isError || categories.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[24],
          }}
        >
          <Text variant="body14Regular" color={colors.text.secondary} align="center">
            {isError
              ? 'Couldn’t load benefits. Please try again.'
              : 'Benefit details aren’t available for this card.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing[16],
            paddingBottom: spacing[24],
          }}
        >
          {(active?.items ?? []).map((item, i) => (
            <View key={i}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing[12],
                  paddingVertical: spacing[16],
                }}
              >
                <View style={{ paddingTop: spacing[2] }}>
                  <StarSixGlyph />
                </View>
                <Text
                  variant="body14Regular"
                  color={colors.text.primary}
                  style={{ flex: 1 }}
                >
                  {item}
                </Text>
              </View>
              <View
                style={{
                  height: borderWidth.thin,
                  backgroundColor: colors.border.subtle,
                }}
              />
            </View>
          ))}
        </ScrollView>
      )}

      {/* 4. Footer — REUSED saffron CTA back to the card detail. */}
      <View style={{ paddingBottom: insets.bottom }}>
        <FooterButtons
          buttons="single"
          size={52}
          shadow="on"
          strip="none"
          color="main"
          primaryLabel="Go back to card details"
          onPrimary={() => navigation.goBack()}
        />
      </View>
    </SafeAreaView>
  );
}
