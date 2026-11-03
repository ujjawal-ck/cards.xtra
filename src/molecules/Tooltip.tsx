/**
 * Tooltip — molecule (Figma set 3340:1798)
 *
 * Bubble + arrow pointing toward a target. Position is semantic:
 * `position='top'` means the tooltip BUBBLE sits above the target and
 * its arrow points down at it. The arrow is rendered via the canonical
 * CSS border trick — a 0×0 View with 3 transparent borders and one
 * coloured border becomes a triangle.
 *
 * Bubble:
 *   borderRadius radius.sm (8), horizontal row, gap spacing[8],
 *   padding spacing[8] (sm) or spacing[12] (md)
 *   icon (iconSize[14] for sm, iconSize[16] for md) + vertical text
 *   block (gap spacing[4])
 *
 * Text:
 *   Title — body12Medium (sm) / body14Medium (md)
 *   Supporting (optional) — body12Regular
 *
 * Arrow geometry: 12 wide × 6 tall (≈ spacing[6] both ways) — a base of
 * 12 and a height of 6 toward the target.
 *
 * Themes:
 *   dark  → bubble bg surface.inverse (#262626), text + icon text.inverse
 *           (#fff), arrow same as bubble
 *   light → bubble bg surface.default (#fff), text + icon text.primary
 *           (#262626), arrow same as bubble, plus a subtle drop shadow
 *           so the bubble lifts off white surfaces
 *
 * Hex → token mapping:
 *   #262626 → colors.surface.inverse (bubble bg dark) / colors.text.primary (text light)
 *   #ffffff → colors.surface.default (bubble bg light) / colors.text.inverse (text dark)
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text, Icon } from '../atoms';
import type { IconName, TextVariant } from '../atoms';
import { colors, spacing, radius, iconSize } from '../tokens';

export type TooltipTheme = 'dark' | 'light';
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipSize = 'sm' | 'md';
/** Horizontal caret placement for top/bottom tooltips. Default 'center'. */
export type TooltipArrowAlign = 'start' | 'center' | 'end';

export interface TooltipProps {
  title: string;
  supporting?: string;
  icon?: IconName;
  theme?: TooltipTheme;
  position?: TooltipPosition;
  size?: TooltipSize;
  /** For top/bottom tooltips, where the caret sits along the bubble's
   *  width — 'center' (default), 'start' (left) or 'end' (right). Use
   *  'end' when the tooltip hangs below a right-aligned target (e.g. an
   *  info icon at the top-right of a card). Ignored for left/right. */
  arrowAlign?: TooltipArrowAlign;
  /** Hard cap on the bubble width. Text wraps onto extra lines past it.
   *  Default 280 — wide enough for two short lines on most phones, tight
   *  enough that a tooltip never stretches across the whole screen. */
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}

// Arrow base and height. Spec says 12×6 — `spacing[6]` is exactly half
// the 12-wide base, and also the 6-tall height.
const ARROW_HALF_BASE = spacing[6];
const ARROW_HEIGHT = spacing[6];

// Default cap on bubble width (px). Long content wraps onto extra lines
// instead of stretching the tooltip across the whole screen.
const DEFAULT_MAX_WIDTH = 280;

type SizeSpec = {
  bubblePad: number;
  iconPx: number;
  titleVariant: TextVariant;
};

const SIZE_SPEC: Record<TooltipSize, SizeSpec> = {
  sm: {
    bubblePad: spacing[8],
    iconPx: iconSize[14],
    titleVariant: 'body12Medium',
  },
  md: {
    bubblePad: spacing[12],
    iconPx: iconSize[16],
    titleVariant: 'body14Medium',
  },
};

type ThemeSpec = {
  bubbleBg: string;
  fg: string;
  shadow: boolean;
};

const THEME_SPEC: Record<TooltipTheme, ThemeSpec> = {
  dark: {
    bubbleBg: colors.surface.inverse,
    fg: colors.text.inverse,
    shadow: false,
  },
  light: {
    bubbleBg: colors.surface.default,
    fg: colors.text.primary,
    shadow: true,
  },
};

// ----------------------------------------------------------------------------
// Arrow — one 0×0 View with 3 transparent borders + 1 coloured border.
// Which border is coloured determines the apex direction.
//   position='top'    → coloured = top    → apex DOWN  (points at target below)
//   position='bottom' → coloured = bottom → apex UP    (points at target above)
//   position='left'   → coloured = left   → apex RIGHT (points at target on right)
//   position='right'  → coloured = right  → apex LEFT  (points at target on left)
// ----------------------------------------------------------------------------
function Arrow({
  position,
  color,
}: {
  position: TooltipPosition;
  color: string;
}) {
  const transparent = 'transparent';
  switch (position) {
    case 'top':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: ARROW_HALF_BASE,
            borderRightWidth: ARROW_HALF_BASE,
            borderTopWidth: ARROW_HEIGHT,
            borderLeftColor: transparent,
            borderRightColor: transparent,
            borderTopColor: color,
          }}
        />
      );
    case 'bottom':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: ARROW_HALF_BASE,
            borderRightWidth: ARROW_HALF_BASE,
            borderBottomWidth: ARROW_HEIGHT,
            borderLeftColor: transparent,
            borderRightColor: transparent,
            borderBottomColor: color,
          }}
        />
      );
    case 'left':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: ARROW_HALF_BASE,
            borderBottomWidth: ARROW_HALF_BASE,
            borderLeftWidth: ARROW_HEIGHT,
            borderTopColor: transparent,
            borderBottomColor: transparent,
            borderLeftColor: color,
          }}
        />
      );
    case 'right':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: ARROW_HALF_BASE,
            borderBottomWidth: ARROW_HALF_BASE,
            borderRightWidth: ARROW_HEIGHT,
            borderTopColor: transparent,
            borderBottomColor: transparent,
            borderRightColor: color,
          }}
        />
      );
  }
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function Tooltip({
  title,
  supporting,
  icon,
  theme = 'dark',
  position = 'top',
  size = 'md',
  arrowAlign = 'center',
  maxWidth = DEFAULT_MAX_WIDTH,
  style,
}: TooltipProps) {
  const sizeSpec = SIZE_SPEC[size];
  const themeSpec = THEME_SPEC[theme];

  // Layout direction: vertical (column) for top/bottom, horizontal (row)
  // for left/right. The bubble is the larger sibling.
  const isVertical = position === 'top' || position === 'bottom';
  const flexDirection: 'row' | 'column' = isVertical ? 'column' : 'row';

  // Arrow comes BEFORE the bubble for position='bottom' / 'right' (the
  // arrow sits at the bubble's top/left edge respectively).
  const arrowFirst = position === 'bottom' || position === 'right';

  const bubble = (
    <View
      style={{
        flexDirection: 'row',
        // Top-align so a wrapped supporting line keeps the icon next to
        // the title rather than centring against the whole text block.
        alignItems: 'flex-start',
        gap: spacing[8],
        padding: sizeSpec.bubblePad,
        borderRadius: radius.sm,
        backgroundColor: themeSpec.bubbleBg,
        maxWidth,
        ...(themeSpec.shadow
          ? {
              shadowColor: colors.surface.dark,
              shadowOpacity: 0.1,
              shadowRadius: spacing[8],
              shadowOffset: { width: 0, height: spacing[4] },
              elevation: 4,
            }
          : null),
      }}
    >
      {icon ? (
        <Icon name={icon} size={sizeSpec.iconPx} color={themeSpec.fg} />
      ) : null}
      <View style={{ flexShrink: 1, gap: spacing[4] }}>
        <Text variant={sizeSpec.titleVariant} color={themeSpec.fg}>
          {title}
        </Text>
        {supporting ? (
          <Text variant="body12Regular" color={themeSpec.fg}>
            {supporting}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const arrow = <Arrow position={position} color={themeSpec.bubbleBg} />;

  // For top/bottom tooltips the caret can be offset horizontally so it
  // sits under a specific point (e.g. a right-aligned info icon) instead
  // of always centring on the bubble. Wrap it in a row that stretches to
  // the bubble's width and justifies the caret; a 12-px inset keeps an
  // 'end'/'start' caret clear of the bubble's rounded corner.
  const arrowNode =
    isVertical && arrowAlign !== 'center' ? (
      <View
        style={{
          alignSelf: 'stretch',
          flexDirection: 'row',
          justifyContent: arrowAlign === 'start' ? 'flex-start' : 'flex-end',
          paddingHorizontal: spacing[12],
        }}
      >
        {arrow}
      </View>
    ) : (
      arrow
    );

  return (
    <View
      style={[
        { flexDirection, alignItems: 'center', alignSelf: 'flex-start' },
        style,
      ]}
    >
      {arrowFirst ? arrowNode : bubble}
      {arrowFirst ? bubble : arrowNode}
    </View>
  );
}
