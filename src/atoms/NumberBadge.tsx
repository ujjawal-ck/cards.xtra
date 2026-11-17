/**
 * DS-ADD(ds-figma-1, 2026-11-17): small round count badge (dark or light).
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1051:2424099 (number-badge, dark) and 1300:9221 (light). Metrics from Figma values (2026-11-17):
 * 16 x 16 minimum, fully round, padding 0 / 6 (dark) and 1 / 6 (light), count Outfit 500 9; dark = inverse surface + inverse text + medium
 * border; light = elevated surface + 1 px border + secondary text.
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts.
 *
 * NumberBadge — atom. New part. RankBadge is 24 px, link-coloured and says "Rank n"; this is the 16 px count marker for tabs, carts and chips.
 * Colours by role: dark fill colors.surface.inverse, light fill colors.surface.default, light border colors.border.subtle2.
 * Type: caption10Medium (Figma is 9 px; we have no 9 px variant, see manifest).
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, spacing, radius, borderWidth } from '../tokens';

export type NumberBadgeTone = 'dark' | 'light';

export interface NumberBadgeProps {
  count: number;
  tone?: NumberBadgeTone;
  /** Screen-reader text. Default: the count as a word-free number. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function NumberBadge({ count, tone = 'dark', accessibilityLabel, style }: NumberBadgeProps) {
  const dark = tone === 'dark';
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? String(count)}
      style={[
        {
          minWidth: spacing[16],
          height: spacing[16],
          paddingHorizontal: spacing[6],
          borderRadius: radius.full,
          borderWidth: dark ? borderWidth.thick : borderWidth.thin,
          borderColor: dark ? colors.surface.inverse : colors.border.subtle2,
          backgroundColor: dark ? colors.surface.inverse : colors.surface.default,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text variant="caption10Medium" color={dark ? colors.text.inverse : colors.text.secondary} align="center">
        {count}
      </Text>
    </View>
  );
}
