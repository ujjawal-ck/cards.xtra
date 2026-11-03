/**
 * StoreSimilarStore — organism (Figma 3832:25789, "Store/Similar store")
 *
 * A store page's "Similar Store" block. One prop:
 *
 *   property1 (default "Stores"):
 *     "Stores"   → title + one row of 3 store cards (node 3795:76815,
 *                  360×196).
 *     "6 stores" → title + two stacked rows = 6 store cards (node
 *                  3832:25790, 360×364). Two SEPARATE grid instances,
 *                  not one grid emitting 6.
 *
 * REUSE:
 *   - Grid `brand-1x3` variant (node 3098:60742) for each store-card row.
 *     Verified against the node: offer badge always visible, Timer hidden
 *     (showTimer defaults off). Card = white bg, 1px border.subtle3
 *     (#eee), radius.sm, pb spacing[8]; column gap spacing[12], centered;
 *     badge (feedback.error.onColor #fef1f1, px12/py4, ruby-red #da2760)
 *     + 88×62 logo + CTA pill (90×40, feedback.info.hover #0036da,
 *     radius.sm, 2-line caption text, text.inverse #fff).
 *
 * Token map (per property):
 *   root          → column, gap spacing[16], px spacing[16],
 *                   width sizing.containerMobile (360)
 *   title         → typography.body16SemiBold, colors.text.primary
 *   "6 stores" stack → column, gap spacing[12]
 *   grid + cards  → Grid 'brand-1x3' (outer/row gap spacing[8]); card
 *                   tokens per REUSE above (radius.sm, border.subtle3,
 *                   surface/background.default, feedback.error.onColor,
 *                   promotional.rubyRed, feedback.info.hover, text.inverse,
 *                   caption10* typography, spacing[4]/[8]/[12])
 */
import React from 'react';
import { View, ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Text } from '../atoms';
import { Grid } from './Grid';
import type { BrandOfferItem } from './Grid';
import { images } from '../assets/images';
import { colors, spacing, sizing } from '../tokens';

export type StoreSimilarView = 'Stores' | '6 stores';

export interface StoreSimilarStoreItem {
  logo: ImageSourcePropType;
  badge: string;
  cta: string;
}

const s = images.stores;

// Figma sample badges/CTAs paired with real, distinct store logos
// (not one repeated placeholder).
const DEFAULT_STORES_3: StoreSimilarStoreItem[] = [
  { logo: s.amazon2, badge: 'Live Now', cta: 'Upto 7% Cashback' },
  { logo: s.myntra31, badge: 'Upto 80% Off', cta: 'Flat 5% Rewards' },
  { logo: s.fkFashion1, badge: 'Live Now', cta: 'Upto 6% Rewards' },
];

const DEFAULT_STORES_6: StoreSimilarStoreItem[] = [
  ...DEFAULT_STORES_3,
  { logo: s.jioMart12, badge: 'Live Now', cta: 'Upto 7% Cashback' },
  { logo: s.tataNeu12, badge: 'Upto 80% Off', cta: 'Flat 5% Rewards' },
  { logo: s.makeMyTripCab1, badge: 'Live Now', cta: 'Upto 6% Rewards' },
];

export interface StoreSimilarStoreProps {
  /** "Stores" (one row of 3) or "6 stores" (two rows). Default "Stores". */
  property1?: StoreSimilarView;
  /** Store cards. Defaults to 3 (Stores) or 6 (6 stores) Figma samples. */
  stores?: StoreSimilarStoreItem[];
  /** Fired (with the global card index) when a store card is tapped. */
  onStorePress?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/** Map a slice of store items to Grid brand-1x3 items, preserving the
 *  global index for onStorePress (offset by the slice's start). */
function toBrandItems(
  items: StoreSimilarStoreItem[],
  offset: number,
  onStorePress?: (index: number) => void
): BrandOfferItem[] {
  return items.map((item, i) => ({
    logo: item.logo,
    badgeText: item.badge,
    ctaLabel: item.cta,
    onPress: onStorePress ? () => onStorePress(offset + i) : undefined,
  }));
}

export function StoreSimilarStore({
  property1 = 'Stores',
  stores,
  onStorePress,
  style,
}: StoreSimilarStoreProps) {
  const is6 = property1 === '6 stores';
  const data = stores ?? (is6 ? DEFAULT_STORES_6 : DEFAULT_STORES_3);

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
        Similar Store
      </Text>

      {is6 ? (
        // Two SEPARATE brand-1x3 grids stacked (rows of 3 each)
        <View style={{ width: '100%', gap: spacing[12] }}>
          <Grid
            variant="brand-1x3"
            items={toBrandItems(data.slice(0, 3), 0, onStorePress)}
            style={{ width: '100%' }}
          />
          <Grid
            variant="brand-1x3"
            items={toBrandItems(data.slice(3, 6), 3, onStorePress)}
            style={{ width: '100%' }}
          />
        </View>
      ) : (
        // One brand-1x3 grid (row of 3)
        <Grid
          variant="brand-1x3"
          items={toBrandItems(data.slice(0, 3), 0, onStorePress)}
          style={{ width: '100%' }}
        />
      )}
    </View>
  );
}
