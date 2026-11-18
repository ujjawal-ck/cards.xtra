/**
 * InlineFilterQuestion — molecule
 *
 * One filter question placed between the Home card tiles: the title, then
 * the answer chips in a wrapping row. Chip looks (existing Chip states only):
 *   unselected   → default chip, label "<label> (<count>)"
 *   selected     → "selected with count" look (Chip `count` prop = cards left)
 *   action chip  → default chip, label only
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '../atoms';
import { Chip } from '../atoms/Chip';
import { colors, spacing, radius, borderWidth } from '../tokens';
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
        borderWidth: borderWidth.thin,
        borderColor: colors.border.default,
        backgroundColor: colors.surface.default,
      }}
    >
      <Text variant="body14Medium" color={colors.text.primary}>
        {row.title}
      </Text>
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
