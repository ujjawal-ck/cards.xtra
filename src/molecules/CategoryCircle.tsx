/**
 * CategoryCircle — molecule
 *
 * Vertical: round image (~64) over a 2-line body12 label. Used in the
 * Offers horizontal category strip and Home "find by category" carousel.
 *
 * The circle is a placeholder coloured disc with an emoji glyph inside.
 * `placeholderColor` keys map to existing semantic tokens — no raw hex
 * from data.
 */
import React from 'react';
import {
  View,
  Pressable,
  Text as RNText,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text } from '../atoms';
import { colors, spacing, radius, iconSize } from '../tokens';

// Category disc diameter. Spec says ~64-72; not a theme token (these
// circles are content visuals, not part of the spacing scale).
const CATEGORY_CIRCLE_SIZE = 64;
const CATEGORY_LABEL_WIDTH = 80;

export type CategoryPlaceholderColor =
  | 'saffron'
  | 'cobalt'
  | 'fern'
  | 'violet'
  | 'sky'
  | 'rose';

const placeholderBgMap: Record<CategoryPlaceholderColor, string> = {
  saffron: colors.background.emphasis,
  cobalt: colors.background.lavender,
  fern: colors.promotional.fernBg,
  violet: colors.promotional.violetBg,
  sky: colors.promotional.skyBg,
  rose: colors.surface.alert,
};

export interface CategoryCircleProps {
  label: string;
  icon: string; // emoji
  placeholderColor?: CategoryPlaceholderColor;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function CategoryCircle({
  label,
  icon,
  placeholderColor = 'cobalt',
  onPress,
  size = CATEGORY_CIRCLE_SIZE,
  style,
}: CategoryCircleProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        {
          alignItems: 'center',
          gap: spacing[6],
          width: CATEGORY_LABEL_WIDTH,
        },
        style,
      ]}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor: placeholderBgMap[placeholderColor],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RNText style={{ fontSize: iconSize[32] }}>{icon}</RNText>
      </View>
      <Text
        variant="body12Medium"
        color={colors.text.primary}
        numberOfLines={2}
        style={{ textAlign: 'center' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
