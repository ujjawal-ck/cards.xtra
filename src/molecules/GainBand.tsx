/**
 * DS-ADD(ds-expansion-1, 2026-11-17): a flat colour band across the TOP of a card saying what the user gains (icon, amount, caption; or "Viewed").
 * Rollback: delete this file and its DS-ADD export lines in src/molecules/index.ts
 * (users: src/molecules/CompareCard.tsx).
 *
 * GainBand — molecule
 *
 * Edge to edge, one line. With `amount`: the amount in body16SemiBold then `text`
 * in body12Regular ("₹1,180" + "less a year"). Without: `text` in body14SemiBold.
 * The amount is never shrunk or cut. Only `text` can change: normally it may
 * shrink (adjustsFontSizeToFit, floor 0.85) and, if it still does not fit,
 * ends with "…". `viewed` switches to the gray tone and adds a check icon +
 * "Viewed" at the right end (full size, never shrunk). In that state `text`
 * does not shrink: it keeps its normal size on one line and ends with "…"
 * when too long. The gain text is not prefixed.
 *
 * Flat fills (no gradient) so the band reads edge to edge:
 *   success / brand / info / purple / gray → colors.tones[tone].bg + .text
 */
import React from 'react';
import { View } from 'react-native';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import { colors, spacing, iconSize } from '../tokens';

export type GainBandTone = 'success' | 'brand' | 'info' | 'purple' | 'gray';

export interface GainBandProps {
  tone: GainBandTone;
  icon: IconName;
  text: string;
  /** Big figure shown before `text`, e.g. "₹1,180". */
  amount?: string;
  /** Show the gray "Viewed" state. */
  viewed?: boolean;
}

const SHRINK_FLOOR = 0.85;

export function GainBand({ tone, icon, text, amount, viewed = false }: GainBandProps) {
  const t = colors.tones[viewed ? 'gray' : tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[6],
        paddingVertical: spacing[6],
        paddingHorizontal: spacing[12],
        backgroundColor: t.bg,
      }}
    >
      <Icon name={icon} size={iconSize[16]} color={t.text} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[4], minWidth: 0 }}>
        {amount ? (
          <Text variant="body16SemiBold" color={t.text} numberOfLines={1} style={{ flexShrink: 0 }}>
            {amount}
          </Text>
        ) : null}
        <Text
          variant={amount ? 'body12Regular' : 'body14SemiBold'}
          color={t.text}
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit={!viewed}
          minimumFontScale={viewed ? undefined : SHRINK_FLOOR}
          style={{ flexShrink: 1 }}
        >
          {text}
        </Text>
      </View>
      {viewed ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexShrink: 0 }}>
          <Icon name="check-outline" size={iconSize[16]} color={t.text} />
          <Text variant="body12SemiBold" color={t.text}>
            Viewed
          </Text>
        </View>
      ) : null}
    </View>
  );
}
