/**
 * DS-ADD(ds-expansion-1, 2026-11-17): one stacked horizontal bar with a labelled legend row per segment.
 * Rollback: delete this file and its DS-ADD export lines in src/molecules/index.ts.
 *
 * StackedBar — molecule
 *
 * Segments are View flex widths (sizes from stackedWidths(), summing to 100%),
 * with a spacing[2] gap in surface.default between them because neighbouring
 * series colours are under 3:1 against each other. Every segment is labelled in
 * the legend (colour is never the only cue). Colours: colors.data.*.
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '../atoms';
import { colors, spacing, radius } from '../tokens';
import { stackedWidths } from '../lib/chartMath';
import { formatINR } from '../lib/money';

type Series = 'series1' | 'series2' | 'series3' | 'positive' | 'negative' | 'muted';

export interface StackedBarSegment {
  label: string;
  value: number;
  series: Series;
}

export interface StackedBarProps {
  segments: StackedBarSegment[];
  /** Show the legend (label + value per segment). Default true. */
  legend?: boolean;
}

export function StackedBar({ segments, legend = true }: StackedBarProps) {
  const widths = stackedWidths(segments.map((s) => s.value));
  return (
    <View style={{ gap: spacing[8] }}>
      <View
        accessible
        accessibilityLabel={segments.map((s) => `${s.label} ${formatINR(s.value)}`).join(', ')}
        style={{
          flexDirection: 'row',
          gap: spacing[2],
          height: spacing[12],
          borderRadius: radius.full,
          overflow: 'hidden',
          backgroundColor: colors.surface.default,
        }}
      >
        {segments.map((s, i) =>
          widths[i] > 0 ? (
            <View key={s.label} style={{ flex: widths[i], backgroundColor: colors.data[s.series] }} />
          ) : null
        )}
      </View>
      {legend ? (
        <View style={{ gap: spacing[4] }}>
          {segments.map((s) => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[6] }}>
              <View
                style={{
                  width: spacing[8],
                  height: spacing[8],
                  borderRadius: radius.full,
                  backgroundColor: colors.data[s.series],
                }}
              />
              <Text variant="body12Regular" color={colors.text.secondary} style={{ flex: 1 }}>
                {s.label}
              </Text>
              <Text variant="body12SemiBold" color={colors.text.primary}>
                {formatINR(s.value)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
