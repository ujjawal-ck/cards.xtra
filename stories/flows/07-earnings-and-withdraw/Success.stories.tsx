import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, ScrollView } from 'react-native';
import { WithdrawSuccess } from '../../../src/screens/withdraw/WithdrawSuccess';
import { Text, Icon } from '../../../src/atoms';
import { ListRow } from '../../../src/molecules';
import { Header, FooterButtons } from '../../../src/organisms';
import { colors, spacing, radius, borderWidth } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { AMOUNT, ANDROID_360 } from './_shared';

/**
 * Flow 7, step 6. MONEY STEP. The payout was accepted. The Verify OTP step replaces the whole withdraw stack with this screen,
 * so Back cannot reopen it. Close and "Continue Shopping" both go to Home. The success mark is a placeholder icon (no animation asset ships).
 */
const meta: Meta = {
  title: 'Flows/7 Earnings and withdraw/Success',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/withdraw/WithdrawSuccess.tsx';
const Success = ({ method, amount = AMOUNT, width }: { method: 'upi' | 'amazon' | 'flipkart'; amount?: number; width?: number }) => (
  <ScreenHarness name="WithdrawSuccess" component={WithdrawSuccess} auth="signedIn" params={routeParams('WithdrawSuccess', { amount, method })} api={api.ok()} width={width} />
);

/** UPI: "₹1,240 withdrawn Successfully!" and the 72 hour note. */
export const Upi: Story = { tags: ['live'], parameters: { source: `${SRC}:45` }, render: () => <Success method="upi" /> };
/** Amazon Pay Balance: "Payment Initiated", within 5 minutes, rarely 72 hours. */
export const Amazon: Story = { tags: ['live'], parameters: { source: `${SRC}:45` }, render: () => <Success method="amazon" /> };
/** Flipkart gift card: "Payment Initiated", the gift card is emailed. */
export const Flipkart: Story = { tags: ['live'], parameters: { source: `${SRC}:45` }, render: () => <Success method="flipkart" /> };

/**
 * PROPOSED (R4). After success there is no record of this payout anywhere: the screen goes to Home, Payment History is hidden (D4),
 * and Earnings shows only a Paid total and a "payout settling" sheet. This adds a receipt card (amount, method, status, a reference)
 * and a "View in Earnings" action. The fields are a design guess.
 */
export const PayoutRecordProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: {
      description: {
        story:
          'Open question (R4): which fields does a payout record need, where does it live (this screen, Earnings, Payment History), and does CashKaro return a reference at accept time? Today the accepted response has a payment id only. Owner: product owner with the CashKaro backend team.',
      },
    },
  },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.background.default }}>
        <Header leading="close" align="end" />
        <ScrollView contentContainerStyle={{ alignItems: 'center', gap: spacing[24], paddingTop: spacing[32], paddingHorizontal: spacing[16] }}>
          <View style={{ width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.feedback.success.subtle, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check-circle-filled" size={48} color={colors.feedback.success.default} />
          </View>
          <Text variant="heading24Bold" color={colors.text.primary} align="center">{'₹1,240\nwithdrawn Successfully!'}</Text>
          <View style={{ alignSelf: 'stretch', backgroundColor: colors.surface.default, borderRadius: radius.xl, paddingHorizontal: spacing[16], paddingVertical: spacing[8], borderWidth: borderWidth.thin, borderColor: colors.border.default }}>
            <ListRow type="menu-option" title="Method: UPI (user@upi)" />
            <ListRow type="menu-option" title="Status: Processing, up to 72 hours" />
            <ListRow type="menu-option" title="Request: CKPAY0001" />
          </View>
        </ScrollView>
        <FooterButtons buttons="dual-outline" size={52} primaryLabel="Continue Shopping" secondaryLabel="View in Earnings" />
      </View>
    </PhoneFrame>
  ),
};

/** 360 dp Android width with a very large payout (₹10,00,000): the title is built from the amount, so this checks how it wraps in the narrow frame. Same screen after a re-check (Verify OTP, "Recheck found payout"). */
export const LargeAmount360: Story = {
  tags: ['live'],
  globals: ANDROID_360,
  parameters: { source: `${SRC}:118` },
  render: () => <Success method="upi" amount={1000000} width={360} />,
};
