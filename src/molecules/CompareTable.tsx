/**
 * DS-ADD(ds-figma-1, 2026-11-17): compare table, mobile: a pinned first column of hero cells and value columns that scroll sideways.
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1192:209166 (compare-table, mobile), cells 1192:185948 (value), 1192:185947 (value selected),
 * 1192:185946 (hero), 1192:185945 (header), 1192:185944 (header selected). Metrics from Figma values (2026-11-17): value cell 88 x 88,
 * header 88 x 52 (padding 9 / 8, gap 4), hero 146 x 172, cell border right + bottom 1 px, outer radius 16 + hairline + sm shadow.
 * Rollback: delete this file, src/lib/compareTable.ts (+ test), and its DS-ADD export lines in src/molecules/index.ts.
 *
 * CompareTable — molecule. New part. Layout is INFERRED from the cells (the whole-table inner layout was not read): rows are the compared items,
 * the pinned column holds one hero cell per row (a slot: tag, name, image, button), the scrolling columns are attributes with a header
 * cell and one value per row. Row height = hero height, so the value cells are taller than Figma's 88 square: check against the file.
 * Selected column: header text in link colour and a lavender fill (Figma selected cells #F2F7FD against #FCFEFF). Tap a header to select.
 * Type (nearest Outfit): header caption10Medium, value caption10Medium in text.secondary (Figma Outfit 500 10 = same).
 * Roles: Figma surface/elevated = colors.surface.default; surface/default and background/elevated (both #F2F7FD) = colors.background.lavender;
 * border/subtle = colors.border.subtle2. Not run on a device: check scroll feel and the pinned column on a 360 dp screen.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, Icon } from '../atoms';
import { colors, spacing, radius, borderWidth, iconSize, elevation } from '../tokens';
import { COMPARE_TABLE, isSelectedColumn, nextSelected } from '../lib/compareTable';

export interface CompareTableColumn {
  id: string;
  /** Header text, e.g. an attribute name. */
  header: string;
}

export interface CompareTableRow {
  id: string;
  /** Pinned hero cell content (146 wide, 172 high). */
  hero: React.ReactNode;
  /** One value per column, in column order. Missing values show a dash. */
  values: string[];
}

export interface CompareTableProps {
  columns: CompareTableColumn[];
  rows: CompareTableRow[];
  /** Text in the empty top-left cell. */
  cornerLabel?: string;
  selectedColumnId?: string | null;
  onSelectColumn?: (id: string | null) => void;
}

const cellBorder = {
  borderRightWidth: borderWidth.thin,
  borderBottomWidth: borderWidth.thin,
  borderColor: colors.border.subtle2,
};

export function CompareTable({ columns, rows, cornerLabel, selectedColumnId, onSelectColumn }: CompareTableProps) {
  const ids = columns.map((c) => c.id);
  const { valueW, valueH, headerH, heroW, heroH } = COMPARE_TABLE;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          borderRadius: radius.xl,
          borderWidth: borderWidth.hairline,
          borderColor: colors.border.subtle2,
          backgroundColor: colors.background.lavender,
          overflow: 'hidden',
        },
        elevation.light.sm,
      ]}
    >
      {/* Pinned column */}
      <View style={{ width: heroW }}>
        <View
          style={[
            { height: headerH, justifyContent: 'center', paddingHorizontal: spacing[8], backgroundColor: colors.background.lavender },
            cellBorder,
          ]}
        >
          {cornerLabel ? (
            <Text variant="caption10Medium" color={colors.text.secondary}>
              {cornerLabel}
            </Text>
          ) : null}
        </View>
        {rows.map((row) => (
          <View key={row.id} style={[{ width: heroW, height: heroH, backgroundColor: colors.surface.default }, cellBorder]}>
            {row.hero}
          </View>
        ))}
      </View>

      {/* Scrolling value columns */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <View>
          <View style={{ flexDirection: 'row' }}>
            {columns.map((col) => {
              const selected = isSelectedColumn(col.id, selectedColumnId, ids);
              return (
                <Pressable
                  key={col.id}
                  disabled={!onSelectColumn}
                  onPress={() => onSelectColumn?.(nextSelected(selectedColumnId, col.id))}
                  accessibilityRole="button"
                  accessibilityLabel={col.header}
                  accessibilityState={{ selected }}
                  style={[
                    {
                      width: valueW,
                      height: headerH,
                      paddingHorizontal: spacing[8],
                      paddingVertical: spacing[10] - borderWidth.thin, // Figma 9
                      gap: spacing[4],
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.background.lavender,
                    },
                    cellBorder,
                  ]}
                >
                  <Text variant="caption10Medium" color={selected ? colors.text.link : colors.text.secondary} align="center" numberOfLines={2}>
                    {col.header}
                  </Text>
                  <Icon name="chevron-down" size={iconSize[12]} color={selected ? colors.text.link : colors.text.secondary} />
                </Pressable>
              );
            })}
          </View>
          {rows.map((row) => (
            <View key={row.id} style={{ flexDirection: 'row' }}>
              {columns.map((col, ci) => {
                const selected = isSelectedColumn(col.id, selectedColumnId, ids);
                return (
                  <View
                    key={col.id}
                    style={[
                      {
                        width: valueW,
                        height: Math.max(valueH, heroH),
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: spacing[8],
                        backgroundColor: selected ? colors.background.lavender : colors.surface.default,
                      },
                      cellBorder,
                    ]}
                  >
                    <Text variant="caption10Medium" color={colors.text.secondary} align="center">
                      {row.values[ci] ?? '–'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
