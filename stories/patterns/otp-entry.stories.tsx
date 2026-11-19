import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OtpInput } from '../../src/atoms/OtpInput';
import { Board, Phone, Labelled, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/OTP entry',
  parameters: { layout: 'padded', docs: { description: { component: 'Six boxes (D19), a resend timer, and one error line under the boxes.' } } },
};
export default meta;
type Story = StoryObj;

function Otp({ initial, ...rest }: { initial: string } & Partial<React.ComponentProps<typeof OtpInput>>) {
  const [v, setV] = useState(initial);
  return <OtpInput length={6} value={v} onChangeText={setV} {...rest} />;
}

export const Entry: Story = {
  tags: ['live'],
  parameters: { source: 'src/auth/LoginSheetProvider.tsx:511', docs: { description: { story: 'Empty, then partly filled. The resend link counts down (`resend="timer"`).' } } },
  render: () => (
    <Board><Phone>
      <Labelled label="Empty, resend timer"><Otp initial="" resend="timer" seconds={24} onResend={noop} /></Labelled>
      <Labelled label="Partly filled"><Otp initial="482" resend="timer" seconds={18} onResend={noop} /></Labelled>
    </Phone></Board>
  ),
};

export const WrongCode: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/withdraw/WithdrawVerifyOTP.tsx:211', docs: { description: { story: 'Wrong or expired code: `state="error"` and a short hint under the boxes. The two hints below are the copy the withdraw screen uses.' } } },
  render: () => (
    <Board><Phone>
      <Labelled label="Invalid"><Otp initial="482915" state="error" hint="Enter a valid OTP" resend="ready" onResend={noop} /></Labelled>
      <Labelled label="Expired"><Otp initial="482915" state="error" hint="OTP is expired" resend="ready" onResend={noop} /></Labelled>
    </Phone></Board>
  ),
};

export const ResendReady: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/withdraw/WithdrawVerifyOTP.tsx:217', docs: { description: { story: 'Timer finished: the resend link is active. While the code is being verified, the resend is hidden and the boxes are blocked.' } } },
  render: () => (
    <Board><Phone>
      <Labelled label="Ready to resend"><Otp initial="" resend="ready" onResend={noop} /></Labelled>
      <Labelled label="Verifying (resend hidden)"><Otp initial="482915" state="default" resend="hidden" /></Labelled>
    </Phone></Board>
  ),
};
