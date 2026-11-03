/**
 * StoreCashbackTimelines — organism (Figma 3795:78834, "Store/Cashback Timelines")
 *
 * A store page's "Important Details" block: a title over a grid of
 * cashback-timeline stat tiles. One boolean:
 *
 *   appOrderTile (default true) — On shows 3 tiles, the 3rd wrapping to
 *     a new row, left-aligned (node 3795:76813, 360×316). Off shows 2
 *     tiles in one row (node 3795:78835, 360×164).
 *
 * REUSE:
 *   - Grid molecule/organism, `cashback-timelines` variant, for the stat
 *     tiles (Figma 3752:66403 family). Verified: metric = colors.text.link
 *     (#0036da, CK Blue), tile shadow = elevation.light.sm (Shadow/Light/
 *     SM). The grid already owns the 2-per-row chunking, row/tile gaps
 *     (spacing[12]), the trailing left-aligned single tile, the 16px
 *     forward-arrow button (elevation.light.xs, border.default) and the
 *     Opacity/0 unit spacer via `unitHidden`.
 *   - Existing forward-arrow glyph (16px) — provided by the Grid tile.
 *
 * Token map (per property):
 *   root            → column, gap spacing[16], px spacing[16],
 *                     width sizing.containerMobile (360)
 *   title           → typography.body16SemiBold, colors.text.primary
 *   grid            → Grid 'cashback-timelines' (gap spacing[12])
 *   tile bg         → colors.background.default (#fff)
 *   tile radius     → radius.lg
 *   tile padding    → spacing[16]
 *   tile shadow     → elevation.light.sm (Shadow/Light/SM)
 *   tile label      → typography.body12Medium, colors.text.primary
 *   tile metric     → typography.display32Bold, colors.text.link (CK Blue)
 *   tile unit       → typography.body12Regular, colors.text.primary
 *   unitHidden unit → opacity[0] (Opacity/0) spacer (tile 3)
 *   arrow button    → iconSize[24] circle, radius.full, surface.default,
 *                     borderWidth.thin / border.default, elevation.light.xs
 *                     (Shadow/Light/XS), 16px arrow
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from '../atoms';
import { Grid } from './Grid';
import type { TimelineStatItem } from './Grid';
import { colors, spacing, sizing } from '../tokens';

export interface StoreCashbackTimelineTile {
  label: string;
  metric: string;
  unit?: string;
  /** Render `unit` at Opacity/0 (invisible height spacer). */
  unitHidden?: boolean;
}

const DEFAULT_TILES: StoreCashbackTimelineTile[] = [
  { label: 'Cashback tracks in', metric: '30', unit: 'Minutes' },
  { label: 'Cashback Confirms in', metric: '65', unit: 'Days' },
  {
    label: 'Cashback on Mcaffeine app orders',
    metric: 'NO',
    unit: 'Minutes',
    unitHidden: true,
  },
];

export interface StoreCashbackTimelinesProps {
  /** On (true) shows the 3rd (app-order) tile wrapped to a new row. */
  appOrderTile?: boolean;
  /** Stat tiles. Defaults to the three Figma samples (tile 3 hidden-unit). */
  tiles?: StoreCashbackTimelineTile[];
  /** Fired (with the tile index) when a tile's arrow button is tapped. */
  onTilePress?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

export function StoreCashbackTimelines({
  appOrderTile = true,
  tiles = DEFAULT_TILES,
  onTilePress,
  style,
}: StoreCashbackTimelinesProps) {
  // Off omits the app-order tile (the 3rd); On shows every tile.
  const shown = appOrderTile ? tiles : tiles.slice(0, 2);

  const items: TimelineStatItem[] = shown.map((t, i) => ({
    label: t.label,
    metric: t.metric,
    unit: t.unit,
    unitHidden: t.unitHidden,
    onPress: onTilePress ? () => onTilePress(i) : undefined,
  }));

  return (
    <View
      style={[
        {
          width: sizing.containerMobile, // 360
          alignItems: 'flex-start',
          gap: spacing[16],
          paddingHorizontal: spacing[16],
        },
        style,
      ]}
    >
      {/* Title */}
      <Text variant="body16SemiBold" color={colors.text.primary} style={{ width: '100%' }}>
        Important Details
      </Text>

      {/* Stat tiles — reuse the cashback-timelines grid (full width) */}
      <Grid variant="cashback-timelines" items={items} style={{ width: '100%' }} />
    </View>
  );
}
