/**
 * DS-ADD(ds-figma-1, 2026-11-17): small upper-case tag for a card's type (Lifetime free / Invite only / Discontinued).
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1049:2331850 (Lifetime Free In Table), 1049:2331851 (General), 1049:2331852 (On Card),
 *   1049:2331853 / 1049:2331854 (Invite Only), 1049:2331856 (Discontinued In Table). Metrics from Figma values (2026-11-17).
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts.
 *
 * CardTypeTag — atom. New part: Tag has no upper-case / letter-spaced style and no placement shapes.
 * Metrics per placement (CARD_TYPE_TAG_METRICS): table = square corners, 1 px border, padding 4 / 8, min height 20;
 * general = radius 4, hairline, padding 6 / 8, min height 24; onCard = left corners 4, right corners 0, same padding.
 * Type: Figma is Outfit ExtraBold 9 (table) / 10 (general, on card) with wide letter spacing. We have no ExtraBold at
 * those sizes: table and general use caption10SemiBold, on card the same (no 9 px variant; see manifest).
 * Colours come from colors.tones (success / warning / gray); Figma's gradient fills and text gradients are flat here.
 * 'onCard' adds the word "card". Not built: the folded corner under the On Card chip (Figma root is 34 high, chip 27).
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors } from '../tokens';
import {
  CARD_TYPE_TAG,
  CARD_TYPE_TAG_METRICS,
  cardTypeTagLabel,
  type CardTypeTagKind,
  type CardTypeTagPlacement,
} from '../lib/tagVariants';

export interface CardTypeTagProps {
  kind: CardTypeTagKind;
  placement?: CardTypeTagPlacement;
  style?: StyleProp<ViewStyle>;
}

export function CardTypeTag({ kind, placement = 'general', style }: CardTypeTagProps) {
  const tone = colors.tones[CARD_TYPE_TAG[kind].tone];
  const m = CARD_TYPE_TAG_METRICS[placement];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          justifyContent: 'center',
          minHeight: m.minHeight,
          paddingHorizontal: m.padH,
          paddingVertical: m.padV,
          borderTopLeftRadius: m.tl,
          borderTopRightRadius: m.tr,
          borderBottomRightRadius: m.br,
          borderBottomLeftRadius: m.bl,
          borderWidth: m.border,
          borderColor: tone.border,
          backgroundColor: tone.bgSubtle,
        },
        style,
      ]}
    >
      <Text variant="caption10SemiBold" color={tone.text}>
        {cardTypeTagLabel(kind, placement)}
      </Text>
    </View>
  );
}
