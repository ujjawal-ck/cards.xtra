/**
 * Badge — atom (Figma set 453:24078)
 *
 * General-purpose category / status label.
 *
 * Sizes (height emerges from text lineHeight + padY; sm and md match
 * the spec's 20 / 28 targets exactly):
 *   xxs → caption10Regular, padY 0, padX 4   → ~14h
 *   xs  → caption10Medium,  padY 2, padX 6   → ~18h
 *   sm  → body12Medium,     padY 2, padX 8   → 20h ✓
 *   md  → body14Medium,     padY 4, padX 12  → 28h ✓
 *
 * Appearance:
 *   'default' → solid colors.background.emphasis (#fff4eb, Saffron-50)
 *   'subtle'  → gradients.saffronFade pale wash (left fade)
 *
 * Shape: radius.xs (4) by default, radius.full when `pill` is true.
 *
 * Icon options:
 *   'none'   → just the label
 *   'dot'    → small leading filled circle (View, no Icon atom — it's a
 *              primitive shape, sized by token-spacing values)
 *   'left'   → <Icon> before the label
 *   'right'  → <Icon> after the label
 *   'only'   → <Icon> centred, label hidden (still used as a11y label)
 *   'close'  → trailing <Icon name="desc-cross"> wrapped in a Pressable
 *              that fires onClose. Note: desc-cross's stroke (#D41000)
 *              is baked semantic-red and won't tint to the badge fg.
 *
 * Token mapping:
 *   #fff4eb → colors.background.emphasis  (default fill)
 *   #ff6d1d → colors.cashback.default     (label + icon foreground)
 *   saffron gradient → gradients.saffronFade
 */
import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextVariant } from './Text';
import { Icon, IconName } from './Icon';
import { colors, spacing, radius, iconSize, gradients } from '../tokens';

export type BadgeSize = 'xxs' | 'xs' | 'sm' | 'md';
export type BadgeAppearance = 'default' | 'subtle';
export type BadgeIconOption =
  | 'none'
  | 'dot'
  | 'left'
  | 'right'
  | 'only'
  | 'close';

export interface BadgeProps {
  label: string;
  size?: BadgeSize;
  appearance?: BadgeAppearance;
  pill?: boolean;
  icon?: BadgeIconOption;
  iconName?: IconName;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

type SizeConfig = {
  labelVariant: TextVariant;
  padY: number;
  padX: number;
  iconPx: number;
  /** Dot diameter — repurposes spacing tokens since they're px values
   *  and we don't have a dedicated dot/indicator size scale. */
  dotSize: number;
  gap: number;
};

const SIZE_CONFIG: Record<BadgeSize, SizeConfig> = {
  xxs: {
    labelVariant: 'caption10Regular',
    padY: spacing[0],
    padX: spacing[4],
    iconPx: iconSize[10],
    dotSize: spacing[4],
    gap: spacing[2],
  },
  xs: {
    labelVariant: 'caption10Medium',
    padY: spacing[2],
    padX: spacing[6],
    iconPx: iconSize[10],
    dotSize: spacing[4],
    gap: spacing[2],
  },
  sm: {
    labelVariant: 'body12Medium',
    padY: spacing[2],
    padX: spacing[8],
    iconPx: iconSize[12],
    dotSize: spacing[6],
    gap: spacing[4],
  },
  md: {
    labelVariant: 'body14Medium',
    padY: spacing[4],
    padX: spacing[12],
    iconPx: iconSize[16],
    dotSize: spacing[8],
    gap: spacing[6],
  },
};

export function Badge({
  label,
  size = 'md',
  appearance = 'default',
  pill = false,
  icon = 'none',
  iconName,
  onClose,
  style,
}: BadgeProps) {
  const config = SIZE_CONFIG[size];
  const fg = colors.cashback.default;
  const br = pill ? radius.full : radius.xs;
  const isIconOnly = icon === 'only' && !!iconName;

  const containerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: config.gap,
    paddingVertical: config.padY,
    paddingHorizontal: config.padX,
    borderRadius: br,
    alignSelf: 'flex-start' as const,
  };

  const content = (
    <>
      {icon === 'dot' ? (
        <View
          style={{
            width: config.dotSize,
            height: config.dotSize,
            borderRadius: radius.full,
            backgroundColor: fg,
          }}
        />
      ) : null}

      {icon === 'left' && iconName ? (
        <Icon name={iconName} size={config.iconPx} color={fg} />
      ) : null}

      {!isIconOnly ? (
        <Text
          variant={config.labelVariant}
          color={fg}
          accessibilityLabel={label}
        >
          {label}
        </Text>
      ) : null}

      {icon === 'right' && iconName ? (
        <Icon name={iconName} size={config.iconPx} color={fg} />
      ) : null}

      {isIconOnly && iconName ? (
        <Icon name={iconName} size={config.iconPx} color={fg} />
      ) : null}

      {icon === 'close' ? (
        <Pressable
          onPress={onClose}
          hitSlop={spacing[8]}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
        >
          <Icon name="desc-cross" size={config.iconPx} color={fg} />
        </Pressable>
      ) : null}
    </>
  );

  if (appearance === 'subtle') {
    const grad = gradients.saffronFade;
    return (
      <LinearGradient
        colors={grad.colors}
        locations={grad.locations}
        start={grad.start}
        end={grad.end}
        style={[containerStyle, style]}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[containerStyle, { backgroundColor: colors.background.emphasis }, style]}
    >
      {content}
    </View>
  );
}
