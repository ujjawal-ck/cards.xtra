/**
 * StripAlert — molecule (Figma 3836:49836)
 *
 * Thin tone-themed alert strip. Reuses the same 9-tone system as
 * Toast / InlineMessage (colors.tones[tone]) — bg, caption colour,
 * leading-icon tint, AND the CTA link all shift together per tone.
 *
 * Geometry:
 *   height 24, padding vertical 4, horizontal 16
 *   bg = colors.tones[tone].bgSubtle
 *
 * Layouts:
 *   'center'    — single caption text centred on the strip.
 *   'left-cta'  — space-between row:
 *                 [optional leading icon + caption]   [Link › CTA]
 *
 * Text:
 *   caption  body12Medium, colors.tones[tone].text
 *   CTA      body12Medium + chevron-right glyph, both in tones[tone].text
 *
 * Chevron-right SVG isn't shipped in src/assets/icons today, so the
 * arrow is drawn inline at borderWidth.iconDefault (1.25) stroke
 * within a 12×12 viewBox — matches the Figma 12-px spec exactly.
 */
import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import {
  colors,
  spacing,
  iconSize,
  borderWidth,
} from '../tokens';
import type { ToneName } from '../tokens';

export type StripAlertLayout = 'center' | 'left-cta';

export interface StripAlertProps {
  tone?: ToneName;
  layout?: StripAlertLayout;
  /** Show the leading 16-px icon (only consulted on `left-cta`). */
  icon?: boolean;
  /** Caption text. */
  text: string;
  /** CTA link label (only consulted on `left-cta`). */
  ctaLabel?: string;
  /** Leading icon name. Defaults to a neutral 'message-outline' if `icon` is true. */
  leadingIcon?: IconName;
  onCtaPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Chevron + leading-icon sizes scaled up one step to keep the band's
// visual proportions correct after the padV bump from 4 → 8 (band
// height grew from 24 → 32, ≈33% taller; icons also grew one token step).
const CHEVRON_SIZE = iconSize[16];
const LEADING_ICON_SIZE = iconSize[20];

function ChevronRightGlyph({ color }: { color: string }) {
  return (
    <Svg
      width={CHEVRON_SIZE}
      height={CHEVRON_SIZE}
      viewBox="0 0 16 16"
      fill="none"
    >
      <Path
        d="M6 3 L11 8 L6 13"
        stroke={color}
        strokeWidth={borderWidth.iconDefault}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StripAlert({
  tone = 'info',
  layout = 'center',
  icon = false,
  text,
  ctaLabel,
  leadingIcon = 'message-outline',
  onCtaPress,
  style,
}: StripAlertProps) {
  const t = colors.tones[tone];

  return (
    <View
      style={[
        {
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent:
            layout === 'center' ? 'center' : 'space-between',
          // padV bumped from spacing[4] → spacing[8] so the band lands
          // at h32 (= padY 8 + body12 lh 16) instead of h24 — gives the
          // link CTA room to breathe alongside the bigger icons.
          paddingVertical: spacing[8],
          paddingHorizontal: spacing[16],
          backgroundColor: t.bgSubtle,
        },
        style,
      ]}
    >
      {layout === 'left-cta' ? (
        <>
          {/* Left group: icon + caption */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[4],
              flexShrink: 1,
            }}
          >
            {icon ? (
              <Icon
                name={leadingIcon}
                size={LEADING_ICON_SIZE}
                color={t.text}
              />
            ) : null}
            <Text variant="body12Medium" color={t.text} numberOfLines={1}>
              {text}
            </Text>
          </View>

          {/* Right CTA — link styled, pressable */}
          {ctaLabel ? (
            <Pressable
              onPress={onCtaPress}
              accessibilityRole="link"
              accessibilityLabel={ctaLabel}
              hitSlop={spacing[8]}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[2],
              }}
            >
              <Text variant="body12Medium" color={t.text}>
                {ctaLabel}
              </Text>
              <ChevronRightGlyph color={t.text} />
            </Pressable>
          ) : null}
        </>
      ) : (
        <Text variant="body12Medium" color={t.text} numberOfLines={1}>
          {text}
        </Text>
      )}
    </View>
  );
}
