/**
 * WithdrawFlipkart — Figma withdraw/.../enter-email-giftcard (3277:13812).
 *
 * Flipkart Gift Card details: email + confirm email, then send the payment
 * OTP and hand a draft to the shared OTP screen (which verifies + submits the
 * `flipkartgiftcard` payment). "Get Paid" is gated until both emails match
 * and the T&C is checked; the email is validated server-side at submit.
 */
import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Input } from '../../atoms';
import { Header, Masthead, FooterButtons } from '../../organisms';
import { colors, spacing, radius } from '../../tokens';
import type { WithdrawStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';
import { usePaymentInfo } from '../../query/usePaymentInfo';
import { sendPaymentRequestOTP } from '../../api/payments';
import { formatRupees } from './amount';
import { withdrawTitle, withdrawSubtitle } from './labels';

type Nav = NativeStackNavigationProp<WithdrawStackParamList, 'WithdrawFlipkart'>;
type Rt = RouteProp<WithdrawStackParamList, 'WithdrawFlipkart'>;

const BODY_GROUP_GAP = spacing[40];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.feedback.info.subtle,
        borderRadius: radius.lg,
        padding: spacing[12],
      }}
    >
      <Text variant="body12Regular" color={colors.text.primary}>
        <Text variant="body12SemiBold" color={colors.text.primary}>
          Note:{' '}
        </Text>
        {children}
      </Text>
    </View>
  );
}

export function WithdrawFlipkart() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { data: info } = usePaymentInfo();

  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);

  const valid = EMAIL_RE.test(email.trim()) && email.trim() === confirm.trim();
  // Inline errors (Figma 3283:51858 / 3283:52088), mirroring WithdrawAmazon:
  //   • "Invalid Email ID" on the first field once the user has left it.
  //   • "Emails don't match…" on Confirm as soon as what's typed diverges.
  const [emailTouched, setEmailTouched] = useState(false);
  const emailInvalid =
    emailTouched && email.trim().length > 0 && !EMAIL_RE.test(email.trim());
  const confirmMismatch =
    confirm.trim().length > 0 &&
    confirm.trim() !== email.trim().slice(0, confirm.trim().length);

  const handleGetPaid = async () => {
    if (!accessToken || sending) return;
    setSending(true);
    try {
      const { otpGuid, sentToMobile } = await sendPaymentRequestOTP(accessToken);
      navigation.navigate('WithdrawVerifyOTP', {
        draft: {
          method: 'flipkart',
          paymentType: params.paymentType,
          amount: params.amount,
          paymentMethodId: info?.methodIds.flipkart ?? 13,
          email: email.trim(),
        },
        otpGuid,
        maskedMobile: sentToMobile,
      });
    } catch (e: any) {
      Alert.alert('Could not send OTP', e?.message ?? 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <View style={{ gap: spacing[24] }}>
          <Header
            leading="back"
            title={withdrawTitle(params.paymentType)}
            onLeadingPress={() => navigation.goBack()}
          />

          <Masthead
            variant="payment"
            amount={formatRupees(params.amount)}
            subtitle={withdrawSubtitle(params.paymentType)}
          />

          <View style={{ gap: BODY_GROUP_GAP }}>
            <Text
              variant="body16SemiBold"
              color={colors.text.primary}
              style={{ paddingHorizontal: spacing[16] }}
            >
              Enter Email to Receive Gift Card
            </Text>

            <View style={{ paddingHorizontal: spacing[16], gap: spacing[16] }}>
              <Input
                label="Email"
                size="sm"
                value={email}
                onChangeText={setEmail}
                onBlur={() => setEmailTouched(true)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                state={emailInvalid ? 'error' : undefined}
                hint={emailInvalid ? 'Invalid Email ID' : undefined}
              />
              <Input
                label="Confirm Email"
                size="sm"
                value={confirm}
                onChangeText={setConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                state={confirmMismatch ? 'error' : undefined}
                hint={
                  confirmMismatch
                    ? 'Emails don’t match. Please re-enter email'
                    : undefined
                }
              />
              <NoteBox>
                The Gift Card will be sent to above email within 5 minutes. In
                rare cases it may take up to 72 hours.
              </NoteBox>
            </View>
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
          strip="tnc"
          primaryLabel="Get Paid"
          stripText="I agree to the terms & conditions governing payment transfer request listed here."
          tncChecked={agreed}
          onTncToggle={setAgreed}
          stripLinkLabels={['here']}
          onStripLinkPress={() => navigation.navigate('WithdrawTerms', { variant: 'flipkart' })}
          primaryDisabled={!agreed || !valid}
          primaryLoading={sending}
          onPrimary={handleGetPaid}
          style={{ paddingBottom: insets.bottom }}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
