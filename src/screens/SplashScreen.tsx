/**
 * SplashScreen — Lottie splash that plays once on app launch.
 *
 * On `onAnimationFinish` (or, defensively, on a 7-second safety
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
import React, { useCallback, useEffect, useRef } from 'react';
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

// 7 s — animation runs ~6.5 s, this is the safety hatch in case the
// Lottie's onAnimationFinish never fires (known issue on some
// Expo Go builds).
const SPLASH_SAFETY_MS = 7000;

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

  useEffect(() => {
    safetyRef.current = setTimeout(goNext, SPLASH_SAFETY_MS);
    return () => {
      if (safetyRef.current) clearTimeout(safetyRef.current);
    };
  }, [goNext]);

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
        resizeMode="cover"
        style={{ flex: 1 }}
        onAnimationFinish={goNext}
      />
    </View>
  );
}
