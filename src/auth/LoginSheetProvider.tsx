/**
 * LoginSheetProvider — the ONE phone + OTP login sheet for the whole app.
 *
 * Any screen calls `useLoginSheet().open({ source, onSuccess })`. The sheet
 * slides up over the screen the user is on (no detour through Onboarding),
 * and after a successful login or signup it closes and runs `onSuccess`, so
 * the user continues exactly what they were doing (Apply opens the bank,
 * Missing Cashback opens the claim, Earnings fills in where they are).
 *
 * Onboarding is shown on first launch only; its "Log in" link uses this same
 * sheet. When a session expires (refresh token rejected), the sheet opens by
 * itself over the current screen; queries refetch once the user is back in.
 *
 * The sheet is a gorhom BottomSheetModal mounted directly here (the pattern
 * that registers reliably with BottomSheetModalProvider — see the history in
 * docs/decision.md). Steps inside are unchanged from the old onboarding
 * sheet: phone → OTP, plus a name when the number is new to CashKaro (D16).
 *
 * Mount inside BottomSheetModalProvider and NavigationContainer (App.js),
 * around RootNavigator, and pass the container ref.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Dimensions, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text, Button, Input, OtpInput } from '../atoms';
import type { OtpInputHandle } from '../atoms';
import { BottomSheetHeader } from '../organisms/BottomSheetHeader';
import { colors, spacing, radius } from '../tokens';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from './AuthContext';
import { markOnboarded } from './tokenStore';
import { login, loginOtp, signup, signupOtp } from '../api/cashkaro';
import { analytics, Events } from '../analytics';
import { ApiError } from '../api/client';
import { dummyEmail, randomPassword } from '../lib/eccentricName';
import { normalizeIndianMobile, PHONE_INPUT_MAX_LENGTH } from '../lib/phone';

export interface LoginSuccess {
  /** True when this OTP round created a new CashKaro account. */
  isSignup: boolean;
  /** Name typed during signup (empty for a returning login). */
  name: string;
  /** Fresh access token, for callers that must act right away (click-out). */
  accessToken: string;
}

export interface OpenLoginOptions {
  /** Where the prompt came from, for analytics (profile, earnings, apply…). */
  source: string;
  /** Runs once the user is signed in and the sheet has closed. */
  onSuccess?: (result: LoginSuccess) => void;
}

interface LoginSheetContextValue {
  open: (options: OpenLoginOptions) => void;
}

const LoginSheetContext = createContext<LoginSheetContextValue | undefined>(undefined);

export function useLoginSheet(): LoginSheetContextValue {
  const ctx = useContext(LoginSheetContext);
  if (!ctx) throw new Error('useLoginSheet must be used within a LoginSheetProvider');
  return ctx;
}

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
// Time for the sheet to start closing before the next screen / action runs,
// so the hand-off reads as one movement.
const HANDOFF_DELAY_MS = 200;

type Stage = 'phone' | 'otp';

export function LoginSheetProvider({
  navigationRef,
  children,
}: {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { signIn, deviceId, setDisplayName, status, sessionExpiredAt } = useAuth();
  const screenW = Dimensions.get('window').width;

  const sheetRef = useRef<BottomSheetModal>(null);
  const onSuccessRef = useRef<OpenLoginOptions['onSuccess']>(undefined);
  // Set just before a successful sign-in dismisses the sheet, so the dismiss
  // handler doesn't treat it as a cancel.
  const signedInRef = useRef(false);

  const open = useCallback((options: OpenLoginOptions) => {
    onSuccessRef.current = options.onSuccess;
    analytics.track(Events.LOGIN_SHEET_OPEN, { source: options.source });
    sheetRef.current?.present();
  }, []);

  // Session expired (refresh token rejected) → ask the user to log in again
  // over the screen they are on. Not on a manual logout (that never sets it).
  useEffect(() => {
    if (sessionExpiredAt && status === 'unauthenticated') {
      open({ source: 'session_expired' });
    }
  }, [sessionExpiredAt, status, open]);

  // Single tall snap point. Re-snapping while a field is focused blurs it on
  // Android edge-to-edge (typing stopped after one digit), so the sheet opens
  // tall once and never moves; the keyboard spacer below keeps the CTA
  // reachable. [[gorhom-keyboard-edge-to-edge]]
  const snapPoints = useMemo(() => ['90%'], []);
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const keyboardSpacerStyle = useAnimatedStyle(() => ({ height: keyboard.height.value }));

  // Only tracks keyboard visibility (to flip the bottom padding); never snaps.
  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardShown(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardShown(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ----- Form state -------------------------------------------------
  const [phone, setPhone] = useState('');
  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const [stage, setStage] = useState<Stage>('phone');
  const [otp, setOtp] = useState('');
  const [otpGuid, setOtpGuid] = useState<string | undefined>(undefined);
  // Login is tried first; a number not registered with CashKaro (code 2010)
  // falls back to the signup OTP, so first-timers create an account here.
  const [isSignup, setIsSignup] = useState(false);
  const [signupName, setSignupName] = useState('');
  // Two characters or more, with a letter (Latin or Devanagari). No Unicode
  // property escapes (Hermes).
  const signupNameValid =
    /[A-Za-zÀ-ɏऀ-ॿ]/.test(signupName) && signupName.trim().length >= 2;
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (stage !== 'otp' || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [stage, secondsLeft]);

  // Two panels side by side; the slider moves one sheet-width left for OTP.
  const stageProgress = useSharedValue(0);
  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -stageProgress.value * screenW }] as unknown as {
      translateX: number;
    }[],
  }));
  const otpRef = useRef<OtpInputHandle>(null);

  const handleSlideToOtpDone = useCallback(() => {
    setStage('otp');
    setSecondsLeft(RESEND_SECONDS);
    setRequesting(false);
    // Focus only once the OTP row is on screen, so iOS keeps the keyboard up.
    otpRef.current?.focus();
  }, []);

  const goToOtp = useCallback(async () => {
    if (requesting || !phoneValid) return;
    setRequesting(true);
    setError(null);
    try {
      let guid: string;
      let signupMode = false;
      try {
        ({ otpGuid: guid } = await loginOtp(phone));
      } catch (loginErr) {
        // Code 2010 = "Mobile number not registered with us" (CK doc). The text
        // check is a fallback in case a gateway drops the code.
        if (
          loginErr instanceof ApiError &&
          (loginErr.hasCode(2010) || /not regist/i.test(loginErr.message))
        ) {
          ({ otpGuid: guid } = await signupOtp(phone));
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
      stageProgress.value = withTiming(
        1,
        { duration: 320, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(handleSlideToOtpDone)();
        }
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send OTP. Please try again.');
      setRequesting(false);
    }
  }, [requesting, phoneValid, phone, stageProgress, handleSlideToOtpDone]);

  const goToPhone = useCallback(() => {
    setStage('phone');
    setOtp('');
    setError(null);
    setIsSignup(false);
    stageProgress.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [stageProgress]);

  const phoneFormatted = useMemo(() => {
    const d = phone.replace(/\D/g, '');
    return d.length === 10 ? `${d.slice(0, 5)}-${d.slice(5)}` : phone;
  }, [phone]);

  // One resend at a time: a double tap sent two SMS, and the otp_guid could
  // come from the other one, so the typed code failed as "invalid".
  const resendingRef = useRef(false);
  const handleResend = useCallback(async () => {
    if (resendingRef.current) return;
    resendingRef.current = true;
    setOtp('');
    setError(null);
    try {
      const { otpGuid: guid } = isSignup ? await signupOtp(phone) : await loginOtp(phone);
      analytics.track(Events.OTP_RESEND, { flow: isSignup ? 'signup' : 'login' });
      setOtpGuid(guid);
      setSecondsLeft(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend OTP. Please try again.');
    } finally {
      resendingRef.current = false;
    }
  }, [phone, isSignup]);

  const handleVerifyOtp = useCallback(async () => {
    if (verifying) return;
    if (!otpGuid || !deviceId) {
      setError('Something went wrong. Please request a new OTP.');
      return;
    }
    if (isSignup && !signupNameValid) {
      setError('Enter your name to create your account.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      // New number → create the account (email and password are generated:
      // login is OTP-only, nobody types them; see D16). Existing number →
      // plain login.
      const session = isSignup
        ? await signup({
            fullname: signupName.trim(),
            email: dummyEmail(phone),
            password: randomPassword(),
            mobileNumber: phone,
            otpGuid,
            otp,
            deviceId,
          })
        : await login({ mobileNumber: phone, otpGuid, otp, deviceId });
      analytics.track(Events.OTP_SUBMITTED, {
        flow: isSignup ? 'signup' : 'login',
        success: true,
      });
      await signIn(session);
      if (isSignup) await setDisplayName(signupName.trim()).catch(() => undefined);
      analytics.track(isSignup ? Events.SIGN_UP : Events.LOGIN, { method: 'otp' });
      markOnboarded().catch(() => undefined);
      signedInRef.current = true;
      const onSuccess = onSuccessRef.current;
      const result: LoginSuccess = {
        isSignup,
        name: isSignup ? signupName.trim() : '',
        accessToken: session.accessToken,
      };
      sheetRef.current?.dismiss();
      setTimeout(() => onSuccess?.(result), HANDOFF_DELAY_MS);
    } catch (e) {
      analytics.track(Events.OTP_FAILED, {
        flow: isSignup ? 'signup' : 'login',
        reason:
          e instanceof ApiError ? (e.status === 0 ? 'network' : `http_${e.status}`) : 'unknown',
      });
      setError(e instanceof ApiError ? e.message : 'Could not verify OTP. Please try again.');
      setVerifying(false);
    }
  }, [
    verifying,
    otpGuid,
    deviceId,
    isSignup,
    signupNameValid,
    signupName,
    phone,
    otp,
    signIn,
    setDisplayName,
  ]);

  // "Privacy Policy" link: close the sheet (it would cover the policy), open
  // the policy, and reopen the sheet with the typed number on the way back.
  const legalDetourRef = useRef(false);
  const openPrivacyPolicy = useCallback(() => {
    legalDetourRef.current = true;
    Keyboard.dismiss();
    sheetRef.current?.dismiss();
    setTimeout(() => navigationRef.navigate('PrivacyPolicy'), 150);
  }, [navigationRef]);
  useEffect(() => {
    return navigationRef.addListener('state', () => {
      if (!legalDetourRef.current) return;
      if (navigationRef.getCurrentRoute()?.name === 'PrivacyPolicy') return;
      setTimeout(() => {
        legalDetourRef.current = false;
        sheetRef.current?.present();
      }, 300);
    });
  }, [navigationRef]);

  // Reset to a clean phone step whenever the sheet closes (cancel or success).
  const handleDismiss = useCallback(() => {
    if (legalDetourRef.current) return;
    if (!signedInRef.current) onSuccessRef.current = undefined;
    signedInRef.current = false;
    setStage('phone');
    setOtp('');
    setOtpGuid(undefined);
    setIsSignup(false);
    setSignupName('');
    setPhone('');
    setError(null);
    setSecondsLeft(RESEND_SECONDS);
    setVerifying(false);
    setRequesting(false);
    stageProgress.value = 0;
  }, [stageProgress]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const value = useMemo(() => ({ open }), [open]);

  const panelStyle = {
    width: screenW,
    paddingTop: spacing[24],
    paddingBottom: keyboardShown ? spacing[20] : insets.bottom + spacing[20],
    paddingHorizontal: spacing[20],
    gap: spacing[24],
    alignItems: 'flex-start' as const,
  };

  return (
    <LoginSheetContext.Provider value={value}>
      {children}
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        handleComponent={() => null}
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          // Without this, tapping Get OTP / Verify blurs the input before
          // onPress runs on iOS and the sheet drops.
          keyboardShouldPersistTaps="handled"
        >
          <BottomSheetHeader showStroke={false} />
          <View style={{ width: '100%', overflow: 'hidden', backgroundColor: colors.surface.default }}>
            <Animated.View style={[{ flexDirection: 'row', width: screenW * 2 }, sliderStyle]}>
              {/* -------- Panel 1: phone ---------------------------- */}
              <View style={panelStyle}>
                <View style={{ width: '100%', alignItems: 'center', gap: spacing[4] }}>
                  <Text variant="heading24SemiBold" color={colors.text.primary} align="center">
                    Log in or sign up
                  </Text>
                  <Text variant="body14Regular" color={colors.text.secondary} align="center">
                    Enter your mobile number. We will text you a 6-digit OTP.
                  </Text>
                </View>

                <View style={{ width: '100%' }}>
                  {/* Plain input (not BottomSheetTextInput): gorhom's input
                      dropped focus after each digit on the new architecture. */}
                  <Input
                    label="Mobile Number"
                    keyboardType="number-pad"
                    autoFocus
                    value={phone}
                    onChangeText={(t) => {
                      setPhone(normalizeIndianMobile(t));
                      if (error) setError(null);
                    }}
                    maxLength={PHONE_INPUT_MAX_LENGTH}
                  />
                </View>

                <Button
                  label="Get OTP"
                  variant="solid"
                  tone="second"
                  size={52}
                  fullWidth
                  loading={requesting}
                  disabled={!phoneValid || requesting}
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

                <Text
                  variant="body12Medium"
                  color={colors.text.secondary}
                  align="center"
                  style={{ width: '100%' }}
                >
                  By continuing, you agree to the Terms & Conditions and{' '}
                  <Text
                    variant="body12Medium"
                    color={colors.text.link}
                    onPress={openPrivacyPolicy}
                    accessibilityRole="link"
                    suppressHighlighting
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>

              {/* -------- Panel 2: OTP ------------------------------ */}
              <View style={panelStyle}>
                <View style={{ width: '100%', alignItems: 'center', gap: spacing[4] }}>
                  <Text variant="heading24SemiBold" color={colors.text.primary} align="center">
                    {isSignup ? 'Verify and finish' : 'Enter the OTP'}
                  </Text>
                  <Text variant="body14Regular" color={colors.text.secondary} align="center">
                    OTP sent to +91 {phoneFormatted}
                    {'  '}
                    <Text variant="body14SemiBold" color={colors.text.link} onPress={goToPhone}>
                      Change
                    </Text>
                  </Text>
                </View>

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
                  style={{ width: '100%', paddingHorizontal: 0, alignItems: 'center' }}
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

                {isSignup ? (
                  <View style={{ width: '100%', gap: spacing[8] }}>
                    <Text variant="body12Regular" color={colors.text.secondary}>
                      New here? Add your name to create your account.
                    </Text>
                    <Input
                      label="Your name"
                      placeholder="As on your card"
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="name"
                      textContentType="name"
                      value={signupName}
                      onChangeText={(t) => {
                        setSignupName(t);
                        if (error) setError(null);
                      }}
                    />
                  </View>
                ) : null}

                <Button
                  label={isSignup ? 'Verify & create account' : 'Verify & log in'}
                  variant="solid"
                  tone="second"
                  size={52}
                  fullWidth
                  loading={verifying}
                  disabled={otp.length !== OTP_LENGTH || verifying || (isSignup && !signupNameValid)}
                  onPress={handleVerifyOtp}
                />
              </View>
            </Animated.View>
          </View>
          <Animated.View style={keyboardSpacerStyle} />
        </BottomSheetScrollView>
      </BottomSheetModal>
    </LoginSheetContext.Provider>
  );
}
