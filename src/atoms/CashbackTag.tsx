/**
 * DS-ADD(ds-figma-1, 2026-11-17): rectangular reward tag with optional brand logos ("₹1,400 REWARDS").
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1046:2276333 (cashback-tag, sizes sm / md / lg, with / without image)
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts.
 *
 * CashbackTag — atom. New part (not an extension of CashbackBadge): CashbackBadge is a pill with a
 * prefix + value; this one is a squared tag (radius xs / sm / md), upper-case, letter-spaced,
 * hairline border, and can lead with overlapping brand logo chips and end with an info glyph.
 *
 * Type: Figma uses Outfit ExtraBold 9 / 11 / 12. We have no such sizes, so: sm caption10SemiBold,
 * md and lg body12SemiBold. Colours: text colors.cashback.default, fill gradients.saffronFade,
 * border colors.cashback.tagBorder (new token), logo chip fill colors.cashback.subtle.
 */
import React from 'react';
import { View, Image, Pressable, StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { InfoCircleGlyph } from './InfoCircleGlyph';
import { colors, spacing, radius, borderWidth, gradients } from '../tokens';
import { CASHBACK_TAG_SIZE, type CashbackTagSize } from '../lib/tagVariants';

export interface CashbackTagProps {
  /** Already formatted, in our words, e.g. "₹1,400 Rewards". Shown upper-case. */
  label: string;
  size?: CashbackTagSize;
  /** Brand logos (up to 2). Empty or omitted → the "without image" variant. */
  logos?: ImageSourcePropType[];
  /** Shows the info glyph (md and lg only) and makes it tappable. */
  onInfoPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CashbackTag({ label, size = 'sm', logos, onInfoPress, style }: CashbackTagProps) {
  const cfg = CASHBACK_TAG_SIZE[size];
  const shown = (logos ?? []).slice(0, 2);
  const withImage = shown.length > 0;
  const textVariant = size === 'sm' ? 'caption10SemiBold' : 'body12SemiBold';
  const grad = gradients.saffronFade;

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        {
          alignSelf: 'flex-start',
          maxWidth: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[4],
          minHeight: cfg.minHeight,
          borderRadius: radius[cfg.radius],
          borderWidth: borderWidth.hairline,
          borderColor: colors.cashback.tagBorder,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <LinearGradient
        colors={grad.colors}
        locations={grad.locations}
        start={grad.start}
        end={grad.end}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      />
      {withImage ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: spacing[2] }}>
          {shown.map((src, i) => (
            <View
              key={i}
              style={{
                width: cfg.logo,
                height: cfg.logo,
                marginLeft: i === 0 ? 0 : -spacing[8],
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius[cfg.radius],
                borderWidth: borderWidth.hairline,
                borderColor: colors.cashback.tagBorder,
                backgroundColor: colors.cashback.subtle,
              }}
            >
              <Image
                source={src}
                accessibilityIgnoresInvertColors
                style={{ width: cfg.logo - spacing[8], height: cfg.logo - spacing[8], resizeMode: 'contain' }}
              />
            </View>
          ))}
        </View>
      ) : null}
      <View
        style={{
          flexShrink: 1,
          paddingVertical: cfg.padV,
          paddingLeft: withImage ? 0 : cfg.padH,
          paddingRight: cfg.padH,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[4],
        }}
      >
        <Text variant={textVariant} color={colors.cashback.default} numberOfLines={1} style={{ flexShrink: 1 }}>
          {label.toUpperCase()}
        </Text>
        {cfg.showInfo && onInfoPress ? (
          <Pressable
            onPress={onInfoPress}
            hitSlop={spacing[8]}
            accessibilityRole="button"
            accessibilityLabel="More about this reward"
          >
            <InfoCircleGlyph size={spacing[12]} color={colors.cashback.tagBorder} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
