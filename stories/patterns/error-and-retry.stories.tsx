import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ScreenState } from '../../src/organisms/ScreenState';
import { InlineMessage } from '../../src/molecules/InlineMessage';
import { Input } from '../../src/atoms/Input';
import { Board, Phone, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/Error and retry',
  parameters: { layout: 'padded', docs: { description: { component: 'Say what failed, say what to do, and give a way to retry.' } } },
};
export default meta;
type Story = StoryObj;

export const LoadFailed: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/EarningsScreen.tsx:217', docs: { description: { story: 'A whole screen failed to load: ScreenState with a title, a cause line and "Try again".' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="Couldn’t load your earnings" body="Check your connection and try again." actionLabel="Try again" onAction={noop} />
    </Phone></Board>
  ),
};

export const Retrying: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OrdersList.tsx:411', docs: { description: { story: 'While the retry runs, the action label changes to "Retrying…". Orders, claims and transactions do this.' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="Couldn’t load your orders" body="Something went wrong. Please try again." actionLabel="Retrying…" onAction={noop} />
    </Phone></Board>
  ),
};

export const ServerSide: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OffersScreen.tsx:537', docs: { description: { story: 'When the cause is on our side, say so and do not blame the connection.' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="Couldn’t load offers" body="Something went wrong on our side. Please try again in a bit." actionLabel="Try again" onAction={noop} />
    </Phone></Board>
  ),
};

export const FieldError: Story = {
  tags: ['live'],
  parameters: { source: 'src/atoms/Input.tsx:71', docs: { description: { story: 'Inline field error: `state="error"` and a `hint` that says how to fix it. The error stays next to the field.' } } },
  render: () => (
    <Board><Phone>
      <Input label="UPI ID" value="user@" state="error" hint="Enter a valid UPI ID, like name@bank." onChangeText={noop} />
    </Phone></Board>
  ),
};

export const NetworkProblemProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 6 (WithdrawVerifyOTP, network failure)', docs: { description: { story: 'Proposed: replace the native Alert on a network or resend failure with an InlineMessage (tone warning). Open question: does a failed resend count toward the OTP rate limit (R20)?' } } },
  render: () => (
    <Board><Phone>
      <InlineMessage tone="warning" message="Connection problem. Please try again." />
    </Phone></Board>
  ),
};

export const BenefitsErrorProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 3 (CardDetailSheet, detail fetch failed)', docs: { description: { story: 'Proposed: a failed card-detail fetch today falls back silently (`src/organisms/CardDetailSheet.tsx:1111`). An InlineMessage in the benefits block with a retry. Open question: show the cached benefits above it, or hide them?' } } },
  render: () => (
    <Board><Phone>
      <InlineMessage tone="warning" message="Couldn't load all benefits for this card." action="single" primaryActionLabel="Try again" onPrimaryAction={noop} />
    </Phone></Board>
  ),
};

export const HomeCatalogueProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 2 (Home, catalogue error)', docs: { description: { story: 'Proposed: Home builds its own text and Pressable on error (`src/screens/HomeScreen.tsx:2244`). Use ScreenState, as Cards you can get already does. Open question: keep the masthead and tools row above it (assumed yes).' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="Couldn't load cards" body="Check your connection and try again." actionLabel="Try again" onAction={noop} />
    </Phone></Board>
  ),
};
