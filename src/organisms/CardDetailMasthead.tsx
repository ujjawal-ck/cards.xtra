/**
 * CardDetailMasthead — organism (Figma 3762:91705)
 *
 * The collapsing hero at the top of CardDetailSheet. One component,
 * interpolated by a single `progress` shared value (gorhom's
 * animatedIndex from the parent sheet):
 *
 *   progress 0 -> EXPANDED  (Figma "Property 1=expanded", 360x248)
 *   progress 1 -> COLLAPSED (Figma "Property 1=collapsed", 336x102)
 *
 * No nesting. The parent sheet owns animatedIndex and passes it here AND
 * keeps the rest of the body reading the same drag - so the hero and the
 * sheet move in lockstep. All motion lives inside useAnimatedStyle
 * (never read progress.value in inline JSX style).
 *
 * Falls back to the card's placeholder colour behind the art so it reads
 * fine even before/while the card image loads.
 *
 * Backdrop: `images.backgrounds.large` (bg-large.png) — the project's
 * shared large-format hero backdrop. Replaced the prior saffron-fade
 * gradient.
 *
 * Token mapping:
 *   #ffffff      -> colors.surface.default
 *   24 radius    -> radius['2xl']
 */
import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import type { CardModel } from '../molecules';
import { CardArt, CARD_ART_W, CARD_ART_H, CROSSFADE_LO, CROSSFADE_HI } from './CardArt';
import { images } from '../assets/images';
import { spacing, radius, colors } from '../tokens';

// Figma spec (3762:91705) - not in the spacing scale.
// EXPANDED_H bumped by spacing[16] (+ ~19% on the original
// "top → card art" gap of 86 px → ~102 px) so the credit-card art has
// more peach BG breathing room above it.
const EXPANDED_H = 248 + spacing[16];
const COLLAPSED_H = 102;
// CARD_ART_W / CARD_ART_H now live in ./CardArt (shared with FloatingCardRail).
const CARD_ART_SCALE_COLLAPSED = 0.42;
// Masthead height at the PARTIAL peek. The card floats half-out there (via the
// FloatingCardRail), so the in-sheet peach only needs to back the card's bottom
// half — a shorter masthead pulls the title up tight under the card instead of
// leaving a big empty peach gap. Grows to EXPANDED_H as the sheet expands.
// Tuning knob for the card→title gap.
const PARTIAL_H = 150;
// Contained-card height (Android): the card sits CONTAIN_TOP_GAP below the
// sheet's top edge and the masthead ends flush at the card's bottom, so the
// peach backs only the 20px above + the card. The section below the masthead
// then adds its own 32px gap to the card name.
const CONTAIN_TOP_GAP = spacing[20];
const CONTAIN_MASTHEAD_H = CONTAIN_TOP_GAP + CARD_ART_H;
// Contained card scales from 100% at the peek to 70% as the sheet expands to
// full screen (per the Figma full-page spec). Top-anchored (transformOrigin
// 'center top'), and the masthead height tracks the scaled card height so the
// 20px-top / 32px-to-content spacing holds at every scale.
const CONTAIN_FULL_SCALE = 0.7;
// iOS only: how much bigger the in-sheet hero card reads at full screen vs. the
// partial peek (1 = same size). Tuning knob for the full-page card size.
const FULL_SCREEN_CARD_SCALE = 1.15;
// To keep the bigger card SHARP, render it at its full-screen pixel size
// natively (so expo-image decodes at this resolution, no upscaling blur) and
// animate a DOWN-scale to the peek size during the crossfade. Downscaling a
// bitmap stays crisp; upscaling a 204px decode to 235px is what blurred it.
const FULL_SCREEN_CARD_W = CARD_ART_W * FULL_SCREEN_CARD_SCALE;
const FULL_SCREEN_CARD_H = CARD_ART_H * FULL_SCREEN_CARD_SCALE;
// Computed component-spec dim — at stage 1 the BG image translates
// DOWN by this much so its TOP edge lands at the VERTICAL CENTRE of
// the credit-card art. Derivation:
//   card art bottom = EXPANDED_H − paddingBottom(12) = 236
//   card art top    = card art bottom − CARD_ART_H   = 86
//   card art centre = (top + bottom) / 2             = 161
// So BG.translateY = 161 to put its top edge there.
const BG_PUSH_DOWN_STAGE_1 = EXPANDED_H - spacing[12] - CARD_ART_H / 2;
// Height of the bottom fade that melts the peach BG into the sheet body
// (surface.sunken). Anchored to the masthead's bottom edge, it ramps from
// transparent (top) to opaque sunken (bottom) so there's no hard horizontal
// cut. Sits above the BG image but below the card art. ~half the expanded hero
// so the warm peach has dissolved by the time the body begins.
const FADE_H = 144;

export interface CardDetailMastheadProps {
  /** 0 = QuickView (expanded hero), 1 = Expanded sheet (collapsed bar). */
  progress: SharedValue<number>;
  card: CardModel;
  /** Optional shared value (0..1) that drives the BG ImageBackground's
   *  vertical offset:
   *    bgPushProgress=0 → BG top edge at vertical centre of card art
   *                       (BG translateY = BG_PUSH_DOWN_STAGE_1 = 161)
   *    bgPushProgress=1 → BG top edge at masthead top (translateY = 0)
   *  When omitted, BG renders at its normal position (translateY 0). */
  bgPushProgress?: SharedValue<number>;
  /** Optional shared value (0..1) that scales the card art image
   *  independently of the `progress` collapse animation:
   *    cardArtScaleProgress=0 → scale 1   (100% — full size)
   *    cardArtScaleProgress=1 → scale 0.5 (50%)
   *  When omitted, no additional scaling is applied. */
  cardArtScaleProgress?: SharedValue<number>;
  /** Whether this masthead is the active pager page. Only the active page
   *  subscribes to the accelerometer for the gyro tilt — neighbour preview
   *  pages pass `active={false}` so N pages don't open N sensor listeners.
   *  Defaults true (single-card usage outside the pager is unaffected). */
  active?: boolean;
  /** Optional sheet animatedIndex (0=partial → 1=full). When supplied, the
   *  in-sheet card art is HIDDEN at partial (the FloatingCardRail shows the
   *  half-out card instead) and fades IN over [CROSSFADE_LO, CROSSFADE_HI]
   *  as the sheet expands. Omitted → art stays fully visible (no crossfade). */
  artOpacityProgress?: SharedValue<number>;
  /** Contain the card fully INSIDE the masthead (no half-out float). Used on
   *  Android, where a sibling overlay above the sheet can't be composited
   *  reliably — so instead of the FloatingCardRail we show the card in-sheet:
   *  the masthead stays at full height even at the partial snap and the art
   *  ignores the crossfade gate (always visible). */
  containCard?: boolean;
  /** Top safe-area inset (status bar). Used ONLY in the contained (Android)
   *  layout: at full screen the sheet top is the screen top, so the peach grows
   *  by this much under the status bar and the card is pushed down to clear it.
   *  At the partial peek (sheet top is mid-screen) it stays the flat 20px gap. */
  topInset?: number;
}

export function CardDetailMasthead({
  progress,
  card,
  bgPushProgress,
  cardArtScaleProgress,
  active = true,
  artOpacityProgress,
  containCard = false,
  topInset = 0,
}: CardDetailMastheadProps) {
  // Container height. The expanded base grows from PARTIAL_H (peek — card
  // floats half-out, peach just backs its bottom half) to EXPANDED_H (full
  // hero) as the sheet expands (cardArtScaleProgress = sheet animatedIndex).
  // The `progress` collapse (pinned 0 here) still maps that base → COLLAPSED_H.
  // containCard (Android): pin to EXPANDED_H so the full card fits in-sheet at
  // every snap (no half-out, so the short PARTIAL_H would clip the card).
  const containerStyle = useAnimatedStyle(() => {
    if (containCard) {
      // Grow a status-bar-sized band of peach above the card as the sheet
      // expands (0 at peek → topInset at full), and pad the content down by the
      // same amount so the card clears the status bar at full screen while
      // staying a flat 20px below the sheet edge at the peek.
      const statusPad = cardArtScaleProgress
        ? interpolate(
            cardArtScaleProgress.value,
            [0, 1],
            [0, topInset],
            Extrapolation.CLAMP
          )
        : 0;
      // Card scales 1 → 0.7 as the sheet expands; the masthead hugs the scaled
      // card so the 32px gap to the name is measured from the card's (scaled)
      // bottom at every snap.
      const cardScale = cardArtScaleProgress
        ? interpolate(
            cardArtScaleProgress.value,
            [0, 1],
            [1, CONTAIN_FULL_SCALE],
            Extrapolation.CLAMP
          )
        : 1;
      const base = CONTAIN_TOP_GAP + CARD_ART_H * cardScale;
      return {
        height: interpolate(
          progress.value,
          [0, 1],
          [base + statusPad, COLLAPSED_H],
          Extrapolation.CLAMP
        ),
        paddingTop: statusPad,
      };
    }
    const expandedH = cardArtScaleProgress
      ? interpolate(
          cardArtScaleProgress.value,
          [0, 1],
          [PARTIAL_H, EXPANDED_H],
          Extrapolation.CLAMP
        )
      : EXPANDED_H;
    return {
      height: interpolate(
        progress.value,
        [0, 1],
        [expandedH, COLLAPSED_H],
        Extrapolation.CLAMP
      ),
    };
  });

  // Card art shrinks + fades out a touch before fully collapsed.
  const cardArtStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.7], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [1, CARD_ART_SCALE_COLLAPSED],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  // Card-art scale + lift driven by cardArtScaleProgress (sheet's
  // animatedIndex).
  //   stage 1 (progress=0): scale 1.0, translateY = -spacing[32] (lift
  //                         up 32 px so the card sits higher AND its
  //                         drop shadow has room to render fully
  //                         instead of being clipped by the masthead's
  //                         overflow:hidden bottom edge).
  //   stage 2 (progress=1): scale 0.8, translateY = -spacing[8]  (still
  //                         lifted slightly so the shadow's bottom
  //                         doesn't get clipped at stage 2 either).
  const cardArtScaleStyle = useAnimatedStyle(() => {
    if (!cardArtScaleProgress) return {};
    // Contained (Android): scale the card 1 → 0.7 as the sheet expands, anchored
    // to the top (transformOrigin 'center top' on the wrapper) so the 20px top
    // gap stays fixed and the card shrinks downward into the hugging masthead.
    if (containCard) {
      const cs = interpolate(
        cardArtScaleProgress.value,
        [0, 1],
        [1, CONTAIN_FULL_SCALE],
        Extrapolation.CLAMP
      );
      return { transform: [{ scale: cs }] as unknown as { scale: number }[] };
    }
    // iOS full screen: the card is RENDERED natively at the bigger full-screen
    // size (FULL_SCREEN_CARD_W/H) so it decodes crisp. Here we DOWN-scale it to
    // the peek size through the rail→in-sheet crossfade window (so the hand-off
    // matches the floating rail's size exactly), then ease back to 1 (native,
    // full size) as the sheet finishes expanding. Downscaling stays sharp.
    const scale = interpolate(
      cardArtScaleProgress.value,
      [0, CROSSFADE_HI, 1],
      [1 / FULL_SCREEN_CARD_SCALE, 1 / FULL_SCREEN_CARD_SCALE, 1],
      Extrapolation.CLAMP
    );
    // Only the upward translate animates (so the drop shadow isn't clipped by
    // the masthead's overflow:hidden bottom edge at either snap).
    const ty = interpolate(
      cardArtScaleProgress.value,
      [0, 1],
      [-spacing[32], -spacing[8]],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateY: ty },
        { scale },
      ] as unknown as { translateY: number }[],
    };
  });

  // Crossfade gate — hides the in-sheet art at partial (the FloatingCardRail
  // shows the half-out card there) and fades it in as the sheet expands.
  // Omitted prop → opacity untouched (stays 1).
  const artGateStyle = useAnimatedStyle(() => {
    // containCard (Android): no crossfade with a rail → art always visible.
    if (containCard || !artOpacityProgress) return {};
    return {
      opacity: interpolate(
        artOpacityProgress.value,
        [CROSSFADE_LO, CROSSFADE_HI],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  // Bottom-fade opacity — full in the expanded/quickview hero, fades OUT as the
  // masthead collapses into the small sticky bar (which keeps its solid peach).
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  // BG translateY driven by bgPushProgress (sheet's animatedIndex).
  // At stage 1 (bgPushProgress=0) → translateY = BG_PUSH_DOWN_STAGE_1
  // At stage 2 (bgPushProgress=1) → translateY = 0
  // When the prop is omitted, no translation applies.
  const bgAnimStyle = useAnimatedStyle(() => {
    if (!bgPushProgress) return {};
    const ty = interpolate(
      bgPushProgress.value,
      [0, 1],
      [BG_PUSH_DOWN_STAGE_1, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateY: ty },
      ] as unknown as { translateY: number }[],
    };
  });

  return (
    <Animated.View style={[styles.base, containerStyle]}>
      {/* BG layer — absolutely positioned and INDEPENDENTLY animatable.
          Split out from the prior ImageBackground so the BG image can
          translate DOWN at stage 1 without dragging the card art with
          it. The card art (below) stays in its own flex layout. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.bgLayer, bgAnimStyle]}
      >
        <Image
          source={images.backgrounds.large}
          style={styles.bgImage}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Bottom fade — dissolves the peach BG into the sheet body
          (surface.sunken) so the masthead has no hard horizontal cut. Anchored
          to the masthead's bottom edge (does NOT translate with the BG image)
          and rendered ABOVE the BG but BELOW the card art. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.fadeLayer, fadeStyle]}
      >
        <LinearGradient
          colors={[
            colors.surfaceFade.sunkenTransparent,
            colors.surfaceFade.sunken,
          ]}
          style={styles.fadeGradient}
        />
      </Animated.View>

      {/* Content layout — mirrors the flex properties the prior
          ImageBackground had so the card art keeps its centred,
          bottom-aligned position. Contained (Android) pins the card to the TOP
          with a fixed 20px gap instead. */}
      <View
        style={[
          styles.contentLayout,
          containCard && styles.contentLayoutContain,
        ]}
      >
        {/* Outer wrapper applies the independent scale-down animation
            (cardArtScaleProgress) so the existing collapse-scale on
            cardArtWrap can compose with it without overwriting. The
            INNERMOST wrapper (cardArtTiltStyle) applies the accelerometer-
            driven 3D rotate so the card "leans" toward the tilt. */}
        <Animated.View
          style={[
            // Contained card scales from its TOP edge so the 20px top gap is
            // fixed while it shrinks to 70% on expand. iOS (floated) scales from
            // the BOTTOM edge so the downscaled peek card's bottom stays pinned
            // where the rail card's bottom sits during the crossfade.
            { transformOrigin: containCard ? 'center top' : 'center bottom' },
            cardArtScaleStyle,
            artGateStyle,
          ]}
        >
          <Animated.View style={[styles.cardArtWrap, cardArtStyle]}>
            {/* Card visual — image + bg + shadow + glare + gyro tilt.
                Extracted to <CardArt> so the FloatingCardRail renders an
                identical card for the half-out peek + crossfade. iOS renders at
                the full-screen pixel size (decodes crisp; the scale above eases
                it down to the peek size during the crossfade); Android (contained)
                uses the default footprint and scales down to 70%. */}
            <CardArt
              card={card}
              tilt={active}
              width={containCard ? undefined : FULL_SCREEN_CARD_W}
              height={containCard ? undefined : FULL_SCREEN_CARD_H}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = {
  base: {
    width: '100%' as const,
    overflow: 'hidden' as const,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
  },
  bgLayer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  fadeLayer: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE_H,
  },
  fadeGradient: {
    flex: 1,
  },
  contentLayout: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    gap: spacing[8],
  },
  // Contained (Android): card pinned to the top, 20px below the sheet edge,
  // masthead ends flush at the card bottom (no extra bottom padding — the
  // section below owns the 32px gap to the card name).
  contentLayoutContain: {
    justifyContent: 'flex-start' as const,
    paddingTop: CONTAIN_TOP_GAP,
    paddingBottom: 0,
  },
  cardArtWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
