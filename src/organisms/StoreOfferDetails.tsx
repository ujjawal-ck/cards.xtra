/**
 * StoreOfferDetails — organism (Figma 3795:78469, "Store/Offer Details")
 *
 * The offer summary block on a store page. Two INDEPENDENT booleans:
 *
 *   howToGetThisOffer (default true) — the state toggle. On appends the
 *     "How to get the offer" card (node 3795:76797, 360×248). Off omits
 *     it (node 3795:78470, 360×168).
 *   copyCode (default true) — shows/hides the code chip + Copy Code row.
 *
 * REUSE:
 *   - Icon atom (`copy-outline`) for the 12px copy glyph — the repo's
 *     canonical copy icon.
 *   - HowToGetOfferCard (./HowToGetOfferCard) for the bottom card, and
 *     its exported ForwardArrowGlyph (12px) for the link rows. The card
 *     is shared with StoreBenefitDetails — see that file for its token
 *     map and the untokenized-shadow note.
 *
 * Token map (per property):
 *   root                  → column, gap spacing[16], px spacing[16],
 *                           width sizing.containerMobile (360)
 *   title                 → typography.body16SemiBold, colors.text.primary
 *   offer block gap       → spacing[20]
 *   offer line            → typography.body14Regular, colors.text.primary
 *   code+copy row gap     → spacing[12]
 *   code chip             → dashed borderWidth.thin / border.focussed,
 *                           radius.xs, px spacing[16], py spacing[8]
 *   code text             → typography.body14Medium, colors.text.primary
 *   Copy Code row gap     → spacing[2]; label body12Medium / text.link;
 *                           copy icon iconSize[12] tinted text.link
 *   See Details row gap   → spacing[2]; label body12Medium / text.link;
 *                           arrow iconSize[12] tinted text.link
 *   how-to card           → HowToGetOfferCard (shared)
 */
import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Text, Icon } from '../atoms';
import { colors, spacing, radius, borderWidth, iconSize, sizing } from '../tokens';
import { HowToGetOfferCard, ForwardArrowGlyph } from './HowToGetOfferCard';

// Neutral defaults: callers pass the store's real copy. (Were the Figma
// sample strings, including the placeholder code MCCK300.)
const DEFAULTS = {
  title: 'Offers',
  offerText: '',
  code: '',
} as const;

export interface StoreOfferDetailsProps {
  /** On (true) appends the "How to get the offer" card. */
  howToGetThisOffer?: boolean;
  /** Shows the code chip + Copy Code row. */
  copyCode?: boolean;
  /** Heading. Default "Top <Brand> Offers". */
  title?: string;
  /** Offer description line (wraps). Default Figma sample. */
  offerText?: string;
  /** Promo code shown in the dashed chip (only with copyCode). */
  code?: string;
  /** Fired when "Copy Code" is tapped. */
  onCopyCode?: () => void;
  /** Label for the see-details link row. Default "See Offer Details"
   *  (e.g. pass "See +5 Offers" on a brand page). */
  seeDetailsLabel?: string;
  /** Fired when the see-details link is tapped. */
  onSeeDetails?: () => void;
  /** Fired when the "How to get this offer?" card / button is tapped. */
  onHowToGet?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StoreOfferDetails({
  howToGetThisOffer = true,
  copyCode = true,
  title = DEFAULTS.title,
  offerText = DEFAULTS.offerText,
  code = DEFAULTS.code,
  onCopyCode,
  seeDetailsLabel = 'See Offer Details',
  onSeeDetails,
  onHowToGet,
  style,
}: StoreOfferDetailsProps) {
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

      {/* Offer block — offer line + (optional) code/copy row */}
      <View style={{ width: '100%', gap: spacing[20], alignItems: 'flex-start' }}>
        <Text variant="body14Regular" color={colors.text.primary} style={{ width: '100%' }}>
          {offerText}
        </Text>

        {copyCode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[12] }}>
            {/* Dashed code chip */}
            <View
              style={{
                borderWidth: borderWidth.thin,
                borderStyle: 'dashed',
                borderColor: colors.border.focussed,
                borderRadius: radius.xs,
                paddingHorizontal: spacing[16],
                paddingVertical: spacing[8],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="body14Medium" color={colors.text.primary}>
                {code}
              </Text>
            </View>

            {/* Copy Code button */}
            <Pressable
              onPress={onCopyCode}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
            >
              <Text variant="body12Medium" color={colors.text.link}>
                Copy Code
              </Text>
              <Icon name="copy-outline" size={iconSize[12]} color={colors.text.link} />
            </Pressable>
          </View>
        )}
      </View>

      {/* See Offer Details link row */}
      <Pressable
        onPress={onSeeDetails}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], width: '100%' }}
      >
        <Text variant="body12Medium" color={colors.text.link}>
          {seeDetailsLabel}
        </Text>
        <ForwardArrowGlyph size={iconSize[12]} color={colors.text.link} />
      </Pressable>

      {/* How to get the offer card — On state only (shared sub-component) */}
      {howToGetThisOffer && <HowToGetOfferCard onPress={onHowToGet} />}
    </View>
  );
}
