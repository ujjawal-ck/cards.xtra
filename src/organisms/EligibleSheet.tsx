/**
 * EligibleSheet — organism (Figma 2917:67213)
 *
 * 360-wide bottom-sheet composed entirely from existing components:
 *   - <EligibilityMasthead variant='eligible' />   (organism)
 *   - <FooterButtons buttons='single' ... />        (organism)
 *
 * Body content between the masthead and footer:
 *   - Reward text block — vertical, gap spacing[4], alignItems center:
 *       headline   heading24Bold, text.primary, align center
 *       subtext    body14Regular, text.primary, align center
 *
 * Hex → token: every value sourced from src/tokens.
 *   #ffffff → colors.surface.default
 *   #262626 → colors.text.primary
 */
import React from 'react';
import {
  View,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

import { Text } from '../atoms';
import { EligibilityMasthead } from './EligibilityMasthead';
import { FooterButtons } from './FooterButtons';
import {
  colors,
  primitives,
  spacing,
  radius,
  sizing,
} from '../tokens';

export interface EligibleSheetProps {
  /** Headline beneath the masthead — default "Flat ₹1400 Rewards". */
  rewardHeadline?: string;
  /** Subtext beneath the headline — default "On Card Activation". */
  rewardSubtext?: string;
  /** Footer CTA label — default "Apply Now". */
  ctaLabel?: string;
  onApply?: () => void;

  // 'eligible' masthead pass-through props
  message?: string;
  pincode?: string;
  amount?: string;
  occupation?: string;
  cardImage?: ImageSourcePropType;
  /** 2+ card images → the masthead renders a fanned card STACK (the Home
   *  "eligible for N cards" celebration). */
  cardImages?: ImageSourcePropType[];
  onEditPress?: () => void;

  /** Hide the per-card reward block (headline + subtext). Used by the
   *  multi-card Home flow where there's no single card's reward to show. */
  hideReward?: boolean;

  /** When true, a confetti burst plays in the background as the
   *  sheet opens. Default true — this is the "celebration" sheet. */
  showConfetti?: boolean;

  style?: StyleProp<ViewStyle>;
}

// Confetti — uses `react-native-confetti-cannon` (pure JS, Expo-Go
// compatible, the de-facto RN confetti library). Two cannons fire
// from the bottom corners up-and-out so the burst peaks in the
// upper area of the sheet and rains back down over the masthead
// + reward block + Apply Now button.
//
// On-brand colour palette pulled from existing primitives so the
// flakes match the saffron / cobalt / fern / amber / rose / violet
// brand tokens.
const CONFETTI_COUNT = 120;
const CONFETTI_COLORS = [
  primitives.saffron[500],
  primitives.saffron[300],
  primitives.cobalt[500],
  primitives.cobalt[300],
  primitives.fern[500],
  primitives.amber[400],
  primitives.rose[500],
  primitives.violet[500],
  primitives.sky[500],
];

function ConfettiBlast() {
  const screenW = Dimensions.get('window').width;
  const screenH = Dimensions.get('window').height;
  // Two cannons firing from BELOW the screen (origin y > screenH so
  // particles enter the visible area travelling upward), positioned
  // at the bottom-third left + right of the screen so the bursts
  // overlap in the middle. High explosionSpeed launches the flakes
  // high enough to reach the top edge before gravity pulls them
  // back down onto the sheet. Slow fallSpeed keeps them airborne
  // long enough to feel like a real celebratory burst.
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <ConfettiCannon
        count={CONFETTI_COUNT}
        origin={{ x: screenW * 0.25, y: screenH + 20 }}
        explosionSpeed={650}
        fallSpeed={3500}
        fadeOut
        colors={CONFETTI_COLORS}
        autoStart
      />
      <ConfettiCannon
        count={CONFETTI_COUNT}
        origin={{ x: screenW * 0.75, y: screenH + 20 }}
        explosionSpeed={650}
        fallSpeed={3500}
        fadeOut
        colors={CONFETTI_COLORS}
        autoStart
      />
    </View>
  );
}

export function EligibleSheet({
  rewardHeadline = 'Flat ₹1400 Rewards',
  rewardSubtext = 'On Card Activation',
  ctaLabel = 'Apply Now',
  onApply,
  message,
  pincode,
  amount,
  occupation,
  cardImage,
  cardImages,
  onEditPress,
  hideReward = false,
  showConfetti = true,
  style,
}: EligibleSheetProps) {
  return (
    <View
      style={[
        {
          // Fluid width so the sheet fills the parent (e.g. a full-width
          // bottom-sheet Modal). Was a fixed 360 which left whitespace
          // on iPhones wider than 360.
          width: '100%',
          backgroundColor: colors.surface.default,
          alignItems: 'center',
          // Match the bottom-sheet's 24-px top curve and clip the
          // gradient banner to it — without overflow:hidden, the
          // sheet's white bg peeks out behind the banner's rounded
          // corners on iOS.
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Confetti — background layer behind the masthead + body.
          pointerEvents:'none' inside so taps pass through. */}
      {showConfetti ? <ConfettiBlast /> : null}

      {/* 1. Masthead — REUSED */}
      <EligibilityMasthead
        variant="eligible"
        message={message}
        pincode={pincode}
        amount={amount}
        occupation={occupation}
        cardImage={cardImage}
        cardImages={cardImages}
        onEditPress={onEditPress}
      />

      {/* 2. Reward text block — hidden in the multi-card Home flow where
          there's no single card's reward to celebrate. */}
      {hideReward ? null : (
        <View
          style={{
            gap: spacing[4],
            alignItems: 'center',
            paddingHorizontal: spacing[16],
            paddingVertical: spacing[16],
          }}
        >
          <Text
            variant="heading24Bold"
            color={colors.text.primary}
            align="center"
          >
            {rewardHeadline}
          </Text>
          <Text
            variant="body14Regular"
            color={colors.text.primary}
            align="center"
          >
            {rewardSubtext}
          </Text>
        </View>
      )}

      {/* Spacer — keeps the CTA off the card stack when the reward block
          is hidden (the reward block otherwise provides this gap). */}
      {hideReward ? <View style={{ height: spacing[24] }} /> : null}

      {/* 3. Footer — REUSED */}
      <FooterButtons
        buttons="single"
        size={52}
        shadow="off"
        strip="none"
        color="main"
        primaryLabel={ctaLabel}
        onPrimary={onApply}
      />
    </View>
  );
}
