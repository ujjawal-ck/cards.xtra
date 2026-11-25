/**
 * SplashScreen — Lottie splash that plays once on app launch.
 *
 * On `onAnimationFinish` (or, defensively, on a 3.5-second safety
 * timeout — some Lottie/Expo Go combos drop the callback) the screen
 * `navigation.replace('Onboarding')`s itself so the user can't swipe
 * back to the splash. Sequence: Splash → Onboarding → Login.
 *
 * Background colour: the animation's solid colour layer is white
 * (`"sc":"#ffffff"` in the JSON), so the container uses
 * `colors.surface.default` (= slate-50 = #ffffff) — the closest
 * existing semantic for a pure-white screen background.
 *
 * Resize mode: `cover` so the 720×1600 portrait fills the device
 * without letterboxing on any aspect ratio.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../tokens';
import { useAuth } from '../auth/AuthContext';
import { loadOnboarded } from '../auth/tokenStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

// BUILD-06 / parity H: CashKaro plays one ~3 s splash with no hold. The Lottie
// is 6.53 s at 1x (392 frames @ 60 fps), so play it at 2.2x (~3.0 s).
const SPLASH_SPEED = 2.2;
// Hard cap: leave the splash by now even if onAnimationFinish never fires or
// the session is still loading (was 7000 ms).
const SPLASH_SAFETY_MS = 3500;

export function SplashScreen() {
  const navigation = useNavigation<Nav>();
  const { status } = useAuth();
  const insets = useSafeAreaInsets();
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);
  // Whether onboarding was already seen on this install. Login is optional,
  // so a returning guest goes straight to Home rather than onboarding again.
  const onboardedRef = useRef(false);
  useEffect(() => {
    loadOnboarded()
      .then((v) => {
        onboardedRef.current = v;
      })
      .catch(() => undefined);
  }, []);

  // Idempotent — both the Lottie callback AND the safety timeout race
  // to call this; whichever fires first wins, the other becomes a
  // no-op. A persisted session, or a guest who has already seen onboarding,
  // lands on the tabs; a first launch goes to Onboarding. (If the session
  // bootstrap is somehow still pending, default to onboarding.)
  const goNext = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (safetyRef.current) clearTimeout(safetyRef.current);
    navigation.replace(
      status === 'authenticated' || onboardedRef.current ? 'MainTabs' : 'Onboarding'
    );
  }, [navigation, status]);

  // The animation ending only hands over once the session load is known
  // (short wait, bounded by the cap below); the cap leaves regardless.
  const [animDone, setAnimDone] = useState(false);
  useEffect(() => {
    if (animDone && status !== 'loading') goNext();
  }, [animDone, status, goNext]);

  // Cap timer starts once (not on every status change); it calls the latest goNext.
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  useEffect(() => {
    safetyRef.current = setTimeout(() => goNextRef.current(), SPLASH_SAFETY_MS);
    return () => {
      if (safetyRef.current) clearTimeout(safetyRef.current);
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface.default,
        // Keep the animation above the Android navigation bar (edge-to-edge):
        // its "Powered by CashKaro" footer was drawn underneath the system
        // buttons.
        paddingBottom: insets.bottom,
      }}
    >
      {/* Light icons over the deep-blue splash animation. */}
      <StatusBar style="light" />
      <LottieView
        source={require('../assets/animations/splash-animation.json')}
        autoPlay
        loop={false}
        speed={SPLASH_SPEED}
        resizeMode="cover"
        style={{ flex: 1 }}
        onAnimationFinish={() => setAnimDone(true)}
      />
    </View>
  );
}
