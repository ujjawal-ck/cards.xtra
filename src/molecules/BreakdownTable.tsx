/**
 * DS-ADD(ds-figma-1, 2026-11-17): compare two cards line by line (Breakdown | Your pick | Our pick) with a net total.
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1179:1156004 (breakdown-table, mobile, rows=3). Metrics from Figma values (2026-11-17):
 * root radius 16, border 1.2 (our thin), padding bottom 16, gap 16; header 12 / 16; rows padding 0 / 16, gap 12; footer 0 / 16, gap 8.
 * Rollback: delete this file, src/lib/breakdownTable.ts (+ test), and its DS-ADD export lines in src/molecules/index.ts.
 *
 * BreakdownTable — molecule. New part. Overlaps CompareCard / BarBreakdown (see docs/ds-additions.md).
 * Type (nearest Outfit): header caption10Medium (Figma Outfit 500 10); row label and value body12Medium (Figma sf-pro 12 and 11:
 * we have no 11 px, so values use 12); total label body14Medium; total values body12SemiBold (Figma Outfit 600 12).
 * Colours by role: Figma surface/default (#F2F7FD) header fill = colors.background.lavender; elevated fill = colors.surface.default;
 * better value = feedback.success.text. "Better" word under the winning total is OUR addition (not in Figma): colour must not be the only cue.
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '../atoms';
import { colors, spacing, radius, borderWidth } from '../tokens';
import { formatINR } from '../lib/money';
import { betterSide, breakdownTotals, type BreakdownRowData } from '../lib/breakdownTable';

export interface BreakdownTableProps {
  rows: BreakdownRowData[];
  /** Header text. Defaults: "Breakdown", "Your pick", "Our pick". */
  headers?: { label?: string; a?: string; b?: string };
  totalLabel?: string;
  /** Override the computed totals. */
  total?: { a: number; b: number };
  /** Default false: a higher total is better. */
  lowerIsBetter?: boolean;
}

const VALUE_W = 80;

export function BreakdownTable({
  rows,
  headers,
  totalLabel = 'Your net savings',
  total,
  lowerIsBetter = false,
}: BreakdownTableProps) {
  const h = { label: 'Breakdown', a: 'Your pick', b: 'Our pick', ...headers };
  const t = total ?? breakdownTotals(rows);
  const better = betterSide(t.a, t.b, lowerIsBetter);
  const valueCell = { width: VALUE_W, textAlign: 'right' as const };

  const totalCell = (value: number, side: 'a' | 'b') => {
    const wins = better === side;
    return (
      <View style={{ width: VALUE_W, alignItems: 'flex-end' }}>
        <Text
          variant="body12SemiBold"
          color={wins ? colors.feedback.success.text : colors.text.primary}
          align="right"
        >
          {formatINR(value)}
        </Text>
        {wins ? (
          <Text variant="caption10SemiBold" color={colors.feedback.success.text} align="right">
            Better
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View
      accessible
      accessibilityLabel={
        `${h.label}. ` +
        rows.map((r) => `${r.label}: ${h.a} ${formatINR(r.a)}, ${h.b} ${formatINR(r.b)}.`).join(' ') +
        ` ${totalLabel}: ${h.a} ${formatINR(t.a)}, ${h.b} ${formatINR(t.b)}.` +
        (better === 'tie' ? '' : ` ${better === 'a' ? h.a : h.b} is better.`)
      }
      style={{
        borderRadius: radius.xl,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle2,
        backgroundColor: colors.surface.default,
        paddingBottom: spacing[16],
        gap: spacing[16],
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[4],
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[12],
          backgroundColor: colors.background.lavender,
        }}
      >
        <Text variant="caption10Medium" color={colors.text.primary} style={{ flex: 1 }}>
          {h.label}
        </Text>
        <Text variant="caption10Medium" color={colors.text.primary} style={valueCell}>
          {h.a}
        </Text>
        <Text variant="caption10Medium" color={colors.text.primary} style={valueCell}>
          {h.b}
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing[16], gap: spacing[12] }}>
        {rows.map((r, i) => (
          <View key={`${r.label}-${i}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="body12Medium" color={colors.text.secondary} style={{ flex: 1 }}>
              {r.label}
            </Text>
            <Text variant="body12Medium" color={colors.text.secondary} style={valueCell}>
              {formatINR(r.a)}
            </Text>
            <Text variant="body12Medium" color={colors.text.secondary} style={valueCell}>
              {formatINR(r.b)}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
        <View style={{ height: borderWidth.thin, backgroundColor: colors.border.subtle3 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="body14Medium" color={colors.text.primary} style={{ flex: 1 }}>
            {totalLabel}
          </Text>
          {totalCell(t.a, 'a')}
          {totalCell(t.b, 'b')}
        </View>
      </View>
    </View>
  );
}
