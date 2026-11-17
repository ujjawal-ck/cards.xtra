/**
 * CrossSellRail — organism (approved prototype: prototypes/cross-sell, v2)
 *
 * The "Not sure about X?" rail that expands directly under a Home tile after the
 * user closes that card's detail without applying. Up to 3 alternative cards in a
 * horizontal row; each states what the user gains against the card they left
 * ("₹2,000 lower annual fee"). Chips above the row switch the reason (lens).
 *
 * Pure presentation: the engine result, the open/close rules and analytics live
 * in src/lib/crossSell.ts and src/screens/useCrossSellRail.ts.
 *
 * Each pick is a CompareCard (GainBand + two CompareStat cells), not CardTile
 * type="scrollable": that tile carries tags, benefit rows and a fee strip, so it
 * cannot compare two cards. Text and icon choice: src/lib/crossSellPresent.ts.
 *
 * Token mapping: surface.sunken2 + action.secondary.border container, radius.xl;
 * lens chips action.accent (selected) / surface.default + action.secondary.border.
 */
import React, { useEffect, useRef } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '../atoms';
import { CompareCard, COMPARE_CARD_W } from '../molecules';
import type { CardModel } from '../molecules';
import { colors, spacing, radius, borderWidth } from '../tokens';
import type { CrossSellPick, CrossSellResult } from '../lib/crossSell';
import { presentPick, shortCardName } from '../lib/crossSellPresent';

export interface CrossSellRailProps {
  /** The tapped card the rail sits under (for accessibility labels). */
  sourceCard: CardModel;
  result: CrossSellResult;
  /** Selected lens key ('top' = Top picks). */
  lensKey: string;
  /** pick card id → the full CardModel (image, reward badge). */
  cardsById: Map<string, CardModel>;
  /** Ids of cards already opened this session (picks render dimmed, "Viewed ·"). */
  viewedIds: string[];
  onCardPress: (card: CardModel, pick: CrossSellPick, slot: number) => void;
  onLensChange: (lensKey: string) => void;
  /** Eligibility result unknown: opens the eligibility checker. */
  onCheckEligibility: () => void;
  onHide: () => void;
}

function LensChip({
  label,
  selected,
  dashed,
  onPress,
}: {
  label: string;
  selected?: boolean;
  dashed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      // 26dp chip + 2 x 10 = 46dp touch target (sizing.touchMin is 44).
      hitSlop={{ top: spacing[10], bottom: spacing[10] }}
      style={{
        paddingVertical: spacing[4],
        paddingHorizontal: spacing[12],
        borderRadius: radius.full,
        borderWidth: borderWidth.thin,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: selected
          ? colors.action.accent.default
          : colors.action.secondary.border,
        backgroundColor: selected
          ? colors.action.accent.default
          : colors.surface.default,
      }}
    >
      <Text
        variant="body12SemiBold"
        color={
          selected
            ? colors.text.inverse
            : dashed
              ? colors.text.link
              : colors.text.primary
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function CrossSellRail({
  sourceCard,
  result,
  lensKey,
  cardsById,
  viewedIds,
  onCardPress,
  onLensChange,
  onCheckEligibility,
  onHide,
}: CrossSellRailProps) {
  const lens = result.lenses.find((l) => l.key === lensKey) ?? result.lenses[0];
  const picksRef = useRef<ScrollView>(null);

  // Switching lens shows a different set: start again from the first pick.
  useEffect(() => {
    picksRef.current?.scrollTo({ x: 0, animated: false });
  }, [lens.key]);

  return (
    <View
      style={{
        gap: spacing[12],
        padding: spacing[12],
        borderRadius: radius.xl,
        borderWidth: borderWidth.thin,
        borderColor: colors.action.secondary.border,
        backgroundColor: colors.surface.sunken2,
      }}
    >
      {/* Header: headline + sub-line, Hide on the right. */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[8] }}>
        <View style={{ flex: 1 }}>
          <Text variant="body16SemiBold" color={colors.text.primary} accessibilityRole="header">
            {result.headline}
          </Text>
          <Text variant="body12Regular" color={colors.text.secondary}>
            {result.sub}
          </Text>
        </View>
        <Pressable
          onPress={onHide}
          hitSlop={spacing[14]}
          accessibilityRole="button"
          accessibilityLabel={`Hide suggestions for ${sourceCard.name}`}
        >
          <Text variant="body12SemiBold" color={colors.text.link}>
            Hide
          </Text>
        </Pressable>
      </View>

      {/* Lens chips: single select. The dashed chip only while eligibility is unknown. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginRight: -spacing[12] }}
        contentContainerStyle={{ gap: spacing[6], paddingRight: spacing[12] }}
      >
        {result.lenses.map((l) => (
          <LensChip
            key={l.key}
            label={l.label}
            selected={l.key === lens.key}
            onPress={() => onLensChange(l.key)}
          />
        ))}
        {result.askEligibility ? (
          <LensChip dashed label="Check what I can get" onPress={onCheckEligibility} />
        ) : null}
      </ScrollView>

      {/* Picks: snap to card, no indicator, the next card peeks. */}
      <ScrollView
        ref={picksRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={COMPARE_CARD_W + spacing[8]}
        snapToAlignment="start"
        style={{ marginRight: -spacing[12] }}
        contentContainerStyle={{ gap: spacing[8], paddingRight: spacing[12] }}
      >
        {lens.picks.map((pick, i) => {
          const card = cardsById.get(pick.card.id);
          if (!card) return null;
          const view = presentPick(sourceCard.crossSell ?? pick.card, pick, card);
          return (
            <CompareCard
              key={pick.card.id}
              cardImage={card.cardImage}
              name={shortCardName(card.name)}
              sourceName={shortCardName(sourceCard.name)}
              bandTone={pick.tone}
              bandIcon={view.icon}
              bandText={view.bandText}
              bandAmount={view.bandAmount}
              stats={view.stats}
              // The band already says it for the "You can get" lens.
              eligible={pick.eligible && pick.lens !== 'eligible'}
              viewed={viewedIds.indexOf(card.id) !== -1}
              onPress={() => onCardPress(card, pick, i + 1)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
