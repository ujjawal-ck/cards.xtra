/**
 * HowToGetOfferCard — shared organism sub-component
 *
 * The "How to get this offer?" card that appears at the bottom of the
 * On state of both StoreOfferDetails (Figma 3829:139537) and
 * StoreBenefitDetails (Figma 3829:139743). Extracted here so the two
 * organisms share ONE implementation rather than duplicating it.
 *
 * Layout (matches Figma exactly):
 *   Pressable card — width 100% (= 328 inside a px-16 root), bg
 *     border.inverse (#fff), 1px border border.default, radius.lg,
 *     padding spacing[16], row, space-between, align center, plus the
 *     OUTER_CARD_SHADOW drop shadow.
 *   Left  — label Text, body14Regular, text.primary.
 *   Right — 32px circular button: bg surface.default, 1px border
 *     border.default, radius.full, padding spacing[10],
 *     elevation.light.xs (Shadow/Light/XS), 16px forward-arrow glyph.
 *
 * Also exports ForwardArrowGlyph — the inline forward-arrow used here
 * (16px) and by the host organisms' link rows (12px). No forwardarrow
 * SVG ships in src/assets/icons, so it's drawn inline with a token-bound
 * stroke (same convention as SearchBar's glyphs); shared here to avoid
 * redefining it per organism.
 *
 * SHADOW NOTE: the card's outer drop shadow (offset y4, blur4, #000 @8%)
 * has NO exact match in src/tokens/elevation.ts (closest light.md is
 * y4/blur16/10%, light.sm is y2/blur8/8% — neither exact). Per the build
 * instruction it is rendered with literal values (OUTER_CARD_SHADOW) and
 * FLAGGED as an untokenized Figma shadow.
 */
import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../atoms';
import { colors, spacing, radius, borderWidth, iconSize, elevation } from '../tokens';

// Untokenized Figma drop shadow: offset y4, blur4, #000 @8%, spread 0.
// No exact token in src/tokens/elevation.ts — literal per instruction.
// FLAGGED for tokenization.
export const OUTER_CARD_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 4,
} as const;

/**
 * Inline forward-arrow glyph (right-pointing). No forwardarrow SVG ships
 * in src/assets/icons; drawn inline with a token-bound stroke.
 */
export function ForwardArrowGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M2 6 H9 M6 3 L9 6 L6 9"
        stroke={color}
        strokeWidth={borderWidth.iconDefault}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export interface HowToGetOfferCardProps {
  /** Card label. Default "How to get this offer?". */
  label?: string;
  /** Fired when the card (or its arrow button) is tapped. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function HowToGetOfferCard({
  label = 'How to get this offer?',
  onPress,
  style,
}: HowToGetOfferCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        {
          width: '100%', // = 328 inside a px-16 root
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.border.inverse,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          borderRadius: radius.lg,
          padding: spacing[16],
          ...OUTER_CARD_SHADOW,
        },
        style,
      ]}
    >
      <Text variant="body14Regular" color={colors.text.primary}>
        {label}
      </Text>

      {/* 32px circular forward button */}
      <View
        style={{
          width: iconSize[32],
          height: iconSize[32],
          borderRadius: radius.full,
          backgroundColor: colors.surface.default,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          padding: spacing[10],
          alignItems: 'center',
          justifyContent: 'center',
          ...elevation.light.xs, // Shadow/Light/XS — exact match
        }}
      >
        <ForwardArrowGlyph size={iconSize[16]} color={colors.text.link} />
      </View>
    </Pressable>
  );
}
