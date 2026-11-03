/**
 * PartnerCard — molecule  [spec 4439:291381]
 *
 * Cell in the Offers 2-col grid. Layout:
 *   row: logo placeholder + partner name
 *   product image placeholder (square-ish, fills width)
 *   full-width accent button "Shop & Earn upto X%"
 *
 * Logo + image are coloured placeholder boxes — swap for real <Image>
 * sources once partner art lands. No raw hex from data; partners pick a
 * `placeholderColor` key that maps to a semantic token.
 */
import React from 'react';
import {
  View,
  Pressable,
  Text as RNText,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
} from '../tokens';
import { Text, Button } from '../atoms';

export type PartnerPlaceholderColor =
  | 'saffron'
  | 'cobalt'
  | 'fern'
  | 'violet'
  | 'sky'
  | 'rose';

const placeholderBgMap: Record<PartnerPlaceholderColor, string> = {
  saffron: colors.background.emphasis,
  cobalt: colors.background.lavender,
  fern: colors.promotional.fernBg,
  violet: colors.promotional.violetBg,
  sky: colors.promotional.skyBg,
  rose: colors.surface.alert,
};

export interface PartnerModel {
  id: string;
  name: string;
  /** Emoji or short letter — shown inside the logo placeholder */
  logo: string;
  placeholderColor: PartnerPlaceholderColor;
  /** e.g. "5%" */
  rate: string;
}

export interface PartnerCardProps {
  partner: PartnerModel;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PartnerCard({ partner, onPress, style }: PartnerCardProps) {
  const bg = placeholderBgMap[partner.placeholderColor];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${partner.name}, earn up to ${partner.rate}`}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface.default,
          borderRadius: radius.xl,
          padding: spacing[12],
          gap: spacing[12],
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
          opacity: pressed ? 0.96 : 1,
        },
        style,
      ]}
    >
      {/* Header: logo + name */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
        }}
      >
        <View
          style={{
            width: iconSize[32],
            height: iconSize[32],
            borderRadius: radius.sm,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RNText style={{ fontSize: iconSize[20] }}>{partner.logo}</RNText>
        </View>
        <Text variant="body14SemiBold" color={colors.text.primary} numberOfLines={1}>
          {partner.name}
        </Text>
      </View>

      {/* Product image placeholder */}
      <View
        style={{
          aspectRatio: 1.3,
          borderRadius: radius.md,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RNText style={{ fontSize: iconSize[40] }}>{partner.logo}</RNText>
      </View>

      {/* CTA */}
      <Button
        label={`Shop & Earn upto ${partner.rate}`}
        variant="solid"
        tone="second"
        size={36}
        fullWidth
        onPress={onPress}
      />
    </Pressable>
  );
}
