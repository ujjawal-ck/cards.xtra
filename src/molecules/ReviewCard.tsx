/**
 * ReviewCard — molecule (Figma 3713:50081)
 *
 * A single user-review card for the Review Us screen. Data-driven via a
 * ReviewModel so the list renders from an array, not hardcoded blocks.
 *
 * Composition (no new primitives):
 *   - <Rating>  (atom)  — 5 stars, gold-filled count from `stars`.
 *   - <Text>    (atom)  — title / body / attribution.
 *
 * Card:
 *   bg colors.surface.default, radius.xl (16), elevation.light.sm,
 *   padding spacing[16]. Inner vertical layout, gap spacing[12].
 *     • Rating
 *     • Title + body group (gap spacing[4]):
 *         title → body14SemiBold, text.primary
 *         body  → body12Regular,  text.secondary
 *     • Attribution → caption10Regular, text.secondary
 *
 * Hex → token:
 *   #ffffff → colors.surface.default
 *   #262626 → colors.text.primary
 *   #5c5c5c → colors.text.secondary
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text, Rating } from '../atoms';
import { colors, spacing, radius, elevation } from '../tokens';

export interface ReviewModel {
  /** Gold-filled star count (0..5). */
  stars: number;
  title: string;
  body: string;
  /** Attribution line, e.g. "Subhrendu Sen, Mar 02, 2023". */
  author: string;
}

export interface ReviewCardProps {
  review: ReviewModel;
  style?: StyleProp<ViewStyle>;
}

export function ReviewCard({ review, style }: ReviewCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface.default,
          borderRadius: radius.xl,
          padding: spacing[16],
          gap: spacing[12],
        },
        elevation.light.xs,
        style,
      ]}
    >
      {/* Rating — REUSED atom, gold-filled count is data-driven */}
      <Rating filled={review.stars} />

      {/* Title + body */}
      <View style={{ gap: spacing[4] }}>
        <Text variant="body14SemiBold" color={colors.text.primary}>
          {review.title}
        </Text>
        <Text variant="body12Regular" color={colors.text.secondary}>
          {review.body}
        </Text>
      </View>

      {/* Attribution */}
      <Text variant="caption10Regular" color={colors.text.secondary}>
        {review.author}
      </Text>
    </View>
  );
}
