/**
 * OnboardingScreen — Figma onboarding/landing (4817:47529).
 *
 * Shown on FIRST launch only (Splash routes here until the user has
 * onboarded). Login never opens this screen again: every "Log in" in the
 * app uses the app-wide sheet from auth/LoginSheetProvider.
 *
 * Composition:
 *   - <ImageBackground> — blue onboarding backdrop.
 *   - <FlatList horizontal pagingEnabled> — full-screen Lottie carousel.
 *   - <Text> atom — headline (crossfades as slides settle).
 *   - <Button> "Get Started" → enter the app as a guest.
 *   - "Already on CashKaro? Log in" → the app-wide login sheet.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ImageBackground,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from 'react-native';
import LottieView from 'lottie-react-native';
import type { LottieViewProps } from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text, Button, Indicator } from '../atoms';
import { colors, spacing } from '../tokens';
import { images } from '../assets/images';
import type { RootStackParamList } from '../navigation/types';
import { markOnboarded } from '../auth/tokenStore';
import { useLoginSheet } from '../auth/LoginSheetProvider';
import { analytics, Events } from '../analytics';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

// Auto-advance cadence — matched to the Lottie slide length (~321
// frames @ 60fps ≈ 5.35s) so each animation plays through almost
// exactly once before the carousel glides to the next slide. The
// progress Indicator's active bar fills over this same time, and the
// active slide loops, so any small drift just replays seamlessly.
const AUTO_ADVANCE_MS = 5350;
// Headline box is locked to three display36 lines (3 × 42 lineHeight)
// so a 2-line headline (slide 2) doesn't shrink the box and shove the
// carousel up when the crossfade swaps text. Raw value — it's derived
// from the type token, not on the spacing scale.
const HEADLINE_HEIGHT = 42 * 3;

interface OnboardingSlide {
  id: string;
  // Full-screen (360×800) Lottie scene played behind the chrome. The
  // require()'d JSON is the parsed AnimationObject LottieView expects.
  source?: LottieViewProps['source'];
  // Optional uniform scale for the scene (default 1 = full-bleed). Used
  // to shrink a slide whose figure would otherwise crowd the headline;
  // the blue backdrop fills the freed margin. Scales about centre.
  scale?: number;
  // Optional downward nudge in points (default 0) — pushes the whole
  // scene down so a tall figure clears the headline. Applied after
  // scale, so it's a true screen-space shift.
  offsetY?: number;
  // Headline shown over the hero while THIS slide is settled. Line
  // breaks are authored per Figma; the box height is fixed (above) so
  // 2- vs 3-line headlines swap without reflow.
  headline: string;
}

// Three real hero slides — full-screen Lottie animations from
// src/assets/animations/. Each is a complete branded scene (gradient
// backdrop + animated figure/props, no baked-in text), so it plays
// full-bleed with the headline / CTA floating on top. Each carries its
// own headline; the headline crossfades to match once a slide settles.
const SLIDES: OnboardingSlide[] = [
  {
    id: 'slide-1',
    source: require('../assets/animations/onboarding-1.json'),
    headline: 'Find The\nPerfect Card\nin Seconds',
    // 90% + nudged down — the full-bleed figure's head reached into the
    // headline; shrinking and shifting it down clears the text, and the
    // backdrop fills the freed margin.
    scale: 0.9,
    offsetY: 72,
  },
  {
    id: 'slide-2',
    source: require('../assets/animations/onboarding-2.json'),
    headline: "Don't Just Apply.\nEarn Cashback",
  },
  {
    id: 'slide-3',
    source: require('../assets/animations/onboarding-3.json'),
    headline: 'Explore Deals\n& Offers on\n1500+ Brands',
  },
];

// Seamless infinite loop: append a clone of slide 1 after the last real
// slide. Auto-advance always moves FORWARD into the clone, then we
// silently jump back to the real slide 1 (animated:false) at rest — so
// the loop never plays the ugly backward sweep across all pages. The
// clone is visually identical to slide 1, so the jump is invisible.
const LOOP_SLIDES: OnboardingSlide[] = [
  ...SLIDES,
  { ...SLIDES[0], id: 'slide-1-loop' },
];

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const screenW = Dimensions.get('window').width;
  // One carousel page = the full screen width — the Lottie slides play
  // full-bleed (the chrome floats on top). Used for both scrollToIndex
  // layout and rounding scroll offsets back to a page index.
  const PAGE_W = screenW;
  // Position within LOOP_SLIDES (0..3). Drives the auto-advance base,
  // the seamless-loop snap, AND the progress Indicator — all settle-
  // driven, so the story bar fill stays in lockstep with auto-advance.
  const [loopIndex, setLoopIndex] = useState(0);
  // Auto-advance pauses the moment a finger touches the carousel and
  // resumes once the slide settles again.
  const [paused, setPaused] = useState(false);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  // One LottieView ref per slide id (keyed by LOOP_SLIDES id, so the two
  // slide-1 instances stay distinct). Only the settled slide animates —
  // playing all four full-screen Lotties at once is needless GPU/CPU on
  // Expo Go — so playActive() plays the active one and resets the rest to
  // their first frame whenever a slide settles.
  const lottieRefs = useRef<Record<string, LottieView | null>>({});
  const playActive = useCallback((li: number) => {
    const activeId = LOOP_SLIDES[li]?.id;
    Object.entries(lottieRefs.current).forEach(([id, ref]) => {
      if (!ref) return;
      if (id === activeId) {
        ref.reset();
        ref.play();
      } else {
        ref.reset();
      }
    });
  }, []);

  // ----- Headline crossfade ----------------------------------------
  // The headline does NOT track the scroll — it changes only once the
  // image has settled (on momentum end), so the interaction reads as
  // "image arrives, then text changes." A fade-out + slight rise hands
  // off to a fade-in from below of the new headline.
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const headlineOpacity = useSharedValue(1);
  const headlineShift = useSharedValue(0);
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineShift.value }],
  }));
  const applyHeadline = useCallback((idx: number) => setHeadlineIdx(idx), []);
  const transitionHeadline = useCallback(
    (idx: number) => {
      headlineOpacity.value = withTiming(0, {
        duration: 180,
        easing: Easing.in(Easing.cubic),
      });
      headlineShift.value = withTiming(
        -10,
        { duration: 180, easing: Easing.in(Easing.cubic) },
        (finished) => {
          'worklet';
          if (!finished) return;
          // Swap text while invisible, then fade the new line in from
          // just below its resting position.
          runOnJS(applyHeadline)(idx);
          headlineShift.value = 12;
          headlineOpacity.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          });
          headlineShift.value = withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          });
        }
      );
    },
    [applyHeadline, headlineOpacity, headlineShift]
  );

  // ----- Auto-advance ----------------------------------------------
  // Re-arms whenever the settled slide changes (or pause flips). Always
  // steps FORWARD by one loop index; landing on the clone is resolved to
  // a seamless jump in handleMomentumEnd.
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: loopIndex + 1,
        animated: true,
      });
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [loopIndex, paused]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      let li = Math.round(x / PAGE_W);
      // Settled on the clone of slide 1 → silently rewind to the real
      // slide 1. animated:false means no momentum-end re-fire.
      if (li === LOOP_SLIDES.length - 1) {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        li = 0;
      }
      setLoopIndex(li);
      // Animate the just-settled slide; reset the others to frame 0.
      playActive(li);
      const real = li % SLIDES.length;
      if (real !== headlineIdx) transitionHeadline(real);
      setPaused(false);
    },
    [PAGE_W, headlineIdx, transitionHeadline, playActive]
  );

  const handleScrollBeginDrag = useCallback(() => setPaused(true), []);

  // Login: the app-wide login sheet opens over this screen. After a login
  // the user enters the app; a new account gets the greeting first.
  const { open: openLogin } = useLoginSheet();
  const openLoginSheet = useCallback(() => {
    openLogin({
      source: 'onboarding',
      onSuccess: ({ isSignup, name }) => {
        if (isSignup && name) {
          navigation.navigate('Greeting', { name });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] });
        }
      },
    });
  }, [openLogin, navigation]);

  // Login is optional. "Get Started" enters the app as a guest (Home, card
  // discovery and Offers need no account); the phone + OTP sheet is one tap
  // away via "Log in", and again from Earnings / Profile.
  const enterAsGuest = useCallback(() => {
    markOnboarded().catch(() => undefined);
    analytics.track(Events.ONBOARDING_GUEST_START);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] });
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
      {/* Light icons over the blue onboarding / dimmed login backdrop. */}
      <StatusBar style="light" />
      {/* Base brand backdrop — also the fallback behind the Lottie while
          it loads and at the edges `cover` may not reach on odd aspect
          ratios. */}
      <ImageBackground
        source={images.backgrounds.onboarding}
        resizeMode="cover"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Full-bleed animated hero carousel — one full-screen Lottie per
          slide, swipeable + auto-advancing. Sits above the backdrop and
          below the floating chrome. Lottie views don't capture touches,
          so the FlatList still pages normally over them. */}
      <FlatList
        ref={listRef}
        data={LOOP_SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumEnd}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        // Fixed item width → reliable scrollToIndex for the
        // auto-advance, no onScrollToIndexFailed.
        getItemLayout={(_, index) => ({
          length: PAGE_W,
          offset: PAGE_W * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <View style={{ width: PAGE_W, height: '100%' }}>
            <LottieView
              ref={(r) => {
                lottieRefs.current[item.id] = r;
              }}
              source={item.source}
              // Only the first slide auto-plays on mount; every later
              // slide is started imperatively by playActive() once it
              // settles (and the others reset to frame 0). loop keeps the
              // active slide animating through the full dwell.
              autoPlay={index === 0}
              loop
              // `cover` fills the screen on any aspect ratio — the figures
              // sit in the lower-middle of the 360×800 comp, so the small
              // top/bottom crop never clips a face.
              resizeMode="cover"
              style={{
                width: '100%',
                height: '100%',
                // Per-slide shrink (default 1) + downward nudge (default
                // 0). Listed translateY-then-scale so scale applies first
                // and the shift stays in screen-space points.
                transform: [
                  { translateY: item.offsetY ?? 0 },
                  { scale: item.scale ?? 1 },
                ],
              }}
            />
          </View>
        )}
      />

      {/* Floating chrome — headline (top) + progress / CTA (bottom),
          over the animation. `box-none` lets swipes in the open middle
          reach the carousel underneath; only the Button captures touches. */}
      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        style={{ flex: 1 }}
        pointerEvents="box-none"
      >
        <View
          pointerEvents="box-none"
          style={{
            flex: 1,
            paddingTop: spacing[64],
            paddingBottom: spacing[32],
            paddingHorizontal: spacing[20],
            justifyContent: 'space-between',
          }}
        >
          {/* Fixed-height box (3 lines) so the crossfade between a
              3-line and a 2-line headline never shifts the layout.
              The headline changes only when a slide settles. */}
          <View
            pointerEvents="none"
            style={{
              width: '100%',
              height: HEADLINE_HEIGHT,
              justifyContent: 'center',
            }}
          >
            <Animated.View style={headlineStyle}>
              <Text
                variant="display36ExtraBold"
                color={colors.text.onColor}
                align="center"
                style={{ width: '100%' }}
              >
                {SLIDES[headlineIdx].headline}
              </Text>
            </Animated.View>
          </View>

          {/* Bottom group — progress bars + Get Started. */}
          <View
            pointerEvents="box-none"
            style={{ width: '100%', alignItems: 'center', gap: spacing[24] }}
          >
            {/* Story-style timed progress bars — the same Indicator the
                store details PromoBanner uses. The active segment fills
                over the dwell time, so it reaches 100% exactly as the
                carousel advances. Settle-driven (loopIndex), so the fill
                stays in lockstep with the auto-advance timer. */}
            <Indicator
              variant="progress"
              total={SLIDES.length}
              active={loopIndex % SLIDES.length}
              durationMs={AUTO_ADVANCE_MS}
              // 80% (not full bleed) — shrinks each equal-flex step by 20%
              // per spec; the parent's alignItems:'center' keeps it centred.
              style={{ width: '80%' }}
            />

            <View style={{ width: '100%', alignItems: 'center', gap: spacing[12] }}>
              <Button
                label="Get Started"
                variant="solid"
                tone="main"
                size={52}
                fullWidth
                onPress={enterAsGuest}
              />
              <Pressable
                onPress={openLoginSheet}
                accessibilityRole="button"
                accessibilityLabel="Log in with your CashKaro account"
                hitSlop={spacing[8]}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  gap: spacing[4],
                  paddingVertical: spacing[8],
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text variant="body14Regular" color={colors.text.inverseMuted}>
                  Already on CashKaro?
                </Text>
                <Text variant="body14SemiBold" color={colors.text.inverse}>
                  Log in
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>

    </View>
  );
}
