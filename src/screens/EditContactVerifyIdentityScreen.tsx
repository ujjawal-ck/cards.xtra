/**
 * EditContactVerifyIdentityScreen — step A of the email / mobile change
 * flow (Figma 3395:21424). Reached by tapping the edit pencil on the
 * Email or Mobile Number field in Account Settings.
 *
 * Verifies the user's identity with a 6-digit OTP sent to their existing
 * email + mobile, then proceeds to "enter new value".
 *
 * ── Figma note ──
 * The Figma OTP base here renders 4 slots, but per product this gate is
 * 6 digits — built with the OtpInput atom's length=6 variant.
 *
 * Top → bottom:
 *   1. Header (back) "Account Settings"               — REUSED organism.
 *   2. "Enter OTP" (body16SemiBold) + "Enter OTP sent to your existing
 *      email and mobile number" (body16Regular).
 *   3. OtpInput (6 slots) + "Resend OTP in: 30s" timer — REUSED atom.
 *   4. Sticky "Continue" footer (cobalt) — disabled until 6 digits.
 *      (Figma labels it "Save Changes"; using action-appropriate copy
 *      since this step advances rather than saves.)
 *
 * Demo: no live verify endpoint — any 6-digit code advances the flow.
 */
import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, OtpInput } from '../atoms';
import { Header, FooterButtons } from '../organisms';
import { colors, spacing } from '../tokens';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditContactVerifyIdentity'>;
type Rt = RouteProp<RootStackParamList, 'EditContactVerifyIdentity'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export function EditContactVerifyIdentityScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const field = params.field;

  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const isComplete = otp.length === OTP_LENGTH;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <Header
            leading="back"
            title="Account Settings"
            onLeadingPress={() => navigation.goBack()}
          />

          <View style={{ flex: 1, paddingTop: spacing[24], gap: spacing[24] }}>
            <View style={{ paddingHorizontal: spacing[16], gap: spacing[12] }}>
              <Text variant="body16SemiBold" color={colors.text.primary}>
                Enter OTP
              </Text>
              <Text variant="body16Regular" color={colors.text.primary}>
                Enter OTP sent to your existing email and mobile number
              </Text>
            </View>

            <OtpInput
              length={OTP_LENGTH}
              value={otp}
              onChangeText={setOtp}
              autoFocus
              resend={secondsLeft > 0 ? 'timer' : 'ready'}
              seconds={secondsLeft}
              onResend={() => {
                setOtp('');
                setSecondsLeft(RESEND_SECONDS);
              }}
            />
          </View>

          <FooterButtons
            buttons="single"
            color="second"
            size={52}
            shadow="off"
            primaryLabel="Continue"
            primaryDisabled={!isComplete}
            onPrimary={() =>
              navigation.navigate('EditContactEnterNew', { field })
            }
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
