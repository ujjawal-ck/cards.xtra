/**
 * DiscBulletList — molecule
 *
 * A plain disc-bulleted text list (the Figma "_ListBase" disc pattern):
 * each item is a `•` glyph in a fixed hanging-indent column + the item
 * text, with a consistent gap between items and wrapped lines aligned
 * under the text (not under the bullet).
 *
 * Used by Store/Terms & Conditions (List View) and the Amazon
 * terms-conditions bottom sheet. RN has no native `list-disc`, so the
 * disc is rendered as `•` in the same body14Regular line as the text.
 *
 * Tokens:
 *   item text  → typography.body14Regular, colors.text.primary
 *   item gap   → spacing[8]
 *   indent     → BULLET_INDENT (21 — Figma ms-[21px], off the spacing scale)
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from '../atoms';
import { colors, spacing } from '../tokens';

// Figma ms-[21px] hanging indent on each <li> — component spec, not on
// the spacing scale. The bullet sits in this column; wrapped lines align
// to its right edge.
const BULLET_INDENT = 21;

export interface DiscBulletListProps {
  items: string[];
  style?: StyleProp<ViewStyle>;
}

export function DiscBulletList({ items, style }: DiscBulletListProps) {
  return (
    <View style={[{ width: '100%', gap: spacing[8], alignItems: 'flex-start' }, style]}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ width: BULLET_INDENT }}>
            <Text variant="body14Regular" color={colors.text.primary}>
              {'•'}
            </Text>
          </View>
          <Text variant="body14Regular" color={colors.text.primary} style={{ flex: 1 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}
