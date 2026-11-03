/**
 * BrandLogoTile — atom (Figma "Image/Brand Logos" 4129:23686)
 *
 * A small bordered logo tile: a partner/brand image fills the box
 * (object-cover), under a 1px border with rounded corners. Distinct from
 * the BrandLogo molecule (104×48 with a *contained* 74×32 image) — this is
 * a smaller tile whose image FILLS the box, used in the missing-cashback
 * retailer list + choose-date header.
 *
 * Token map (per property):
 *   width 74         → flagged untokenized literal (no width on the scale)
 *   height '32'      → mediaSize[32]  (74×32 ticket tile, Figma 4129:25303)
 *   height '40'      → mediaSize[40]
 *   height '44'      → flagged untokenized literal (Media/44 not in mediaSize)
 *   bg               → colors.surface.default
 *   radius           → radius.sm
 *   border color     → colors.border.default
 *   border width     → borderWidth.thin
 *   overflow         → 'hidden' (clip)
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, borderWidth, mediaSize, spacing } from '../tokens';
import { images } from '../assets/images';

export type BrandLogoTileSize = '32' | '40' | '44';

export interface BrandLogoTileProps {
  /** Brand/partner image from the src/assets/images index. */
  source: ImageSourcePropType;
  /** Tile height: '32' (Media/32), '40' (Media/40, default), or '44' (Media/44). */
  size?: BrandLogoTileSize;
  style?: StyleProp<ViewStyle>;
}

// Component-spec dimensions not on the token scale (the two flagged
// untokenized values): the fixed 74 tile width, and the 44 height
// (Media/44 has no slot in mediaSize). The 32 + 40 heights use mediaSize.
const TILE_WIDTH = 74;
const TILE_HEIGHT: Record<BrandLogoTileSize, number> = {
  '32': mediaSize[32],
  '40': mediaSize[40],
  '44': 44,
};

export function BrandLogoTile({ source, size = '40', style }: BrandLogoTileProps) {
  // Remote logo URLs (CashKaro store_logo) can 404 or be an unsupported
  // format — RN <Image> then renders nothing and the tile looks blank. Track
  // a load error and fall back to the Cards.xtra mark so a row is never empty.
  const [errored, setErrored] = useState(false);
  // Reset the error if the row is recycled with a different logo.
  useEffect(() => setErrored(false), [source]);
  const resolved = errored ? images.logos.darkSmall : source;

  return (
    <View
      style={[
        {
          width: TILE_WIDTH,
          height: TILE_HEIGHT[size],
          borderRadius: radius.sm,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          backgroundColor: colors.surface.default,
          overflow: 'hidden',
          // Contain the logo with a little breathing room — brand logos carry
          // transparent padding, so 'cover' zooms into that empty margin and
          // the tile reads as blank. 'contain' shows the whole mark.
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[6],
        },
        style,
      ]}
    >
      <Image
        source={resolved}
        resizeMode="contain"
        style={{ width: '100%', height: '100%' }}
        onError={() => setErrored(true)}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
