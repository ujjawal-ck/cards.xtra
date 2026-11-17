/**
 * DS-ADD(ds-expansion-1, 2026-11-17): a determinate progress bar with an optional label and "2 of 6" count.
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts
 * (users: src/organisms/QuizStep.tsx).
 *
 * StepProgress — atom
 *
 * Track colors.data.track, fill action.accent (or feedback.success), height
 * spacing[6], radius.full. The fill animates with motion.duration.base.
 * value is clamped to 0..total (total 0 → empty bar).
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from './Text';
import { colors, spacing, radius, motion } from '../tokens';
import { progressFraction } from '../lib/chartMath';

export interface StepProgressProps {
  value: number;
  total: number;
  label?: string;
  /** Show "2 of 6" on the right. Default true. */
  showCount?: boolean;
  tone?: 'accent' | 'success';
}

export function StepProgress({
  value,
  total,
  label,
  showCount = true,
  tone = 'accent',
}: StepProgressProps) {
  const fraction = progressFraction(value, total);
  const shared = useSharedValue(fraction);
  useEffect(() => {
    shared.value = withTiming(fraction, {
      duration: motion.duration.base,
      easing: motion.easing.standard,
    });
  }, [fraction, shared]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${shared.value * 100}%` }));
  const now = Math.max(0, Math.min(total > 0 ? total : 0, value));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Progress'}
      accessibilityValue={{ min: 0, max: Math.max(total, 0), now }}
      style={{ gap: spacing[4] }}
    >
      {label || showCount ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing[8] }}>
          {label ? (
            <Text variant="body12Regular" color={colors.text.secondary} style={{ flex: 1 }}>
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showCount ? (
            <Text variant="body12SemiBold" color={colors.text.secondary}>
              {`${now} of ${Math.max(total, 0)}`}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={{
          height: spacing[6],
          borderRadius: radius.full,
          overflow: 'hidden',
          backgroundColor: colors.data.track,
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: radius.full,
              backgroundColor:
                tone === 'success' ? colors.feedback.success.default : colors.action.accent.default,
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}
