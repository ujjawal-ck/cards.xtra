/**
 * BrandLogo + BrandLogoGrid — molecules (Figma 3283:47650)
 *
 * BrandLogo
 *   A 104 × 48 chip with a 1-px border that displays a brand/partner
 *   logo image (74 × Media/32) centred on both axes via flexbox. The
 *   image uses `resizeMode: 'contain'` so each logo keeps its aspect
 *   ratio inside the 74 × 32 frame.
 *
 * BrandLogoGrid
 *   Renders one BrandLogo per entry sourced from the images index
 *   (`src/assets/images/index.ts`). Wraps via flexWrap; spacing tokens
 *   set the gaps. Each call renders ONE collection — defaults to
 *   `images.brands`. To render the store/partner logos, pass
 *   `logos={Object.values(images.stores)}` (or build any custom list).
 *   Rendering brands + stores in one mixed grid is intentionally not
 *   supported; pass them as two separate grids so sourcing stays
 *   unambiguous (a previous `includeStores` flag mixed them under a
 *   single render and made it look like the wrong files were resolving).
 *
 * Why "source from the index" matters
 *   Adding a new logo later is one require() line in
 *   src/assets/images/index.ts — the grid picks it up automatically
 *   with no component change.
 *
 * Hex → token:
 *   #ffffff → colors.surface.default   (background/default)
 *   #d9e3ec → colors.border.default    (border/default)
 *   8       → radius.sm                (Radius/sm)
 *   32      → mediaSize[32]            (Media/32)
 *   1       → borderWidth.thin
 *   gap     → spacing[8]
 */
import React from 'react';
import {
  View,
  Image,
  Pressable,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { images } from '../assets/images';
import { RemoteImage } from '../atoms';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  mediaSize,
} from '../tokens';

// Container + image dims — component-spec, not in any global scale.
// (Container width 104 + image width 74 are Figma component specs.)
const LOGO_W = 104;
const LOGO_H = spacing[48]; // 48
const IMAGE_W = 74;
const IMAGE_H = mediaSize[32]; // 32

// ----------------------------------------------------------------------------
// BrandLogo — single chip
// ----------------------------------------------------------------------------
export interface BrandLogoProps {
  source: ImageSourcePropType;
  onPress?: () => void;
  /** A11y label (e.g. brand name). Falls back to "Brand logo". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function BrandLogo({
  source,
  onPress,
  accessibilityLabel = 'Brand logo',
  style,
}: BrandLogoProps) {
  const chip = (
    <View
      style={[
        {
          width: LOGO_W,
          height: LOGO_H,
          borderRadius: radius.sm,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          backgroundColor: colors.surface.default,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <RemoteImage
        source={source}
        style={{ width: IMAGE_W, height: IMAGE_H }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );

  if (!onPress) return chip;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {chip}
    </Pressable>
  );
}

// ----------------------------------------------------------------------------
// BrandLogoGrid — source all from the images index
// ----------------------------------------------------------------------------
export interface BrandLogoGridProps {
  /** Logos to render. Default = `Object.values(images.brands)`. For
   *  store/partner logos, pass `Object.values(images.stores)`. */
  logos?: ImageSourcePropType[];
  onLogoPress?: (logo: ImageSourcePropType, index: number) => void;
  style?: StyleProp<ViewStyle>;
}

export function BrandLogoGrid({
  logos,
  onLogoPress,
  style,
}: BrandLogoGridProps) {
  // Sourced from the images index — adding a new logo means dropping
  // a file + one line in src/assets/images/index.ts; this list updates
  // automatically.
  const data: ImageSourcePropType[] = logos ?? Object.values(images.brands);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing[8],
        },
        style,
      ]}
    >
      {data.map((src, i) => (
        <BrandLogo
          key={i}
          source={src}
          onPress={onLogoPress ? () => onLogoPress(src, i) : undefined}
        />
      ))}
    </View>
  );
}
