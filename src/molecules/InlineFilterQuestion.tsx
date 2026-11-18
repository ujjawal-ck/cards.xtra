/**
 * InlineFilterQuestion — molecule
 *
 * One filter question placed between the Home card tiles: a small "filter" mark
 * and the title, then the answer chips in a wrapping row.
 *
 * It must not read as a card: card tiles are white with a hairline border, so
 * this is a flat tinted panel (surface.sunken, no border) and the chips stay
 * white on it. Chip looks (existing Chip states only):
 *   unselected   → default chip, label "<label> (<count>)"
 *   selected     → "selected with count" look (Chip `count` prop = cards left)
 *   action chip  → default chip, label only
 */
import React from 'react';
import { View } from 'react-native';
import { Text, Icon } from '../atoms';
import { Chip } from '../atoms/Chip';
import { colors, spacing, radius, iconSize } from '../tokens';
import type { InlineRow, InlineChip } from '../lib/inlineFilters';

export interface InlineFilterQuestionProps {
  row: InlineRow;
  onChipPress: (chip: InlineChip) => void;
}

function InlineFilterQuestionBase({ row, onChipPress }: InlineFilterQuestionProps) {
  return (
    <View
      style={{
        gap: spacing[12],
        padding: spacing[16],
        borderRadius: radius.md,
        backgroundColor: colors.surface.sunken,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
        <Icon name="filter-outline" size={iconSize[16]} color={colors.text.secondary} />
        <Text variant="body14SemiBold" color={colors.text.primary} style={{ flex: 1 }}>
          {row.title}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
        {row.chips.map((chip) => {
          const isAction = !!chip.action;
          const hasCount = typeof chip.count === 'number';
          const label =
            isAction || chip.selected || !hasCount
              ? chip.label
              : `${chip.label} (${chip.count})`;
          return (
            <Chip
              key={chip.key}
              label={label}
              size={32}
              state={chip.selected ? 'selected' : 'default'}
              count={chip.selected && hasCount ? chip.count : undefined}
              onPress={() => onChipPress(chip)}
            />
          );
        })}
      </View>
    </View>
  );
}

export const InlineFilterQuestion = React.memo(InlineFilterQuestionBase);
