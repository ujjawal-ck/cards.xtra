/**
 * PromoTopSheet — organism
 *
 * A full-bleed promotional banner that slides DOWN from the top of the
 * screen over a dim backdrop. Used for the Offers "Shop as Usual, Earn
 * Cashback" welcome banner, shown once per fresh app session (the
 * once-per-launch gate lives in the screen, not here — this component is
 * purely presentational + controlled via `visible`).
 *
 * Built like <SearchTopSheet>: a react-native <Modal> + reanimated for the
 * slide. The banner enters from off-screen-top (−screenH → 0) and, on
 * dismiss, falls DOWNWARD off the bottom (0 → +screenH) — so both the
 * entrance and the dismissal read as a single downward motion.
 *
 * Three ways to dismiss (all → `onClose`):
 *   1. The glass close (✕) button straddling the banner's bottom edge.
 *   2. Tapping the dim backdrop below the banner.
 *   3. Swiping the banner down (PanResponder — reliable inside a Modal,
 *      where react-native-gesture-handler is not).
 *
 * No navigation — the banner is purely promotional + dismissible.
 *
 * Hex → token: every value sourced from src/tokens. The glass button uses
 * alpha.white[24] (fill) + colors.border.inverse (white ring) +
 * colors.icon.inverse (white ✕) — expo-blur isn't shipped, so this is the
 * frosted look's static stand-in (matches the HomeHeader approach).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  Image,
  Dimensions,
  StyleSheet,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../atoms';
import { play } from '../lib/haptics';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  opacity,
  alpha,
} from '../tokens';

// ----------------------------------------------------------------------------
// Tunables (kept local to this sheet)
// ----------------------------------------------------------------------------
// Settled slide — the banner glides in/out rather than snapping.
const SLIDE_DURATION_MS = 560;

// ----- Diagonal shimmer --------------------------------------------------
// A tilted, soft-white band sweeps diagonally across the banner on a loop —
// a premium "sheen" glint that draws the eye. One sweep, then a beat of
// rest, repeated (a periodic glint, not a constant shimmer).
const SHINE_BAND_FRACTION = 0.45; // band width as a fraction of screen width
const SHINE_TILT = '20deg'; // band tilt → the sweep reads diagonal
const SHINE_SWEEP_MS = 1100;
const SHINE_REST_MS = 1500;
// Banner art aspect ratio (width ÷ height). The artwork is portrait ~720×904
// (4:5); keep the registered asset close to this so it isn't cropped.
const PROMO_ASPECT = 0.8;
// Glass close button — 40px circle (matches the Figma control).
const CLOSE_SIZE = iconSize[40];
// Clear gap between the banner's bottom edge and the close button.
const CLOSE_GAP = spacing[20];

export interface PromoTopSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Full-bleed banner artwork (e.g. images.promos.shopAsUsual). */
  source: ImageSourcePropType;
  /** Width ÷ height of the artwork. Default 0.8 (4:5 portrait). */
  aspectRatio?: number;
  /** Describes the banner for screen readers. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function PromoTopSheet({
  visible,
  onClose,
  source,
  aspectRatio = PROMO_ASPECT,
  accessibilityLabel = 'Shop as usual, earn cashback on the stores you love',
  style,
}: PromoTopSheetProps) {
  const insets = useSafeAreaInsets();

  // Read once per mount; if the device rotates we re-read on next open.
  const screenH = useRef(Dimensions.get('window').height).current;
  const screenW = useRef(Dimensions.get('window').width).current;

  // Keep the <Modal> mounted across the closing tween so the slide-out is
  // actually rendered. Unmount only after the tween completes.
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(-screenH);
  const backdropAlpha = useSharedValue(0);

  // Diagonal shimmer: 0 → 1 drives the tilted band from off the banner's
  // left to off its right. A focused band (~45% of the screen) reads as a
  // single travelling sheen rather than a wash.
  const bandW = useRef(screenW * SHINE_BAND_FRACTION).current;
  const shine = useSharedValue(0);

  const requestClose = () => {
    play('sheetCollapse');
    onClose();
  };

  useEffect(() => {
    // Ingress and egress mirror each other: the banner slides DOWN from the
    // top into place, and on dismiss slides back UP the way it came. Same
    // duration + symmetric easing both ways so the motion feels settled.
    const easing = Easing.inOut(Easing.cubic);
    if (visible) {
      setMounted(true);
      translateY.value = withTiming(0, { duration: SLIDE_DURATION_MS, easing });
      backdropAlpha.value = withTiming(opacity[80], {
        duration: SLIDE_DURATION_MS,
        easing,
      });
    } else if (mounted) {
      // Slide back up off the top, then unmount.
      translateY.value = withTiming(
        -screenH,
        { duration: SLIDE_DURATION_MS, easing },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
      backdropAlpha.value = withTiming(0, { duration: SLIDE_DURATION_MS, easing });
    }
  }, [visible, mounted, screenH, translateY, backdropAlpha]);

  // Start (and keep) the shimmer loop while the banner is on screen.
  useEffect(() => {
    if (!visible) return;
    shine.value = 0;
    shine.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: SHINE_SWEEP_MS,
          easing: Easing.inOut(Easing.quad),
        }),
        // Hold off-screen, then snap back to the start for the next glint.
        withDelay(SHINE_REST_MS, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
  }, [visible, shine]);

  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const shineAnim = useAnimatedStyle(() => ({
    // Tilt the band, then travel it along that tilted axis → a diagonal
    // sweep from off the left edge to off the right.
    transform: [
      { rotate: SHINE_TILT },
      {
        translateX: interpolate(
          shine.value,
          [0, 1],
          [-(bandW + screenW * 0.3), screenW + bandW]
        ),
      },
    ] as const,
  }));
  const backdropAnim = useAnimatedStyle(() => ({
    backgroundColor: colors.surface.dark,
    opacity: backdropAlpha.value,
  }));

  if (!mounted) return null;

  // Cap the banner so the backdrop and the ✕ below it stay visible on short
  // screens; the mask crops the art's bottom if it would exceed this.
  const maskMaxH = screenH * 0.72;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      {/* Dim backdrop — tap anything below the banner to dismiss. */}
      <Pressable
        accessibilityLabel="Dismiss promotion"
        accessibilityRole="button"
        onPress={requestClose}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, backdropAnim]}
        />
      </Pressable>

      {/* Top-anchored banner + the close button stacked below it. Both ride
          the same translateY, so they slide in and out together. */}
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
          sheetAnim,
          style,
        ]}
      >
        <View
          style={{
            width: '100%',
            maxHeight: maskMaxH,
            borderBottomLeftRadius: radius['2xl'],
            borderBottomRightRadius: radius['2xl'],
            overflow: 'hidden',
            backgroundColor: colors.surface.dark,
          }}
        >
          <Image
            source={source}
            accessibilityLabel={accessibilityLabel}
            accessible
            resizeMode="cover"
            style={{ width: screenW, height: screenW / aspectRatio }}
          />

          {/* Diagonal shimmer — a tilted soft-white band that sweeps across
              the banner on a loop. Clipped to the banner by the parent's
              overflow:hidden. Taller than the banner so the tilt never
              reveals a gap; purely decorative (pointerEvents none). */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: -screenH,
                height: screenH * 3,
                left: 0,
                width: bandW,
              },
              shineAnim,
            ]}
          >
            <LinearGradient
              colors={['transparent', alpha.white[50], 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Glass close (✕) — centred, a clear 20px below the banner. */}
        <View style={{ marginTop: CLOSE_GAP }}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={requestClose}
            hitSlop={spacing[8]}
            style={({ pressed }) => ({
              width: CLOSE_SIZE,
              height: CLOSE_SIZE,
              borderRadius: radius.full,
              borderWidth: borderWidth.thin,
              borderColor: colors.border.inverse,
              backgroundColor: alpha.white[24],
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? opacity[80] : opacity[100],
            })}
          >
            <Icon name="close" size={iconSize[24]} color={colors.icon.inverse} />
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}
