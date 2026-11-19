/**
 * Proposed Verify OTP layouts, composed from DS parts only (no src/screens import).
 * Same frame as the live screen: Header, payment Masthead, OTP boxes, footer.
 * `notice` sits above the footer (InlineMessage), `body` replaces the OTP area (ScreenState).
 */
import React from 'react';
import { View } from 'react-native';
import { Text, OtpInput } from '../../../src/atoms';
import { Header, Masthead, FooterButtons } from '../../../src/organisms';
import { colors, spacing } from '../../../src/tokens';
import { PhoneFrame } from '../../../storybook/harness';
import { FAKE } from '../../../storybook/fixtures';

export function ProposedOtp({
  notice,
  body,
  otpError,
  otpHint,
  resend = 'timer',
  cta = 'Verify OTP',
}: {
  notice?: React.ReactNode;
  body?: React.ReactNode;
  otpError?: boolean;
  otpHint?: string;
  resend?: 'timer' | 'ready' | 'hidden';
  cta?: string;
}) {
  return (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.background.default }}>
        <View style={{ gap: spacing[24], flex: 1 }}>
          <Header leading="back" title="Withdraw Cashback" />
          <Masthead variant="payment" amount="₹1,240" subtitle="Cashback Available For Payment" />
          {body ?? (
            <View style={{ gap: spacing[24] }}>
              <View style={{ gap: spacing[8] }}>
                <Text variant="body16SemiBold" color={colors.text.primary} style={{ paddingHorizontal: spacing[16] }}>
                  Verify Using OTP
                </Text>
                <Text variant="body14Medium" color={colors.text.primary} style={{ paddingHorizontal: spacing[16] }}>
                  OTP sent to {FAKE.phone}
                </Text>
              </View>
              <OtpInput
                length={6}
                value="482913"
                onChangeText={() => undefined}
                state={otpError ? 'error' : undefined}
                hint={otpHint}
                resend={resend}
                seconds={12}
              />
            </View>
          )}
        </View>
        {notice ? <View style={{ paddingHorizontal: spacing[16], paddingBottom: spacing[12] }}>{notice}</View> : null}
        <FooterButtons buttons="single" size={52} color="second" primaryLabel={cta} />
      </View>
    </PhoneFrame>
  );
}
