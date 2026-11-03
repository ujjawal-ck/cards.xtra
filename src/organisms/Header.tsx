/**
 * Header — organism (Figma set 3451:50577)
 *
 * Top app bar: leading icon + optional title + optional trailing icon,
 * with an optional TabPrimary row below.
 *
 * Header row:
 *   width-fill, height sizing.headerHeight (56), horizontal, align centre.
 *   bg colors.surface.default when surface='default', no bg when 'transparent'.
 *
 * Leading variants:
 *   'back'  → 32×32 ← glyph, gap spacing[8], row padding 12/16,
 *             title body16Medium
 *   'close' → 24×24 × glyph, gap spacing[4], row padding 16/16,
 *             title body14SemiBold
 *
 * Trailing slot (optional):
 *   32×32 Pressable with padding 4 wrapping a 24-px outline Icon.
 *
 * No `backarrow` / `close` SVG ships in src/assets/icons (only
 * `desc-cross` which is baked semantic-red and wouldn't tint to
 * text.primary). We draw the arrow + × inline via react-native-svg
 * with strokeWidth = borderWidth.thick (1.5) so the line weight
 * matches the rest of the outline icon family. When a real
 * backarrow / close SVG ships, replace BackArrowGlyph / CloseGlyph
 * with `<Icon name="…" size={…} color={fg} />`.
 *
 * Optional `tabs` prop renders the existing TabPrimary molecule
 * directly below the header row. When omitted, only the header row
 * renders.
 *
 * Hex → token:
 *   #ffffff → colors.surface.default
 *   #262626 → colors.text.primary
 */
import React from 'react';
import {
  View,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, Icon } from '../atoms';
import type { IconName, TextVariant } from '../atoms';
import { TabPrimary } from '../molecules';
import type { TabPrimaryItem } from '../molecules';
import {
  colors,
  spacing,
  iconSize,
  sizing,
  borderWidth,
} from '../tokens';

export type HeaderSurface = 'default' | 'transparent';
export type HeaderLeading = 'back' | 'close';
export type HeaderAlign = 'start' | 'end';

export interface HeaderProps {
  surface?: HeaderSurface;
  leading: HeaderLeading;
  /** Horizontal placement of the leading glyph. 'start' (default) keeps
   *  it at the left; 'end' pushes it to the right (e.g. a close-only
   *  header per Figma). Only meaningful when there's no title. */
  align?: HeaderAlign;
  title?: string;
  trailingIcon?: IconName;
  onLeadingPress?: () => void;
  onTrailingPress?: () => void;
  /** Optional tabs row below the header (uses the TabPrimary molecule). */
  tabs?: TabPrimaryItem[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

// Trailing icon slot — 32×32 tap target with 4px inset around a 24-px icon.
const TRAILING_SLOT = iconSize[32];

// Stroke weight on the back/close glyphs — borderWidth.thick (= 1.5)
// matches the spec and the rest of the outline icon set's weight.
const GLYPH_STROKE = borderWidth.thick;

/**
 * Thin left-pointing back arrow. Drawn in a 32-unit viewBox so the
 * 1.5px stroke renders as a true 1.5px line at the spec's 32-px
 * display size. Tinted via the `color` prop (no baked colour).
 */
function BackArrowGlyph({
  size,
  color,
}: {
  size: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Horizontal shaft */}
      <Path
        d="M4 16 L28 16"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <Path
        d="M12 8 L4 16 L12 24"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Thin close (×) glyph. Drawn in a 24-unit viewBox so the 1.5px stroke
 * renders true at the spec's 24-px display size.
 */
function CloseGlyph({
  size,
  color,
}: {
  size: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6 L18 18"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
      />
      <Path
        d="M18 6 L6 18"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}

type LeadingSpec = {
  renderGlyph: (color: string) => React.ReactNode;
  glyphSize: number;
  rowGap: number;
  padV: number;
  padH: number;
  titleVariant: TextVariant;
};

const LEADING_SPEC: Record<HeaderLeading, LeadingSpec> = {
  back: {
    renderGlyph: (color) => (
      <BackArrowGlyph size={iconSize[32]} color={color} />
    ),
    glyphSize: iconSize[32],
    rowGap: spacing[8],
    padV: spacing[12],
    padH: spacing[16],
    titleVariant: 'body16Medium',
  },
  close: {
    renderGlyph: (color) => (
      <CloseGlyph size={iconSize[24]} color={color} />
    ),
    glyphSize: iconSize[24],
    rowGap: spacing[4],
    padV: spacing[16],
    padH: spacing[16],
    titleVariant: 'body14SemiBold',
  },
};

export function Header({
  surface = 'default',
  leading,
  align = 'start',
  title,
  trailingIcon,
  onLeadingPress,
  onTrailingPress,
  tabs,
  activeTab = 0,
  onTabChange,
  style,
}: HeaderProps) {
  const spec = LEADING_SPEC[leading];
  const fg = colors.text.primary;
  const bg =
    surface === 'default' ? colors.surface.default : undefined;

  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <View
        style={{
          height: sizing.headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spec.rowGap,
          paddingVertical: spec.padV,
          paddingHorizontal: spec.padH,
        }}
      >
        {/* When align='end' and there's no title, a leading flex spacer
            pushes the glyph to the right edge (close-only header). */}
        {align === 'end' && !title ? <View style={{ flex: 1 }} /> : null}

        {/* Leading icon glyph — SVG drawn at 1.5px stroke for the slim
            outline look. No `desc-cross` (red-baked) and no Unicode
            fallback any more. */}
        <Pressable
          onPress={onLeadingPress}
          accessibilityRole="button"
          accessibilityLabel={leading === 'back' ? 'Back' : 'Close'}
          hitSlop={spacing[8]}
          style={{
            width: spec.glyphSize,
            height: spec.glyphSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {spec.renderGlyph(fg)}
        </Pressable>

        {/* Title — or a trailing flex spacer that left-aligns the glyph.
            When align='end' (no title) the spacer is rendered BEFORE the
            glyph instead (above), so none is needed here. */}
        {title ? (
          <Text
            variant={spec.titleVariant}
            color={fg}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {title}
          </Text>
        ) : align === 'end' ? null : (
          <View style={{ flex: 1 }} />
        )}

        {/* Trailing icon slot */}
        {trailingIcon ? (
          <Pressable
            onPress={onTrailingPress}
            accessibilityRole="button"
            accessibilityLabel="Header action"
            hitSlop={spacing[8]}
            style={{
              width: TRAILING_SLOT,
              height: TRAILING_SLOT,
              padding: spacing[4],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={trailingIcon}
              size={iconSize[24]}
              color={fg}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Optional tabs row */}
      {tabs ? (
        <TabPrimary
          tabs={tabs}
          activeIndex={activeTab}
          onChange={onTabChange}
        />
      ) : null}
    </View>
  );
}
