/**
 * AmountSkeleton — atom
 *
 * A pulsing placeholder shown in place of a money amount while it is
 * still loading from the API (e.g. the Earnings masthead total + stat
 * cards, the Confirmed / Pending rows). Replaces the old neutral "—"
 * dash so a loading screen reads as "amount arriving" rather than
 * flashing a fake default value that then changes.
 *
 * It reuses the SAME pulse the Home screen skeleton uses (HomeSkeleton
 * in src/screens/HomeScreen.tsx): a reanimated opacity loop between
 * opacity[16] and opacity[40], so the loading language is consistent
 * across the app rather than a one-off animation.
 *
 * Tone:
 *   - 'default' — slate bar for money on a light surface (white card).
 *   - 'onDark'  — light bar for money on a dark hero (earnings masthead).
 *
 * Size: pass `width` + `height` to match the text line it stands in for
 * (a display headline is taller/wider than a body14 stat value).
 */
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { primitives, radius, opacity } from '../tokens';

export interface AmountSkeletonProps {
  /** Bar width — match the rough width of the amount it replaces. */
  width?: number | `${number}%`;
  /** Bar height — match the text line height (display vs body). */
  height?: number;
  /** 'default' for light surfaces, 'onDark' for dark hero backgrounds. */
  tone?: 'default' | 'onDark';
  style?: StyleProp<ViewStyle>;
}

export function AmountSkeleton({
  width = 88,
  height = 16,
  tone = 'default',
  style,
}: AmountSkeletonProps) {
  // Same pulse as HomeSkeleton — a 0↔1 loop, eased in/out, repeated
  // forever. opacity is interpolated from it so the bar breathes between
  // a faint (opacity[16]) and a stronger (opacity[40]) tint.
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 650, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [shimmer]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [opacity[16], opacity[40]]),
  }));

  return (
    <Animated.View
      accessibilityLabel="Loading amount"
      style={[
        {
          width,
          height,
          borderRadius: radius.sm,
          // slate[300] reads as a grey bar on white; slate[50] (the light
          // end of the ramp) reads as a light bar on the dark masthead.
          backgroundColor:
            tone === 'onDark' ? primitives.slate[50] : primitives.slate[300],
        },
        pulseStyle,
        style,
      ]}
    />
  );
}
