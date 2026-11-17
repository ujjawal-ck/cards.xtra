/**
 * DS-ADD(ds-expansion-1, 2026-11-17): a number with a stated direction ("₹590, ↓ ₹2,360 less") and an optional reference line.
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts
 * (users: src/molecules/CompareCard.tsx).
 *
 * StatDelta — atom
 *
 * Row layout: label on the left (body12Regular, text.secondary); on the right,
 * on one line that may wrap, the value (body14SemiBold) then a small direction
 * icon and the delta text (body12SemiBold). Colour follows `sentiment` (good =
 * feedback.success.text, bad = feedback.error.text, neutral = text.secondary) but
 * the direction is ALWAYS also stated by icon and word, never by colour alone.
 * `reference` is a second line under the value. Values are never truncated.
 * 'stack' puts the label above the value instead.
 *
 * The up arrow is the chevron-down glyph turned 180 degrees (no arrow glyph in
 * the icon set); 'same' shows no icon, only the word.
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors, spacing, iconSize } from '../tokens';
import { formatINR } from '../lib/money';

export type StatDeltaDirection = 'up' | 'down' | 'same';
export type StatDeltaSentiment = 'good' | 'bad' | 'neutral';

export interface StatDeltaProps {
  label: string;
  /** A display string, or a number shown as rupees. */
  value: string | number;
  /** The other thing it is compared with, e.g. { label: 'Axis ACE', value: '₹2,950' }. */
  reference?: { label: string; value: string };
  /** Delta text, e.g. "₹2,360 less" or "Same". */
  delta?: string;
  direction?: StatDeltaDirection;
  sentiment?: StatDeltaSentiment;
  layout?: 'row' | 'stack';
}

const SENTIMENT_COLOR: Record<StatDeltaSentiment, string> = {
  good: colors.feedback.success.text,
  bad: colors.feedback.error.text,
  neutral: colors.text.secondary,
};

export function StatDelta({
  label,
  value,
  reference,
  delta,
  direction = 'same',
  sentiment = 'neutral',
  layout = 'row',
}: StatDeltaProps) {
  const valueText = typeof value === 'number' ? formatINR(value) : value;
  const tint = SENTIMENT_COLOR[sentiment];
  const a11y =
    `${label}: ${valueText}` +
    (delta ? `, ${delta}` : '') +
    (reference ? `, ${reference.label} ${reference.value}` : '');

  const valueLine = (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: spacing[4],
        justifyContent: layout === 'row' ? 'flex-end' : 'flex-start',
      }}
    >
      <Text variant="body14SemiBold" color={colors.text.primary}>
        {valueText}
      </Text>
      {delta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          {direction === 'same' ? null : (
            <Icon
              name="chevron-down"
              size={iconSize[12]}
              color={tint}
              style={direction === 'up' ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          )}
          <Text variant="body12SemiBold" color={tint}>
            {delta}
          </Text>
        </View>
      ) : null}
    </View>
  );
  const referenceLine = reference ? (
    <Text
      variant="body12Regular"
      color={colors.text.secondary}
      align={layout === 'row' ? 'right' : 'left'}
    >
      {`${reference.label} ${reference.value}`}
    </Text>
  ) : null;

  if (layout === 'stack') {
    return (
      <View accessible accessibilityLabel={a11y} style={{ gap: spacing[2] }}>
        <Text variant="body12Regular" color={colors.text.secondary}>
          {label}
        </Text>
        {valueLine}
        {referenceLine}
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[8] }}
    >
      <Text variant="body12Regular" color={colors.text.secondary}>
        {label}
      </Text>
      <View style={{ flex: 1, alignItems: 'flex-end', gap: spacing[2] }}>
        {valueLine}
        {referenceLine}
      </View>
    </View>
  );
}
