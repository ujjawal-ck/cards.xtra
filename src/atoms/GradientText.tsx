/**
 * GradientText — atom
 *
 * Renders a single run of text filled with a linear gradient, using the
 * established MaskedView + expo-linear-gradient recipe (same as RollingAmount's
 * edge fade): the text is the alpha mask, the gradient is the fill, and a
 * hidden copy of the same text sizes the gradient box so it tracks the glyphs.
 *
 * Typography flows through a `variant` token exactly like <Text>; the gradient
 * stops come in as a named gradient (e.g. gradients.reward) — never raw hex.
 *
 * `italic` adds fontStyle:'italic'. NOTE: only the upright Outfit faces are
 * loaded, so on iOS this is a synthesised oblique and on Android it renders
 * upright (Android can't fake-slant a font with no italic face). Flagged for
 * the build owner.
 */
import React from 'react';
import { View, StyleProp, TextStyle, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextVariant } from './Text';

export interface GradientTextProps {
  children: string;
  variant: TextVariant;
  /** Named gradient stops, e.g. gradients.reward. */
  colors: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  italic?: boolean;
  /** Extra text style (e.g. textAlign, fontStyle is handled via `italic`). */
  style?: StyleProp<TextStyle>;
}

export function GradientText({
  children,
  variant,
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  italic = false,
  style,
}: GradientTextProps) {
  const textStyle: StyleProp<TextStyle> = [
    style,
    italic ? { fontStyle: 'italic' as const } : null,
  ];

  return (
    <MaskedView
      maskElement={
        <Text variant={variant} style={textStyle}>
          {children}
        </Text>
      }
    >
      <LinearGradient colors={colors} start={start} end={end}>
        {/* Hidden sizer — same glyphs, transparent, gives the gradient its box. */}
        <Text variant={variant} style={[textStyle, styles.sizer]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  sizer: { opacity: 0 },
});
