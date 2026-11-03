/**
 * Grid — organism (Figma 3098:60741)
 *
 * Multi-variant grid renderer. The component switches on `variant`
 * so additional variants can drop in without restructuring callers.
 * Each variant has its own item type, exposed via a discriminated
 * GridProps union.
 *
 * 'features' variant (Figma 3098:60741)
 * -------------------------------------
 *   Outer column: 328 wide, height hugs content, gap spacing[12].
 *   Rows of two equal-width tiles, gap spacing[12] between tiles.
 *   Tile (fills the row column, height ~86): radius.xl, white bg, 1px
 *   border.subtle2 (#dce5fe), vertical padding spacing[8] / horizontal
 *   spacing[12], gap spacing[4]. Icon centred above caption.
 *
 * 'cashback-timelines' variant (Figma 3752:66403)
 * -----------------------------------------------
 *   Outer column: 328 wide, gap spacing[12]. Items chunked into rows of
 *   2; if the trailing row holds a single item it stretches full width.
 *   Stat card: padding spacing[16] / gap spacing[10], radius.lg, white
 *   bg, elevation.light.sm (#000 8% y2 blur8). Vertical stack:
 *     • Top label   — body12Medium, text.primary, align center.
 *     • Big metric  — display32Bold, text.link (#0036da, CK Blue), align center.
 *     • Unit        — body12Regular, text.primary, align center.
 *     • Forward-arrow button — 24×24 circle, radius.full, white bg,
 *       1px border.default, elevation.light.xs (#000 6% y1 blur2),
 *       holds the 16-px forward-arrow glyph in icon.brand (#0741ef)
 *       at borderWidth.iconDefault (1.25) stroke. Tappable.
 *   No `forwardarrow.svg` ships in src/assets/icons (the closest entry
 *   `desc-right.svg` is a baked green burst, not an arrow), so the
 *   glyph is drawn inline via react-native-svg at the spec'd stroke
 *   weight + tint. Replace with a real Icons/Action/forwardarrow.svg
 *   later and swap to <Icon name="forward-arrow" /> in one place.
 *
 * 'filters' variant (Figma 3098:60744)
 * ------------------------------------
 *   Outer column: fluid (verification uses 192 wide), gap spacing[12].
 *   Rows of two equal-width filter tiles (gap spacing[12]).
 *   Tile (90 wide × 110 tall): column, alignItems centre, gap spacing[4].
 *     • Selectable square (90×90, radius.lg, padding spacing[2]):
 *         selected   → bg background.lavender (#ebf0ff),
 *                       borderWidth.heavy (2) border.focussed (#0741ef).
 *         unselected → bg background.sunken (#fcfcfd),
 *                       borderWidth.thin  (1) border.subtle3 (#eeeeee).
 *       Inside: filter image (contain), fills the padded box.
 *       (No existing Selector atom in the codebase — built inline.)
 *     • Label (body12Medium, align center):
 *         selected   → colors.text.link       (#0036da)
 *         unselected → colors.text.secondary  (#5c5c5c)
 *
 * 'brand-1x2' variant (Figma 3098:60743)
 * --------------------------------------
 *   Outer column: 328 wide, gap spacing[8]. Two rows of two equal-
 *   width cards (flex:1, row gap spacing[8] → each lands at 160 wide
 *   inside the 328-wide row). Each card: 186 tall, radius.lg (12),
 *   white bg, 1px border.default (#d9e3ec), elevation.light.xs (the
 *   standard card lift), padding spacing[8] all, inner gap spacing[8].
 *     • Offer image — 144×130, fills card width, resizeMode='cover'.
 *     • CTA bar — full inner width (144), height 32, radius.sm (8),
 *       bg colors.action.accent.default (#0741ef cobalt), label
 *       caption10SemiBold in colors.action.accent.text (white).
 *
 * 'brand-1x3' variant (Figma 3098:60742)
 * --------------------------------------
 *   Outer column: 334 wide, gap spacing[8]. A single row of three
 *   equal-width cards (flex:1, gap spacing[8] → each lands at 106 wide
 *   inside the 334-wide row). Each card: 156 tall, radius.sm, white
 *   bg, 1px border.subtle3 (#eeeeee), justifyContent space-between +
 *   alignItems center, paddingBottom spacing[8].
 *     • Top badge — full-width strip, padV 4 / padH 12, ruby-50 bg,
 *       caption10Regular in promotional.rubyRed (#da2760).
 *     • Logo — 88×62 container holding the brand image (~90×40,
 *       resizeMode='contain'), sourced from images.brands.* or
 *       images.stores.*.
 *     • Bottom block — column, gap spacing[4]: optional timer
 *       (hidden by default; shown when item.showTimer is true) +
 *       a 90×40 cobalt-700 CTA pill (radius.sm, 1px border.subtle2,
 *       caption10SemiBold white label, up to 2 lines).
 *
 * Icon sourcing
 *   'features' icons: any `feat-*-outline` IconName from
 *   src/atoms/Icon. No improvised glyphs.
 *
 * Logo sourcing
 *   'brand-1x3' logos: pass any `ImageSourcePropType` — typically
 *   `images.brands.*` or `images.stores.*` from src/assets/images.
 *
 * Hex → token:
 *   #ffffff → colors.surface.default
 *   #dce5fe → colors.border.subtle2
 *   #eeeeee → colors.border.subtle3
 *   #4d93e9 → colors.icon.info             (primitives.cobalt[300])
 *   #262626 → colors.text.primary
 *   #fef1f1 → colors.feedback.error.onColor (primitives.ruby[50])
 *   #da2760 → colors.promotional.rubyRed   (primitives.rose[500])
 *   #d41000 → colors.feedback.error.default (primitives.ruby[500])
 *   #0036da → colors.feedback.info.hover   (primitives.cobalt[700])
 *   white   → colors.text.inverse
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
import Svg, { Path } from 'react-native-svg';
import { Text, Icon, AmountSkeleton, RemoteImage } from '../atoms';
import type { IconName } from '../atoms';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  elevation,
  opacity,
} from '../tokens';

// ----------------------------------------------------------------------------
// Variant union + per-variant item types
// ----------------------------------------------------------------------------
export type GridVariant =
  | 'features'
  | 'brand-1x3'
  | 'brand-1x2'
  | 'filters'
  | 'cashback-timelines';

export interface FeatureItem {
  /** A `feat-*-outline` IconName from src/atoms/Icon. */
  icon: IconName;
  label: string;
}

export interface BrandOfferItem {
  logo: ImageSourcePropType;
  badgeText: string;
  ctaLabel: string;
  /** Default false. When true, a small ruby timer line shows above
   *  the CTA. Pass the pre-formatted countdown via `endsAt`. */
  showTimer?: boolean;
  /** Pre-formatted countdown string e.g. "23:59:59". Only shown when
   *  showTimer is true. */
  endsAt?: string;
  onPress?: () => void;
}

export interface OfferCardItem {
  /** Large promotional image (sourced from images.brands.* etc). */
  image: ImageSourcePropType;
  ctaLabel: string;
  onPress?: () => void;
}

export interface FilterTileItem {
  image: ImageSourcePropType;
  label: string;
  selected?: boolean;
}

export interface TimelineStatItem {
  label: string;
  /** Big stat value e.g. "30" or "NO". */
  metric: string;
  /** Optional unit beneath the metric e.g. "Minutes". Omit on cards
   *  whose metric is a self-contained answer (e.g. "NO") — the unit
   *  row collapses so the card doesn't read taller. */
  unit?: string;
  /** When true, the `unit` is still rendered (reserving its height) but
   *  at Opacity/0 — an invisible spacer so the card matches the height
   *  of its siblings even though the unit carries no meaning (Figma
   *  3752:69234, the "NO" app-orders tile). Requires `unit` to be set. */
  unitHidden?: boolean;
  onPress?: () => void;
}

// Discriminated union so the `items` type is correct per variant.
export type GridProps =
  | {
      variant: 'features';
      items?: FeatureItem[];
      columns?: number;
      /** Show pulsing skeleton tiles instead of `items` while the card's
       *  data is still loading. */
      loading?: boolean;
      /** How many skeleton tiles to show while loading (default 6). */
      skeletonCount?: number;
      style?: StyleProp<ViewStyle>;
    }
  | {
      variant: 'brand-1x3';
      items?: BrandOfferItem[];
      style?: StyleProp<ViewStyle>;
    }
  | {
      variant: 'brand-1x2';
      items?: OfferCardItem[];
      style?: StyleProp<ViewStyle>;
    }
  | {
      variant: 'filters';
      items?: FilterTileItem[];
      onToggle?: (index: number, nextSelected: boolean) => void;
      style?: StyleProp<ViewStyle>;
    }
  | {
      variant: 'cashback-timelines';
      items?: TimelineStatItem[];
      style?: StyleProp<ViewStyle>;
    };

// ----------------------------------------------------------------------------
// Switch
// ----------------------------------------------------------------------------
export function Grid(props: GridProps) {
  switch (props.variant) {
    case 'features':
      return <FeaturesGrid {...props} />;
    case 'brand-1x3':
      return <BrandOneByThreeGrid {...props} />;
    case 'brand-1x2':
      return <BrandOneByTwoGrid {...props} />;
    case 'filters':
      return <FiltersGrid {...props} />;
    case 'cashback-timelines':
      return <CashbackTimelinesGrid {...props} />;
  }
}

// ----------------------------------------------------------------------------
// 'features' — 2-column grid of bordered feature tiles
// ----------------------------------------------------------------------------
function FeaturesGrid({
  items = [],
  columns = 2,
  loading = false,
  skeletonCount = 6,
  style,
}: Extract<GridProps, { variant: 'features' }>) {
  // Loading → render pulsing skeleton tiles (same box geometry as the real
  // ones) so the benefit grid stays engaging while data settles.
  if (loading) {
    const skRows: number[] = [];
    for (let i = 0; i < skeletonCount; i += columns) {
      skRows.push(Math.min(columns, skeletonCount - i));
    }
    return (
      <View style={[{ gap: spacing[12] }, style]}>
        {skRows.map((count, ri) => (
          <View
            key={ri}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[12] }}
          >
            {Array.from({ length: count }).map((_, ti) => (
              <SkeletonFeatureTile key={`${ri}-${ti}`} />
            ))}
            {count < columns
              ? Array.from({ length: columns - count }).map((_, fi) => (
                  <View key={`f-${ri}-${fi}`} style={{ flex: 1 }} />
                ))
              : null}
          </View>
        ))}
      </View>
    );
  }

  // Chunk items into rows of `columns`.
  const rows: FeatureItem[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }

  return (
    <View
      style={[
        {
          gap: spacing[12],
          // Outer column doesn't set a fixed width — leaves the caller
          // free to drop it inside any container (a 328 column on a
          // detail page, full-width on a hero, etc.). The tiles
          // distribute equally across whatever width the row gets.
        },
        style,
      ]}
    >
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[12],
          }}
        >
          {row.map((item, ti) => (
            <FeatureTile key={`${ri}-${ti}`} item={item} />
          ))}
          {/* Pad the last row with invisible filler so trailing single
              tiles still render at the same column width as the rest. */}
          {row.length < columns
            ? Array.from({ length: columns - row.length }).map((_, fi) => (
                <View key={`f-${ri}-${fi}`} style={{ flex: 1 }} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

// Fixed tile height = enough room for 3 lines of body12Regular text
// without the row reflowing per-tile when labels differ in length.
// Math: top padV(8) + icon(24) + icon-text gap(4) + 3 × lineHeight(16)
// + bottom padV(8) = 92. Snaps to spacing[96] for a 4-px breathing
// buffer and to stay on the spacing scale.
const FEATURE_TILE_H = spacing[96];

// Skeleton version of FeatureTile — same box, pulsing placeholder for the
// icon + two text lines (reuses the AmountSkeleton pulse atom).
function SkeletonFeatureTile() {
  return (
    <View
      style={{
        flex: 1,
        height: FEATURE_TILE_H,
        paddingVertical: spacing[8],
        paddingHorizontal: spacing[12],
        gap: spacing[4],
        borderRadius: radius.xl,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle2,
        backgroundColor: colors.surface.default,
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <AmountSkeleton
        width={iconSize[24]}
        height={iconSize[24]}
        style={{ borderRadius: radius.full }}
      />
      <AmountSkeleton width="80%" height={10} style={{ marginTop: spacing[4] }} />
      <AmountSkeleton width="55%" height={10} />
    </View>
  );
}

function FeatureTile({ item }: { item: FeatureItem }) {
  return (
    <View
      style={{
        flex: 1,
        height: FEATURE_TILE_H,
        paddingVertical: spacing[8],
        paddingHorizontal: spacing[12],
        gap: spacing[4],
        borderRadius: radius.xl,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle2,
        backgroundColor: colors.surface.default,
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <Icon
        name={item.icon}
        size={iconSize[24]}
        color={colors.icon.info}
        // The svg-transformer maps the outline stroke to currentColor on
        // feat-*-outline files (see src/atoms/Icon docstring), so the
        // 1.5-px stroke width baked into the SVG is preserved and tints
        // to icon/info via the `color` prop above.
      />
      <Text
        variant="body12Regular"
        color={colors.text.primary}
        align="center"
        numberOfLines={3}
      >
        {item.label}
      </Text>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 'brand-1x3' — row of 3 equal-width brand-offer cards
// ----------------------------------------------------------------------------

// Card + tile dims — Figma spec, component-local consts.
const BRAND_CARD_H = 156;
const LOGO_BOX_W = 88;
const LOGO_BOX_H = 62;
const LOGO_IMG_W = 90;
const LOGO_IMG_H = 40;
const CTA_W = 90;
const CTA_H = 40;

function BrandOneByThreeGrid({
  items = [],
  style,
}: Extract<GridProps, { variant: 'brand-1x3' }>) {
  return (
    <View style={[{ gap: spacing[8] }, style]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
        }}
      >
        {items.map((item, i) => (
          <BrandOfferCard key={i} item={item} />
        ))}
      </View>
    </View>
  );
}

function BrandOfferCard({ item }: { item: BrandOfferItem }) {
  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.badgeText}, ${item.ctaLabel}`}
      style={({ pressed }) => ({
        flex: 1,
        height: BRAND_CARD_H,
        borderRadius: radius.sm,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle3,
        backgroundColor: colors.surface.default,
        // NOTE: no `overflow: 'hidden'` here — it would clip the card's drop
        // shadow. The top badge strip rounds its own top corners instead (so
        // it still follows the card's rounded top).
        // Subtle card lift (Shadow/Light/XS), consistent with the page's
        // other tiles.
        ...elevation.light.xs,
        // column distributes badge / logo / bottom-block top→middle→bottom
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: spacing[8],
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {/* Top badge — ruby-50 strip, full width. Rounds its own top corners
          to the card radius (the card no longer clips via overflow). */}
      <View
        style={{
          width: '100%',
          paddingVertical: spacing[4],
          paddingHorizontal: spacing[12],
          backgroundColor: colors.feedback.error.onColor,
          borderTopLeftRadius: radius.sm,
          borderTopRightRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          variant="caption10Regular"
          color={colors.promotional.rubyRed}
          align="center"
          numberOfLines={1}
        >
          {item.badgeText}
        </Text>
      </View>

      {/* Logo — 88×62 frame, image 90×40 contain */}
      <View
        style={{
          width: LOGO_BOX_W,
          height: LOGO_BOX_H,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={item.logo}
          style={{ width: LOGO_IMG_W, height: LOGO_IMG_H }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      {/* Bottom block — optional timer + CTA pill */}
      <View style={{ alignItems: 'center', gap: spacing[4] }}>
        {item.showTimer ? (
          <Text
            variant="caption10SemiBold"
            color={colors.feedback.error.default}
            align="center"
          >
            Ends in {item.endsAt ?? ''}
          </Text>
        ) : null}

        {/* CTA — inline cobalt pill. The Button atom's sizes are
            36/44/52 and don't include 40, so building this as an
            inline 90×40 cobalt pill matches the spec exactly. */}
        <View
          style={{
            width: CTA_W,
            height: CTA_H,
            borderRadius: radius.sm,
            borderWidth: borderWidth.thin,
            borderColor: colors.border.subtle2,
            backgroundColor: colors.feedback.info.hover,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[4],
          }}
        >
          <Text
            variant="caption10SemiBold"
            color={colors.text.inverse}
            align="center"
            numberOfLines={2}
          >
            {item.ctaLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ----------------------------------------------------------------------------
// 'brand-1x2' — 2×2 grid of offer cards (large image + cobalt CTA bar)
// ----------------------------------------------------------------------------

// Card + tile dims — Figma spec, component-local consts.
// CTA is a two-line stack ("Shop &" over the larger "Earn Flat/Upto X"),
// so the bar is taller than the Figma 32 and the card grows by the same
// delta (12) to keep the image at its spec'd 130.
const OFFER_CARD_H = 198;
const OFFER_IMAGE_H = 130;
const OFFER_CTA_H = 44;

// Prefix the offers mapper emits on every store CTA ("Shop & Earn Flat 80%",
// "Shop & Earn Upto 5.2%"). Split here so "Shop &" sits on its own quiet top
// line and the cashback promise ("Earn Flat 80%") drops to a larger, bolder
// second line. Labels without the prefix (e.g. the "Shop & Earn Cashback"
// fallback still matches; anything else) render whole on the emphasised line.
const SHOP_CTA_PREFIX = 'Shop & ';

function BrandOneByTwoGrid({
  items = [],
  style,
}: Extract<GridProps, { variant: 'brand-1x2' }>) {
  // Chunk into rows of 2.
  const rows: OfferCardItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return (
    <View style={[{ gap: spacing[8] }, style]}>
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[8],
          }}
        >
          {row.map((item, ti) => (
            <OfferCard key={`${ri}-${ti}`} item={item} />
          ))}
          {/* Pad a single trailing tile so its width still matches the
              two-column layout. */}
          {row.length < 2 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

function OfferCard({ item }: { item: OfferCardItem }) {
  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.ctaLabel}
      style={({ pressed }) => ({
        flex: 1,
        height: OFFER_CARD_H,
        padding: spacing[8],
        gap: spacing[8],
        borderRadius: radius.lg,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.default,
        backgroundColor: colors.surface.default,
        // Store cards carry the standard card lift (Shadow/Light/XS).
        ...elevation.light.xs,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Offer image — white box (no grey backing) holding the logo,
          fit by WIDTH (contain) so wide wordmarks (Myntra / Amazon /
          Flipkart) aren't cropped. The logo renders at 88% of the box
          (centred) so it reads a touch smaller with white margin. */}
      <View
        style={{
          width: '100%',
          height: OFFER_IMAGE_H,
          borderRadius: radius.sm,
          backgroundColor: colors.surface.default,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <RemoteImage
          source={item.image}
          style={{ width: '88%', height: '88%' }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      {/* CTA bar — full inner width, cobalt-500 bg. Two-line stack: a quiet
          "Shop &" over the larger, bolder cashback promise. The Button atom
          only ships size 36/44/52, so this is an inline pill. */}
      <OfferCtaBar label={item.ctaLabel} />
    </Pressable>
  );
}

// Two-line CTA pill. Splits "Shop & Earn Flat 80%" into a small top line
// ("Shop &") and a larger, heavier second line ("Earn Flat 80%"). Labels
// missing the prefix render whole on the emphasised line.
function OfferCtaBar({ label }: { label: string }) {
  const hasPrefix = label.startsWith(SHOP_CTA_PREFIX);
  const top = hasPrefix ? 'Shop &' : null;
  const emphasis = hasPrefix ? label.slice(SHOP_CTA_PREFIX.length) : label;
  return (
    <View
      style={{
        width: '100%',
        height: OFFER_CTA_H,
        borderRadius: radius.sm,
        backgroundColor: colors.action.accent.default,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing[4],
      }}
    >
      {top ? (
        <Text
          variant="caption10SemiBold"
          color={colors.action.accent.text}
          align="center"
          numberOfLines={1}
        >
          {top}
        </Text>
      ) : null}
      <Text
        variant="body14Bold"
        color={colors.action.accent.text}
        align="center"
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {emphasis}
      </Text>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 'filters' — 2-col grid of selectable filter-category tiles
// ----------------------------------------------------------------------------

// Tile + square dims — component-spec, Figma fixed.
const FILTER_TILE_W = 90;
const FILTER_SQUARE = 90;

function FiltersGrid({
  items = [],
  onToggle,
  style,
}: Extract<GridProps, { variant: 'filters' }>) {
  // Chunk into rows of 2.
  const rows: Array<{ item: FilterTileItem; index: number }[]> = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(
      items.slice(i, i + 2).map((item, j) => ({ item, index: i + j }))
    );
  }

  return (
    <View style={[{ gap: spacing[12] }, style]}>
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[12],
          }}
        >
          {row.map(({ item, index }) => (
            <FilterTile
              key={index}
              item={item}
              onPress={
                onToggle ? () => onToggle(index, !item.selected) : undefined
              }
            />
          ))}
          {/* Pad an unpaired trailing tile so column widths stay aligned. */}
          {row.length < 2 ? (
            <View style={{ width: FILTER_TILE_W }} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function FilterTile({
  item,
  onPress,
}: {
  item: FilterTileItem;
  onPress?: () => void;
}) {
  const isSelected = !!item.selected;

  // No existing Selector atom in the codebase — built inline per the
  // spec's selected/unselected token bundle.
  const squareStyle = isSelected
    ? {
        backgroundColor: colors.background.lavender,
        borderWidth: borderWidth.heavy,
        borderColor: colors.border.focussed,
      }
    : {
        backgroundColor: colors.background.sunken,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle3,
      };

  const labelColor = isSelected
    ? colors.text.link
    : colors.text.secondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={item.label}
      style={({ pressed }) => ({
        width: FILTER_TILE_W,
        alignItems: 'center',
        gap: spacing[4],
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={[
          {
            width: FILTER_SQUARE,
            height: FILTER_SQUARE,
            borderRadius: radius.lg,
            padding: spacing[2],
            // Centre the image both axes + clip anything that tries
            // to overflow the square (intrinsic image dims can read
            // wider than the inner padded box without overflow:hidden).
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          squareStyle,
        ]}
      >
        <Image
          source={item.image}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <Text
        variant="body12Medium"
        color={labelColor}
        align="center"
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

// ----------------------------------------------------------------------------
// 'cashback-timelines' — 2-per-row grid of stat cards w/ forward-arrow tap
// ----------------------------------------------------------------------------

// Tile dims — component-spec, Figma fixed.
const TIMELINE_ARROW_SIZE = 24;

// Fixed label box = 2 × body12 lineHeight (16). Reserving 2 lines for
// EVERY tile means a 1-line label ("Cashback tracks in") occupies the
// same height as a 2-line one ("Cashback on Mcaffeine app orders"), so
// all tiles in the grid render at exactly the same height.
const TIMELINE_LABEL_H = spacing[32]; // 32

// Inline 16-px forward-arrow glyph. No `forwardarrow.svg` ships in
// src/assets/icons (the only "right"-named asset, `desc-right.svg`, is
// a baked green burst not an arrow), so it's drawn here at the spec'd
// stroke weight + tinted by the caller's `color` prop. Swap to <Icon
// name="forward-arrow" /> once the real asset lands.
function ForwardArrowGlyph({ color }: { color: string }) {
  const s = iconSize[16];
  return (
    <Svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <Path
        d="M6 3.5 L10.5 8 L6 12.5 M3 8 H10.5"
        stroke={color}
        strokeWidth={borderWidth.iconDefault}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CashbackTimelinesGrid({
  items = [],
  style,
}: Extract<GridProps, { variant: 'cashback-timelines' }>) {
  // Chunk into rows of 2. A trailing single item keeps the SAME width
  // as a paired tile (sits left-aligned in its row) — a `flex:1` spacer
  // fills the other column so the lone tile doesn't stretch full-width.
  const rows: TimelineStatItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return (
    <View style={[{ gap: spacing[12] }, style]}>
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: spacing[12],
          }}
        >
          {row.map((item, ti) => (
            <TimelineStatCard key={`${ri}-${ti}`} item={item} />
          ))}
          {row.length < 2 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

function TimelineStatCard({ item }: { item: TimelineStatItem }) {
  return (
    <View
      style={[
        {
          flex: 1,
          padding: spacing[16],
          gap: spacing[10],
          borderRadius: radius.lg,
          backgroundColor: colors.surface.default,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        },
        // Subtle lift (Shadow/Light/XS) — consistent with the page's other tiles.
        elevation.light.xs,
      ]}
    >
      {/* Fixed 2-line label box so every tile is the SAME height whether
          its label is 1 or 2 lines (top-aligned to match the design). */}
      <View
        style={{ width: '100%', height: TIMELINE_LABEL_H, justifyContent: 'flex-start' }}
      >
        <Text
          variant="body12Medium"
          color={colors.text.primary}
          align="center"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{ width: '100%' }}
        >
          {item.label}
        </Text>
      </View>

      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        <Text
          variant="display32Bold"
          color={colors.text.link}
          align="center"
        >
          {item.metric}
        </Text>
      </View>

      {/* Unit line is ALWAYS rendered (a non-breaking space when empty) so
          every tile is the SAME height — a lone third tile whose unit is
          empty/hidden no longer collapses shorter than the first two. It's
          invisible (Opacity/0) when the unit is hidden or blank. */}
      <Text
        variant="body12Regular"
        color={colors.text.primary}
        align="center"
        numberOfLines={1}
        style={{
          width: '100%',
          opacity: item.unitHidden || !item.unit ? opacity[0] : opacity[100],
        }}
      >
        {item.unit || ' '}
      </Text>

      {/* Forward-arrow button — small circular tap target, pinned to
          the bottom-right of the card via alignSelf. */}
      <Pressable
        onPress={item.onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.label} details`}
        hitSlop={spacing[8]}
        style={({ pressed }) => [
          {
            alignSelf: 'flex-end',
            width: TIMELINE_ARROW_SIZE,
            height: TIMELINE_ARROW_SIZE,
            borderRadius: radius.full,
            borderWidth: borderWidth.thin,
            borderColor: colors.border.default,
            backgroundColor: colors.surface.default,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          },
          elevation.light.xs,
        ]}
      >
        <ForwardArrowGlyph color={colors.icon.brand} />
      </Pressable>
    </View>
  );
}
