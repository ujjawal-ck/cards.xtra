/**
 * AdvisorOptionRow: one answer option in the reply tray, full width, stacked with the others.
 *
 *   default  surface fill, thin border, medium radius, primary label.
 *   quiet    "Not sure": no visible border, secondary label. Same height and tap area.
 *
 * The label may wrap to two or more lines: no fixed height, minHeight touchMin only.
 * A tap gives the selection haptic, like the Chip atom.
 */
import React from 'react';
import { Pressable } from 'react-native';
import { Text } from '../../atoms';
import { colors, spacing, radius, borderWidth, opacity, sizing } from '../../tokens';
import { haptics } from '../../lib/haptics';

export function AdvisorOptionRow({
  label,
  quiet = false,
  onPress,
}: {
  label: string;
  quiet?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: sizing.touchMin,
        justifyContent: 'center',
        paddingHorizontal: spacing[16],
        paddingVertical: spacing[10],
        borderRadius: radius.md,
        borderWidth: borderWidth.thin,
        // The quiet row keeps the border width (same height) but in the tray colour, so none shows.
        borderColor: quiet ? colors.surface.default : colors.border.default,
        backgroundColor: colors.surface.default,
        opacity: pressed ? opacity[80] : opacity[100],
      })}
    >
      <Text variant="body14Medium" color={quiet ? colors.text.secondary : colors.text.primary}>
        {label}
      </Text>
    </Pressable>
  );
}
