/**
 * TabPrimary — molecule (Figma 3232:29141)
 *
 * Horizontal row of pill tabs with optional count badges. Wraps the
 * Chip atom in its `tab` mode so all the per-tab styling (cobalt
 * palette, count-badge colours, padding T6/B6/L16/R16, body14Medium
 * label, radius.full) is defined in one place.
 *
 * Container: white surface, paddingAll spacing[16], gap spacing[8],
 * horizontal scroll (so 2–10 tabs all fit without truncation).
 *
 * Token mapping for the tab body lives in Chip.tsx; this file only
 * touches container chrome:
 *   #fff → colors.surface.default (container bg)
 */
import React from 'react';
import { ScrollView, StyleProp, ViewStyle } from 'react-native';
import { Chip } from '../atoms';
import { colors, spacing } from '../tokens';

export interface TabPrimaryItem {
  label: string;
  count?: number;
}

export interface TabPrimaryProps {
  tabs: TabPrimaryItem[];
  activeIndex: number;
  onChange?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

export function TabPrimary({
  tabs,
  activeIndex,
  onChange,
  style,
}: TabPrimaryProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ backgroundColor: colors.surface.default }, style]}
      contentContainerStyle={{
        padding: spacing[16],
        gap: spacing[8],
        alignItems: 'center',
      }}
    >
      {tabs.map((tab, i) => (
        <Chip
          key={`${tab.label}-${i}`}
          type="tab"
          label={tab.label}
          count={tab.count}
          state={i === activeIndex ? 'selected' : 'default'}
          onPress={() => onChange?.(i)}
        />
      ))}
    </ScrollView>
  );
}
