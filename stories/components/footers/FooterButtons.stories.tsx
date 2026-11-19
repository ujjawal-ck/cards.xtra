import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

const noop = () => {};
const TONES = ['success', 'error', 'brand', 'gray', 'warning', 'info', 'purple', 'sky', 'rose'] as const;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: 360, paddingTop: spacing[24], backgroundColor: colors.background.default, justifyContent: 'flex-end' }}>{children}</View>
);

const meta = {
  title: 'Components/Footers/FooterButtons',
  component: FooterButtons,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/FooterButtons.tsx',
    docs: { description: { component: 'The sticky action bar at the bottom of a screen: one or two buttons, an optional caption or terms strip above them, and a lift shadow.' } },
  },
  decorators: [(Story) => <Frame><Story /></Frame>],
  argTypes: {
    buttons: { control: 'inline-radio', options: ['single', 'dual', 'dual-outline'] },
    size: { control: 'inline-radio', options: [44, 52] },
    shadow: { control: 'inline-radio', options: ['on', 'off'] },
    strip: { control: 'inline-radio', options: ['none', 'caption', 'tnc'] },
    color: { control: 'inline-radio', options: ['main', 'second', 'mixed'] },
    primaryLabel: { control: 'text' },
    secondaryLabel: { control: 'text' },
    stripText: { control: 'text' },
    stripTone: { control: 'select', options: TONES },
    tncChecked: { control: 'boolean' },
    stripLinkLabels: { control: 'object' },
    primaryIcon: { control: 'inline-radio', options: ['none', 'leading', 'trailing', 'only'] },
    primaryIconName: { control: 'select', options: ['chevron-right', 'check-outline', 'lock-outline', 'wallet-outline'] },
    primaryDisabled: { control: 'boolean' },
    primaryLoading: { control: 'boolean' },
    shine: { control: 'boolean', description: 'Single layout only. Runs a reanimated shine across the primary button.' },
    onTncToggle: { control: false },
    onStripLinkPress: { control: false },
    onPrimary: { control: false },
    onSecondary: { control: false },
    style: { control: false },
  },
  args: {
    buttons: 'single',
    size: 44,
    shadow: 'on',
    strip: 'none',
    color: 'main',
    primaryLabel: 'Withdraw ₹1,250',
    secondaryLabel: 'Cancel',
    stripText: 'Cashback is added after the store confirms your order.',
    stripTone: 'info',
    tncChecked: false,
    primaryIcon: 'none',
    primaryDisabled: false,
    primaryLoading: false,
    shine: false,
    onPrimary: noop,
    onSecondary: noop,
    onTncToggle: noop,
    onStripLinkPress: noop,
  },
} satisfies Meta<typeof FooterButtons>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4] }}>
    <Text variant="body12Medium" color={colors.text.secondary}>{title}</Text>
    {children}
  </View>
);

function TncDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <FooterButtons buttons="single" strip="tnc" stripText="I agree to the Terms and Privacy Policy" tncChecked={checked} onTncToggle={setChecked} primaryLabel="Continue" primaryDisabled={!checked} onPrimary={noop} />
  );
}

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Layouts (single, dual, dual-outline), colours (main, second, mixed), sizes (44, 52), strips (caption, tnc) and primary icons.' } } },
  decorators: [(Story) => <View><Story /></View>],
  render: () => (
    <View style={{ width: 360, gap: spacing[24] }}>
      <Block title="single, size 44"><FooterButtons buttons="single" primaryLabel="Continue" onPrimary={noop} /></Block>
      <Block title="single, size 52"><FooterButtons buttons="single" size={52} primaryLabel="Continue" onPrimary={noop} /></Block>
      <Block title="dual, main"><FooterButtons buttons="dual" primaryLabel="Withdraw" secondaryLabel="Cancel" onPrimary={noop} onSecondary={noop} /></Block>
      <Block title="dual, mixed"><FooterButtons buttons="dual" color="mixed" primaryLabel="Withdraw" secondaryLabel="Cancel" onPrimary={noop} onSecondary={noop} /></Block>
      <Block title="dual, second"><FooterButtons buttons="dual" color="second" primaryLabel="Withdraw" secondaryLabel="Cancel" onPrimary={noop} onSecondary={noop} /></Block>
      <Block title="dual-outline"><FooterButtons buttons="dual-outline" primaryLabel="Withdraw" secondaryLabel="Cancel" onPrimary={noop} onSecondary={noop} /></Block>
      <Block title="strip caption, tone info"><FooterButtons buttons="single" strip="caption" stripText="Cashback is added after the store confirms your order." primaryLabel="Continue" onPrimary={noop} /></Block>
      <Block title="strip caption, tone warning"><FooterButtons buttons="single" strip="caption" stripTone="warning" stripText="Pending cashback can take up to 72 hours." primaryLabel="Continue" onPrimary={noop} /></Block>
      <Block title="strip tnc (tap the box)"><TncDemo /></Block>
      <Block title="primary icon trailing"><FooterButtons buttons="single" primaryLabel="Go to Amazon" primaryIcon="trailing" primaryIconName="chevron-right" onPrimary={noop} /></Block>
      <Block title="shadow off"><FooterButtons buttons="single" shadow="off" primaryLabel="Continue" onPrimary={noop} /></Block>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Primary disabled, primary loading, shine on (reanimated loop, check it runs on web), a long label, and an amount at ₹10,00,000.' } } },
  decorators: [(Story) => <View><Story /></View>],
  render: () => (
    <View style={{ width: 360, gap: spacing[24] }}>
      <Block title="primary disabled"><FooterButtons buttons="single" primaryLabel="Continue" primaryDisabled onPrimary={noop} /></Block>
      <Block title="primary loading"><FooterButtons buttons="single" primaryLabel="Continue" primaryLoading onPrimary={noop} /></Block>
      <Block title="shine"><FooterButtons buttons="single" shine primaryLabel="Apply Now" onPrimary={noop} /></Block>
      <Block title="long labels, dual"><FooterButtons buttons="dual" primaryLabel="Withdraw the full confirmed amount" secondaryLabel="Maybe later" onPrimary={noop} onSecondary={noop} /></Block>
      <Block title="₹10,00,000"><FooterButtons buttons="single" primaryLabel={`Withdraw ₹${(1000000).toLocaleString('en-IN')}`} onPrimary={noop} /></Block>
      <Block title="₹0, disabled"><FooterButtons buttons="single" primaryLabel={`Withdraw ₹${(0).toLocaleString('en-IN')}`} primaryDisabled onPrimary={noop} /></Block>
    </View>
  ),
};
