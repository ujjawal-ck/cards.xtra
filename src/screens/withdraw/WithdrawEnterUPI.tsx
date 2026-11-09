/**
 * WithdrawEnterUPI — Figma withdraw/.../enter-upi (3248:12758, error 3283:49404).
 *
 * Collects the UPI ID, then sends the payment OTP (POST /users/sendotp) and
 * hands a draft to the shared OTP screen, which verifies + submits.
 *
 * The UPI ID is validated SERVER-SIDE at submit — we only do a lenient
 * "looks like vpa@psp" gate here so the Figma inline-error state is reachable
 * for obviously-malformed input (this replaces the old strict regex that
 * rejected valid handles).
 */
import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { useKeyboardPadding } from '../../lib/useKeyboardInset';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Input } from '../../atoms';
import { Header, Masthead, FooterButtons } from '../../organisms';
import { colors, spacing } from '../../tokens';
import type { WithdrawStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';
import { usePaymentInfo } from '../../query/usePaymentInfo';
import { sendPaymentRequestOTP } from '../../api/payments';
import { formatRupees } from './amount';
import { withdrawTitle, withdrawSubtitle } from './labels';

type Nav = NativeStackNavigationProp<WithdrawStackParamList, 'WithdrawEnterUPI'>;
type Rt = RouteProp<WithdrawStackParamList, 'WithdrawEnterUPI'>;

// Body group gap (Figma 36 → nearest token spacing[40]).
const BODY_GROUP_GAP = spacing[40];

// Lenient VPA shape: handle@psp, no spaces. Real validation is server-side.
const looksLikeUpi = (v: string) => /^[^\s@]+@[^\s@]+$/.test(v.trim());

export function WithdrawEnterUPI() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const keyboardPad = useKeyboardPadding();
  const { accessToken } = useAuth();
  const { data: info } = usePaymentInfo();

  const [upi, setUpi] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [sending, setSending] = useState(false);

  const handleGetPaid = async () => {
    if (!looksLikeUpi(upi)) {
      setShowError(true);
      return;
    }
    if (!accessToken || sending) return;
    setSending(true);
    try {
      const { otpGuid, sentToMobile } = await sendPaymentRequestOTP(accessToken);
      navigation.navigate('WithdrawVerifyOTP', {
        draft: {
          method: 'upi',
          paymentType: params.paymentType,
          amount: params.amount,
          paymentMethodId: info?.methodIds.upi ?? 20,
          upiId: upi.trim(),
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
              Enter Your UPI ID
            </Text>

            <View style={{ paddingHorizontal: spacing[16] }}>
              <Input
                label="Enter UPI ID"
                size="sm"
                value={upi}
                onChangeText={(t) => {
                  setUpi(t);
                  if (showError) setShowError(false);
                }}
                state={showError ? 'error' : undefined}
                hint={
                  showError
                    ? 'Invalid UPI ID. Please enter correct UPI ID'
                    : undefined
                }
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Lifts the footer above the keyboard. KeyboardAvoidingView did
          nothing on Android under edge-to-edge (see useKeyboardInset.ts),
          so the keys covered the CTA and T&C checkbox. */}
      <Animated.View style={keyboardPad}>
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
          onStripLinkPress={() => navigation.navigate('WithdrawTerms', { variant: 'upi' })}
          primaryDisabled={!agreed}
          primaryLoading={sending}
          onPrimary={handleGetPaid}
          style={{ paddingBottom: insets.bottom }}
        />
      </Animated.View>
    </View>
  );
}
