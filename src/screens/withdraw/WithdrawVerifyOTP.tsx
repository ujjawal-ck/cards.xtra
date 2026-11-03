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
 * expired" + Resend (re-sends a fresh OTP). A submit failure (e.g. invalid
 * UPI/email) surfaces as an alert.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, OtpInput } from '../../atoms';
import { Header, Masthead, FooterButtons } from '../../organisms';
import { colors, spacing } from '../../tokens';
import { analytics, Events } from '../../analytics';
import { play } from '../../lib/haptics';
import type { WithdrawStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';
import {
  sendPaymentRequestOTP,
  verifyPaymentRequestOTP,
  verifyHasError,
  submitUPIPayment,
  submitAmazonPayment,
  submitFlipkartPayment,
} from '../../api/payments';
import { formatRupees } from './amount';
import { withdrawTitle } from './labels';

type Nav = NativeStackNavigationProp<WithdrawStackParamList, 'WithdrawVerifyOTP'>;
type Rt = RouteProp<WithdrawStackParamList, 'WithdrawVerifyOTP'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

type OtpError = 'none' | 'invalid' | 'expired';

export function WithdrawVerifyOTP() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { draft, maskedMobile } = params;

  const [otp, setOtp] = useState('');
  const [otpGuid, setOtpGuid] = useState(params.otpGuid);
  const [busy, setBusy] = useState(false); // verifying + submitting
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [error, setError] = useState<OtpError>('none');

  // Resend countdown — paused while busy / once expired.
  useEffect(() => {
    if (busy || error === 'expired') return;
    if (seconds <= 0) {
      setError('expired');
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, busy, error]);

  const verifyAndPay = async () => {
    if (busy || error === 'expired' || otp.length !== OTP_LENGTH) return;
    if (!accessToken || !otpGuid) {
      Alert.alert('Session expired', 'Please request a new OTP.');
      return;
    }
    setBusy(true);

    // 1) Verify OTP.
    let verifyRes: any;
    try {
      verifyRes = await verifyPaymentRequestOTP(accessToken, otpGuid, otp);
    } catch {
      setBusy(false);
      play('error');
      setError('invalid');
      return;
    }
    if (verifyHasError(verifyRes)) {
      setBusy(false);
      play('error');
      setError('invalid');
      return;
    }

    // 2) Submit the payment for the chosen method.
    try {
      const { method, paymentType, paymentMethodId } = draft;
      if (method === 'upi') {
        await submitUPIPayment(accessToken, paymentType, draft.upiId ?? '', otpGuid, paymentMethodId);
      } else if (method === 'amazon') {
        await submitAmazonPayment(accessToken, paymentType, draft.mobile ?? '', otpGuid, paymentMethodId);
      } else if (method === 'flipkart') {
        await submitFlipkartPayment(accessToken, paymentType, draft.email ?? '', otpGuid, paymentMethodId);
      }
      // Payout request accepted — the withdraw conversion.
      analytics.track(Events.WITHDRAW_SUBMIT, {
        method,
        payment_type: paymentType,
        amount: draft.amount,
      });
      navigation.navigate('WithdrawSuccess', { amount: draft.amount, method });
    } catch (e: any) {
      setBusy(false);
      play('error');
      Alert.alert('Payment failed', e?.message ?? 'Please try again.');
    }
  };

  // Auto-submit once the final digit lands.
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !busy && error !== 'expired') verifyAndPay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleChange = (v: string) => {
    setOtp(v);
    if (error === 'invalid') setError('none');
  };

  const handleResend = async () => {
    if (!accessToken || busy) return;
    setBusy(true);
    try {
      const { otpGuid: fresh } = await sendPaymentRequestOTP(accessToken);
      analytics.track(Events.WITHDRAW_OTP_RESEND);
      setOtpGuid(fresh);
      setOtp('');
      setError('none');
      setSeconds(RESEND_SECONDS);
    } catch (e: any) {
      Alert.alert('Could not resend OTP', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const otpState = error !== 'none' ? 'error' : busy ? 'default' : undefined;
  const otpHint =
    error === 'invalid'
      ? 'Enter a valid OTP'
      : error === 'expired'
      ? 'OTP is expired'
      : 'Help text';
  const otpResend = busy ? 'hidden' : error === 'expired' ? 'ready' : 'timer';

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
            subtitle="Cashback Available For Payment"
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
                  accessibilityLabel="Edit mobile"
                >
                  <Text variant="caption10SemiBold" color={colors.text.link}>
                    Edit mobile
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FooterButtons
          buttons="single"
          size={52}
          color="second"
          primaryLabel="Verify OTP"
          primaryLoading={busy}
          onPrimary={verifyAndPay}
          style={{ paddingBottom: insets.bottom }}
        />
      </KeyboardAvoidingView>

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
