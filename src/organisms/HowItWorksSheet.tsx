/**
 * HowItWorksSheet — organism (Figma 6173:12529)
 *
 * A centred modal explaining how a card's reward flow works.
 * Opened from the CardDetailSheet's "Learn how it works?" link.
 *
 * Pattern: like ShareSheet, this is a SIBLING RN <Modal> (not a gorhom
 * sheet). The CardDetailSheet stays mounted underneath; tapping the link
 * calls `howItWorksRef.current?.present()` and this fades in over it.
 * Using RN Modal (vs stacking another gorhom modal) keeps it reliably
 * above the gorhom sheet — the same lesson ShareSheet bakes in.
 *
 * Layout (centred Animated.View, 16px gutters left/right):
 *   • Card art — floats centred, straddling the panel's top edge (its
 *     lower half overlaps the rounded panel; drawn on top via zIndex).
 *   • White panel (rounded all corners, content-driven height):
 *       – peach gradient band behind the card's lower half
 *       – title (heading22Bold, centred)
 *       – OrnamentLabel "HOW IT WORKS" (diamond-flanked divider)
 *       – steps box: 1px-bordered container holding <ProcessSteps>,
 *         capped at stepsMaxHeight and scrolling only on overflow
 *       – CTA ("Okay, got it!")
 *
 * Animation (single shared `progress`, 0 = hidden, 1 = shown):
 *   Enter → withSpring; backdrop fades in, panel fades + scales up.
 *   Exit  → withTiming; panel fades + scales back, backdrop fades, unmount.
 *
 * Ref API: { present(): void; dismiss(): void } — mirrors ShareSheet.
 *
 * Hex → token:
 *   #ffffff   → colors.surface.default
 *   scrim     → alpha.black[80]
 *   peach     → colors.action.primary.subtle (gradient → transparent)
 *   diamond / label / CTA → colors.action.primary.default
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  View,
  Image,
  Modal,
  Pressable,
  ScrollView,
  ImageSourcePropType,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Text, Button } from '../atoms';
import { ProcessSteps } from './ProcessSteps';
import type { ProcessStep } from './ProcessSteps';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  alpha,
  elevation,
} from '../tokens';

export interface HowItWorksSheetRef {
  present: () => void;
  dismiss: () => void;
}

export interface HowItWorksSheetProps {
  /** Card art shown straddling the panel's top edge. */
  cardImage?: ImageSourcePropType;
  /** Reward value, e.g. "₹1,400" — drives the default title. */
  rewardValue?: string;
  /** Full heading override. Defaults to the "Apply … earn Rewards" copy. */
  title?: string;
  /** Steps in the scroll container. Sensible card-reward defaults provided. */
  steps?: ProcessStep[];
  /** CTA label. */
  ctaLabel?: string;
  /** Fires when the CTA is pressed (before the close animation). */
  onConfirm?: () => void;
  /** Fires immediately when the close begins (tap-outside, back, or CTA). */
  onDismiss?: () => void;
}

// ---- One-off frame dims (per Figma 6173:12529) ---------------------
// Credit-card art ~1.586:1. Not on the spacing scale → named here.
const CARD_W = 204;
const CARD_H = 128;
// How far the panel's top edge overlaps the card's lower half. The card
// pokes above the panel by CARD_H − PANEL_OVERLAP.
const PANEL_OVERLAP = spacing[64];
// Peach band reaches a touch below the card so the fade lands in white.
const PEACH_H = PANEL_OVERLAP + spacing[80];

const DEFAULT_STEPS: ProcessStep[] = [
  {
    id: 'apply',
    icon: 'clock-outline',
    title: 'Once you apply, we will start tracking your application',
    caption: 'Generally takes 2–72 hrs',
  },
  {
    id: 'approve',
    icon: 'clock-outline',
    title:
      'Once the bank approves your successful card delivery, we will process your rewards',
    caption: 'Generally takes 2–72 hrs',
  },
  {
    id: 'credit',
    icon: 'clock-outline',
    title: 'Your rewards are credited to your CashKaro account',
    caption: 'Generally takes 2–72 hrs',
  },
];

const SPRING_IN = { damping: 18, stiffness: 180, mass: 0.9 };
const TIMING_OUT = { duration: 220, easing: Easing.in(Easing.cubic) };

// ---- OrnamentLabel — "◆ LABEL ◆" diamond-flanked divider -----------
// Exported for reuse: a centred section label with fading orange lines
// to each edge and a small diamond hugging the text on both sides.
export function OrnamentLabel({ label }: { label: string }) {
  const accent = colors.action.primary.default;
  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
      }}
    >
      <LinearGradient
        colors={['transparent', accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1, height: borderWidth.thin }}
      />
      <Diamond color={accent} />
      <Text
        variant="caption10SemiBold"
        color={accent}
        style={{ textTransform: 'uppercase' }}
      >
        {label}
      </Text>
      <Diamond color={accent} />
      <LinearGradient
        colors={[accent, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1, height: borderWidth.thin }}
      />
    </View>
  );
}

function Diamond({ color }: { color: string }) {
  return (
    <View
      style={{
        width: spacing[6],
        height: spacing[6],
        backgroundColor: color,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );
}

export const HowItWorksSheet = forwardRef<
  HowItWorksSheetRef,
  HowItWorksSheetProps
>((props, ref) => {
  const {
    cardImage,
    rewardValue,
    title,
    steps = DEFAULT_STEPS,
    ctaLabel = 'Okay, got it!',
    onConfirm,
    onDismiss,
  } = props;

  const { height: windowH } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const progress = useSharedValue(0);
  const dismissing = useRef(false);

  // Centered modal: the panel sizes to its content (no fixed height) so there
  // is no dead space below the steps. The steps box is capped at this height
  // and scrolls only if the content ever exceeds it (it normally won't).
  const stepsMaxHeight = Math.round(windowH * 0.45);

  const headingText =
    title ??
    (rewardValue
      ? `Apply for this credit card & earn Rewards of ${rewardValue}`
      : 'Apply for this credit card & earn rewards');

  const finalizeClose = useCallback(() => {
    setVisible(false);
    dismissing.current = false;
  }, []);

  const startClose = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    onDismiss?.();
    progress.value = withTiming(0, TIMING_OUT, (finished) => {
      if (finished) runOnJS(finalizeClose)();
    });
  }, [progress, onDismiss, finalizeClose]);

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        dismissing.current = false;
        setVisible(true);
        progress.value = 0;
        progress.value = withSpring(1, SPRING_IN);
      },
      dismiss: () => startClose(),
    }),
    [progress, startClose]
  );

  const handleConfirm = useCallback(() => {
    onConfirm?.();
    startClose();
  }, [onConfirm, startClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // Centered modal: fade + scale up into place (no bottom slide).
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [0.92, 1],
          Extrapolation.CLAMP
        ),
      },
    ] as unknown as { scale: number }[],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={startClose}
      statusBarTranslucent
    >
      {/* Backdrop scrim — tap dismisses. */}
      <Animated.View
        style={[{ flex: 1, backgroundColor: alpha.black[80] }, backdropStyle]}
      >
        <Pressable
          onPress={startClose}
          style={{
            flex: 1,
            justifyContent: 'center',
            // 16px gutters left + right — the modal floats inset from the edges.
            paddingHorizontal: spacing[16],
          }}
        >
          {/* Centered modal. Inner no-op Pressable swallows taps so
              touching the modal doesn't bubble to the backdrop. */}
          <Animated.View style={sheetStyle}>
            <Pressable onPress={() => undefined} style={{ alignItems: 'center' }}>
              {/* Card art — straddles the panel's top edge. */}
              {cardImage ? (
                <Image
                  source={cardImage}
                  resizeMode="contain"
                  style={[
                    {
                      width: CARD_W,
                      height: CARD_H,
                      marginBottom: -PANEL_OVERLAP,
                      zIndex: 2,
                    },
                    // Subtle lift; the Android `elevation` field also keeps
                    // the card drawing ABOVE the panel (which has none).
                    elevation.light.md,
                  ]}
                />
              ) : null}
              {/* No card (e.g. the general "How Cards.xtra works" from Help):
                  no art slot at all — the grey placeholder box read as a
                  broken image. The panel drops its overlap padding below. */}

              {/* White panel — content-driven height, rounded on all corners
                  (it floats, not anchored to the screen bottom). */}
              <View
                style={{
                  width: '100%',
                  backgroundColor: colors.surface.default,
                  borderRadius: radius['2xl'],
                  overflow: 'hidden',
                  paddingTop: cardImage ? PANEL_OVERLAP + spacing[8] : spacing[24],
                }}
              >
                {/* Peach band behind the card's lower half */}
                <LinearGradient
                  pointerEvents="none"
                  colors={[colors.action.primary.subtle, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: PEACH_H,
                  }}
                />

                {/* Content column */}
                <View
                  style={{
                    paddingHorizontal: spacing[16],
                    gap: spacing[16],
                  }}
                >
                  <Text
                    variant="heading22Bold"
                    color={colors.text.primary}
                    align="center"
                  >
                    {headingText}
                  </Text>

                  <OrnamentLabel label="How it works" />

                  {/* Steps box — bordered container, sized to its content.
                      Capped at stepsMaxHeight; only scrolls if it overflows. */}
                  <View
                    style={{
                      borderWidth: borderWidth.thin,
                      borderColor: colors.border.default,
                      borderRadius: radius.lg,
                      backgroundColor: colors.surface.default,
                      overflow: 'hidden',
                    }}
                  >
                    <ScrollView
                      showsVerticalScrollIndicator
                      style={{ maxHeight: stepsMaxHeight }}
                      contentContainerStyle={{ padding: spacing[16] }}
                    >
                      <ProcessSteps steps={steps} />
                    </ScrollView>
                  </View>
                </View>

                {/* CTA */}
                <View
                  style={{
                    paddingHorizontal: spacing[16],
                    paddingTop: spacing[12],
                    paddingBottom: spacing[16],
                  }}
                >
                  <Button
                    label={ctaLabel}
                    variant="solid"
                    tone="second"
                    size={44}
                    fullWidth
                    onPress={handleConfirm}
                  />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
});

HowItWorksSheet.displayName = 'HowItWorksSheet';
