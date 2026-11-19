import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { InlineMessage } from '../../../src/molecules/InlineMessage';
import { Input } from '../../../src/atoms/Input';
import { OtpInput } from '../../../src/atoms/OtpInput';
import { Text } from '../../../src/atoms/Text';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { colors, spacing } from '../../../src/tokens';
import { ProposedPage } from './_proposed';

const meta: Meta = {
  title: 'Flows/10 Offline and session/Mid-flow return',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const R17 = 'R17 (not built). Today the session ends, the login sheet opens, the cache clears, and the return to the step is not defined: the withdraw screens read only `accessToken`, and the login sheet has no `onSuccess` here. The result on screen is inferred, not seen. Open questions: (1) return to the same step with the entered values, or restart the step; (2) after login, does the money action repeat on its own (risk of a double payout or double claim) or does the user confirm again; (3) how long a withdraw OTP stays valid across the login.';

/** PROPOSED: the session ends on the withdraw OTP step. Details kept, the user logs in, then confirms again. */
export const WithdrawOtpSessionEnded: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: R17 + ' This design keeps the typed code and asks for an explicit tap after login (no automatic repeat of the payout).' } } },
  render: () => (
    <ProposedPage
      title="Verify OTP"
      footer={<View style={{ padding: spacing[16] }}><FooterButtons buttons="single" primaryLabel="Log in to continue" onPrimary={() => {}} /></View>}
    >
      <View style={{ padding: spacing[16], gap: spacing[16] }}>
        <InlineMessage tone="warning" title="Your session ended" message="Log in again to finish this withdrawal. Your payout has not been sent." />
        <Text variant="body14Regular" color={colors.text.secondary}>Enter the OTP sent to 98XXXXXX10</Text>
        <OtpInput length={6} value="482915" onChangeText={() => {}} />
      </View>
    </ProposedPage>
  ),
};

/** PROPOSED: the session ends while a claim is being submitted (amount step). */
export const ClaimSubmitSessionEnded: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: R17 + ' This design keeps the amount and shows that the claim was not submitted, so the user does not submit twice.' } } },
  render: () => (
    <ProposedPage
      title="Did You Shop?"
      footer={<View style={{ padding: spacing[16] }}><FooterButtons buttons="single" primaryLabel="Log in to continue" onPrimary={() => {}} /></View>}
    >
      <View style={{ padding: spacing[16], gap: spacing[16] }}>
        <Text variant="body16Bold" color={colors.text.primary}>Almost there! Tell us your order amount</Text>
        <Input size="sm" value="1299" onChangeText={() => {}} placeholder="Enter amount" />
        <InlineMessage tone="warning" title="Your session ended" message="Log in again to submit this claim. It has not been submitted yet." />
      </View>
    </ProposedPage>
  ),
};

/** PROPOSED: the session ends while an invoice is uploading (C1-Other and C2 claims). */
export const InvoiceUploadSessionEnded: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: R17 + ' The picked files live only in screen state and are lost on a restart: the biggest loss of the three. Open question: keep the files in memory across the login.' } } },
  render: () => (
    <ProposedPage
      title="Did You Shop?"
      footer={<View style={{ padding: spacing[16] }}><FooterButtons buttons="single" primaryLabel="Log in to continue" onPrimary={() => {}} /></View>}
    >
      <View style={{ padding: spacing[16], gap: spacing[16] }}>
        <Text variant="body16Bold" color={colors.text.primary}>Upload your invoice</Text>
        <InlineMessage tone="warning" title="Your session ended" message="Log in again to raise your ticket. Your screenshots are still here." />
      </View>
    </ProposedPage>
  ),
};
