/**
 * OnboardingScreen — Figma onboarding/landing (4817:47529).
 *
 * Sequence: Splash → Onboarding → (Get Started → Login bottom sheet
 * over the still-mounted onboarding) → Otp.
 *
 * Composition (existing components only — no new molecules):
 *   - <ImageBackground> — blue onboarding backdrop.
 *   - <FlatList horizontal pagingEnabled> — hero carousel, slides
 *     data-driven (1 placeholder + 2 pads today; append to add more).
 *   - <Text> atom — headline.
 *   - <Button> atom — "Get Started" → presents the login bottom sheet.
 *
 * Login sheet — INLINED to match the EligibleSheet / MaybeSheet
 * pattern used in FoundationCheck (a custom forwardRef wrapper's ref
 * was not propagating reliably to gorhom's BottomSheetModal, so the
 * modal never registered with BottomSheetModalProvider). Mounting the
 * `<GorhomBottomSheetModal>` directly here makes `ref.present()` work
 * the same way the existing eligibility sheets do.
 *
 * The dim scrim uses gorhom's stock `BottomSheetBackdrop` wrapped in
 * a View so the white Cards.xtra wordmark can sit absolutely on top
 * (pointerEvents='none' so tap-outside-to-dismiss still works).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ImageBackground,
  FlatList,
  Dimensions,
  Keyboard,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import LottieView from 'lottie-react-native';
import type { LottieViewProps } from 'lottie-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text, Button, Input, OtpInput, Indicator } from '../atoms';
import type { OtpInputHandle } from '../atoms';
import { BottomSheetHeader } from '../organisms';
import {
  colors,
  spacing,
  radius,
  opacity,
} from '../tokens';
import { images } from '../assets/images';
import { logos } from '../assets/logos';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { login, loginOtp, signup, signupOtp } from '../api/cashkaro';
import { analytics, Events } from '../analytics';
import { ApiError } from '../api/client';
import { eccentricName, dummyEmail, randomPassword } from '../lib/eccentricName';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

// Logo on the login scrim — Figma fixed 124.972 × 98.503; clean round.
const LOGO_W = 125;
const LOGO_H = 98;

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
  const insets = useSafeAreaInsets();
  const { signIn, deviceId } = useAuth();
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

  // Login sheet — gorhom modal mounted directly here (matches the
  // working EligibleSheet pattern from FoundationCheck).
  const loginSheetRef = useRef<BottomSheetModal>(null);
  // Sheet height is a single tall snap point (see loginSnapPoints below).
  // We used to lean on `enableDynamicSizing` + gorhom's `keyboardBehavior`,
  // but under Android edge-to-edge gorhom reads the keyboard height as ~0
  // and never lifted the sheet. The interim fix (a compact+tall pair we
  // re-snapped between on keyboard events) blurred the focused field on
  // every snap, so we now just open tall and never move the sheet.
  const [loginPhone, setLoginPhone] = useState('');
  const loginPhoneValid = loginPhone.replace(/\D/g, '').length === 10;

  // ONE fixed tall snap point — deliberately NOT a compact+tall pair we
  // re-snap between on keyboard events. On Android edge-to-edge, calling
  // snapToIndex() while a field is focused BLURS that field (moving the
  // sheet tears down the focused input's connection), which produced two
  // bugs: (1) autoFocus fired keyboardDidShow during present(), so the
  // snap-to-tall raced the open animation and the sheet stuck at the
  // compact height; (2) every keystroke kicked off focus→snap→blur→
  // keyboard-hide→snap-back, so only one digit landed per tap. Opening
  // tall once and never re-snapping kills both: the form clears the keypad
  // from the start, and the useAnimatedKeyboard spacer below handles any
  // scroll the keyboard would otherwise cover. [[gorhom-keyboard-edge-to-edge]]
  const loginSnapPoints = useMemo(() => ['90%'], []);

  // Live keyboard height (UI thread). useAnimatedKeyboard measures the IME
  // inset correctly under edge-to-edge when given the translucent flags — RN's
  // Keyboard events report ~0 here. Drives a scroll spacer at the bottom of the
  // sheet so the CTA + T&C can always be scrolled clear of the keypad, the same
  // way the (working) EligibilityCheckerSheet does it. [[gorhom-keyboard-edge-to-edge]]
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const keyboardSpacerStyle = useAnimatedStyle(() => ({
    height: keyboard.height.value,
  }));

  // Live y-coordinate of the sheet's top edge (in screen pixels).
  // Drives the floating Cards.xtra logo's `top` so the logo stays
  // pinned 5 px above whatever height the sheet ends up at — whether
  // that's its resting content height or its keyboard-lifted position.
  // Starts at screen-height (sheet closed, off-bottom).
  const loginSheetPosition = useSharedValue(
    Dimensions.get('window').height
  );
  // 5 px is a raw value — the spacing scale has 4 / 6 either side,
  // neither is the spec gap; left as a literal with this comment.
  const LOGO_GAP_ABOVE_SHEET = 5;

  // Track keyboard visibility so the inner content's paddingBottom
  // can flip between "20 px above home indicator" (keyboard down) and
  // "20 px above keyboard top" (keyboard up). Without dropping the
  // safe-area inset when the keyboard is up, the T&C would sit ~54 px
  // above the keyboard instead of the spec'd 20 px.
  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    // We only TRACK keyboard visibility here (to flip the body's bottom
    // padding) — we deliberately do NOT snapToIndex on these events any
    // more. Snapping the sheet while the phone field is focused blurred it
    // on Android edge-to-edge, which is what made typing drop after one
    // digit. The sheet opens tall (single snap point above) and the
    // useAnimatedKeyboard spacer keeps the CTA scrollable clear of the
    // keypad, so no movement is needed.
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardShown(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardShown(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ----- Two-stage sheet state machine -----------------------------
  // The sheet body holds two panels side-by-side ('phone' and 'otp')
  // inside a horizontally-translated slider. 'Get OTP' slides the
  // slider left to expose the OTP panel; 'Change' slides it back.
  type Stage = 'phone' | 'otp';
  const [stage, setStage] = useState<Stage>('phone');
  const [otp, setOtp] = useState('');
  // otp_guid returned by loginOtp/signupOtp — required to verify the code.
  const [otpGuid, setOtpGuid] = useState<string | undefined>(undefined);
  // Whether THIS OTP round is a signup (new number) vs a login (existing).
  // Decided in goToOtp: we try login first, and fall back to signup when the
  // backend says the number isn't registered. Drives which verify call runs.
  const [isSignup, setIsSignup] = useState(false);
  // Surfaced API failure (send / resend / verify), shown under the input.
  const [error, setError] = useState<string | null>(null);
  const OTP_LENGTH = 6;
  const RESEND_SECONDS = 30;
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  // Countdown tick — runs while > 0; resets when the user resends.
  useEffect(() => {
    if (stage !== 'otp' || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [stage, secondsLeft]);

  // Slider geometry. Each panel is exactly one sheet width, and the sheet is
  // full-screen-width, so the panel width is simply screenW. We deliberately
  // DON'T measure it via onLayout any more: that re-fired on every
  // keyboard-show / snap relayout, and the re-render churn was dropping the
  // phone field's focus mid-type (only one digit landed before the keypad
  // fell) AND leaving the sheet stuck at its compact snap instead of riding up.
  // A constant width removes that churn. (App is portrait-locked, so screenW
  // never changes at runtime.)
  // Slider progress: 0 = phone panel visible, 1 = otp panel visible.
  const stageProgress = useSharedValue(0);

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -stageProgress.value * screenW },
    ] as unknown as { translateX: number }[],
  }));

  // Ref to the OtpInput so we can hand keyboard focus over AFTER the
  // slide completes (when the OTP slot row — and thus its hidden
  // TextInput — is actually on-screen). Focusing while still off-screen
  // is what was causing iOS to drop the keyboard previously.
  const otpRef = useRef<OtpInputHandle>(null);

  // Get-OTP loading state — small spinner on the CTA while the slide
  // runs. Also locks re-entry into goToOtp.
  const [requesting, setRequesting] = useState(false);

  // Runs on the JS thread once the slide-to-OTP animation finishes —
  // pulled out so the worklet callback can `runOnJS` it.
  const handleSlideToOtpDone = useCallback(() => {
    setStage('otp');
    setSecondsLeft(RESEND_SECONDS);
    setRequesting(false);
    // OTP slot row is now on-screen, so focusing its hidden input is
    // a real focus transfer — iOS keeps the keyboard up because we're
    // moving from one BottomSheetTextInput to another in the same
    // session (phone Input was focused throughout the slide).
    otpRef.current?.focus();
  }, []);

  const goToOtp = useCallback(async () => {
    if (requesting || !loginPhoneValid) return;
    // Request the real OTP first; only slide to the OTP panel once
    // CashKaro has accepted the number and returned an otp_guid. Keep
    // the phone TextInput focused so the keyboard stays up across the
    // (usually fast) request and the slide that follows.
    setRequesting(true);
    setError(null);
    try {
      // Try login first. A new number isn't registered, so /loginotp rejects
      // it ("mobile number not registered with us") — fall back to the signup
      // OTP so first-timers can create an account in the same flow.
      let guid: string;
      let signupMode = false;
      try {
        ({ otpGuid: guid } = await loginOtp(loginPhone));
      } catch (loginErr) {
        if (loginErr instanceof ApiError && /not regist/i.test(loginErr.message)) {
          ({ otpGuid: guid } = await signupOtp(loginPhone));
          signupMode = true;
        } else {
          throw loginErr;
        }
      }
      setIsSignup(signupMode);
      analytics.track(Events.OTP_REQUESTED, {
        method: 'phone',
        flow: signupMode ? 'signup' : 'login',
      });
      setOtpGuid(guid);
      // handleSlideToOtpDone clears `requesting` and focuses the OTP input.
      stageProgress.value = withTiming(
        1,
        { duration: 320, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(handleSlideToOtpDone)();
        }
      );
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not send OTP. Please try again.'
      );
      setRequesting(false);
    }
  }, [requesting, loginPhoneValid, loginPhone, stageProgress, handleSlideToOtpDone]);

  const goToPhone = useCallback(() => {
    setStage('phone');
    setOtp('');
    setError(null);
    // Re-deciding the number means re-deciding login-vs-signup on next Get OTP.
    setIsSignup(false);
    stageProgress.value = withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [stageProgress]);

  // Verify OTP — fake-async loading state on the CTA, then dismiss
  // the sheet and reset the navigation stack to the main tabs.
  const [verifying, setVerifying] = useState(false);

  const loginPhoneFormatted = useMemo(() => {
    const d = loginPhone.replace(/\D/g, '');
    if (d.length !== 10) return loginPhone;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }, [loginPhone]);

  const handleResend = useCallback(async () => {
    setOtp('');
    setError(null);
    try {
      // Resend the same KIND of OTP we sent (signup vs login), so the new
      // otp_guid matches the verify call that follows.
      const { otpGuid: guid } = isSignup
        ? await signupOtp(loginPhone)
        : await loginOtp(loginPhone);
      analytics.track(Events.OTP_RESEND, { flow: isSignup ? 'signup' : 'login' });
      setOtpGuid(guid);
      setSecondsLeft(RESEND_SECONDS);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not resend OTP. Please try again.'
      );
    }
  }, [loginPhone, isSignup]);

  const handleVerifyOtp = useCallback(async () => {
    if (verifying) return;
    if (!otpGuid || !deviceId) {
      setError('Something went wrong. Please request a new OTP.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      // New number → create the account; the user only gave us a phone, so we
      // fill the required fullname/email/password behind the scenes (Home then
      // asks "what should we call you?"). Existing number → plain login.
      const session = isSignup
        ? await signup({
            fullname: eccentricName(),
            email: dummyEmail(loginPhone),
            password: randomPassword(),
            mobileNumber: loginPhone,
            otpGuid,
            otp,
            deviceId,
          })
        : await login({
            mobileNumber: loginPhone,
            otpGuid,
            otp,
            deviceId,
          });
      analytics.track(Events.OTP_SUBMITTED, {
        flow: isSignup ? 'signup' : 'login',
        success: true,
      });
      await signIn(session);
      analytics.track(isSignup ? Events.SIGN_UP : Events.LOGIN, { method: 'otp' });
      loginSheetRef.current?.dismiss();
      // Fresh signups go through the post-OTP name-capture + greeting handoff
      // (NameInput → Greeting → MainTabs); returning logins drop straight into
      // the app. The short delay lets the login sheet begin dismissing before
      // the cross-fade, so the handoff reads as one continuous moment.
      setTimeout(() => {
        if (isSignup) {
          navigation.navigate('NameInput' as never);
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' as never }],
          });
        }
      }, 200);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not verify OTP. Please try again.'
      );
      setVerifying(false);
    }
  }, [verifying, otpGuid, deviceId, loginPhone, otp, isSignup, signIn, navigation]);

  // Reset to the phone stage whenever the sheet closes, so the next
  // present() starts clean.
  // Legal links (Privacy Policy) push a stack screen, but the login sheet is
  // a portal that would stay on top of it. Close the sheet first, keep the
  // typed number, and re-open the sheet when the user comes back.
  const openingLegalRef = useRef(false);
  const openPrivacyPolicy = useCallback(() => {
    openingLegalRef.current = true;
    loginSheetRef.current?.dismiss();
    navigation.navigate('PrivacyPolicy');
  }, [navigation]);
  useFocusEffect(
    useCallback(() => {
      if (!openingLegalRef.current) return;
      openingLegalRef.current = false;
      loginSheetRef.current?.present();
    }, [])
  );

  const handleSheetDismiss = useCallback(() => {
    if (openingLegalRef.current) return; // temporary close for a legal page
    setStage('phone');
    setOtp('');
    setOtpGuid(undefined);
    setIsSignup(false);
    setLoginPhone('');
    setError(null);
    setSecondsLeft(RESEND_SECONDS);
    setVerifying(false);
    setRequesting(false);
    stageProgress.value = 0;
  }, [stageProgress]);

  const renderLoginBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => {
      const LogoLight = logos.lightBig;
      // Logo tracks the sheet's TOP EDGE live (via animatedPosition)
      // and fades in/out via opacity (via animatedIndex). The sheet's
      // height is now dynamic — content-sized at rest, lifted further
      // when the keyboard rises — so the logo can't sit at a fixed
      // `top`. Combining both into one animated style keeps the hook
      // surface small.
      const logoStyle = useAnimatedStyle(() => ({
        top: loginSheetPosition.value - LOGO_GAP_ABOVE_SHEET - LOGO_H,
        opacity: interpolate(
          props.animatedIndex.value,
          [-1, 0],
          [0, 1],
          Extrapolation.CLAMP
        ),
      }));
      return (
        <View style={props.style} pointerEvents="box-none">
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={opacity[80]}
            pressBehavior="close"
          />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                height: LOGO_H,
                alignItems: 'center',
                justifyContent: 'center',
              },
              logoStyle,
            ]}
          >
            <LogoLight width={LOGO_W} height={LOGO_H} />
          </Animated.View>
        </View>
      );
    },
    [loginSheetPosition]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
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

            <Button
              label="Get Started"
              variant="solid"
              tone="main"
              size={52}
              fullWidth
              onPress={() => loginSheetRef.current?.present()}
            />
          </View>
        </View>
      </SafeAreaView>

      {/* Login sheet — gorhom modal mounted directly (mirrors the
          EligibleSheet pattern from FoundationCheck). */}
      <BottomSheetModal
        ref={loginSheetRef}
        // Single tall snap (see loginSnapPoints). We do NOT re-snap on
        // keyboard events and do NOT use gorhom's `keyboardBehavior` —
        // both move the sheet, and moving it while the phone field is
        // focused blurs the field on Android edge-to-edge (the "one digit
        // then it deselects" bug). Opening tall + the keyboard spacer
        // below avoids any sheet movement while typing.
        snapPoints={loginSnapPoints}
        animatedPosition={loginSheetPosition}
        enablePanDownToClose
        onDismiss={handleSheetDismiss}
        backdropComponent={renderLoginBackdrop}
        handleComponent={() => null}
        // Android only: match the app manifest's resize mode while the sheet
        // is open. No `keyboardBehavior`/`keyboardBlurBehavior` — those act
        // solely on focused <BottomSheetTextInput> nodes, and this sheet now
        // uses plain inputs + the manual snap above for keyboard avoidance.
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          // CRITICAL: without this, tapping the Get OTP / Verify OTP
          // button (or any Pressable inside the sheet) triggers iOS's
          // "tap-outside-input dismisses keyboard" — the phone Input
          // blurs BEFORE onPress runs, gorhom sees no focused BSTI,
          // and the sheet drops. `'handled'` keeps the keyboard up
          // whenever a descendant captures the tap (every Button /
          // Pressable here does).
          keyboardShouldPersistTaps="handled"
        >
          <BottomSheetHeader showStroke={false} />
          {/* Stage container — clips both panels (each one screenW wide).
              The slider inside is horizontally laid out (row of two panels)
              and translates by -screenW to swap between phone <-> otp. */}
          <View
            style={{
              width: '100%',
              overflow: 'hidden',
              backgroundColor: colors.surface.default,
            }}
          >
            <Animated.View
              style={[
                {
                  flexDirection: 'row',
                  // Definite px width so each child panel can take screenW and
                  // the row sums to 2× width.
                  width: screenW * 2,
                },
                sliderStyle,
              ]}
            >
              {/* -------- Panel 1: phone / "Log in or Sign up" -- */}
              <View
                style={{
                  width: screenW,
                  paddingTop: spacing[24],
                  paddingBottom: keyboardShown
                    ? spacing[20]
                    : insets.bottom + spacing[20],
                  paddingHorizontal: spacing[20],
                  gap: spacing[24],
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: '100%',
                    alignItems: 'center',
                    gap: spacing[4],
                  }}
                >
                  <Text
                    variant="heading24SemiBold"
                    color={colors.text.primary}
                    align="center"
                  >
                    Log in or Sign up
                  </Text>
                  <Text
                    variant="body14Regular"
                    color={colors.text.secondary}
                    align="center"
                  >
                    We will send an OTP to verify
                  </Text>
                </View>

                <View style={{ width: '100%' }}>
                  {/* Plain <TextInput> (no useBottomSheetInput): gorhom's
                      BottomSheetTextInput re-applies its keyboard-tracking on
                      every controlled-value change, which on the new
                      architecture dropped focus after each digit. The sheet's
                      keyboard avoidance is handled by the single tall snap +
                      keyboard spacer, so we don't need gorhom to track this
                      input. */}
                  <Input
                    label="Mobile Number"
                    // number-pad: a 10-digit mobile needs no + * # keys, and it
                    // matches the OTP / Eligibility fields. (The "typing stops
                    // after one digit" focus drop was an Android-only re-measure
                    // bug fixed in the Input atom, independent of keyboardType.)
                    keyboardType="number-pad"
                    // autoFocus pops the keyboard the instant the sheet opens
                    // so it lands in the keyboard-up state the user expects
                    // (no extra tap). Safe now that the sheet never re-snaps
                    // on keyboard events — autoFocus used to race the
                    // snap-to-tall during present() and leave the sheet stuck
                    // at the compact height.
                    autoFocus
                    value={loginPhone}
                    onChangeText={(t) => {
                      setLoginPhone(t.replace(/\D/g, '').slice(0, 10));
                      if (error) setError(null);
                    }}
                    maxLength={10}
                  />
                </View>

                <Button
                  label="Get OTP"
                  variant="solid"
                  tone="second"
                  size={52}
                  fullWidth
                  loading={requesting}
                  disabled={!loginPhoneValid || requesting}
                  onPress={goToOtp}
                />

                {error && stage === 'phone' ? (
                  <Text
                    variant="body12Regular"
                    color={colors.feedback.error.text}
                    align="center"
                    style={{ width: '100%' }}
                  >
                    {error}
                  </Text>
                ) : null}

                {/* T&C — inline Text per spec. */}
                <Text
                  variant="body12Medium"
                  color={colors.text.secondary}
                  align="center"
                  style={{ width: '100%' }}
                >
                  By continuing, you agree to Cashkaro's{' '}
                  <Text
                    variant="body12Medium"
                    color={colors.text.link}
                  >
                    Terms & Conditions
                  </Text>
                  {' '}and{' '}
                  <Text
                    variant="body12Medium"
                    color={colors.text.link}
                    accessibilityRole="link"
                    onPress={openPrivacyPolicy}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>

              {/* -------- Panel 2: otp / "Enter OTP" ------------ */}
              <View
                style={{
                  width: screenW,
                  paddingTop: spacing[24],
                  paddingBottom: keyboardShown
                    ? spacing[20]
                    : insets.bottom + spacing[20],
                  paddingHorizontal: spacing[20],
                  gap: spacing[24],
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: '100%',
                    alignItems: 'center',
                    gap: spacing[4],
                  }}
                >
                  <Text
                    variant="heading24SemiBold"
                    color={colors.text.primary}
                    align="center"
                  >
                    Enter OTP
                  </Text>
                  <Text
                    variant="body14Regular"
                    color={colors.text.secondary}
                    align="center"
                  >
                    OTP sent on +91 {loginPhoneFormatted}{'  '}
                    <Text
                      variant="body14SemiBold"
                      color={colors.text.link}
                      onPress={goToPhone}
                    >
                      Change
                    </Text>
                  </Text>
                </View>

                {/* OtpInput stays mounted at all times — the parent
                    transfers keyboard focus to it imperatively (via
                    `otpRef.current?.focus()`) once the slide finishes, so
                    the keyboard never drops between the phone input and the
                    OTP input. Like the phone field it uses a plain input
                    (no useBottomSheetInput) — the sheet's manual snap keeps
                    it clear of the keypad. `alignItems: 'center'` centres
                    the slot row, the hint row, and the resend row. */}
                <OtpInput
                  ref={otpRef}
                  length={OTP_LENGTH}
                  value={otp}
                  onChangeText={(v) => {
                    setOtp(v);
                    if (error) setError(null);
                  }}
                  state={error && stage === 'otp' ? 'error' : undefined}
                  resend={secondsLeft > 0 ? 'timer' : 'ready'}
                  seconds={secondsLeft}
                  onResend={handleResend}
                  // width:'100%' is required — the parent panel uses
                  // alignItems:'flex-start' which would otherwise
                  // shrink OtpInput to its intrinsic content width,
                  // leaving alignItems:'center' nothing to centre
                  // against. Forcing full width gives the centre
                  // alignment horizontal slack so the slot row, hint
                  // row, and resend row all sit centred.
                  style={{
                    width: '100%',
                    paddingHorizontal: 0,
                    alignItems: 'center',
                  }}
                />

                {error && stage === 'otp' ? (
                  <Text
                    variant="body12Regular"
                    color={colors.feedback.error.text}
                    align="center"
                    style={{ width: '100%' }}
                  >
                    {error}
                  </Text>
                ) : null}

                <Button
                  label="Verify OTP"
                  variant="solid"
                  tone="second"
                  size={52}
                  fullWidth
                  loading={verifying}
                  disabled={otp.length !== OTP_LENGTH || verifying}
                  onPress={handleVerifyOtp}
                />
              </View>
            </Animated.View>
          </View>

          {/* Keyboard spacer — grows to the live keyboard height so the CTA +
              T&C can always be scrolled clear of the keypad, even on shorter
              screens or when the window doesn't resize under edge-to-edge. */}
          <Animated.View style={keyboardSpacerStyle} />
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}
