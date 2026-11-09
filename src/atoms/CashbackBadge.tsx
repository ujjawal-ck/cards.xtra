/**
 * CashbackBadge — atom (Figma node 2518:4995)
 *
 * Pale-saffron pill with an optional Regular-weight prefix ("Upto") and
 * a heavier-weight value ("₹1200 Cashback"). Both texts in Saffron-500.
 *
 * Gradient: gradients.saffronFade — left→right
 *   #ffe6d6 @ 0%  →  #ffffff @ 79%  →  #ffffff @ 94%
 * This is a *subtle* pale peach fading to white. If the badge ever
 * reads as saturated orange, that's almost certainly the wrapper not
 * clipping the gradient to the pill on Android — fixed below by
 * wrapping the LinearGradient in a view with overflow:hidden +
 * borderRadius full.
 *
 * Sizes — height stays at the spec 32 (padding+typography land there);
 * the value weight differs by size, as in Figma:
 *   sm  prefix body14Regular   · value body14SemiBold     · padH 12
 *   md  prefix body16Regular   · value body16Bold         · padH 12
 *   lg  prefix heading18Regular · value heading18SemiBold · padH 16
 * (Typography token has no `body18` — `heading18` carries the same
 * 18/26 metrics and is used here.)
 *
 * Token mapping:
 *   #ff6d1d  → colors.cashback.default
 *   saffronFade gradient → gradients.saffronFade
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextVariant } from './Text';
import { colors, spacing, radius, gradients } from '../tokens';

export type CashbackBadgeSize = 'sm' | 'md' | 'lg';

export interface CashbackBadgeProps {
  /** Regular-weight lead-in (e.g. "Upto"). Required text when `showPrefix` is true. */
  prefix?: string;
  /** Bold/SemiBold value (e.g. "₹1200 Cashback"). Always rendered. */
  value: string;
  /** When false, only the value is rendered (no prefix even if provided). Default true. */
  showPrefix?: boolean;
  size?: CashbackBadgeSize;
  style?: StyleProp<ViewStyle>;
}

type SizeConfig = {
  prefixVariant: TextVariant;
  valueVariant: TextVariant;
  padH: number;
};

const SIZE_CONFIG: Record<CashbackBadgeSize, SizeConfig> = {
  sm: {
    prefixVariant: 'body14Regular',
    // Bumped from body14SemiBold → body14Bold so the value reads with
    // the same weight as the md (body16Bold) variant — at 14px,
    // SemiBold visually under-renders next to the orange fade.
    valueVariant: 'body14Bold',
    padH: spacing[12],
  },
  md: {
    prefixVariant: 'body16Regular',
    valueVariant: 'body16Bold',
    padH: spacing[12],
  },
  lg: {
    prefixVariant: 'heading18Regular',
    valueVariant: 'heading18SemiBold',
    padH: spacing[16],
  },
};

export function CashbackBadge({
  prefix,
  value,
  showPrefix = true,
  size = 'md',
  style,
}: CashbackBadgeProps) {
  const config = SIZE_CONFIG[size];
  const fg = colors.cashback.default;
  const grad = gradients.saffronFade;
  const renderPrefix = showPrefix && !!prefix;

  return (
    // Outer wrapper clips the gradient to the pill shape — without
    // overflow:hidden + borderRadius here, the gradient can paint past
    // its rounded corners on Android, which reads as a "square saturated
    // patch" peeking out of the pill.
    <View
      style={[
        {
          alignSelf: 'flex-start',
          // Never wider than its column: long values ("Flat ₹1,200 Rewards"
          // on a 360dp phone) used to run past the tile edge and get clipped.
          maxWidth: '100%',
          borderRadius: radius.full,
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[4],
          paddingVertical: spacing[4],
          paddingHorizontal: config.padH,
        }}
      >
        {renderPrefix ? (
          <Text variant={config.prefixVariant} color={fg}>
            {prefix}
          </Text>
        ) : null}
        {/* Shrinks to fit (down to 75%) instead of overflowing the pill. */}
        <Text
          variant={config.valueVariant}
          color={fg}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={{ flexShrink: 1 }}
        >
          {value}
        </Text>
      </LinearGradient>
    </View>
  );
}
