/**
 * DeleteAccountOtpScreen — OTP gate before final deletion (Figma
 * 3396:28591, file P7UcoZYBnfyefmJIA8wcM7). Reached from the Delete
 * Account landing's "Delete Account" CTA.
 *
 * Top → bottom:
 *   1. Header (back) "Delete Account"                 — REUSED organism.
 *   2. "Enter OTP" (body16SemiBold) + "OTP sent to 967XXXX551"
 *      (body14Regular) with a cobalt "Edit mobile" link.
 *   3. OtpInput (4 slots) + "Resend OTP in: 30s" timer — REUSED atom.
 *   4. Sticky "Submit" footer button (cobalt/accent) above the keyboard.
 *
 * Demo: there is no live delete-account verify endpoint, so any 6-digit
 * code is accepted and submitting advances to the Account Deleted screen.
 *
 * Token map:
 *   screen bg        → colors.background.default
 *   content px / gap → spacing[16] / spacing[24]
 *   heading          → body16SemiBold / text.primary
 *   sent-to copy     → body14Regular / text.secondary
 *   edit link        → body14Medium / text.link
 *   submit footer    → <FooterButtons buttons="single" color="second">
 */
import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, OtpInput } from '../atoms';
import { Header, FooterButtons } from '../organisms';
import { colors, spacing } from '../tokens';
import { analytics, Events } from '../analytics';
import { useProfile } from '../query/useProfile';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DeleteAccountOtp'>;

const OTP_LENGTH = 6; // OTPs are 6 digits app-wide (confirmed by product).
const RESEND_SECONDS = 30;

/** Mask a mobile number to "967XXXX551" (first 3 · XXXX · last 3). */
function maskMobile(raw?: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 7) return '••••••••••';
  return `${digits.slice(0, 3)}XXXX${digits.slice(-3)}`;
}

export function DeleteAccountOtpScreen() {
  const navigation = useNavigation<Nav>();
  const { data: profile } = useProfile();

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
            title="Delete Account"
            onLeadingPress={() => navigation.goBack()}
          />

          <View style={{ flex: 1, paddingTop: spacing[24], gap: spacing[24] }}>
            <View style={{ paddingHorizontal: spacing[16], gap: spacing[4] }}>
              <Text variant="body16SemiBold" color={colors.text.primary}>
                Enter OTP
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="body14Regular" color={colors.text.secondary}>
                  OTP sent to {maskMobile(profile?.mobileNumber)}
                </Text>
                <Text
                  variant="body14Medium"
                  color={colors.text.link}
                  onPress={() => navigation.goBack()}
                >
                  Edit mobile
                </Text>
              </View>
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

          {/* Sticky Submit — cobalt/accent, disabled until 6 digits entered. */}
          <FooterButtons
            buttons="single"
            color="second"
            size={52}
            shadow="off"
            primaryLabel="Submit"
            primaryDisabled={!isComplete}
            onPrimary={() => {
              analytics.track(Events.ACCOUNT_DELETE_SUBMIT);
              navigation.navigate('AccountDeleted');
            }}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
