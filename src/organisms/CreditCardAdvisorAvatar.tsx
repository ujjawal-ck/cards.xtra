/**
 * CreditCardAdvisorAvatar: organism. "Swipey", the card advisor mascot: a
 * friendly credit card with a face, small arms with gloves and legs with shoes.
 *
 * Contract: src/lib/advisorAvatar/types.ts. Pose maths and geometry:
 * src/lib/advisorAvatar/pose.ts. Docs: docs/card-advisor-avatar.md.
 *
 * Layers (back to front), all inside one Animated.View that floats, tilts,
 * bounces, breathes and shakes the whole character:
 *   glow, legs (full), arms (standard and full), card body, sparkles, eyes,
 *   brows (standard and full), mouth.
 * Detail by size (detailForSize): compact below 72, standard below 140, full above.
 *
 * Motion runs through Reanimated only (no JS timers), on iOS with reduce
 * motion off. With reduce motion on, or on Android, each state shows one
 * still pose (this repo keeps Reanimated loops to iOS: see the header of
 * StaggeredEntrance.tsx). See creditCardAdvisorAvatar/useAvatarMotion.ts.
 *
 * Colours: colors.advisorAvatar.*; the card body: gradients.premium.
 */
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReduceMotion } from '../lib/useReduceMotion';
import {
  BREATH_SCALE,
  accessibilityLabelFor,
  avatarGeometry,
  clampAudioLevel,
  detailForSize,
} from '../lib/advisorAvatar/pose';
import type { CreditCardAdvisorAvatarProps } from '../lib/advisorAvatar/types';
import { useAvatarMotion } from './creditCardAdvisorAvatar/useAvatarMotion';
import { Arm, CardBody, Glow, Legs, Sparkle } from './creditCardAdvisorAvatar/Body';
import { Brow, Eye, Mouth } from './creditCardAdvisorAvatar/Face';

const DEFAULT_SIZE = 96;

export function CreditCardAdvisorAvatar({
  state,
  size = DEFAULT_SIZE,
  audioLevel,
  accessibilityLabel,
  style,
}: CreditCardAdvisorAvatarProps) {
  const reduceMotion = useReduceMotion();
  const still = reduceMotion || Platform.OS === 'android';
  const detail = detailForSize(size);
  const g = useMemo(() => avatarGeometry(detail), [detail]);
  const m = useAvatarMotion(state, still, clampAudioLevel(audioLevel));

  const characterStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: m.shakeX.value * size },
      { translateY: m.floatY.value * size },
      { rotate: `${m.tilt.value}deg` },
      { scale: 1 + BREATH_SCALE * m.breath.value },
    ] as unknown as { translateY: number }[],
  }));

  const limbs = detail !== 'compact';
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabelFor(state, accessibilityLabel)}
      style={[{ width: size, height: size, overflow: 'visible' }, style]}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, characterStyle]}>
        <Glow g={g} size={size} m={m} />
        {detail === 'full' ? <Legs g={g} size={size} /> : null}
        {limbs ? <Arm g={g} size={size} side="left" m={m} /> : null}
        {limbs ? <Arm g={g} size={size} side="right" m={m} /> : null}
        <CardBody g={g} size={size} detail={detail} />
        {g.sparkles.map((_, i) => (
          <Sparkle key={i} g={g} size={size} index={i} m={m} />
        ))}
        <Eye g={g} size={size} side="left" m={m} />
        <Eye g={g} size={size} side="right" m={m} />
        {limbs ? <Brow g={g} size={size} side="left" m={m} /> : null}
        {limbs ? <Brow g={g} size={size} side="right" m={m} /> : null}
        <Mouth g={g} size={size} m={m} />
      </Animated.View>
    </View>
  );
}
