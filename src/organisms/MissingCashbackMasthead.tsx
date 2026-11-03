/**
 * MissingCashbackMasthead — organism
 *
 * The cobalt "Missing Cashback?" hero used at the top of the help-intake flow
 * (Figma "Masthead/Main", node 3437:72827). A full-bleed Figma export — the
 * gradient, the "Missing Cashback?" heading and the phone-checklist
 * illustration are all baked into the PNG — with rounded bottom corners
 * (radius 2xl = 24) and a floating white circular back button overlaid
 * top-left. Same pattern as the Get Help screen's hero (images.help.masthead).
 *
 * The heading is part of the art; swap to live <Text> later if it needs
 * localising.
 */
import React from 'react';
import { View, ImageBackground, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { images } from '../assets/images';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  elevation,
} from '../tokens';
import { haptics } from '../lib/haptics';

export interface MissingCashbackMastheadProps {
  /** Fired when the floating back button is tapped. */
  onBack?: () => void;
}

// Intrinsic Figma frame is 360 × 268 (PNG exported @2x = 720 × 536), so the
// hero keeps the design proportions at any device width.
const MASTHEAD_ASPECT = 360 / 268;
// Floating back button — 40-px white circle (Figma I3437:72827;3034:222).
const BACK_BTN = 40;

export function MissingCashbackMasthead({
  onBack,
}: MissingCashbackMastheadProps) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={images.help.missingCashbackMasthead}
      resizeMode="cover"
      style={{ width: '100%', aspectRatio: MASTHEAD_ASPECT }}
      imageStyle={{
        borderBottomLeftRadius: radius['2xl'],
        borderBottomRightRadius: radius['2xl'],
      }}
    >
      <View
        style={{
          paddingTop: insets.top + spacing[4],
          paddingHorizontal: spacing[16],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={spacing[8]}
          onPress={() => {
            haptics.impact('light');
            onBack?.();
          }}
          style={({ pressed }) => [
            {
              width: BACK_BTN,
              height: BACK_BTN,
              borderRadius: radius.full,
              backgroundColor: colors.surface.default,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.9 : 1,
            },
            elevation.light.md,
          ]}
        >
          <BackArrowGlyph size={iconSize[24]} color={colors.text.primary} />
        </Pressable>
      </View>
    </ImageBackground>
  );
}

/**
 * Thin left-pointing back arrow — same 32-unit-viewBox glyph the Header
 * organism and Get Help screen draw (no backarrow SVG ships in
 * src/assets/icons), so the 1.5-px stroke renders true at any size.
 */
function BackArrowGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M4 16 L28 16"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 8 L4 16 L12 24"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
