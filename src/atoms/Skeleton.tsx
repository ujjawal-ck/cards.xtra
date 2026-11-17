/**
 * DS-ADD(ds-expansion-1, 2026-11-17): a generic pulsing loading block (any width, height, radius).
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts.
 *
 * Skeleton — atom
 *
 * Same pulse and fill as AmountSkeleton / HomeSkeleton: opacity loops between
 * opacity[16] and opacity[40], one half-cycle = motion.duration.pulse, eased with
 * motion.easing.standard. AmountSkeleton and HomeSkeleton are NOT refactored onto it.
 * Fill: border.subtle (slate-300) on light surfaces, surface.default (white) on dark.
 */
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius as radiusTokens, opacity, motion } from '../tokens';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: keyof typeof radiusTokens;
  tone?: 'default' | 'onDark';
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
  tone = 'default',
  style,
}: SkeletonProps) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    const step = { duration: motion.duration.pulse, easing: motion.easing.standard };
    pulse.value = withRepeat(withSequence(withTiming(1, step), withTiming(0, step)), -1, false);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [opacity[16], opacity[40]]),
  }));
  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[
        {
          width,
          height,
          borderRadius: radiusTokens[radius],
          backgroundColor: tone === 'onDark' ? colors.surface.default : colors.border.subtle,
        },
        pulseStyle,
        style,
      ]}
    />
  );
}
