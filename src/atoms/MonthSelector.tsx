/**
 * MonthSelector — atom (Figma set 3554:26078, Default + Selected)
 *
 * A wheel-picker-style month item: a top hairline rule, a centred month
 * label, and a bottom hairline rule. Stacked vertically, the rules form
 * the selection band around the highlighted month.
 *
 * Divider/Horizontal isn't reused: it renders full-bleed and exposes no
 * width control, but these rules are a fixed 64 wide centred in a 66.5
 * column — so a 1px token-coloured rule View is used instead.
 *
 * Token map (per property):
 *   root width       → 66.5 (flagged untokenized literal — no token)
 *   root gap         → spacing[8]
 *   rule width       → spacing[64]
 *   rule height      → borderWidth.thin
 *   rule Default     → colors.border.default
 *   rule Selected    → colors.border.focussed
 *   label Default    → typography body17Regular · colors.text.secondary
 *   label Selected   → typography body17Medium  · colors.text.primary
 *
 * Imports: Text (atom).
 */
import React from 'react';
import { Pressable, View, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, spacing, borderWidth } from '../tokens';

// Figma fixed column width; no token on the spacing scale (flagged).
const COL_WIDTH = 66.5;

export type MonthSelectorState = 'Default' | 'Selected';

export interface MonthSelectorProps {
  /** Month label, e.g. "April". */
  month: string;
  property1?: MonthSelectorState;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function Rule({ color }: { color: string }) {
  return (
    <View style={{ width: spacing[64], height: borderWidth.thin, backgroundColor: color }} />
  );
}

export function MonthSelector({
  month,
  property1 = 'Default',
  onPress,
  style,
}: MonthSelectorProps) {
  const selected = property1 === 'Selected';
  const ruleColor = selected ? colors.border.focussed : colors.border.default;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={month}
      style={[{ width: COL_WIDTH, gap: spacing[8], alignItems: 'center' }, style]}
    >
      <Rule color={ruleColor} />
      <Text
        variant={selected ? 'body17Medium' : 'body17Regular'}
        align="center"
        color={selected ? colors.text.primary : colors.text.secondary}
        style={{ width: '100%' }}
      >
        {month}
      </Text>
      <Rule color={ruleColor} />
    </Pressable>
  );
}
