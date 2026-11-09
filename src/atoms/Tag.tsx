/**
 * Tag — atom (Figma set 3636:22802, 96 variants)
 *
 * Tone-themed pill used across the system (CardTile tags row, filter
 * chips, etc.). Four axes — size × pill × appearance × icon — multiplied
 * by 9 tones from `colors.tones`.
 *
 * Axes:
 *   size       'xxs' | 'xs' | 'sm' | 'md'
 *   pill       false → radius.xs (4)  |  true → radius.full
 *   appearance 'default' | 'subtle' | 'gradient'
 *              - default  → solid tone.bg
 *              - subtle   → pale tone.bgSubtle
 *              - gradient → LinearGradient using gradients.tagPills
 *                          (#ebf0ff → #ffffff). The gradient is the named
 *                          "tag" gradient style; pair it with tone='info'
 *                          for the matching cobalt border + text.
 *   icon       'none' | 'dot' | 'icon-left' | 'icon-right' | 'icon-only' | 'x-close'
 *   tone       any key of colors.tones (9 tones)
 *
 * Sizing — heights are explicit and the content centres vertically,
 * so the spec'd height is always exact regardless of font metrics:
 *   xxs → h16, padH 4,  text caption10SemiBold
 *   xs  → h20, padH 8,  text body12Medium
 *   sm  → h20, padH 8,  text body12Regular
 *   md  → h28, padH 8,  text body14Regular
 *
 * Every tone variant carries a 1-px border in `tone.border`. Borders
 * are present even on 'default' — that's per the Figma spec.
 *
 * Icon details:
 *   dot       → 8×8 View tinted `tone.text` (no SVG asset needed)
 *   icon-only → just the icon, no label
 *   x-close   → label + dismiss control; the X glyph is drawn inline via
 *               react-native-svg since src/assets/icons doesn't ship an
 *               x-close SVG. Tapping the X fires `onClose`.
 *
 * Token mapping: every colour goes through colors.tones[tone].* —
 * no hex anywhere in this file.
 */
import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Text, TextVariant } from './Text';
import { Icon, IconName } from './Icon';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  gradients,
} from '../tokens';
import type { ToneName } from '../tokens';

export type TagSize = 'xxs' | 'xs' | 'sm' | 'md';
export type TagAppearance = 'default' | 'subtle' | 'gradient';
export type TagIconOption =
  | 'none'
  | 'dot'
  | 'icon-left'
  | 'icon-right'
  | 'icon-only'
  | 'x-close';

export interface TagProps {
  /** Label text. Optional when icon='icon-only' (still used for a11y). */
  label?: string;
  size?: TagSize;
  pill?: boolean;
  appearance?: TagAppearance;
  icon?: TagIconOption;
  tone?: ToneName;
  iconName?: IconName;
  onPress?: () => void;
  onClose?: () => void;
  /** Override the bg derived from `tone` + `appearance`. */
  bgColor?: string;
  /** Override the label / dot / icon tint derived from `tone`. */
  labelColor?: string;
  /** Override the border colour derived from `tone`. */
  borderColor?: string;
  /** Override the leading/right/only icon pixel size (default 16). */
  iconPx?: number;
  style?: StyleProp<ViewStyle>;
}

type SizeConfig = {
  height: number;
  padH: number;
  textVariant: TextVariant;
};

// Heights + horizontal padding are exact spec — the explicit height lets
// the container land on the right pixel regardless of text metrics.
const SIZE_CONFIG: Record<TagSize, SizeConfig> = {
  xxs: { height: spacing[16],            padH: spacing[4], textVariant: 'caption10SemiBold' },
  xs:  { height: spacing[20],            padH: spacing[8], textVariant: 'body12Medium' },
  sm:  { height: spacing[20],            padH: spacing[8], textVariant: 'body12Regular' },
  md:  { height: spacing[24] + spacing[4], padH: spacing[8], textVariant: 'body14Regular' }, // 28
};

// Dot size — fixed 8×8 per spec (Figma).
const DOT_SIZE = spacing[8];

// Inline 16-px X glyph for the dismiss control. Stroke colour tracks
// the tone's text colour so the X reads on every tone.
function XCloseGlyph({ color }: { color: string }) {
  const s = iconSize[16];
  return (
    <Svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4 4 L12 12 M12 4 L4 12"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function Tag({
  label,
  size = 'sm',
  pill = false,
  appearance = 'default',
  icon = 'none',
  tone = 'brand',
  iconName,
  onPress,
  onClose,
  bgColor,
  labelColor,
  borderColor,
  iconPx,
  style,
}: TagProps) {
  const config = SIZE_CONFIG[size];
  const palette = colors.tones[tone];
  const fg = labelColor ?? palette.text;
  const stroke = borderColor ?? palette.border;
  const br = pill ? radius.full : radius.xs;
  const isGradient = appearance === 'gradient';
  const solidBg =
    bgColor ?? (appearance === 'subtle' ? palette.bgSubtle : palette.bg);
  const iconSizePx = iconPx ?? iconSize[16];

  const containerStyle = {
    alignSelf: 'flex-start' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[4],
    // minHeight: a fixed height clipped descenders ("Shopping", "Dining")
    // at larger OS font sizes.
    minHeight: config.height,
    paddingHorizontal: config.padH,
    borderRadius: br,
    borderWidth: borderWidth.thin,
    borderColor: stroke,
  };

  const children = (
    <>
      {icon === 'dot' ? (
        <View
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: radius.full,
            backgroundColor: fg,
          }}
        />
      ) : null}

      {icon === 'icon-left' && iconName ? (
        <Icon name={iconName} size={iconSizePx} color={fg} />
      ) : null}

      {icon === 'icon-only' && iconName ? (
        <Icon name={iconName} size={iconSizePx} color={fg} />
      ) : label ? (
        <Text variant={config.textVariant} color={fg}>
          {label}
        </Text>
      ) : null}

      {icon === 'icon-right' && iconName ? (
        <Icon name={iconName} size={iconSizePx} color={fg} />
      ) : null}

      {icon === 'x-close' ? (
        <Pressable
          onPress={onClose}
          hitSlop={spacing[8]}
          accessibilityRole="button"
          accessibilityLabel={label ? `Remove ${label}` : 'Remove'}
        >
          <XCloseGlyph color={fg} />
        </Pressable>
      ) : null}
    </>
  );

  let body: React.ReactNode;
  if (isGradient) {
    const grad = gradients.tagPills;
    body = (
      <LinearGradient
        colors={grad.colors}
        locations={grad.locations}
        start={grad.start}
        end={grad.end}
        style={[containerStyle, style]}
      >
        {children}
      </LinearGradient>
    );
  } else {
    body = (
      <View style={[containerStyle, { backgroundColor: solidBg }, style]}>
        {children}
      </View>
    );
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {body}
      </Pressable>
    );
  }
  return <>{body}</>;
}
