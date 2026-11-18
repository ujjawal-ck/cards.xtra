/**
 * AdvisorMessageEntrance: a new chat message fades in and rises a little into place.
 *
 * The screen decides `animate` (iOS only, reduce motion off, an id never shown before). The value
 * is read once at mount: a FlatList row that remounts later (scrolled away and back) never
 * replays. `onDone(id)` runs once: when the entrance ends, or when the row unmounts first,
 * so the mascot's "speaking" state can never stick on.
 *
 * iOS only, like src/organisms/StaggeredEntrance.tsx: Reanimated entrances under Android
 * edge-to-edge have caused jank in this app.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { motion, spacing } from '../../tokens';

const RISE = spacing[12];

export function AdvisorMessageEntrance({
  id,
  animate,
  delay,
  onDone,
  style,
  children,
}: {
  id: string;
  animate: boolean;
  /** ms before this message starts, for a stagger. */
  delay: number;
  onDone?: (id: string) => void;
  /** Static layout style for the wrapper (for example a fixed width in a rail). */
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const [shouldAnimate] = useState(animate);
  const progress = useSharedValue(shouldAnimate ? 0 : 1);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const doneRef = useRef(false);
  const finishRef = useRef(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current?.(id);
  });

  useEffect(() => {
    if (!shouldAnimate) return;
    const finish = finishRef.current;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: motion.duration.slow, easing: Easing.out(Easing.cubic) }, () => {
        runOnJS(finish)();
      }),
    );
    return () => finish();
    // Runs once per mount: the entrance never replays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [RISE, 0], Extrapolation.CLAMP) }],
  }));

  if (!shouldAnimate) return <View style={style}>{children}</View>;
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
