/**
 * MaybeSheet — organism (Figma 2917:67223)
 *
 * 360-wide bottom-sheet composed entirely from existing components:
 *   - <EligibilityMasthead variant='maybe' />  (organism — has its own
 *                                               Continue-to-Apply CTA)
 *   - <Divider style='or' />                    (atom)
 *   - <CardCarousel ... />                      (Carousels organism,
 *                                               card-carousel variant)
 *
 * Body content between the masthead and carousel:
 *   - Footer divider block — vertical, gap spacing[8], alignItems center:
 *       <Divider style="or" />
 *       Explore text — body14Regular text.primary, lead phrase
 *       ("Explore N Cards") rendered SemiBold inline via nested Text.
 *
 * Hex → token: every value sourced from src/tokens.
 *   #ffffff → colors.surface.default
 *   #262626 → colors.text.primary
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text, Divider } from '../atoms';
import { EligibilityMasthead } from './EligibilityMasthead';
import { CardCarousel } from './Carousels';
import type { CardCarouselItem } from './Carousels';
import { colors, spacing, radius, sizing } from '../tokens';

export interface MaybeSheetProps {
  /** Cards passed to the embedded CardCarousel (REUSED organism). */
  cards: CardCarouselItem[];
  /** Lead "Explore N Cards" phrase rendered SemiBold; default
   *  "Explore 26 Cards". */
  exploreLead?: string;
  /** Trailing copy in the same line, rendered Regular; default
   *  "that you are eligible for!". */
  exploreTail?: string;

  // 'maybe' masthead pass-through props
  message?: string;
  infoText?: string;
  pincode?: string;
  amount?: string;
  occupation?: string;
  ctaLabel?: string;
  onContinue?: () => void;
  onEditPress?: () => void;

  /** Tap on a carousel card (by card id) — lets the user jump to an
   *  alternative card instead of hitting a dead end. */
  onCardPress?: (id: string) => void;

  style?: StyleProp<ViewStyle>;
}

export function MaybeSheet({
  cards,
  exploreLead = 'Explore 26 Cards',
  exploreTail = ' that you are eligible for!',
  message,
  infoText,
  pincode,
  amount,
  occupation,
  ctaLabel,
  onContinue,
  onEditPress,
  onCardPress,
  style,
}: MaybeSheetProps) {
  return (
    <View
      style={[
        {
          // Fluid width so the sheet fills the parent (e.g. a full-width
          // bottom-sheet Modal). Was a fixed 360 which left whitespace
          // on iPhones wider than 360.
          width: '100%',
          backgroundColor: colors.surface.default,
          // 24-px breathing room beneath the card carousel so it
          // doesn't merge with the sheet's bottom edge / safe-area
          // (the bottom-sheet modal adds its own safe-area on top).
          paddingBottom: spacing[24],
          // Match the bottom-sheet's 24-px top curve and clip the
          // gold masthead to it.
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* 1. Masthead — REUSED (carries its own ghost Continue-to-Apply CTA) */}
      <EligibilityMasthead
        variant="maybe"
        message={message}
        infoText={infoText}
        pincode={pincode}
        amount={amount}
        occupation={occupation}
        ctaLabel={ctaLabel}
        onContinue={onContinue}
        onEditPress={onEditPress}
      />

      {/* 2. Or-divider + explore text */}
      <View
        style={{
          gap: spacing[8],
          alignItems: 'center',
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[16],
        }}
      >
        <Divider style="or" />
        <Text
          variant="body14Regular"
          color={colors.text.primary}
          align="center"
        >
          <Text variant="body14SemiBold" color={colors.text.primary}>
            {exploreLead}
          </Text>
          {exploreTail}
        </Text>
      </View>

      {/* 3. Card carousel — REUSED (Carousels organism, card-carousel
          variant). Auto-scrolls slowly L→R; user touch pauses the loop
          and a short delay later it resumes. */}
      <CardCarousel cards={cards} autoScroll onCardPress={onCardPress ? (c) => onCardPress(c.id) : undefined} />
    </View>
  );
}
