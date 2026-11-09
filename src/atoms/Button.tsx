/**
 * Button — atom (Figma component set 78:21192, 456 variants)
 *
 * Props
 *   variant : 'solid' | 'outline' | 'subtle' | 'destructive' | 'ghost' | 'link'   default 'solid'
 *   tone    : 'main' | 'second' | 'accent'                                         default 'main'
 *             Solid buttons are ALWAYS Saffron (brand rule, CLAUDE.md; decided
 *             9 Nov 2026) for 'main' and 'second'. Only tone='accent' gives a
 *             solid Cobalt fill — reserved for the partner "Shop & Earn upto X%"
 *             CTA. On outline buttons 'main' = saffron outline, 'second' =
 *             cobalt-grey secondary outline.
 *   size    : 36 | 44 | 52                                                         default 44
 *   icon    : 'none' | 'leading' | 'trailing' | 'only'                             default 'none'
 *   iconName: IconName from src/assets/icons (required when icon != 'none')
 *   label   : string  (still required when icon='only' — used as the accessibilityLabel)
 *   disabled, loading, fullWidth, onPress
 *
 * Token mapping (every Figma hex → semantic token, sourced via grep on
 * colors.ts so no hand-coded hex leaks into the component):
 *   #ff6d1d  → colors.action.primary.default      (solid + main fill)
 *   #0741ef  → colors.action.accent.default       (solid + accent fill)
 *   #d41000  → colors.action.destructive.default  (destructive fill)
 *   #fff     → colors.surface.default             (outline fill)
 *                  / colors.action.{primary|accent|destructive}.text
 *                  / colors.text.inverse           (white labels)
 *   #ebf0ff  → colors.action.secondary.default    (subtle fill)
 *   #d3ddf9  → colors.action.secondary.border     (outline / subtle stroke)
 *   #0036da  → colors.action.secondary.text       (outline / subtle label)
 *                  / colors.text.link              (link label)
 *
 * Sizes (Figma spec, mirrored here):
 *   36 → h36, radius 8 (radius.sm), padH 24 (spacing[24]), body12Medium, icon 16
 *   44 → h44, radius 12 (radius.lg), padH 32 (spacing[32]), body14Medium, icon 20
 *   52 → h52, radius 12 (radius.lg), padH 40 (spacing[40]), body16Medium, icon 20
 *   gap between icon & label = spacing[4]
 *
 * Heights 36 / 44 / 52 aren't theme tokens (the spacing scale skips them).
 * They live below as button-spec consts. 44 reuses sizing.touchMin because
 * that *is* in the token set.
 *
 * Link variant: no horizontal padding, height = label lineHeight only
 * (16 / 20 / 24 for 36 / 44 / 52), label underlined.
 */
import React from 'react';
import { Pressable, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  sizing,
} from '../tokens';
import { Text, TextVariant } from './Text';
import { Icon, IconName } from './Icon';
import { triggerHaptic, HapticKind } from '../lib/haptics';

export type ButtonVariant =
  | 'solid'
  | 'outline'
  | 'subtle'
  | 'destructive'
  | 'ghost'
  | 'link';
export type ButtonTone = 'main' | 'second' | 'accent';
export type ButtonSize = 36 | 44 | 52;
export type ButtonIcon = 'none' | 'leading' | 'trailing' | 'only';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ButtonIcon;
  iconName?: IconName;
  /** Haptic fired on tap. Defaults to 'medium' for solid (primary CTA)
   *  buttons and 'light' for the rest. Pass 'none' to silence, or a
   *  notification kind ('success' etc.) for special cases. */
  haptic?: HapticKind;
  /** Overrides the variant's default label colour (label text + any icon
   *  + the loading spinner). Pass a semantic token only. Use sparingly —
   *  e.g. to make an outline button's text match its stroke. */
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
}

// ----------------------------------------------------------------------------
// Heights — component-spec values (not in the shared sizing token set, except
// 44 which we route through sizing.touchMin).
// ----------------------------------------------------------------------------
const BUTTON_HEIGHT_36 = 36;
const BUTTON_HEIGHT_52 = 52;

// Disabled-state opacity. Mirrors the *40 transparency family on
// primitives.transparentBlack[40] / transparentWhite[40] (rgba(.,.,.,0.40)),
// applied here as a numeric opacity multiplier per Figma spec.
const DISABLED_OPACITY = 0.4;

// ----------------------------------------------------------------------------
// Per-size config
// ----------------------------------------------------------------------------
type SizeConfig = {
  height: number;
  radius: number;
  padH: number;
  labelVariant: TextVariant;
  iconPx: number;
  /** Link variant height = label lineHeight; matches the size's typography. */
  linkLineHeight: number;
};

const SIZE_CONFIG: Record<ButtonSize, SizeConfig> = {
  36: {
    height: BUTTON_HEIGHT_36,
    radius: radius.sm,
    padH: spacing[24],
    labelVariant: 'body12Medium',
    iconPx: iconSize[16],
    linkLineHeight: 16,
  },
  44: {
    height: sizing.touchMin,
    radius: radius.lg,
    padH: spacing[32],
    labelVariant: 'body14Medium',
    iconPx: iconSize[20],
    linkLineHeight: 20,
  },
  52: {
    height: BUTTON_HEIGHT_52,
    radius: radius.lg,
    padH: spacing[40],
    labelVariant: 'body16Medium',
    iconPx: iconSize[20],
    linkLineHeight: 24,
  },
};

// ----------------------------------------------------------------------------
// Per-variant palette
// ----------------------------------------------------------------------------
type Palette = {
  bg: string;
  border?: string;
  label: string;
};

function getPalette(variant: ButtonVariant, tone: ButtonTone): Palette {
  switch (variant) {
    case 'solid':
      // Saffron is the one primary-action colour. Cobalt solid is opt-in via
      // tone='accent' (partner Shop & Earn CTA only).
      return tone === 'accent'
        ? {
            bg: colors.action.accent.default,
            label: colors.action.accent.text,
          }
        : {
            bg: colors.action.primary.default,
            label: colors.action.primary.text,
          };
    case 'outline':
      // tone='main' (saffron) → saffron-toned outline.
      // tone='second' (cobalt, default) → cobalt-toned outline.
      // Lets FooterButtons-style "all-saffron" vs "all-cobalt" vs
      // "mixed" composites render distinctly.
      return tone === 'main'
        ? {
            bg: colors.surface.default,
            // Figma 3609:170274: button/primary-border #eeddd3 and
            // button/primary-subtle-text #e55a0e (= saffron 600, the
            // action.primary.hover value).
            border: colors.action.primary.border,
            label: colors.action.primary.hover,
          }
        : {
            bg: colors.surface.default,
            border: colors.action.secondary.border,
            label: colors.action.secondary.text,
          };
    case 'subtle':
      return {
        bg: colors.action.secondary.default,
        border: colors.action.secondary.border,
        label: colors.action.secondary.text,
      };
    case 'destructive':
      return {
        bg: colors.action.destructive.default,
        label: colors.action.destructive.text,
      };
    case 'ghost':
      return {
        bg: 'transparent',
        border: colors.border.inverse,
        label: colors.text.inverse,
      };
    case 'link':
      return {
        bg: 'transparent',
        label: colors.text.link,
      };
    default:
      // Defensive fallback for any out-of-union value (e.g. legacy callers
      // still on the old 'primary' / 'accent' string union).
      return {
        bg: colors.action.primary.default,
        label: colors.action.primary.text,
      };
  }
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function Button({
  label,
  onPress,
  variant = 'solid',
  tone = 'main',
  size = 44,
  disabled = false,
  loading = false,
  fullWidth = false,
  icon = 'none',
  iconName,
  haptic,
  labelColor,
  style,
}: ButtonProps) {
  const config = SIZE_CONFIG[size] ?? SIZE_CONFIG[44];
  const palette = getPalette(variant, tone);
  // Caller override (e.g. outline text matching its stroke) → else the
  // variant's own label colour.
  const resolvedLabelColor = labelColor ?? palette.label;
  const isLink = variant === 'link';
  const isIconOnly = icon === 'only' && !!iconName;
  const interactionBlocked = disabled || loading;

  // Solid buttons are the primary CTAs → a touch more substantial.
  const resolvedHaptic: HapticKind =
    haptic ?? (variant === 'solid' ? 'medium' : 'light');
  const handlePress = () => {
    triggerHaptic(resolvedHaptic);
    onPress?.();
  };

  const containerStyle: StyleProp<ViewStyle> = [
    {
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[4],
      height: isLink ? config.linkLineHeight : config.height,
      width: isIconOnly ? config.height : undefined,
      borderRadius: isLink ? 0 : config.radius,
      // Full-width buttons centre their label, so the size's large side
      // padding only steals room from it ("Apply Filter" was clipped to
      // "Apply" at larger font sizes). Keep a small 16-px inset instead.
      paddingHorizontal: isLink || isIconOnly ? 0 : fullWidth ? spacing[16] : config.padH,
      backgroundColor: palette.bg,
      borderWidth: palette.border ? borderWidth.thin : 0,
      borderColor: palette.border,
      opacity: disabled ? DISABLED_OPACITY : 1,
    },
    style,
  ];

  return (
    <Pressable
      accessibilityRole={isLink ? 'link' : 'button'}
      accessibilityLabel={label}
      accessibilityState={{ disabled: interactionBlocked, busy: loading }}
      onPress={interactionBlocked ? undefined : handlePress}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator color={resolvedLabelColor} />
      ) : (
        <>
          {icon === 'leading' && iconName ? (
            <Icon name={iconName} size={config.iconPx} color={resolvedLabelColor} />
          ) : null}

          {!isIconOnly ? (
            <Text
              variant={config.labelVariant}
              color={resolvedLabelColor}
              // A button label is one line ("Apply Filter" broke onto two
              // lines at larger font sizes). No adjustsFontSizeToFit: on
              // Android it cut the label at a word ("Apply") instead of
              // shrinking it.
              numberOfLines={1}
              style={[
                isLink ? { textDecorationLine: 'underline' } : undefined,
              ]}
            >
              {label}
            </Text>
          ) : null}

          {icon === 'trailing' && iconName ? (
            <Icon name={iconName} size={config.iconPx} color={resolvedLabelColor} />
          ) : null}

          {isIconOnly && iconName ? (
            <Icon name={iconName} size={config.iconPx} color={resolvedLabelColor} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}
