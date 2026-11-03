/**
 * DateSelection — atom (Figma set 3502:61790, Default + Selected)
 *
 * A 64×64 circular day-selector chip showing a date number. The
 * cobalt border is present in BOTH states; selection flips the fill
 * (white → cobalt) and the number colour (cobalt → white).
 *
 * Token map (per property):
 *   box w/h          → spacing[64]
 *   radius           → radius['3xl'] (32 → circle on a square box)
 *   border color     → colors.border.focussed   (both states)
 *   border width     → borderWidth.thin
 *   bg Default       → colors.surface.default
 *   bg Selected      → colors.border.focussed
 *   number type      → typography body16SemiBold
 *   number Default   → colors.action.secondary.text
 *   number Selected  → colors.action.accent.text
 *
 * Imports: Text (atom).
 */
import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, spacing, radius, borderWidth } from '../tokens';

export type DateSelectionState = 'Default' | 'Selected';

export interface DateSelectionProps {
  /** Day number, e.g. "05". */
  day: string;
  property1?: DateSelectionState;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function DateSelection({
  day,
  property1 = 'Default',
  onPress,
  style,
}: DateSelectionProps) {
  const selected = property1 === 'Selected';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Date ${day}`}
      style={[
        {
          width: spacing[64],
          height: spacing[64],
          borderRadius: radius['3xl'],
          borderWidth: borderWidth.thin,
          borderColor: colors.border.focussed,
          backgroundColor: selected ? colors.border.focussed : colors.surface.default,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        variant="body16SemiBold"
        align="center"
        color={selected ? colors.action.accent.text : colors.action.secondary.text}
      >
        {day}
      </Text>
    </Pressable>
  );
}
