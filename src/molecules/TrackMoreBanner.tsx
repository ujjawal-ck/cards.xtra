/**
 * TrackMoreBanner — molecule
 *
 * Dark-gradient "track more cashback" CTA banner that sits at the bottom
 * of the missing-cashback list screens. Extracted from the inline banner
 * the DidYouShop / Track screens hand-rolled, so it can be reused.
 *
 * Self-contained: it carries its own horizontal screen inset (px16) so a
 * screen can drop it straight in without a wrapper. Tapping fires onPress.
 *
 * Token map (per property):
 *   outer inset    → paddingHorizontal spacing[16]
 *   card radius    → radius.lg
 *   card fill      → gradients.dark (token; the Figma "gradient/dark" style)
 *   card padding   → px spacing[20] / py spacing[16]
 *   label          → typography.body16Medium / colors.text.inverse
 *   chevron        → iconSize[20] / colors.icon.inverse · borderWidth.thick
 *
 * Imports: Text atom + react-native-svg (inline chevron — no `chevron-right`
 * ships in the Icon registry; Header-organism precedent for missing glyphs).
 */
import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../atoms';
import { colors, spacing, radius, iconSize, borderWidth, gradients } from '../tokens';

export interface TrackMoreBannerProps {
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Right-pointing chevron — inline (no `chevron-right` in the Icon registry). */
function ChevronRightGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7 5 L13 10 L7 15"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TrackMoreBanner({
  label = 'Have more cashback to track?',
  onPress,
  style,
}: TrackMoreBannerProps) {
  return (
    <View style={[{ paddingHorizontal: spacing[16], width: '100%' }, style]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={{ borderRadius: radius.lg, overflow: 'hidden' }}
      >
        <LinearGradient
          {...gradients.dark}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[20],
            paddingVertical: spacing[16],
          }}
        >
          <Text variant="body16Medium" color={colors.text.inverse} style={{ flex: 1 }}>
            {label}
          </Text>
          <ChevronRightGlyph size={iconSize[20]} color={colors.icon.inverse} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
