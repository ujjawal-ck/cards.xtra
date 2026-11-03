/**
 * LogoContainer — atom (Figma file P7UcoZYBnfyefmJIA8wcM7, orders/list row)
 *
 * Fixed 80×48 framed brand-logo tile: a white box with a 1px border and
 * rounded corners holding a contained 56×24 logo image centred on both
 * axes. Distinct from:
 *   - BrandLogo molecule (104×48 frame, contained 74×32 image)
 *   - BrandLogoTile atom  (74×h, image FILLS the box)
 * This is the smaller orders-list row variant.
 *
 * Token map (per property):
 *   width 80     → spacing[80]
 *   height 48    → spacing[48]
 *   radius       → radius.xs (4)
 *   border       → borderWidth.thin / colors.border.default
 *   bg           → colors.surface.default
 *   image 56×24  → mediaSize[56] × mediaSize[24], resizeMode 'contain'
 */
import React from 'react';
import {
  View,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, spacing, radius, borderWidth, mediaSize } from '../tokens';

export interface LogoContainerProps {
  /** Brand/partner logo image from the src/assets/images index. */
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}

export function LogoContainer({ source, style }: LogoContainerProps) {
  return (
    <View
      style={[
        {
          width: spacing[80],
          height: spacing[48],
          borderRadius: radius.xs,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          backgroundColor: colors.surface.default,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={{ width: mediaSize[56], height: mediaSize[24] }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
