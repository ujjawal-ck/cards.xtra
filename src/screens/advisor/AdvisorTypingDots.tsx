/**
 * AdvisorTypingDots: three small dots that pulse one after another while the advisor works.
 * Under reduce motion the dots stay still. Decorative: the bubble around it carries the words.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, radius, opacity, motion } from '../../tokens';
import { useReduceMotion } from '../../lib/useReduceMotion';

const DOT = spacing[6];
const DOTS = [0, 1, 2];

function Dot({ index, still }: { index: number; still: boolean }) {
  const level = useSharedValue<number>(opacity[40]);
  useEffect(() => {
    if (still) {
      cancelAnimation(level);
      level.value = opacity[40];
      return;
    }
    level.value = withDelay(
      index * motion.duration.fast,
      withRepeat(
        withSequence(
          withTiming(opacity[100], { duration: motion.duration.pulse / 2, easing: motion.easing.standard }),
          withTiming(opacity[40], { duration: motion.duration.pulse / 2, easing: motion.easing.standard }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(level);
  }, [still, index, level]);

  const style = useAnimatedStyle(() => ({ opacity: level.value }));
  return (
    <Animated.View
      style={[
        { width: DOT, height: DOT, borderRadius: radius.full, backgroundColor: colors.text.secondary },
        style,
      ]}
    />
  );
}

export function AdvisorTypingDots() {
  const still = useReduceMotion();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4], paddingVertical: spacing[4] }}
    >
      {DOTS.map((i) => (
        <Dot key={i} index={i} still={still} />
      ))}
    </View>
  );
}
