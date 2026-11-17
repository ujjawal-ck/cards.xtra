/**
 * DS-ADD(ds-expansion-1, 2026-11-17): ranked horizontal bars, one per item (label, rupee value, bar).
 * Rollback: delete this file, src/lib/chartMath.ts (+ test, shared with StackedBar / StepProgress),
 * and its DS-ADD export lines in src/molecules/index.ts.
 *
 * BarBreakdown — molecule
 *
 * Built with View widths, no chart library. Every bar has its label and value
 * written out. Track colors.data.track, bar colors.data.series1. Widths come from
 * barWidths() (scale = `max`, else the largest value).
 */
import React from 'react';
import { View } from 'react-native';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import { colors, spacing, radius, iconSize } from '../tokens';
import { barWidths } from '../lib/chartMath';
import { formatINR } from '../lib/money';

export interface BarBreakdownItem {
  label: string;
  value: number;
  icon?: IconName;
  note?: string;
}

export interface BarBreakdownProps {
  items: BarBreakdownItem[];
  /** Value that fills a whole bar. Default: the largest value. */
  max?: number;
  sort?: 'desc' | 'none';
  showTotal?: boolean;
}

export function BarBreakdown({ items, max, sort = 'desc', showTotal = false }: BarBreakdownProps) {
  const rows = sort === 'desc' ? [...items].sort((a, b) => b.value - a.value) : items;
  const widths = barWidths(rows.map((r) => r.value), max);
  const total = rows.reduce((sum, r) => sum + (r.value > 0 ? r.value : 0), 0);
  return (
    <View style={{ gap: spacing[12] }}>
      {rows.map((r, i) => (
        <View
          key={r.label}
          accessible
          accessibilityLabel={`${r.label}: ${formatINR(r.value)}${r.note ? `, ${r.note}` : ''}`}
          style={{ gap: spacing[4] }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[6] }}>
            {r.icon ? <Icon name={r.icon} size={iconSize[16]} color={colors.icon.features} /> : null}
            <Text variant="body12Regular" color={colors.text.secondary} style={{ flex: 1 }}>
              {r.label}
            </Text>
            <Text variant="body14SemiBold" color={colors.text.primary}>
              {formatINR(r.value)}
            </Text>
          </View>
          <View
            style={{
              height: spacing[8],
              borderRadius: radius.full,
              overflow: 'hidden',
              backgroundColor: colors.data.track,
            }}
          >
            <View
              style={{
                width: `${widths[i]}%`,
                height: '100%',
                borderRadius: radius.full,
                backgroundColor: colors.data.series1,
              }}
            />
          </View>
          {r.note ? (
            <Text variant="body12Regular" color={colors.text.secondary}>
              {r.note}
            </Text>
          ) : null}
        </View>
      ))}
      {showTotal ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="body14SemiBold" color={colors.text.primary}>
            Total
          </Text>
          <Text variant="body14SemiBold" color={colors.text.primary}>
            {formatINR(total)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
