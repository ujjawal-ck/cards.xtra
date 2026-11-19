/**
 * AdvisorOptionRow: one answer option in the reply tray, full width, stacked with the others.
 *
 *   default  surface fill, thin border, medium radius, primary label.
 *   quiet    "Not sure": no visible border, secondary label. Same height and tap area.
 *   selected multi-select pick: the Chip "selected" fill and border, and a check icon. Role checkbox.
 *   disabled dimmed, not pressable (a multi-select question at its pick limit).
 *
 * The label may wrap to two or more lines: no fixed height, minHeight touchMin only.
 * A tap gives the selection haptic, like the Chip atom.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, Icon } from '../../atoms';
import { colors, spacing, radius, borderWidth, opacity, sizing, iconSize } from '../../tokens';
import { haptics } from '../../lib/haptics';

export function AdvisorOptionRow({
  label,
  quiet = false,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  quiet?: boolean;
  /** Set on a multi-select row (true or false): the row is a checkbox. */
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole={selected === undefined ? 'button' : 'checkbox'}
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? { disabled } : { selected, checked: selected, disabled }}
      style={({ pressed }) => ({
        minHeight: sizing.touchMin,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
        justifyContent: 'space-between',
        paddingHorizontal: spacing[16],
        paddingVertical: spacing[10],
        borderRadius: radius.md,
        borderWidth: borderWidth.thin,
        // The quiet row keeps the border width (same height) but in the tray colour, so none shows.
        borderColor: selected ? colors.chip.selectedBorder : quiet ? colors.surface.default : colors.border.default,
        backgroundColor: selected ? colors.background.emphasis : colors.surface.default,
        opacity: disabled ? opacity[40] : pressed ? opacity[80] : opacity[100],
      })}
    >
      <View style={{ flex: 1 }}>
        <Text variant="body14Medium" color={quiet ? colors.text.secondary : colors.text.primary}>
          {label}
        </Text>
      </View>
      {selected ? <Icon name="check-filled" size={iconSize[16]} color={colors.action.primary.default} /> : null}
    </Pressable>
  );
}
