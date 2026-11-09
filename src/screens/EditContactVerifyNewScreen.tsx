/**
 * EditContactVerifyNewScreen — step C of the email / mobile change flow
 * (Figma 3395:23891). Verifies the new value with a 6-digit OTP, then
 * returns to Account Settings with a success message.
 *
 * ── Figma note ──
 * The Figma OTP base renders 4 slots; per product this is 6 digits
 * (OtpInput length=6).
 *
 * Top → bottom:
 *   1. Header (back) "Account Settings"               — REUSED organism.
 *   2. "Enter OTP" (body16SemiBold) + "OTP sent to <new value>"
 *      (body14Regular) with a cobalt "Edit email/mobile" link (back).
 *   3. OtpInput (6 slots) + "Resend OTP in: 30s" timer — REUSED atom.
 *   4. Sticky "Verify" footer (cobalt) — disabled until 6 digits.
 *
 * On success: navigate('AccountSettings', { updated, newValue }) — this
 * pops the three flow screens off the stack, returning to the existing
 * Account Settings instance, which then shows the success message and the
 * updated value.
 *
 * Demo: no live verify endpoint — any 6-digit code completes the change.
 */
import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, OtpInput } from '../atoms';
import { Header, FooterButtons } from '../organisms';
import { colors, spacing } from '../tokens';
import { analytics, Events } from '../analytics';
import { FIELD_COPY, contactDisplay } from './editContact';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditContactVerifyNew'>;
type Rt = RouteProp<RootStackParamList, 'EditContactVerifyNew'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export function EditContactVerifyNewScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { field, newValue } = params;
  const copy = FIELD_COPY[field];

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
                  OTP sent to {contactDisplay(field, newValue)}
                </Text>
                <Text
                  variant="body14Medium"
                  color={colors.text.link}
                  onPress={() => navigation.goBack()}
                >
                  {copy.editLink}
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

          <FooterButtons
            buttons="single"
            color="second"
            size={52}
            shadow="off"
            primaryLabel="Verify"
            primaryDisabled={!isComplete}
            onPrimary={() => {
              analytics.track(Events.CONTACT_EDIT_SUBMIT, { field });
              navigation.navigate('AccountSettings', { updated: field, newValue });
            }}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
