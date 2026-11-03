/**
 * Footer — organism (Figma 3762:74006)
 *
 * Big bottom CTA block — headline + subtext, optional CTA button, and
 * optional children (typically card art rendered below the text).
 * Theme-only, not tone-themed: text colour flips based on the surface
 * it's placed over.
 *
 * Geometry:
 *   vertical column, gap spacing[6]
 *   paddingTop spacing[24], paddingHorizontal spacing[16],
 *   paddingBottom 0 (caller decides what sits beneath)
 *
 * Typography:
 *   headline display40ExtraBold (Outfit ExtraBold 40/48)
 *   subtext  heading20SemiBold (Outfit SemiBold 20/28)
 *
 * Theme → text colour:
 *   'dark'  → colors.surface.dark   (#000000 — for use over light bg)
 *   'light' → colors.text.inverse   (#ffffff — for use over dark / image bg)
 *
 * Hex → token:
 *   #000000 → colors.surface.dark   (the only semantic that resolves to pure black)
 *   #ffffff → colors.text.inverse
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text, Button } from '../atoms';
import { colors, spacing, opacity } from '../tokens';

export type FooterTheme = 'dark' | 'light';

export interface FooterProps {
  theme?: FooterTheme;
  headline: string;
  subtext: string;
  /** When provided, renders a saffron Solid button between the texts and the children. */
  ctaLabel?: string;
  onCtaPress?: () => void;
  /** Card art / illustration mounted below the CTA. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Footer({
  theme = 'dark',
  headline,
  subtext,
  ctaLabel,
  onCtaPress,
  children,
  style,
}: FooterProps) {
  const fg =
    theme === 'dark' ? colors.surface.dark : colors.text.inverse;

  return (
    <View
      style={[
        {
          width: '100%',
          paddingTop: spacing[24],
          paddingHorizontal: spacing[16],
          paddingBottom: 0,
          gap: spacing[6],
        },
        style,
      ]}
    >
      {/* Headline + subtext both at opacity[32] (= 0.32) — stepped
          down again from opacity[40] per the DS opacity scale.
          opacity dims the inherited fg colour, so the rule works for
          both themes: dark = #000 @ 32%, light = #fff @ 32%. */}
      <Text
        variant="display40ExtraBold"
        color={fg}
        style={{ opacity: opacity[32] }}
      >
        {headline}
      </Text>
      <Text
        variant="heading20SemiBold"
        color={fg}
        style={{ opacity: opacity[32] }}
      >
        {subtext}
      </Text>

      {ctaLabel ? (
        <View style={{ marginTop: spacing[16] }}>
          <Button
            label={ctaLabel}
            variant="solid"
            tone="main"
            size={52}
            fullWidth
            onPress={onCtaPress}
          />
        </View>
      ) : null}

      {children ? (
        <View style={{ marginTop: spacing[16] }}>{children}</View>
      ) : null}
    </View>
  );
}
