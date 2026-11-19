import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PaymentProcessingSheet } from '../../src/organisms/PaymentProcessingSheet';
import { ScreenState } from '../../src/organisms/ScreenState';
import { InlineMessage } from '../../src/molecules/InlineMessage';
import { images } from '../../src/assets/images';
import { Board, Phone, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/Money confirmation',
  parameters: { layout: 'padded', docs: { description: { component: 'A money step never leaves the user guessing: if the outcome is unknown, do not let them submit again.' } } },
};
export default meta;
type Story = StoryObj;

function Sheet() {
  const ref = useRef<any>(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.present(), 300); return () => clearTimeout(t); }, []);
  return <View style={{ width: 390, height: 844, alignSelf: 'center' }}><PaymentProcessingSheet ref={ref} amount="₹1,250" onBrowseDeals={noop} /></View>;
}

export const PayoutInProcess: Story = {
  tags: ['live'],
  parameters: { layout: 'fullscreen', source: 'src/screens/withdraw/useWithdrawGate.tsx:126', docs: { description: { story: 'A payout is already settling: Withdraw opens this sheet instead of a second request. Opens on mount.' } } },
  render: () => <Sheet />,
};

export const UnknownOutcomeProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 6 (WithdrawVerifyOTP, outcome unknown)', docs: { description: { story: 'Proposed: a timeout after the send is a money state in limbo. A native Alert today (`src/screens/withdraw/WithdrawVerifyOTP.tsx:89`). A full state that says not to request again. DS gap: ScreenState takes one action only. Open question: how long until the app checks the payout status by itself?' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState image={images.screenstate.tracking} title="We're confirming your withdrawal" body="This can take a few minutes. Don't request again until it shows in Earnings." actionLabel="Go to Earnings" onAction={noop} />
    </Phone></Board>
  ),
};

export const PayoutFailedProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 6 (WithdrawVerifyOTP, payout failed)', docs: { description: { story: 'Proposed: replaces the native Alert that disappears on tap (`src/screens/withdraw/WithdrawVerifyOTP.tsx:177`). An InlineMessage over the footer with a retry. Open question: can the user retry safely, or is the outcome unknown (see the story above)?' } } },
  render: () => (
    <Board><Phone>
      <InlineMessage tone="error" title="Withdrawal didn't go through" message="Please try again in a few minutes." action="single" primaryActionLabel="Try again" onPrimaryAction={noop} />
    </Phone></Board>
  ),
};
