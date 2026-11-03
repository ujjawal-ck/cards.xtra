/**
 * Checkbox — atom (Figma _CheckboxBase 601:23660)
 *
 * Rounded square (radius.xs / 4). Three checked states:
 *   false           → empty white box, slate border
 *   true            → cobalt fill + cobalt border + white checkmark icon
 *   'indeterminate' → cobalt fill + cobalt border + white horizontal dash
 *
 * Disabled greys the fill + border using colors.action.accent.disabled
 * and blocks onChange.
 *
 * Sizes: md = 20×20 (iconSize[20]), sm = 16×16 (iconSize[16]).
 *
 * Hex → token:
 *   #fff     → colors.surface.default      (unchecked fill + checkmark colour)
 *   #d9e3ec  → colors.border.default       (unchecked border)
 *   #0741ef  → colors.action.accent.default (checked fill + border)
 *   #dddce7  → colors.action.accent.disabled (disabled fill + border)
 */
import React from 'react';
import { Pressable, View, StyleProp, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { colors, radius, borderWidth, iconSize, spacing } from '../tokens';
import { haptics } from '../lib/haptics';

export type CheckboxSize = 'md' | 'sm';
export type CheckboxValue = boolean | 'indeterminate';

export interface CheckboxProps {
  checked: CheckboxValue;
  size?: CheckboxSize;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

const SIZE_PX: Record<CheckboxSize, number> = {
  md: iconSize[20],
  sm: iconSize[16],
};

// Inner glyph size: 2px less than the box on each side so the checkmark
// reads as inset, not flush.
const INNER_INSET = 4;

export function Checkbox({
  checked,
  size = 'md',
  disabled = false,
  onChange,
  style,
}: CheckboxProps) {
  const box = SIZE_PX[size];

  const isOn = checked === true || checked === 'indeterminate';

  const bg = disabled
    ? colors.action.accent.disabled
    : isOn
    ? colors.action.accent.default
    : colors.surface.default;

  const border = disabled
    ? colors.action.accent.disabled
    : isOn
    ? colors.action.accent.default
    : colors.border.default;

  const glyphColor = colors.surface.default;
  const glyphSize = box - INNER_INSET;

  const handlePress = () => {
    if (disabled) return;
    haptics.selection();
    // indeterminate → true is the conventional next tap; otherwise toggle.
    onChange?.(checked === 'indeterminate' ? true : !checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{
        disabled,
        checked: checked === 'indeterminate' ? 'mixed' : checked,
      }}
      // Generous hitSlop — 20×20 + 12 on every side = 44×44 effective
      // target, matching iOS HIG / Material minimum touch sizes.
      hitSlop={spacing[12]}
      style={({ pressed }) => [
        {
          width: box,
          height: box,
          borderRadius: radius.xs,
          borderWidth: borderWidth.thin,
          borderColor: border,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed && !disabled ? 0.7 : 1,
        },
        style,
      ]}
    >
      {/* pointerEvents=none keeps the inner glyph from swallowing the
          tap on platforms where SVG / View children can capture touches
          before they reach the Pressable's gesture responder. */}
      {checked === true ? (
        <View pointerEvents="none">
          <Icon name="check-outline" size={glyphSize} color={glyphColor} />
        </View>
      ) : null}
      {checked === 'indeterminate' ? (
        <View
          pointerEvents="none"
          style={{
            width: glyphSize,
            height: borderWidth.heavy,
            backgroundColor: glyphColor,
            borderRadius: radius.xs,
          }}
        />
      ) : null}
    </Pressable>
  );
}
