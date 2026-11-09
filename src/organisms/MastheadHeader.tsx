/**
 * MastheadHeader — organism (Figma set 3037:256)
 *
 * A floating header meant to overlay a hero image. Two circular
 * 40 × 40 buttons (leading required, trailing optional) flanking an
 * optional centred title. No container background — it floats over
 * whatever's beneath.
 *
 * iconType controls the button styling for the underlying surface:
 *   'solid'   — for LIGHT backgrounds: white fill + soft drop shadow
 *               (#000 @ 16%, y2, blur12), dark icon (text.primary)
 *   'overlay' — for DARK / image backgrounds: black fill + 1 px white
 *               border, white icon (text.inverse)
 *
 * Leading icon: 'back' (left arrow) | 'close' (×). Both are drawn
 * inline via react-native-svg at borderWidth.thick (1.5) stroke — no
 * back/close SVGs ship in src/assets/icons today, same situation as
 * Header.tsx. When real artwork lands, swap each glyph for
 * `<Icon name="back-outline" size={24} color={iconColor} />` etc.
 *
 * Trailing icon: any registered IconName from src/assets/icons (e.g.
 * `bell-outline`, `clipboard-search-outline`). For an `options` /
 * share / kebab icon, drop the SVG into src/assets/icons + register.
 *
 * Hex → token:
 *   #ffffff → colors.surface.default / colors.text.inverse
 *   #000000 → colors.surface.dark
 *   #262626 → colors.text.primary
 *   #4a5475 → colors.text.mastheadTitle  (NEW — added to colors.ts)
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
import type { IconName } from '../atoms';
import {
  colors,
  primitives,
  spacing,
  radius,
  borderWidth,
  iconSize,
} from '../tokens';

export type MastheadIconType = 'solid' | 'overlay';
/** 'collapse' = chevron-down, for dismissing a sheet-like page (Figma
 *  3914:43753 card detail). */
export type MastheadLeading = 'back' | 'close' | 'collapse';
/** Inline-drawn trailing glyphs for cases where no registered Icon
 *  asset matches. Use `trailingIcon` (an IconName) when an SVG ships. */
export type MastheadTrailingGlyph = 'share';

export interface MastheadHeaderProps {
  iconType: MastheadIconType;
  leading: MastheadLeading;
  title?: string;
  trailingIcon?: IconName;
  /** Inline-drawn trailing glyph (use when no Icon asset ships).
   *  Takes precedence over `trailingIcon` when both are set. */
  trailingGlyph?: MastheadTrailingGlyph;
  onLeadingPress?: () => void;
  onTrailingPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// 40 × 40 circle button matches iconSize[40] exactly.
const BUTTON_SIZE = iconSize[40];
// Icon inside the button is 24 × 24 (iconSize[24]).
const BUTTON_ICON_SIZE = iconSize[24];
// Stroke weight on inline-drawn back/close glyphs — matches Header.
const GLYPH_STROKE = borderWidth.thick;

// ----------------------------------------------------------------------------
// Inline-drawn glyphs (no real SVG asset ships for back/close)
// ----------------------------------------------------------------------------
function BackArrowGlyph({
  size,
  color,
}: {
  size: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12 L21 12"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
      />
      <Path
        d="M9 6 L3 12 L9 18"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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

/**
 * iOS-style share glyph: open-top square (the "tray") with an upward
 * arrow pointing out of it. Stroke weight + tint follow the same
 * pattern as BackArrowGlyph / CloseGlyph above so the trailing
 * glyph reads with the same visual weight as the leading one.
 *
 * Drawn inline because no `share-*` SVG ships in src/assets/icons.
 * When a real share SVG lands, register it in Icon.tsx and pass it
 * via the existing `trailingIcon` prop instead of `trailingGlyph`.
 */
function ShareGlyph({
  size,
  color,
}: {
  size: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Tray: open-topped rectangle */}
      <Path
        d="M7 10 L4 10 L4 20 L20 20 L20 10 L17 10"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Up arrow */}
      <Path
        d="M12 4 L12 15"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
      />
      <Path
        d="M8 8 L12 4 L16 8"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ----------------------------------------------------------------------------
// Circular button — applies the iconType styling
// ----------------------------------------------------------------------------
function CircleButton({
  iconType,
  onPress,
  accessibilityLabel,
  children,
}: {
  iconType: MastheadIconType;
  onPress?: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const isSolid = iconType === 'solid';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={spacing[8]}
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...(isSolid
          ? {
              backgroundColor: colors.surface.default,
              shadowColor: primitives.slate[1000],
              shadowOpacity: 0.16,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 12,
              elevation: 4,
            }
          : {
              backgroundColor: colors.surface.dark,
              borderWidth: borderWidth.thin,
              borderColor: colors.surface.default,
            }),
      }}
    >
      {children}
    </Pressable>
  );
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function MastheadHeader({
  iconType,
  leading,
  title,
  trailingIcon,
  trailingGlyph,
  onLeadingPress,
  onTrailingPress,
  style,
}: MastheadHeaderProps) {
  const iconColor =
    iconType === 'solid' ? colors.text.primary : colors.text.inverse;

  const renderLeadingGlyph = () =>
    leading === 'back' ? (
      <BackArrowGlyph size={BUTTON_ICON_SIZE} color={iconColor} />
    ) : leading === 'collapse' ? (
      <Icon name="chevron-down" size={BUTTON_ICON_SIZE} color={iconColor} />
    ) : (
      <CloseGlyph size={BUTTON_ICON_SIZE} color={iconColor} />
    );

  return (
    <View
      style={[
        {
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing[16],
          paddingVertical: spacing[12],
          paddingHorizontal: spacing[16],
        },
        style,
      ]}
    >
      <CircleButton
        iconType={iconType}
        onPress={onLeadingPress}
        accessibilityLabel={
          leading === 'back' ? 'Back' : leading === 'collapse' ? 'Collapse' : 'Close'
        }
      >
        {renderLeadingGlyph()}
      </CircleButton>

      {/* Title is OFF by default — only renders when a `title` prop is
          passed. With no title, `justifyContent: 'space-between'` on
          the container handles the leading/trailing edge distribution
          on its own (no spacer needed). */}
      {title ? (
        <Text
          variant="body16Regular"
          color={colors.text.mastheadTitle}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {title}
        </Text>
      ) : null}

      {trailingGlyph || trailingIcon ? (
        <CircleButton
          iconType={iconType}
          onPress={onTrailingPress}
          accessibilityLabel={trailingGlyph === 'share' ? 'Share' : 'Options'}
        >
          {trailingGlyph === 'share' ? (
            <ShareGlyph size={BUTTON_ICON_SIZE} color={iconColor} />
          ) : (
            <Icon
              name={trailingIcon as IconName}
              size={BUTTON_ICON_SIZE}
              color={iconColor}
            />
          )}
        </CircleButton>
      ) : null}
    </View>
  );
}
