/**
 * StoreBenefitDetails — organism (Figma 3821:93543, "Store/Benefit Details")
 *
 * A store page's "Cashback benefits" block: a numbered benefits list and
 * a "See Offer Details" link, optionally followed by the shared
 * "How to get the offer" card. One boolean:
 *
 *   howToGetThisOffer (default true) — On appends the card (node
 *     3821:93544, 360×246). Off omits it (node 3821:93558, 360×166).
 *
 * REUSE:
 *   - ListRow molecule (`number-bullet`) for each benefit row — its
 *     badge already matches the node (20px circle, #262626 bg, number in
 *     Caption/10/Semi Bold #fff, centered; benefit text body14Regular
 *     #262626, flex-grows).
 *   - HowToGetOfferCard (./HowToGetOfferCard) — the SAME card used by
 *     StoreOfferDetails, extracted to a shared sub-component (not
 *     duplicated). Its ForwardArrowGlyph export draws the link-row arrow.
 *
 * Token map (per property):
 *   root                 → column, gap spacing[16], px spacing[16],
 *                          width sizing.containerMobile (360)
 *   title                → typography.body16SemiBold, colors.text.primary
 *   list                 → width 100% (= 328), column, gap spacing[8]
 *   benefit row          → ListRow number-bullet (see REUSE)
 *   row separators       → SEPARATOR_H (borderWidth.thin, 1px) — empty,
 *                          per the node's Separator wrappers (no visible
 *                          line in the design)
 *   See Details row gap  → spacing[2]; label body12Medium / text.link;
 *                          arrow iconSize[12] tinted text.link
 *   how-to card          → HowToGetOfferCard (shared; see that file for
 *                          its token map + untokenized-shadow note)
 */
import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Text } from '../atoms';
import { ListRow } from '../molecules';
import { colors, spacing, iconSize, sizing, borderWidth } from '../tokens';
import { HowToGetOfferCard, ForwardArrowGlyph } from './HowToGetOfferCard';

// Height of the node's empty "Separator wrapper" (1px, no visible line).
const SEPARATOR_H = borderWidth.thin;

const DEFAULTS = {
  title: '<Brand> Cashback benefits',
  benefits: [
    '5% cashback on online spends',
    '1% cashback on offline spends',
    'Save up to ₹60,000 annually',
  ],
} as const;

export interface StoreBenefitDetailsProps {
  /** On (true) appends the "How to get the offer" card. */
  howToGetThisOffer?: boolean;
  /** Heading. Default "<Brand> Cashback benefits". */
  title?: string;
  /** Numbered benefit lines. Defaults to the Figma sample list. */
  benefits?: string[];
  /** Fired when "See Offer Details" is tapped. */
  onSeeDetails?: () => void;
  /** Fired when the "How to get this offer?" card is tapped. */
  onHowToGet?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StoreBenefitDetails({
  howToGetThisOffer = true,
  title = DEFAULTS.title,
  benefits = DEFAULTS.benefits as unknown as string[],
  onSeeDetails,
  onHowToGet,
  style,
}: StoreBenefitDetailsProps) {
  return (
    <View
      style={[
        {
          width: sizing.containerMobile, // 360
          alignItems: 'flex-start',
          gap: spacing[16],
          paddingHorizontal: spacing[16],
        },
        style,
      ]}
    >
      {/* Title */}
      <Text variant="body16SemiBold" color={colors.text.primary} style={{ width: '100%' }}>
        {title}
      </Text>

      {/* Benefits list — number-bullet rows + empty 1px separators */}
      <View style={{ width: '100%', gap: spacing[8], alignItems: 'flex-start' }}>
        {benefits.map((benefit, i) => (
          <React.Fragment key={i}>
            <ListRow type="number-bullet" number={i + 1} description={benefit} />
            {i < benefits.length - 1 && (
              <View style={{ width: '100%', height: SEPARATOR_H }} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* See Offer Details link row */}
      <Pressable
        onPress={onSeeDetails}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], width: '100%' }}
      >
        <Text variant="body12Medium" color={colors.text.link}>
          See Offer Details
        </Text>
        <ForwardArrowGlyph size={iconSize[12]} color={colors.text.link} />
      </Pressable>

      {/* How to get the offer card — On state only (shared sub-component) */}
      {howToGetThisOffer && <HowToGetOfferCard onPress={onHowToGet} />}
    </View>
  );
}
