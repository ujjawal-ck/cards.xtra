/**
 * IneligibleSheet — organism (Figma 3762:85818)
 *
 * The red sibling of MaybeSheet — same composition, swapped to the
 * 'ineligible' masthead:
 *   - <EligibilityMasthead variant='ineligible' />  (organism — red radial
 *                                                    hero with bulleted
 *                                                    reasons + its own
 *                                                    Continue-to-Apply CTA)
 *   - <Divider style='or' />                         (atom)
 *   - <CardCarousel ... />                           (Carousels organism)
 *
 * Body content between the masthead and carousel mirrors MaybeSheet:
 *   - Or-divider + "Explore N Cards that you are eligible for you!" line.
 *
 * Hex → token: every value sourced from src/tokens.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text, Divider } from '../atoms';
import { EligibilityMasthead } from './EligibilityMasthead';
import { CardCarousel } from './Carousels';
import type { CardCarouselItem } from './Carousels';
import { colors, spacing, radius } from '../tokens';

export interface IneligibleSheetProps {
  /** Cards passed to the embedded CardCarousel (REUSED organism). */
  cards: CardCarouselItem[];
  /** Lead "Explore N Cards" phrase rendered SemiBold; default
   *  "Explore 26 Cards". */
  exploreLead?: string;
  /** Trailing copy in the same line, rendered Regular; default
   *  "that you are eligible for you!". */
  exploreTail?: string;

  // 'ineligible' masthead pass-through props
  message?: string;
  /** Bulleted reason lines shown in the red reason window. */
  reasons?: string[];
  pincode?: string;
  amount?: string;
  occupation?: string;
  ctaLabel?: string;
  onContinue?: () => void;
  onEditPress?: () => void;

  style?: StyleProp<ViewStyle>;
}

export function IneligibleSheet({
  cards,
  exploreLead = 'Explore 26 Cards',
  exploreTail = ' that you are eligible for you!',
  message,
  reasons,
  pincode,
  amount,
  occupation,
  ctaLabel,
  onContinue,
  onEditPress,
  style,
}: IneligibleSheetProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: colors.surface.default,
          paddingBottom: spacing[24],
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* 1. Masthead — REUSED (carries its own ghost Continue-to-Apply CTA) */}
      <EligibilityMasthead
        variant="ineligible"
        message={message}
        reasons={reasons}
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
        <Text variant="body14Regular" color={colors.text.primary} align="center">
          <Text variant="body14SemiBold" color={colors.text.primary}>
            {exploreLead}
          </Text>
          {exploreTail}
        </Text>
      </View>

      {/* 3. Card carousel — REUSED (Carousels organism, card-carousel
          variant). Auto-scrolls slowly L→R; user touch pauses the loop. */}
      <CardCarousel cards={cards} autoScroll />
    </View>
  );
}
