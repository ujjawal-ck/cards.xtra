/**
 * Rating — atom
 *
 * A row of star glyphs expressing a 0..total score. Data-driven: the
 * `filled` count is a prop, so the same component renders 4/5, 5/5, etc.
 * Composes the project's `star-filled` Icon (its baked #262626 fill is
 * rewritten to currentColor at build time, so the `color` prop tints it).
 *
 * Default geometry matches the Figma rating component (3713:50081):
 *   5 stars × 16px with a 4px gap → 5×16 + 4×4 = 96 wide × 16 tall.
 *
 * Colour:
 *   filled → colors.icon.warning  (#feca3a, the gold star)
 *   empty  → colors.border.strong (#d9d9d9, a muted "unfilled" star)
 * Both use the SOLID star glyph so the silhouettes stay identical;
 * only the tint differs between filled and empty.
 *
 * Hex → token:
 *   #feca3a → colors.icon.warning
 *   #d9d9d9 → colors.border.strong
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { colors, spacing, iconSize } from '../tokens';

export interface RatingProps {
  /** Number of filled (gold) stars. Clamped to [0, total]. */
  filled: number;
  /** Total number of stars. Default 5. */
  total?: number;
  /** Star glyph size in px. Default iconSize[16] (16). */
  size?: number;
  /** Gap between stars in px. Default spacing[4] (4). */
  gap?: number;
  /** Tint for filled stars. Default colors.icon.warning (gold). */
  filledColor?: string;
  /** Tint for empty stars. Default colors.border.strong. */
  emptyColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Rating({
  filled,
  total = 5,
  size = iconSize[16],
  gap = spacing[4],
  filledColor = colors.icon.warning,
  emptyColor = colors.border.strong,
  style,
}: RatingProps) {
  const filledCount = Math.max(0, Math.min(filled, total));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${filledCount} out of ${total} stars`}
      style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}
    >
      {Array.from({ length: total }).map((_, i) => (
        <Icon
          key={i}
          name="star-filled"
          size={size}
          color={i < filledCount ? filledColor : emptyColor}
        />
      ))}
    </View>
  );
}
