/**
 * Switch — atom (Figma _ToggleBase 629:23604)
 *
 * Pill-shaped track with a circular thumb that slides between off (left)
 * and on (right). Same cobalt accent as Checkbox/Radio.
 *
 * Sizes (all dimensions are existing tokens):
 *   md → track 44×24 (sizing.touchMin × iconSize[24]), thumb 20 (iconSize[20])
 *   sm → track 24×16 (iconSize[24]  × iconSize[16]), thumb 12 (iconSize[12])
 *
 * Thumb travel = trackW − thumbSize − 2·padding. Padding is spacing[2]
 * (the math lands exactly on (trackH − thumbSize)/2 for both sizes).
 *
 * Hex → token:
 *   #ebf0ff → colors.action.secondary.default   (off track)
 *   #0741ef → colors.action.accent.default       (on track)
 *   #fff    → colors.surface.default             (thumb)
 *   #dddce7 → colors.action.accent.disabled      (disabled track)
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, iconSize, sizing, borderWidth } from '../tokens';
import { haptics } from '../lib/haptics';

export type SwitchSize = 'md' | 'sm';

export interface SwitchProps {
  value: boolean;
  size?: SwitchSize;
  disabled?: boolean;
  onValueChange?: (next: boolean) => void;
  /** What the switch controls, read by TalkBack / VoiceOver. Required when
   *  the switch stands alone (no labelled parent row). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

type SizeSpec = {
  trackW: number;
  trackH: number;
  thumb: number;
};

const SIZE_SPEC: Record<SwitchSize, SizeSpec> = {
  md: { trackW: sizing.touchMin, trackH: iconSize[24], thumb: iconSize[20] },
  sm: { trackW: iconSize[24], trackH: iconSize[16], thumb: iconSize[12] },
};

const THUMB_PADDING = spacing[2];
const ANIM_DURATION_MS = 150;

export function Switch({
  value,
  size = 'md',
  disabled = false,
  onValueChange,
  accessibilityLabel,
  style,
}: SwitchProps) {
  const spec = SIZE_SPEC[size];
  const offset = spec.trackW - spec.thumb - 2 * THUMB_PADDING;

  const translate = useRef(
    new Animated.Value(value ? offset : 0)
  ).current;

  useEffect(() => {
    Animated.timing(translate, {
      toValue: value ? offset : 0,
      duration: ANIM_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [value, offset, translate]);

  const trackBg = disabled
    ? colors.action.accent.disabled
    : value
    ? colors.action.accent.default
    : colors.action.secondary.default;

  return (
    <Pressable
      onPress={() => {
        if (!disabled) {
          haptics.selection();
          onValueChange?.(!value);
        }
      }}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, checked: value }}
      hitSlop={spacing[12]}
      style={({ pressed }) => [
        {
          width: spec.trackW,
          height: spec.trackH,
          borderRadius: radius.full,
          backgroundColor: trackBg,
          // Hairline outline in the OFF state: the pale off track (#ebf0ff)
          // on a white card was ~1.1:1 contrast — the switch looked missing.
          // Always present (transparent when on) so geometry never shifts.
          borderWidth: borderWidth.thin,
          borderColor: !value && !disabled ? colors.border.strong : 'transparent',
          justifyContent: 'center',
          paddingHorizontal: THUMB_PADDING,
          opacity: pressed && !disabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          width: spec.thumb,
          height: spec.thumb,
          borderRadius: radius.full,
          backgroundColor: colors.surface.default,
          transform: [{ translateX: translate }],
        }}
      />
    </Pressable>
  );
}
