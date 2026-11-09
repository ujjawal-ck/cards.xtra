/**
 * GreetingScreen — the post-signup greeting (Figma DS node 6295:30803).
 *
 * Clean, centred composition on white:
 *   "Hi <FirstName>"   — "Hi" in text.primary (Display/40 SemiBold); the first
 *                        name Premium-gradient filled (Cobalt→Violet),
 *                        capitalised, ExtraBold.
 *   "Welcome to the"   — text.primary, Heading/28 SemiBold.
 *   <CARDS.xtra logo>  — the full-colour brand lockup (logos.brandColor).
 *
 * Only the user's FIRST name is shown (the entered name's first word).
 *
 * Animation (Reanimated, repo standard): the line fades/scales in, "Welcome to
 * the" slides up, the logo pops in; the name gets a one-time pulse. Auto-
 * advances to MainTabs after GREETING_HOLD_MS, or on tap (700ms fade+shrink,
 * then reset into the tabs).
 *
 * NOTE: the name's italic is FAKED via a skewX transform, not fontStyle.
 * display40ExtraBold maps to Outfit_800ExtraBold, which has no italic variant,
 * so fontStyle:'italic' makes RN fall back to the system font at normal weight
 * (renders light). Skewing the masked layer keeps the heavy ExtraBold weight.
 */
import React, { useEffect, useRef } from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, GradientText } from '../atoms';
import { colors, spacing } from '../tokens';
import { gradients } from '../theme/gradients';
import { logos } from '../assets/logos';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Greeting'>;
type GreetingRoute = RouteProp<RootStackParamList, 'Greeting'>;

const BrandLogo = logos.brandColor;
// Native lockup ratio is 174.961 × 117.598.
const LOGO_W = 184;
const LOGO_H = Math.round((LOGO_W * 117.598) / 174.961);

// Hold before auto-advancing into the app (tap advances sooner).
// Trimmed 40% (was 5200) to land in the app faster; entrance animations still
// finish at ~1700ms, leaving ~1.4s of dwell before the exit.
const GREETING_HOLD_MS = 3120;
// Tap / auto exit fade-out before navigating (trimmed 40%, was 700).
const EXIT_MS = 420;

/** First word of the entered name, first letter capitalised ("praveen s" → "Praveen"). */
function firstName(full?: string): string {
  const first = (full ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first) return 'there';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function GreetingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<GreetingRoute>();
  const name = firstName(route.params?.name);

  // --- Entrance drivers -----------------------------------------------------
  const hi = useSharedValue(0); // line 1 fade + scale-in
  const pulse = useSharedValue(0); // name one-time pulse
  const welcome = useSharedValue(0); // "Welcome to the" slide-up
  const logo = useSharedValue(0); // logo pop-in
  const out = useSharedValue(0); // exit fade + shrink

  const navigatedRef = useRef(false);

  const goToApp = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const exit = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    out.value = withTiming(
      1,
      { duration: EXIT_MS, easing: Easing.in(Easing.cubic) },
      (fin) => {
        if (fin) runOnJS(goToApp)();
      },
    );
  };

  useEffect(() => {
    hi.value = withDelay(
      100,
      withTiming(1, { duration: 1100, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }),
    );
    pulse.value = withDelay(
      650,
      withSequence(
        withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    welcome.value = withDelay(
      550,
      withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }),
    );
    logo.value = withDelay(
      950,
      withTiming(1, { duration: 750, easing: Easing.out(Easing.back(2)) }),
    );
    const t = setTimeout(exit, GREETING_HOLD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Animated styles ------------------------------------------------------
  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - out.value,
    transform: [{ scale: interpolate(out.value, [0, 1], [1, 0.96]) }],
  }));
  const hiStyle = useAnimatedStyle(() => ({
    opacity: hi.value,
    transform: [{ scale: interpolate(hi.value, [0, 1], [1.35, 1.0]) }],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    // skewX fakes the italic slant: Outfit has no italic face, so fontStyle
    // 'italic' would drop the ExtraBold font to the system default (light).
    // Skewing the whole masked layer keeps the heavy weight + gradient.
    transform: [
      { skewX: '-10deg' },
      { scale: 1 + 0.1 * pulse.value },
      { rotate: `${-2 * pulse.value}deg` },
    ] as const,
  }));
  const welcomeStyle = useAnimatedStyle(() => ({
    opacity: welcome.value,
    transform: [{ translateY: 22 * (1 - welcome.value) }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [
      { scale: interpolate(logo.value, [0, 1], [0.6, 1.0]) },
      { translateY: interpolate(logo.value, [0, 1], [14, 0]) },
    ] as const,
  }));

  return (
    <Pressable style={{ flex: 1 }} onPress={exit}>
      <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
        <StatusBar style="dark" />

        <Animated.View style={[{ flex: 1 }, rootStyle]}>
          <SafeAreaView
            edges={['top', 'left', 'right', 'bottom']}
            style={{
              flex: 1,
              paddingHorizontal: spacing[24],
              alignItems: 'center',
              justifyContent: 'center',
              // Optical centring — sit a touch above true centre.
              paddingBottom: spacing[48],
            }}
          >
            {/* Hi <FirstName> */}
            <Animated.View
              style={[
                { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[4] },
                hiStyle,
              ]}
            >
              <Text variant="display40SemiBold" color={colors.text.primary}>
                Hi
              </Text>
              <Animated.View style={nameStyle}>
                <GradientText variant="display40ExtraBold" colors={gradients.premium}>
                  {name}
                </GradientText>
              </Animated.View>
            </Animated.View>

            {/* Welcome to the */}
            <Animated.View style={[{ marginTop: spacing[8] }, welcomeStyle]}>
              <Text variant="heading28SemiBold" color={colors.text.primary} align="center">
                Welcome to the
              </Text>
            </Animated.View>

            {/* Brand lockup */}
            <Animated.View style={[{ marginTop: spacing[48] }, logoStyle]}>
              <BrandLogo width={LOGO_W} height={LOGO_H} />
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Pressable>
  );
}
