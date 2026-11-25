import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { GuestPrompt } from '../../src/organisms/GuestPrompt';
import { EarnLoginSheet, type EarnLoginKind } from '../../src/organisms/EarnLoginSheet';
import { Board, Phone, Labelled, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/Guest gate',
  parameters: { layout: 'padded', docs: { description: { component: 'Login is optional (D12). A guest sees why logging in pays off, and is never blocked from a click-out.' } } },
};
export default meta;
type Story = StoryObj;

export const TabPrompt: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/EarningsScreen.tsx:165', docs: { description: { story: 'GuestPrompt replaces the content of an account-only tab. Earnings and Profile use it, each with its own icon, title and body.' } } },
  render: () => (
    <Board><Phone>
      <Labelled label="Earnings">
        <GuestPrompt title="See every rupee you earn" body="Log in to track cashback from card applications and shopping, and withdraw it to UPI or a gift card." onLogin={noop} style={{ alignSelf: 'stretch' }} />
      </Labelled>
      <Labelled label="Profile">
        <GuestPrompt icon="feat-rewards-outline" title="Your CashKaro account" body="Log in to see your earnings, withdraw cashback and raise missing-cashback claims." onLogin={noop} style={{ alignSelf: 'stretch' }} />
      </Labelled>
    </Phone></Board>
  ),
};

function Sheet({ kind }: { kind: EarnLoginKind }) {
  const ref = useRef<any>(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.present(), 300); return () => clearTimeout(t); }, []);
  return <View style={{ width: 390, height: 844, alignSelf: 'center' }}><EarnLoginSheet ref={ref} kind={kind} onLogin={noop} onContinue={noop} /></View>;
}

export const ClickOutCard: Story = {
  tags: ['live'],
  parameters: { layout: 'fullscreen', source: 'src/organisms/EarnLoginSheet.tsx:35', docs: { description: { story: 'A guest taps Apply on a card. The sheet says cashback needs a login and offers "Apply without cashback". Opens on mount.' } } },
  render: () => <Sheet kind="card" />,
};

export const ClickOutStore: Story = {
  tags: ['live'],
  parameters: { layout: 'fullscreen', source: 'src/organisms/EarnLoginSheet.tsx:38', docs: { description: { story: 'A guest taps Shop & Earn on a store. Same sheet, store copy, "Shop without cashback". Opens on mount.' } } },
  render: () => <Sheet kind="store" />,
};
