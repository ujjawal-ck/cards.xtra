/**
 * HomeSkeleton — a loading placeholder that mirrors the rough Home layout
 * (hero / masthead block, search-bar pill, filter chips, a few card-tile
 * rectangles) so a transition reads as "content arriving" rather than a blank
 * flash.
 *
 * All rectangles pulse-shimmer between opacity[16] and opacity[40] via a
 * repeated reanimated timing — gives the skeleton a "live" feel without a
 * gradient sweep.
 *
 * Used in two places:
 *   • HomeScreen — the brief first-mount overlay before content fades in.
 *   • FilterTransitionOverlay — the backdrop BEHIND the cat animation while a
 *     filter / eligibility result is being applied (so the page reads as
 *     reloading underneath the cat, not a plain white wash).
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, primitives, spacing, radius, opacity, borderWidth } from '../tokens';

export function HomeSkeleton() {
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

  const Block = ({
    height,
    width,
    style,
  }: {
    height: number;
    width?: number | `${number}%`;
    style?: object;
  }) => (
    <Animated.View
      style={[
        {
          height,
          width: width ?? '100%',
          borderRadius: radius.md,
          backgroundColor: primitives.slate[300],
        },
        pulseStyle,
        style,
      ]}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
      {/* Hero / masthead block — full-bleed coloured rectangle */}
      <Animated.View
        style={[
          {
            height: 320,
            backgroundColor: primitives.cobalt[100],
          },
          pulseStyle,
        ]}
      />
      {/* Search bar pill — overlapping the hero's bottom edge */}
      <View
        style={{
          paddingHorizontal: spacing[16],
          marginTop: -spacing[24],
          gap: spacing[16],
        }}
      >
        <Block height={48} />
        {/* Filter chips row */}
        <View style={{ flexDirection: 'row', gap: spacing[8] }}>
          <Block height={32} width={96} />
          <Block height={32} width={80} />
        </View>
        {/* Card list */}
        <View style={{ gap: spacing[12], marginTop: spacing[8] }}>
          <Block height={96} />
          <Block height={96} />
          <Block height={96} />
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// CardListSkeleton — a short run of card-tile-shaped shimmer rows, used to
// bracket the category carousel while a freshly-selected category's cards are
// "being fetched". Each row mirrors a CardTile's layout (left image block +
// three text lines) so the placeholder reads as cards, not generic bars.
// ----------------------------------------------------------------------------
export function CardListSkeleton({ count = 2 }: { count?: number }) {
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

  const pulse = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [opacity[16], opacity[40]]),
  }));

  const Bar = ({
    width,
    height = 12,
  }: {
    width: number | `${number}%`;
    height?: number;
  }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius.sm,
          backgroundColor: primitives.slate[300],
        },
        pulse,
      ]}
    />
  );

  return (
    <View style={{ paddingHorizontal: spacing[16], gap: spacing[16] }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            gap: spacing[12],
            padding: spacing[12],
            borderRadius: radius.lg,
            borderWidth: borderWidth.thin,
            borderColor: colors.border.default,
            backgroundColor: colors.surface.default,
          }}
        >
          {/* Card image block */}
          <Animated.View
            style={[
              {
                width: 120,
                height: 80,
                borderRadius: radius.md,
                backgroundColor: primitives.slate[300],
              },
              pulse,
            ]}
          />
          {/* Text lines */}
          <View style={{ flex: 1, justifyContent: 'center', gap: spacing[8] }}>
            <Bar width="65%" height={14} />
            <Bar width="90%" />
            <Bar width="45%" />
          </View>
        </View>
      ))}
    </View>
  );
}
