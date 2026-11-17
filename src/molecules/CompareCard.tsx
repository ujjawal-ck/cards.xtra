/**
 * DS-ADD(ds-expansion-1, 2026-11-17): a card in a horizontal "compare with another card" row (GainBand, art + name, two StatDelta rows, View card).
 * Rollback: delete this file and its DS-ADD export lines in src/molecules/index.ts
 * (users: src/organisms/CrossSellRail.tsx).
 *
 * CompareCard — molecule
 *
 * GainBand on top; then card art + name (the caller passes a cleaned name); two
 * full-width StatDelta rows; an optional "You can get this card" line; "View card"
 * pinned bottom-right. `viewed` keeps full opacity and turns the band gray with a
 * "Viewed" mark. Pressed: opacity[80] + the light haptic Button uses.
 *
 * Accessibility: one label — "{name}. {gain}. {stat} {value}, {delta} than {source}.
 * … You can get this card." — with hint "Opens card details".
 *
 * Token mapping: surface.default, border.subtle3, radius.lg, elevation.light.xs,
 * art spacing[80] wide at the CardTile 132:84 ratio.
 */
import React from 'react';
import { View, Pressable, Image, ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Text, Icon, StatDelta } from '../atoms';
import type { IconName, StatDeltaDirection, StatDeltaSentiment } from '../atoms';
import { GainBand } from './GainBand';
import type { GainBandTone } from './GainBand';
import { colors, spacing, radius, borderWidth, iconSize, elevation, opacity } from '../tokens';
import { triggerHaptic } from '../lib/haptics';

// Component-spec width (same pattern as CARD_OFFER_W in Carousels): a 360dp phone
// shows one card in full and the next one peeking.
export const COMPARE_CARD_W = 236;
const ART_W = spacing[80];
const ART_ASPECT = 132 / 84; // CardTile art ratio

export interface CompareCardStat {
  label: string;
  value: string;
  /** e.g. "₹2,360 less", "₹600 more", "Same". */
  delta: string;
  direction: StatDeltaDirection;
  sentiment: StatDeltaSentiment;
}

export interface CompareCardProps {
  cardImage: ImageSourcePropType;
  /** Already shortened by the caller (e.g. without "Credit Card"). */
  name: string;
  /** Short name of the card it is compared with, for the screen reader. */
  sourceName: string;
  bandTone: GainBandTone;
  bandIcon: IconName;
  bandText: string;
  bandAmount?: string;
  /** Exactly two stats, as full-width rows. */
  stats: [CompareCardStat, CompareCardStat];
  /** Show "You can get this card" (hide it when the band already says so). */
  eligible?: boolean;
  viewed?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

function spokenDelta(delta: string, sourceName: string): string {
  return delta === 'Same' ? `same as ${sourceName}` : `${delta} than ${sourceName}`;
}

export function CompareCard({
  cardImage,
  name,
  sourceName,
  bandTone,
  bandIcon,
  bandText,
  bandAmount,
  stats,
  eligible = false,
  viewed = false,
  onPress,
  style,
}: CompareCardProps) {
  const gain = bandAmount ? `${bandAmount} ${bandText}` : bandText;
  const label =
    `${name}. ${gain}. ` +
    stats.map((s) => `${s.label} ${s.value}, ${spokenDelta(s.delta, sourceName)}.`).join(' ') +
    (eligible ? ' You can get this card.' : '') +
    (viewed ? ' Viewed.' : '');
  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens card details"
      style={({ pressed }) => [
        {
          width: COMPARE_CARD_W,
          overflow: 'hidden',
          borderRadius: radius.lg,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
          backgroundColor: colors.surface.default,
          opacity: pressed ? opacity[80] : opacity[100],
        },
        elevation.light.xs,
        style,
      ]}
    >
      <GainBand tone={bandTone} icon={bandIcon} text={bandText} amount={bandAmount} viewed={viewed} />
      <View style={{ flex: 1, gap: spacing[8], padding: spacing[12] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
          <Image
            source={cardImage}
            style={{
              width: ART_W,
              aspectRatio: ART_ASPECT,
              borderRadius: radius.sm,
              backgroundColor: colors.surface.sunken,
            }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          <Text variant="body14SemiBold" color={colors.text.primary} numberOfLines={2} style={{ flex: 1 }}>
            {name}
          </Text>
        </View>
        <View style={{ gap: spacing[6] }}>
          {stats.map((s) => (
            <StatDelta
              key={s.label}
              label={s.label}
              value={s.value}
              delta={s.delta}
              direction={s.direction}
              sentiment={s.sentiment}
            />
          ))}
        </View>
        {eligible ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
            <Icon name="check-circle-outline" size={iconSize[16]} color={colors.feedback.success.text} />
            <Text variant="body12SemiBold" color={colors.feedback.success.text}>
              You can get this card
            </Text>
          </View>
        ) : null}
        <View
          style={{
            marginTop: 'auto',
            flexDirection: 'row',
            alignSelf: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Text variant="body12SemiBold" color={colors.text.link}>
            View card
          </Text>
          <Icon name="chevron-right" size={iconSize[16]} color={colors.text.link} />
        </View>
      </View>
    </Pressable>
  );
}
