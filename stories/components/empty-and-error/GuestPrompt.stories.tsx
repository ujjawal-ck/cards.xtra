import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { GuestPrompt } from '../../../src/organisms/GuestPrompt';
import { ICON_NAMES } from '../../../src/atoms/Icon';
import { Block, Stack } from '../carousels/_chrome';
import { colors, spacing } from '../../../src/tokens';

const noop = () => {};
const wrap = (n: React.ReactNode) => <View style={{ paddingHorizontal: spacing[16] }}>{n}</View>;

const meta = {
  title: 'Components/Empty and error/GuestPrompt',
  component: GuestPrompt,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/GuestPrompt.tsx',
    docs: { description: { component: 'The signed-out card for account screens (Earnings, Profile): what logging in unlocks, one saffron Log in button, and a line that the same OTP creates an account.' } },
  },
  argTypes: {
    title: { control: 'text' },
    body: { control: 'text' },
    icon: { control: 'select', options: ICON_NAMES, description: 'Default wallet-outline.' },
    actionLabel: { control: 'text', description: 'Default "Log in".' },
    onLogin: { control: false, description: 'Opens the phone and OTP sheet in the app.' },
    style: { control: false },
  },
  args: {
    title: 'See every rupee you earn',
    body: 'Log in to track cashback from card applications and shopping, and withdraw it to UPI or a gift card.',
    icon: 'wallet-outline', actionLabel: 'Log in', onLogin: noop,
  },
} satisfies Meta<typeof GuestPrompt>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  decorators: [(Story) => <View style={{ width: 360, padding: spacing[16], backgroundColor: colors.background.default }}><Story /></View>],
};

export const Variants: Story = {
  render: () => (
    <Stack width={360}>
      <Block label="Earnings tab">{wrap(<GuestPrompt title="See every rupee you earn" body="Log in to track cashback from card applications and shopping, and withdraw it to UPI or a gift card." onLogin={noop} />)}</Block>
      <Block label="Profile tab (rewards icon)">{wrap(<GuestPrompt icon="feat-rewards-outline" title="Your CashKaro account" body="Log in to see your earnings, withdraw cashback and raise missing-cashback claims." onLogin={noop} />)}</Block>
      <Block label="Custom action label">{wrap(<GuestPrompt title="Track your orders" body="Log in to see orders from your partner stores." actionLabel="Continue with phone" onLogin={noop} />)}</Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The card has no loading or error state: it shows for a guest and is replaced by the screen when the session loads. The reassurance line reads "New to CashKaro?" and is fixed text. Open question: whether it should read Cards.xtra, to match the app name.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="Short copy">{wrap(<GuestPrompt title="Log in" body="Track your cashback." onLogin={noop} />)}</Block>
      <Block label="Long copy">{wrap(<GuestPrompt title="Log in to see everything that you have earned from every card and every store" body="Your cashback from card applications, shopping at partner stores, referral bonuses and missing cashback claims will all appear in one place once you are logged in, and you can withdraw it any time after it is confirmed." onLogin={noop} />)}</Block>
    </Stack>
  ),
};
