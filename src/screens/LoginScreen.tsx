/**
 * LoginScreen — branded hero (navy→teal gradient) above a white sheet.
 *
 * Layout (vertical column):
 *   1. Gradient hero (fills available height)
 *      - SafeArea top inset
 *      - "Cards.xtra · powered by CashKaro" logo, top-left
 *      - Faded "Find The Perfect Card in Seconds" heading
 *      - Decorative floating-cards illustration
 *   2. White sheet with rounded top corners (form area)
 *      - "Log in or Sign up" heading + subtitle
 *      - Phone Input (+91 prefix)
 *      - "Get OTP" primary button (Saffron, fullWidth)
 *      - Terms footer
 *
 * Get OTP -> navigation.navigate('Otp', { phone }).
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Input, Button } from '../atoms';
import { useKeyboardPadding } from '../lib/useKeyboardInset';
import { colors, spacing, radius } from '../tokens';
import { gradients, decorativeCardColors } from '../theme/gradients';
import { loginOtp } from '../api/cashkaro';
import { analytics, Events } from '../analytics';
import { ApiError } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { normalizeIndianMobile, PHONE_INPUT_MAX_LENGTH } from '../lib/phone';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

function BrandLogo({ onDark = false }: { onDark?: boolean }) {
  const fg = onDark ? colors.text.inverse : colors.text.primary;
  const sub = onDark ? colors.text.inverse : colors.text.tertiary;
  return (
    <View style={{ gap: spacing[2] }}>
      <Text variant="heading24ExtraBold" style={{ color: fg }}>
        Cards.xtra
      </Text>
      <Text
        variant="caption10Medium"
        style={{ color: sub, opacity: onDark ? 0.8 : 1 }}
      >
        powered by CashKaro
      </Text>
    </View>
  );
}

function FloatingCards() {
  return (
    <View style={{ height: 120, marginTop: spacing[24] }}>
      {decorativeCardColors.slice(0, 3).map((bg, i) => {
        const offsets = [
          { left: '10%' as const, top: 20, rotate: '-8deg' },
          { left: '38%' as const, top: 0, rotate: '6deg' },
          { left: '64%' as const, top: 28, rotate: '-4deg' },
        ];
        const o = offsets[i];
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: o.left,
              top: o.top,
              width: 96,
              height: 60,
              borderRadius: radius.md,
              backgroundColor: bg,
              transform: [{ rotate: o.rotate }],
              shadowColor: colors.surface.dark,
              shadowOpacity: 0.25,
              shadowRadius: spacing[8],
              shadowOffset: { width: 0, height: spacing[4] },
              elevation: 6,
            }}
          />
        );
      })}
    </View>
  );
}

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const kbStyle = useKeyboardPadding();
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = phone.replace(/\D/g, '').length === 10;

  const handleGetOtp = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { otpGuid } = await loginOtp(phone);
      analytics.track(Events.OTP_REQUESTED, { method: 'phone', flow: 'login' });
      navigation.navigate('Otp', { phone, otpGuid });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="light" />

      {/* Keyboard avoidance via reanimated's IME insets (see useKeyboardPadding):
          paddingBottom = live keyboard height shrinks the flex:1 hero and lifts
          the white form sheet above the keys. Reliable under edge-to-edge where
          RN's KeyboardAvoidingView / Keyboard events are not. */}
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
            style={{ flex: 1, paddingHorizontal: spacing[24], paddingTop: spacing[16] }}
          >
            <BrandLogo onDark />

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text
                variant="heading30Bold"
                style={{
                  color: colors.text.inverse,
                  opacity: 0.85,
                }}
              >
                Find The Perfect{'\n'}Card in Seconds
              </Text>
              <FloatingCards />
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
            gap: spacing[16],
            // Lift the sheet slightly over the gradient.
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
              Log in or Sign up
            </Text>
            <Text variant="body14Regular" color={colors.text.secondary}>
              Enter your mobile number to continue
            </Text>
          </View>

          <Input
            label="Mobile Number"
            placeholder="+91 Enter 10-digit number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(t) => {
              setPhone(normalizeIndianMobile(t));
              if (error) setError(null);
            }}
            maxLength={PHONE_INPUT_MAX_LENGTH}
          />

          {error ? (
            <Text variant="body12Regular" color={colors.feedback.error.text}>
              {error}
            </Text>
          ) : null}

          <Button
            label={submitting ? 'Sending OTP…' : 'Get OTP'}
            variant="solid"
            tone="main"
            size={52}
            fullWidth
            disabled={!isValid || submitting}
            onPress={handleGetOtp}
          />

          <Text
            variant="body12Regular"
            color={colors.text.tertiary}
            style={{ textAlign: 'center' }}
          >
            By continuing, you agree to our{' '}
            <Text variant="body12SemiBold" style={{ color: colors.text.link }}>
              Terms
            </Text>{' '}
            and{' '}
            <Text variant="body12SemiBold" style={{ color: colors.text.link }}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
