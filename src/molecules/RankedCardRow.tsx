/**
 * DS-ADD(ds-expansion-1, 2026-11-17): one row of a ranked card result (rank, art, name, one headline rupee value, reason, eligibility, actions).
 * Rollback: delete this file and its DS-ADD export lines in src/molecules/index.ts.
 *
 * RankedCardRow — molecule
 *
 * The compact sibling of CardTile. The headline amount is a number the caller
 * computed (this part does not decide the net-value rule). Eligibility 'eligible'
 * shows a success line with a check, 'maybe' a warning line, 'unknown' nothing.
 *
 * Token mapping: surface.default, border.subtle3, radius.lg, elevation.light.xs,
 * heading18SemiBold amount, body14SemiBold name, body12Regular reason, RankBadge.
 */
import React from 'react';
import { View, Pressable, Image, ImageSourcePropType } from 'react-native';
import { Text, Icon, RankBadge, Button, Checkbox } from '../atoms';
import { colors, spacing, radius, borderWidth, iconSize, elevation, opacity } from '../tokens';
import { formatINR } from '../lib/money';

const ART_W = spacing[64];
const ART_ASPECT = 132 / 84; // CardTile art ratio

export interface RankedCardRowProps {
  rank: number;
  cardImage: ImageSourcePropType;
  name: string;
  headline: { label: string; amount: number; period?: 'year' | 'month' };
  reason?: string;
  eligibility?: 'eligible' | 'maybe' | 'unknown';
  compare?: { selected: boolean; onToggle: (next: boolean) => void };
  onPress: () => void;
  onApply?: () => void;
}

export function RankedCardRow({
  rank,
  cardImage,
  name,
  headline,
  reason,
  eligibility = 'unknown',
  compare,
  onPress,
  onApply,
}: RankedCardRowProps) {
  const amount = formatINR(headline.amount) + (headline.period ? ` a ${headline.period}` : '');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${rank}. ${name}. ${headline.label} ${amount}.${reason ? ` ${reason}.` : ''}`}
      accessibilityHint="Opens card details"
      style={({ pressed }) => [
        {
          gap: spacing[8],
          padding: spacing[12],
          borderRadius: radius.lg,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
          backgroundColor: colors.surface.default,
          opacity: pressed ? opacity[80] : opacity[100],
        },
        elevation.light.xs,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[8] }}>
        <RankBadge rank={rank} />
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
        <View style={{ flex: 1, gap: spacing[2] }}>
          <Text variant="body14SemiBold" color={colors.text.primary} numberOfLines={2}>
            {name}
          </Text>
          <Text variant="body12Regular" color={colors.text.secondary}>
            {headline.label}
          </Text>
          <Text variant="heading18SemiBold" color={colors.text.primary}>
            {amount}
          </Text>
        </View>
      </View>
      {reason ? (
        <Text variant="body12Regular" color={colors.text.secondary} numberOfLines={2}>
          {reason}
        </Text>
      ) : null}
      {eligibility !== 'unknown' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
          <Icon
            name={eligibility === 'eligible' ? 'check-circle-outline' : 'desc-exclamation'}
            size={iconSize[16]}
            color={eligibility === 'eligible' ? colors.feedback.success.text : colors.feedback.warning.text}
          />
          <Text
            variant="body12SemiBold"
            color={eligibility === 'eligible' ? colors.feedback.success.text : colors.feedback.warning.text}
          >
            {eligibility === 'eligible' ? 'You can get this card' : 'You may get this card'}
          </Text>
        </View>
      ) : null}
      {compare || onApply ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[8] }}>
          {compare ? (
            <Pressable
              onPress={() => compare.onToggle(!compare.selected)}
              hitSlop={spacing[8]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: compare.selected }}
              accessibilityLabel={`Compare ${name}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[6] }}
            >
              <Checkbox checked={compare.selected} size="sm" />
              <Text variant="body12SemiBold" color={colors.text.link}>
                Compare
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
          {onApply ? <Button label="Apply now" size={36} icon="trailing" iconName="chevron-right" onPress={onApply} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
