/**
 * WithdrawAmazon — Figma withdraw/.../enter-amazon-mobile (3277:14556).
 *
 * Amazon Pay Balance details: mobile + confirm mobile, then send the payment
 * OTP and hand a draft to the shared OTP screen (which verifies + submits the
 * `amazongiftcard` payment). "Get Paid" is gated until both numbers match
 * (10 digits) and the T&C is checked; the number itself is validated
 * server-side at submit.
 */
import React, { useState } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useKeyboardPadding } from '../../lib/useKeyboardInset';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
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
import { normalizeIndianMobile, PHONE_INPUT_MAX_LENGTH } from '../../lib/phone';

type Nav = NativeStackNavigationProp<WithdrawStackParamList, 'WithdrawAmazon'>;
type Rt = RouteProp<WithdrawStackParamList, 'WithdrawAmazon'>;

const BODY_GROUP_GAP = spacing[40];

/** Light info note (Figma lavender box). */
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

export function WithdrawAmazon() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const keyboardPad = useKeyboardPadding();
  const { accessToken } = useAuth();
  const { data: info } = usePaymentInfo();

  const [mobile, setMobile] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);

  const valid = /^[6-9]\d{9}$/.test(mobile) && mobile === confirm;
  // Inline error on the first field (Figma 3283:52824): flagged once the user
  // leaves it with a partial number, or as soon as 10 digits don't form a
  // valid Indian mobile (6–9 start).
  const [mobileTouched, setMobileTouched] = useState(false);
  const mobileInvalid =
    (mobile.length === 10 && !/^[6-9]/.test(mobile)) ||
    (mobileTouched && mobile.length > 0 && mobile.length < 10);
  // Inline mismatch error on the re-enter field: flag as soon as what's typed
  // diverges from the first number (not only once both are full length).
  const confirmMismatch =
    confirm.length > 0 && confirm !== mobile.slice(0, confirm.length);

  const handleGetPaid = async () => {
    if (!accessToken || sending) return;
    setSending(true);
    try {
      const { otpGuid, sentToMobile } = await sendPaymentRequestOTP(accessToken);
      navigation.navigate('WithdrawVerifyOTP', {
        draft: {
          method: 'amazon',
          paymentType: params.paymentType,
          amount: params.amount,
          paymentMethodId: info?.methodIds.amazon ?? 12,
          mobile,
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
        {/* Scrollable so the second field and the note can be brought into
            view above the keyboard. */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[24], paddingBottom: spacing[24] }}
        >
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
              Enter Amazon Registered Mobile Number
            </Text>

            <View style={{ paddingHorizontal: spacing[16], gap: spacing[16] }}>
              <Input
                label="Mobile No."
                size="sm"
                value={mobile}
                onChangeText={(t) => setMobile(normalizeIndianMobile(t))}
                onBlur={() => setMobileTouched(true)}
                keyboardType="number-pad"
                maxLength={PHONE_INPUT_MAX_LENGTH}
                returnKeyType="next"
                state={mobileInvalid ? 'error' : undefined}
                hint={mobileInvalid ? 'Invalid mobile number' : undefined}
              />
              <Input
                label="Re-enter Mobile No."
                size="sm"
                value={confirm}
                onChangeText={(t) => setConfirm(normalizeIndianMobile(t))}
                keyboardType="number-pad"
                maxLength={PHONE_INPUT_MAX_LENGTH}
                returnKeyType="done"
                state={confirmMismatch ? 'error' : undefined}
                hint={confirmMismatch ? 'Mobile numbers do not match' : undefined}
              />
              <NoteBox>
                Amazon Pay Balance will be added to Amazon account linked with
                this number within 5 minutes. In rare cases it may take up to 72
                hours.
              </NoteBox>
            </View>
          </View>
        </ScrollView>
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
          onStripLinkPress={() => navigation.navigate('WithdrawTerms', { variant: 'amazon' })}
          primaryDisabled={!agreed || !valid}
          primaryLoading={sending}
          onPrimary={handleGetPaid}
          style={{ paddingBottom: insets.bottom }}
        />
      </Animated.View>
    </View>
  );
}
