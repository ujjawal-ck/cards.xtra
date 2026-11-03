/**
 * OtpScreen — same hero as Login; white sheet holds an OtpInput atom
 * (slots + hidden TextInput + resend row) and the Submit button.
 *
 * State here: the OTP value and the resend countdown. OtpInput owns the
 * slot rendering, the hidden capture-input, and the resend row's layout.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, OtpInput, Button } from '../atoms';
import { colors, spacing, radius } from '../tokens';
import { gradients } from '../theme/gradients';
import { useAuth } from '../auth/AuthContext';
import { login, loginOtp } from '../api/cashkaro';
import { analytics, Events } from '../analytics';
import { ApiError } from '../api/client';
import { play } from '../lib/haptics';
import { useKeyboardPadding } from '../lib/useKeyboardInset';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Otp'>;
type OtpRoute = RouteProp<RootStackParamList, 'Otp'>;

const OTP_LENGTH = 6; // OTPs are 6 digits app-wide (confirmed by product).
const RESEND_SECONDS = 30;

function formatPhone(raw?: string) {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length !== 10) return raw ?? '••••• •••••';
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function OtpScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<OtpRoute>();
  const insets = useSafeAreaInsets();
  const kbStyle = useKeyboardPadding();
  const { signIn, deviceId } = useAuth();

  const phone = route.params?.phone;
  const [otp, setOtp] = useState('');
  const [otpGuid, setOtpGuid] = useState(route.params?.otpGuid);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const isComplete = otp.length === OTP_LENGTH;

  const handleResend = async () => {
    if (!phone) return;
    setOtp('');
    setError(null);
    try {
      const { otpGuid: nextGuid } = await loginOtp(phone);
      analytics.track(Events.OTP_RESEND, { flow: 'login' });
      setOtpGuid(nextGuid);
      setSecondsLeft(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend OTP. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!isComplete || submitting) return;
    if (!phone || !otpGuid || !deviceId) {
      setError('Something went wrong. Please go back and request a new OTP.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await login({ mobileNumber: phone, otpGuid, otp, deviceId });
      analytics.track(Events.OTP_SUBMITTED, { flow: 'login', success: true });
      await signIn(session);
      analytics.track(Events.LOGIN, { method: 'otp' });
      play('success');
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e) {
      play('error');
      setError(e instanceof ApiError ? e.message : 'Could not verify OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="light" />

      {/* Keyboard avoidance via reanimated's IME insets (see useKeyboardPadding):
          paddingBottom = live keyboard height shrinks the flex:1 hero and lifts
          the white sheet (OTP slots) above the keys. Reliable under edge-to-edge
          where RN's KeyboardAvoidingView / Keyboard events are not. */}
      <Animated.View style={[{ flex: 1 }, kbStyle]}>
        {/* Gradient hero */}
        <LinearGradient
          colors={gradients.authHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <SafeAreaView
            edges={['top', 'left', 'right']}
            style={{
              flex: 1,
              paddingHorizontal: spacing[24],
              paddingTop: spacing[16],
            }}
          >
            <View style={{ gap: spacing[2] }}>
              <Text
                variant="heading24ExtraBold"
                color={colors.text.inverse}
              >
                Cards.xtra
              </Text>
              <Text
                variant="caption10Medium"
                color={colors.text.inverse}
                style={{ opacity: 0.8 }}
              >
                powered by CashKaro
              </Text>
            </View>

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text
                variant="heading30Bold"
                color={colors.text.inverse}
                style={{ opacity: 0.85 }}
              >
                Almost there…{'\n'}check your SMS
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* White form sheet */}
        <View
          style={{
            backgroundColor: colors.surface.default,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            paddingTop: spacing[24],
            paddingHorizontal: spacing[24],
            paddingBottom: Math.max(insets.bottom, spacing[16]) + spacing[8],
            gap: spacing[20],
            marginTop: -spacing[24],
            shadowColor: colors.surface.dark,
            shadowOpacity: 0.1,
            shadowRadius: spacing[16],
            shadowOffset: { width: 0, height: -spacing[4] },
            elevation: 8,
          }}
        >
          <View style={{ gap: spacing[4] }}>
            <Text variant="heading22SemiBold" color={colors.text.primary}>
              Enter OTP
            </Text>
            <Text variant="body14Regular" color={colors.text.secondary}>
              Sent to +91 {formatPhone(phone)}{'  '}
              <Text
                variant="body14SemiBold"
                color={colors.text.link}
                onPress={() => navigation.goBack()}
              >
                Change
              </Text>
            </Text>
          </View>

          <OtpInput
            length={OTP_LENGTH}
            value={otp}
            onChangeText={setOtp}
            autoFocus
            resend={secondsLeft > 0 ? 'timer' : 'ready'}
            seconds={secondsLeft}
            onResend={handleResend}
            // The sheet already pads horizontally (spacing[24]); the
            // atom's own paddingHorizontal would double-indent the slots.
            style={{ paddingHorizontal: 0 }}
          />

          {error ? (
            <Text variant="body12Regular" color={colors.feedback.error.text}>
              {error}
            </Text>
          ) : null}

          <Button
            label={submitting ? 'Verifying…' : 'Submit'}
            variant="solid"
            size={52}
            fullWidth
            disabled={!isComplete || submitting}
            onPress={handleSubmit}
          />
        </View>
      </Animated.View>
    </View>
  );
}
