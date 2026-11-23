/**
 * WithdrawVerifyOTP — shared OTP step for every withdraw method.
 *   Figma 3248:13095 / 3277:14192 (gift card) + error 3283:50761 / expired
 *   3283:51654.
 *
 * 6-digit payment OTP (CashKaro /users/sendotp → /users/verify). On verify
 * success it submits the carried `draft` via /payment/paymentV1 (UPI / Amazon
 * / Flipkart), then routes to the method-specific success screen.
 *
 * States: invalid OTP → "Enter a valid OTP"; resend timer hits 0 → "OTP is
 * expired" + Resend (re-sends a fresh OTP). A 4xx from the payout (e.g.
 * invalid UPI/email) shows the server's message. Any other payout failure
 * means the outcome is unknown: the screen shows "Couldn't confirm your
 * withdrawal" and blocks Resend and Verify for the rest of its life.
 *
 * While verify + payout run, the screen can't be left (Back, header back,
 * Android Back, iOS swipe): usePreventRemove.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useKeyboardPadding } from '../../lib/useKeyboardInset';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, OtpInput } from '../../atoms';
import { Header, Masthead, FooterButtons } from '../../organisms';
import { colors, spacing } from '../../tokens';
import { analytics, Events } from '../../analytics';
import { play } from '../../lib/haptics';
import type { RootStackParamList, WithdrawStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';
import {
  sendPaymentRequestOTP,
  verifyPaymentRequestOTP,
  verifyHasError,
} from '../../api/payments';
import { ApiError } from '../../api/client';
import { useWithdraw, isPayoutRejection } from '../../query/mutations/withdraw';
import { formatRupees } from './amount';
import { withdrawTitle, withdrawSubtitle } from './labels';
import { useOfflineSubmitGuard } from './useOfflineSubmitGuard';

type Nav = NativeStackNavigationProp<WithdrawStackParamList, 'WithdrawVerifyOTP'>;
type Rt = RouteProp<WithdrawStackParamList, 'WithdrawVerifyOTP'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

type OtpError = 'none' | 'invalid' | 'expired';

export function WithdrawVerifyOTP() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const keyboardPad = useKeyboardPadding();
  const { accessToken } = useAuth();
  const { draft, maskedMobile } = params;
  const withdraw = useWithdraw();
  const { blockIfOffline, offlineToast } = useOfflineSubmitGuard();

  const [otp, setOtp] = useState('');
  const [otpGuid, setOtpGuid] = useState(params.otpGuid);
  const [busy, setBusy] = useState(false); // verifying + submitting, or resending
  // Verify + payout running: the screen must not be left (NAV-08).
  const [paying, setPaying] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [error, setError] = useState<OtpError>('none');

  // Resend countdown — paused while busy. Reaching 0 only re-enables
  // "Resend"; it does NOT expire the code. It used to mark the OTP expired
  // after 30 s and block Verify, so a user who took 35 s to read the SMS
  // couldn't submit a code the server would still accept.
  useEffect(() => {
    if (busy || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, busy]);

  // Synchronous re-entry guard. `busy` is React state, so the auto-submit
  // effect and a Verify tap landing in the same frame could both pass the
  // `busy` check and submit the payout twice. Resend uses it too.
  const inFlight = useRef(false);
  // Set once any payout on this screen ended with an unknown outcome. From
  // then on, Verify AND Resend are blocked for the rest of the screen's life:
  // the server may already have accepted the withdrawal, and a fresh OTP from
  // Resend must not open a way to request a second payout.
  const outcomeUnknown = useRef(false);
  // Set just before our own reset to the success screen, so the block on
  // leaving lets that one navigation through.
  const leaving = useRef(false);

  // Block Back / header back / Android Back / iOS swipe while verify + payout
  // run. Leaving mid-request hid the result from the user.
  usePreventRemove(paying, ({ data }) => {
    if (leaving.current) navigation.dispatch(data.action);
  });

  const showUnconfirmed = () => {
    Alert.alert(
      "Couldn't confirm your withdrawal",
      // Payment History still shows sample payouts, so don't send people
      // there. Earnings re-reads the live balance, and tapping Withdraw again
      // shows "payment in process" if this request did go through.
      'Your request may already have gone through. Check Earnings in a few minutes before trying again: a payout in progress shows up when you tap Withdraw.',
      [
        {
          text: 'Go to Earnings',
          // popTo, not navigate: navigate pushed a second MainTabs on top.
          onPress: () =>
            navigation
              .getParent<NativeStackNavigationProp<RootStackParamList>>()
              ?.popTo('MainTabs', { screen: 'Earnings' }),
        },
        { text: 'OK', style: 'cancel' },
      ],
    );
  };

  const verifyAndPay = async () => {
    if (inFlight.current || busy || otp.length !== OTP_LENGTH) return;
    if (outcomeUnknown.current) {
      showUnconfirmed();
      return;
    }
    if (!accessToken || !otpGuid) {
      Alert.alert('Session expired', 'Please request a new OTP.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setPaying(true);
    const done = () => {
      inFlight.current = false;
      setBusy(false);
      setPaying(false);
    };

    // 0) Offline: send nothing, keep the typed OTP.
    if (await blockIfOffline()) {
      done();
      return;
    }

    // 1) Verify OTP.
    let verifyRes: any;
    try {
      verifyRes = await verifyPaymentRequestOTP(accessToken, otpGuid, otp);
    } catch (e) {
      done();
      play('error');
      // A timeout / network drop is not a wrong OTP — don't tell the user it is.
      if (e instanceof ApiError && e.status === 0) {
        Alert.alert('Connection problem', e.message);
      } else {
        setError('invalid');
      }
      return;
    }
    if (verifyHasError(verifyRes)) {
      done();
      play('error');
      setError('invalid');
      return;
    }

    // 2) Submit the payment for the chosen method.
    try {
      const { method, paymentType } = draft;
      const outcome = await withdraw.mutateAsync({ draft, otpGuid });
      // Payout request accepted — the withdraw conversion.
      analytics.track(Events.WITHDRAW_SUBMIT, {
        method,
        payment_type: paymentType,
        amount: draft.amount,
        recheck: outcome.status === 'submitted_after_recheck',
      });
      inFlight.current = false;
      // Replace the whole withdraw stack with the success screen: Back from
      // success used to reopen this OTP screen frozen behind its busy overlay
      // (and could invite a resubmit). `leaving` lets this reset past the
      // block on leaving.
      leaving.current = true;
      navigation.reset({
        index: 0,
        routes: [{ name: 'WithdrawSuccess', params: { amount: draft.amount, method } }],
      });
    } catch (e: any) {
      done();
      play('error');
      if (isPayoutRejection(e)) {
        // A 4xx: CashKaro's real answer (e.g. invalid UPI ID). Show it.
        Alert.alert('Payment failed', e?.message ?? 'Please try again.');
      } else {
        // Everything else is an unknown outcome: PayoutUnknownError (timeout,
        // network, 429, 5xx after the re-check), PayoutInFlightError (another
        // payout is still running) or anything unexpected. Don't claim it
        // failed, and block any further payout from this screen.
        outcomeUnknown.current = true;
        showUnconfirmed();
      }
    }
  };

  // Auto-submit once the final digit lands.
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !busy) verifyAndPay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleChange = (v: string) => {
    setOtp(v);
    if (error !== 'none') setError('none');
  };

  const handleResend = async () => {
    // A fresh OTP would get past the block after an unknown outcome (QA-08).
    if (outcomeUnknown.current) {
      showUnconfirmed();
      return;
    }
    if (!accessToken || busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      if (await blockIfOffline()) return;
      const { otpGuid: fresh } = await sendPaymentRequestOTP(accessToken);
      analytics.track(Events.WITHDRAW_OTP_RESEND);
      setOtpGuid(fresh);
      setOtp('');
      setError('none');
      setSeconds(RESEND_SECONDS);
    } catch (e: any) {
      Alert.alert('Could not resend OTP', e?.message ?? 'Please try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const otpState = error !== 'none' ? 'error' : busy ? 'default' : undefined;
  const otpHint =
    error === 'invalid'
      ? 'Enter a valid OTP'
      : error === 'expired'
      ? 'OTP is expired'
      : undefined; // no hint below the boxes unless there's an error (was placeholder "Help text")
  const otpResend = busy ? 'hidden' : seconds <= 0 ? 'ready' : 'timer';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <View style={{ gap: spacing[24] }}>
          <Header
            leading="back"
            title={withdrawTitle(draft.paymentType)}
            onLeadingPress={() => navigation.goBack()}
          />

          <Masthead
            variant="payment"
            amount={formatRupees(draft.amount)}
            subtitle={withdrawSubtitle(draft.paymentType)}
          />

          <View style={{ gap: spacing[24] }}>
            <View style={{ gap: spacing[8] }}>
              <Text
                variant="body16SemiBold"
                color={colors.text.primary}
                style={{ paddingHorizontal: spacing[16] }}
              >
                Verify Using OTP
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingHorizontal: spacing[16],
                }}
              >
                <Text variant="body14Medium" color={colors.text.primary}>
                  OTP sent to {maskedMobile || 'your registered number'}
                </Text>
                <Pressable
                  onPress={() => navigation.goBack()}
                  hitSlop={spacing[8]}
                  accessibilityRole="button"
                  // Goes back to the UPI / Amazon / Flipkart form; the OTP
                  // number itself can't be changed here.
                  accessibilityLabel="Edit details"
                >
                  <Text variant="caption10SemiBold" color={colors.text.link}>
                    Edit details
                  </Text>
                </Pressable>
              </View>
            </View>

            <OtpInput
              length={OTP_LENGTH}
              value={otp}
              onChangeText={handleChange}
              state={otpState}
              autoFocus
              hint={otpHint}
              resend={otpResend}
              seconds={seconds}
              onResend={handleResend}
            />
          </View>
        </View>
      </SafeAreaView>

      {/* Lifts the footer above the keyboard. KeyboardAvoidingView did
          nothing on Android under edge-to-edge (see useKeyboardInset.ts),
          so the keys covered the CTA and T&C checkbox. */}
      <Animated.View style={keyboardPad}>
        {offlineToast}
        <FooterButtons
          buttons="single"
          size={52}
          color="second"
          primaryLabel="Verify OTP"
          primaryLoading={busy}
          onPrimary={verifyAndPay}
          style={{ paddingBottom: insets.bottom }}
        />
      </Animated.View>

      {/* Block input while verifying/submitting (Figma "verifying" overlay). */}
      {busy ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          onPress={() => undefined}
        />
      ) : null}
    </View>
  );
}
