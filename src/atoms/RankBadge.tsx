/**
 * DS-ADD(ds-expansion-1, 2026-11-17): a small round rank number ("1", "2") for ranked lists.
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts
 * (users: src/molecules/RankedCardRow.tsx).
 *
 * RankBadge — atom
 *
 * Token mapping: action.secondary.default fill, text.link, radius.full, body12SemiBold.
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { colors, spacing, radius } from '../tokens';

export interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  return (
    <View
      accessible
      accessibilityLabel={`Rank ${rank}`}
      style={{
        minWidth: spacing[24],
        height: spacing[24],
        paddingHorizontal: spacing[6],
        borderRadius: radius.full,
        backgroundColor: colors.action.secondary.default,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="body12SemiBold" color={colors.text.link}>
        {rank}
      </Text>
    </View>
  );
}
