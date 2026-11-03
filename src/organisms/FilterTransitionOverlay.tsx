/**
 * FilterTransitionOverlay — a full-screen white interstitial played when a
 * filter is committed ("Apply Filter"), so the user clearly registers that the
 * results changed (the silent re-filter was previously easy to miss).
 *
 * Behaviour (driven by the `visible` prop):
 *   1. visible → true  : a white screen fades IN over Home (~220 ms), covering
 *                        everything and blocking taps.
 *   2. fully covered    : `onCovered` fires — the parent commits the filters +
 *                        snaps the list to the top BEHIND the white screen, so
 *                        no stale list flashes.
 *   3. hold ~2 s        : a 160 × 160 animation plays centred (Rive cat/plane).
 *   4. white fades OUT  : revealing the freshly filtered cards; `onHidden`
 *                        fires so the parent can flip `visible` back to false.
 *
 * Rive is a NATIVE module (`rive-react-native`) — it is NOT in Expo Go and
 * only runs in a custom dev build. So:
 *   • Dev build / standalone → renders the real cat/plane `.riv`.
 *   • Expo Go               → renders an on-brand placeholder loader, so the
 *                             transition's timing + feel are still previewable
 *                             over QR. The cat/plane drops in automatically on
 *                             the next EAS dev build (same code, no rework).
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '../atoms';
import { colors, spacing } from '../tokens';
import { HomeSkeleton } from './HomeSkeleton';

// Expo Go can't load native modules — detect it so we never mount the Rive
// view there (it would warn/red-box). `storeClient` == Expo Go; a dev build
// reports `standalone`.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Lazily pull in Rive ONLY outside Expo Go, so requiring this file in Expo Go
// never touches the native component.
let Rive: any = null;
let RiveFit: any = null;
if (!isExpoGo) {
  try {
    const mod = require('rive-react-native');
    Rive = mod.default;
    RiveFit = mod.Fit;
  } catch {
    Rive = null;
  }
}

// Box that hosts the animation — constant width & height per spec.
const ANIM_BOX = 160;
// Fade in / out duration of the white screen.
const FADE_MS = 220;
// How long the white screen + animation are held after fully covering Home.
const HOLD_MS = 2000;

export interface FilterTransitionOverlayProps {
  /** Flip true to run the transition; the overlay sets itself back via onHidden. */
  visible: boolean;
  /** Fires once the white screen is fully opaque (commit filters here). */
  onCovered?: () => void;
  /** Fires after the white screen has fully faded back out. */
  onHidden?: () => void;
}

export function FilterTransitionOverlay({
  visible,
  onCovered,
  onHidden,
}: FilterTransitionOverlayProps) {
  const opacity = useSharedValue(0);
  // Kept mounted only while the transition is running so the animation
  // restarts from frame 0 on every apply (fresh mount each time).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMounted(true);
    opacity.value = 0;
    // Fade IN → fire onCovered when fully opaque.
    opacity.value = withTiming(
      1,
      { duration: FADE_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished && onCovered) runOnJS(onCovered)();
      }
    );
    // After the hold, fade OUT → unmount + fire onHidden.
    const t = setTimeout(() => {
      opacity.value = withTiming(
        0,
        { duration: FADE_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(setMounted)(false);
            if (onHidden) runOnJS(onHidden)();
          }
        }
      );
    }, FADE_MS + HOLD_MS);
    return () => clearTimeout(t);
    // Re-runs whenever `visible` flips to true. onCovered/onHidden are read
    // from the render that flipped it, which carries the right closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!mounted) return null;

  return (
    <Animated.View
      // Sits above all screen content; blocks taps during the transition.
      style={[styles.fill, style]}
      pointerEvents="auto"
    >
      {/* Skeleton of the Home page sits in the BACKGROUND so the transition
          reads as the page reloading underneath, with the cat in the
          foreground — not a plain white wash. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <HomeSkeleton />
      </View>
      {/* Cat animation — centred in the foreground over the skeleton. */}
      <View style={styles.center} pointerEvents="none">
        <View style={{ width: ANIM_BOX, height: ANIM_BOX }}>
          {Rive ? (
            <Rive
              source={require('../assets/animations/cat-redirecting.riv')}
              autoplay
              fit={RiveFit?.Contain ?? 'contain'}
              style={{ flex: 1 }}
            />
          ) : (
            // Expo Go preview placeholder (real cat/plane shows in a dev build).
            <View style={styles.placeholder}>
              <ActivityIndicator
                size="large"
                color={colors.action.primary.default}
              />
              <Text variant="body14Medium" color={colors.text.secondary}>
                Applying filters…
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface.default,
    zIndex: 100,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[16],
  },
});
