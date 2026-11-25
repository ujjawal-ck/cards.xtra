import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { InlineMessage } from '../../../src/molecules/InlineMessage';
import { Text } from '../../../src/atoms';
import { spacing } from '../../../src/tokens';

const TONES = ['brand', 'gray', 'success', 'warning', 'error', 'info', 'sky', 'rose', 'purple'] as const;
const ICONS = ['check-circle-outline', 'message-outline', 'clock-outline', 'desc-exclamation'] as const;

const meta = {
  title: 'Components/Messages and tooltips/InlineMessage',
  component: InlineMessage,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/InlineMessage.tsx',
    docs: { description: { component: 'A message that sits in the page flow, with an optional title, up to two actions and a dismiss.' } },
  },
  argTypes: {
    tone: { control: 'select', options: TONES },
    icon: { control: 'select', options: [undefined, ...ICONS] },
    action: { control: 'select', options: ['none', 'single', 'two'] },
    title: { control: 'text' },
    message: { control: 'text' },
    primaryActionLabel: { control: 'text' },
    secondaryActionLabel: { control: 'text' },
    onDismiss: { control: false },
    onPrimaryAction: { control: false },
    onSecondaryAction: { control: false },
  },
  args: {
    tone: 'info',
    icon: 'message-outline',
    title: 'HDFC Millennia cashback',
    message: 'Your Amazon cashback of ₹1,250 is confirmed and moves to your wallet in 2 days.',
    action: 'single',
    primaryActionLabel: 'View details',
    secondaryActionLabel: 'Dismiss',
  },
  decorators: [(Story) => <View style={{ width: 360 }}><Story /></View>],
} satisfies Meta<typeof InlineMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

const Label = ({ children }: { children: string }) => (
  <Text variant="body12Medium" style={{ marginBottom: spacing[4], marginTop: spacing[12] }}>{children}</Text>
);

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <View style={{ width: 360 }}>
      <Label>action: none</Label>
      <InlineMessage tone="info" icon="message-outline" message="Cashback from Flipkart can take up to 90 days to confirm." />
      <Label>action: single</Label>
      <InlineMessage tone="info" icon="message-outline" message="Cashback from Flipkart can take up to 90 days to confirm." action="single" primaryActionLabel="Learn more" />
      <Label>action: two</Label>
      <InlineMessage tone="info" icon="message-outline" message="Cashback from Flipkart can take up to 90 days to confirm." action="two" primaryActionLabel="Learn more" secondaryActionLabel="Not now" />
      <Label>with title</Label>
      <InlineMessage tone="info" icon="message-outline" title="Order tracked" message="Your Myntra order is being tracked." />
      <Label>with dismiss</Label>
      <InlineMessage tone="info" icon="message-outline" message="Your Myntra order is being tracked." onDismiss={() => {}} />
      <Label>without icon</Label>
      <InlineMessage tone="info" message="Your Myntra order is being tracked." />
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'All nine tones, then long text, then a large rupee amount. The dismiss glyph is a plain "×" text, not an icon.' } } },
  render: () => (
    <View style={{ width: 360, gap: spacing[8] }}>
      {TONES.map((t) => (
        <InlineMessage key={t} tone={t} icon="message-outline" title={t} message="SBI Cashback card: ₹1,00,000 spent this month." action="single" primaryActionLabel="View" onDismiss={() => {}} />
      ))}
      <InlineMessage tone="warning" icon="desc-exclamation" title="Withdrawal on hold" message="Your withdrawal of ₹1,00,000 to the bank account ending 4321 is on hold. Our team verifies large withdrawals before payout, and this can take up to three working days." action="two" primaryActionLabel="Contact support" secondaryActionLabel="Got it" onDismiss={() => {}} />
      <InlineMessage tone="success" icon="check-circle-outline" message="Email updated to user@example.com" />
    </View>
  ),
};
