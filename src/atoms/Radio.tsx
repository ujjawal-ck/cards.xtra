/**
 * Radio — atom (Figma _RadioBase, same surface family as Checkbox)
 *
 * Perfect circle (radius.full). Two states + disabled:
 *   unselected → white fill, slate border
 *   selected   → cobalt fill + cobalt border + small white inner dot
 *   disabled   → cobalt-disabled fill + border
 *
 * Sizes: md = 20×20 (iconSize[20]), sm = 16×16 (iconSize[16]).
 *
 * Hex → token (same palette as Checkbox):
 *   #fff     → colors.surface.default
 *   #d9e3ec  → colors.border.default
 *   #0741ef  → colors.action.accent.default
 *   #dddce7  → colors.action.accent.disabled
 */
import React from 'react';
import { Pressable, View, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, borderWidth, iconSize, spacing } from '../tokens';
import { haptics } from '../lib/haptics';

export type RadioSize = 'md' | 'sm';

export interface RadioProps {
  selected: boolean;
  size?: RadioSize;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

const SIZE_PX: Record<RadioSize, number> = {
  md: iconSize[20],
  sm: iconSize[16],
};

// Inner dot diameter — half of the outer circle reads well at both sizes.
const INNER_DOT_RATIO = 0.5;

export function Radio({
  selected,
  size = 'md',
  disabled = false,
  onChange,
  style,
}: RadioProps) {
  const box = SIZE_PX[size];
  const innerDot = Math.round(box * INNER_DOT_RATIO);

  const bg = disabled
    ? colors.action.accent.disabled
    : selected
    ? colors.action.accent.default
    : colors.surface.default;

  const border = disabled
    ? colors.action.accent.disabled
    : selected
    ? colors.action.accent.default
    : colors.border.default;

  return (
    <Pressable
      onPress={() => {
        if (!disabled) {
          haptics.selection();
          onChange?.(true);
        }
      }}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ disabled, selected }}
      hitSlop={spacing[12]}
      style={({ pressed }) => [
        {
          width: box,
          height: box,
          borderRadius: radius.full,
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
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            width: innerDot,
            height: innerDot,
            borderRadius: radius.full,
            backgroundColor: colors.surface.default,
          }}
        />
      ) : null}
    </Pressable>
  );
}
