import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Toast } from '../../src/molecules/Toast';
import { InlineMessage } from '../../src/molecules/InlineMessage';
import { Board, Phone, Labelled, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/Toast and feedback',
  parameters: { layout: 'padded', docs: { description: { component: 'Transient feedback is a Toast. Feedback that must stay in the flow is an InlineMessage. Both take their colour from a tone.' } } },
};
export default meta;
type Story = StoryObj;

export const SuccessToast: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/ReviewUsScreen.tsx:306', docs: { description: { story: 'The one app Toast with real copy: tone success, one line, dismiss. It is on a hidden screen (D14). Each screen mounts its own Toast: there is no app-level host.' } } },
  render: () => (
    <Board><Phone>
      <Toast tone="success" icon="check-circle-outline" message="Your review is submitted successfully" onDismiss={noop} />
    </Phone></Board>
  ),
};

export const InlineInfo: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/tools/SpendQuizScreen.tsx:188', docs: { description: { story: 'Feedback that stays on the page is an InlineMessage. The spend quiz tells the user their earlier answers were restored.' } } },
  render: () => (
    <Board><Phone>
      <InlineMessage tone="info" message="Showing the spends you entered before." />
    </Phone></Board>
  ),
};

export const BalanceErrorProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 6 (Withdraw gate, balance could not load)', docs: { description: { story: 'Proposed: replaces a native Alert (`src/screens/withdraw/useWithdrawGate.tsx:72`). DS gap: Toast is mounted per screen, there is no app-level host. Open question: build one provider with `show({ tone, message, actionLabel, onActionPress })` before moving the Alerts.' } } },
  render: () => (
    <Board><Phone>
      <Toast tone="error" message="Couldn't load your balance. Check your connection and try again." action="single" actionLabel="Try again" onActionPress={noop} />
    </Phone></Board>
  ),
};

export const ClickOutErrorProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 3 (Apply click-out, user id not resolved)', docs: { description: { story: 'Proposed: replaces a native Alert (`src/lib/useClickOut.tsx:106`). Open question: Toast has no title, so "Couldn\'t open this." leads the message. Does a retry action belong here?' } } },
  render: () => (
    <Board><Phone>
      <Toast tone="error" message="Couldn't open this. We couldn't confirm your account, so cashback would not be tracked. Check your connection and try again." />
    </Phone></Board>
  ),
};
