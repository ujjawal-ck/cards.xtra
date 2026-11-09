/**
 * CashbackPip — a draggable floating "pip" that surfaces the "Never Miss
 * Cashback" prompt on the Orders screen (replaces the old static card).
 *
 * Behaviour:
 *   • A tall 9:16 vibrant gradient bubble the user can DRAG anywhere (pan
 *     gesture). On release it snaps to the nearest side edge.
 *   • Inside the pip, two lines of copy animate in a LOOP — first
 *     "Never miss your cashback", then "Get a reminder to activate cashback
 *     every time you shop" — each rising + scaling in, the previous sliding
 *     out (not a flat crossfade).
 *   • Tapping the pip body navigates to the Never-Miss-Cashback setup (the
 *     screen the old card linked to) via `onPress`.
 *   • Tapping the ✕ collapses the pip with a genie effect — it shrinks and
 *     flies to the right edge, docking as a small notch. Tapping the notch
 *     genies it back OUT into the full pip (same path, reversed, smoothed).
 *
 * Android-only (the underlying feature is Android-only); renders nothing
 * elsewhere so it never disturbs the iOS / web demo.
 *
 * Token map:
 *   pip fill     → gradients.amberSaffron (gold→bronze — money/gold, and
 *                  distinct from the blue Check-Status card above it)
 *   pip radius   → radius['2xl'] · pip shadow → elevation.light.lg
 *   money mark   → "₹" heading24Bold / text.inverse on a translucent disc
 *   line 1 text  → heading18SemiBold / text.inverse (big, bold, crisp)
 *   line 2 text  → body14SemiBold / text.inverse
 *   close glyph  → inline white X on a translucent dark disc (contrast-safe)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, Platform, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../atoms';
import { haptics } from '../lib/haptics';
import * as CashbackGuard from '../../modules/cashback-guard';
import { colors, spacing, radius, iconSize, sizing, borderWidth, gradients, elevation } from '../tokens';

// Expanded pip (9:16 portrait) + collapsed notch geometry. Component-spec;
// not on the spacing scale.
const PIP_W = 135;
const PIP_H = 240; // 135:240 = 9:16
const NOTCH_W = 34;
const NOTCH_H = 48;
const EDGE_GAP = spacing[16];
// How long each copy line holds before the next rolls in.
const LINE_HOLD_MS = 2400;

/** Clamp a value to [min, max] — worklet-safe. */
function clamp(v: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(v, min), max);
}

/** Inline white X — `desc-cross` bakes a semantic red and ignores `color`,
 *  so the close glyph is drawn here to guarantee a contrast-safe white. */
function CloseGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6 L18 18 M18 6 L6 18"
        stroke={color}
        strokeWidth={borderWidth.heavy}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export interface CashbackPipProps {
  /** Fired when the user taps the expanded pip body. */
  onPress: () => void;
}

export function CashbackPip({ onPress }: CashbackPipProps) {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Drag bounds — keep the pip on-screen, clear of the status bar and the
  // floating bottom nav.
  const minX = EDGE_GAP;
  const maxX = SCREEN_W - PIP_W - EDGE_GAP;
  const minY = insets.top + sizing.headerHeight;
  const maxY = SCREEN_H - PIP_H - insets.bottom - (sizing.bottomNavHeight + spacing[24]);

  // Pip top-left, in absolute screen coords. Starts docked toward bottom-right.
  const x = useSharedValue(maxX);
  // Start docked low (bottom-right) rather than mid-screen, where it covered
  // centred content such as the Orders empty state. Still draggable.
  const y = useSharedValue(maxY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  // 0 = expanded pip, 1 = collapsed notch. Drives the genie. Starts as the
  // side widget (notch) and genies OUT on mount — so the pip "appears from
  // the side widget".
  const collapse = useSharedValue(1);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setCollapsed(false);
      collapse.value = withSpring(0, { damping: 18, stiffness: 130, mass: 0.9 });
    }, 650);
    return () => clearTimeout(t);
  }, [collapse]);

  // Once the user has granted both permissions (feature fully set up), the
  // nudge has done its job — hide the pip + notch entirely. Re-checked every
  // time the Orders screen regains focus (e.g. returning from the setup page).
  const [featureOn, setFeatureOn] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFeatureOn(CashbackGuard.isSupported && CashbackGuard.isFullyEnabled());
    }, [])
  );

  // Looping copy — two lines that roll (slide + scale + fade), not a flat
  // crossfade. Each line owns opacity / translateY / scale shared values.
  const op0 = useSharedValue(1);
  const op1 = useSharedValue(0);
  const ty0 = useSharedValue(0);
  const ty1 = useSharedValue(24);
  const sc0 = useSharedValue(1);
  const sc1 = useSharedValue(0.9);

  useEffect(() => {
    const IN = { duration: 460, easing: Easing.out(Easing.cubic) };
    const OUT = { duration: 320, easing: Easing.in(Easing.cubic) };
    let showingFirst = true;
    const swap = () => {
      showingFirst = !showingFirst;
      const inOp = showingFirst ? op0 : op1;
      const outOp = showingFirst ? op1 : op0;
      const inTy = showingFirst ? ty0 : ty1;
      const outTy = showingFirst ? ty1 : ty0;
      const inSc = showingFirst ? sc0 : sc1;
      const outSc = showingFirst ? sc1 : sc0;
      // Incoming rolls up from below, scaling to full.
      inTy.value = 24;
      inSc.value = 0.9;
      inOp.value = withTiming(1, IN);
      inTy.value = withTiming(0, IN);
      inSc.value = withTiming(1, IN);
      // Outgoing lifts up + shrinks away.
      outOp.value = withTiming(0, OUT);
      outTy.value = withTiming(-24, OUT);
      outSc.value = withTiming(0.9, OUT);
    };
    const id = setInterval(swap, LINE_HOLD_MS);
    return () => clearInterval(id);
  }, [op0, op1, ty0, ty1, sc0, sc1]);

  // Drag — only while expanded. On release, snap to the nearer side edge.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startX.value = x.value;
          startY.value = y.value;
        })
        .onUpdate((e) => {
          x.value = clamp(startX.value + e.translationX, minX, maxX);
          y.value = clamp(startY.value + e.translationY, minY, maxY);
        })
        .onEnd(() => {
          const center = x.value + PIP_W / 2;
          x.value = withSpring(center < SCREEN_W / 2 ? minX : maxX, {
            damping: 20,
            stiffness: 170,
          });
        }),
    [minX, maxX, minY, maxY, SCREEN_W, startX, startY, x, y]
  );

  const collapseToNotch = () => {
    haptics.impact('light');
    setCollapsed(true);
    // Smooth ease-in-out genie INTO the notch.
    collapse.value = withTiming(1, {
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
    });
  };

  const expandFromNotch = () => {
    haptics.impact('light');
    setCollapsed(false);
    // Genie back OUT — gentle spring, no harsh overshoot, so it reads as
    // smoothly growing out of the side widget.
    collapse.value = withSpring(0, {
      damping: 18,
      stiffness: 130,
      mass: 0.9,
    });
  };

  // Expanded pip — genie: as collapse→1 it drifts to the right edge (where the
  // notch sits), shrinks toward that point and fades out.
  const pipStyle = useAnimatedStyle(() => {
    const c = collapse.value;
    const targetX = SCREEN_W - NOTCH_W;
    const targetY = y.value + (PIP_H - NOTCH_H) / 2;
    return {
      opacity: 1 - c,
      transform: [
        { translateX: x.value + (targetX - x.value) * c },
        { translateY: y.value + (targetY - y.value) * c },
        { scale: 1 - 0.62 * c },
      ] as unknown as { translateX: number }[],
    };
  });

  // Notch — docked at the right edge, at the pip's current height. Scales +
  // fades IN as the pip collapses.
  const notchStyle = useAnimatedStyle(() => {
    const c = collapse.value;
    return {
      opacity: c,
      transform: [
        { translateX: SCREEN_W - NOTCH_W },
        { translateY: y.value + (PIP_H - NOTCH_H) / 2 },
        { scale: 0.7 + 0.3 * c },
      ] as unknown as { translateX: number }[],
    };
  });

  const line0Style = useAnimatedStyle(() => ({
    opacity: op0.value,
    transform: [{ translateY: ty0.value }, { scale: sc0.value }] as unknown as {
      translateY: number;
    }[],
  }));
  const line1Style = useAnimatedStyle(() => ({
    opacity: op1.value,
    transform: [{ translateY: ty1.value }, { scale: sc1.value }] as unknown as {
      translateY: number;
    }[],
  }));

  if (Platform.OS !== 'android') return null;
  // Feature fully enabled → the reminder is unnecessary; remove pip + widget.
  if (featureOn) return null;

  const grad = gradients.amberSaffron;

  return (
    // Full-screen, touch-transparent overlay; only the pip / notch capture taps.
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Expanded pip */}
      <Animated.View
        pointerEvents={collapsed ? 'none' : 'auto'}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: PIP_W,
            height: PIP_H,
            borderRadius: radius['2xl'],
            ...elevation.light.lg,
          },
          pipStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Never miss your cashback. Open setup."
            onPress={onPress}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={grad.colors}
              start={grad.start}
              end={grad.end}
              style={{
                flex: 1,
                borderRadius: radius['2xl'],
                alignItems: 'center',
                paddingTop: spacing[24],
                paddingHorizontal: spacing[12],
                paddingBottom: spacing[16],
                gap: spacing[12],
              }}
            >
              {/* Money mark — a ₹ coin on a translucent disc. */}
              <View
                style={{
                  width: iconSize[48],
                  height: iconSize[48],
                  borderRadius: radius.full,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="heading24Bold" color={colors.text.inverse}>
                  ₹
                </Text>
              </View>

              {/* Looping copy — two rolling lines, stacked + centred. */}
              <View style={{ flex: 1, alignSelf: 'stretch', justifyContent: 'center' }}>
                <Animated.View
                  style={[{ position: 'absolute', left: 0, right: 0 }, line0Style]}
                >
                  <Text
                    variant="heading18SemiBold"
                    color={colors.text.inverse}
                    align="center"
                  >
                    Never miss your cashback
                  </Text>
                </Animated.View>
                <Animated.View
                  style={[{ position: 'absolute', left: 0, right: 0 }, line1Style]}
                >
                  <Text
                    variant="body14SemiBold"
                    color={colors.text.inverse}
                    align="center"
                  >
                    Get a reminder to activate cashback every time you shop
                  </Text>
                </Animated.View>
              </View>
            </LinearGradient>

            {/* Close → collapse to notch (genie). White X on a translucent
                dark disc — contrast-safe on any part of the gradient. */}
            <Pressable
              onPress={collapseToNotch}
              accessibilityRole="button"
              accessibilityLabel="Minimise"
              hitSlop={spacing[8]}
              style={{
                position: 'absolute',
                top: spacing[8],
                right: spacing[8],
                width: iconSize[24],
                height: iconSize[24],
                borderRadius: radius.full,
                backgroundColor: 'rgba(0,0,0,0.28)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloseGlyph size={iconSize[14]} color={colors.text.inverse} />
            </Pressable>
          </Pressable>
        </GestureDetector>
      </Animated.View>

      {/* Collapsed notch — a small tab on the right edge. Tap to expand. */}
      <Animated.View
        pointerEvents={collapsed ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: NOTCH_W,
            height: NOTCH_H,
            borderTopLeftRadius: radius.lg,
            borderBottomLeftRadius: radius.lg,
            ...elevation.light.lg,
          },
          notchStyle,
        ]}
      >
        <Pressable
          onPress={expandFromNotch}
          accessibilityRole="button"
          accessibilityLabel="Open Never miss your cashback"
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={grad.colors}
            start={grad.start}
            end={grad.end}
            style={{
              flex: 1,
              borderTopLeftRadius: radius.lg,
              borderBottomLeftRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="heading18SemiBold" color={colors.text.inverse}>
              ₹
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}
