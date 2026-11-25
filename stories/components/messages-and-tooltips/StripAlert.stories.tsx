import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StripAlert } from '../../../src/molecules/StripAlert';
import { Text } from '../../../src/atoms';
import { spacing } from '../../../src/tokens';

const TONES = ['brand', 'gray', 'success', 'warning', 'error', 'info', 'sky', 'rose', 'purple'] as const;

const meta = {
  title: 'Components/Messages and tooltips/StripAlert',
  component: StripAlert,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/StripAlert.tsx',
    docs: { description: { component: 'A thin full-width strip attached to the top or bottom of a block, with one caption and an optional link CTA.' } },
  },
  argTypes: {
    tone: { control: 'select', options: TONES },
    layout: { control: 'select', options: ['center', 'left-cta'] },
    icon: { control: 'boolean' },
    leadingIcon: { control: 'select', options: ['message-outline', 'clock-outline', 'check-circle-outline', 'desc-exclamation'] },
    text: { control: 'text' },
    ctaLabel: { control: 'text' },
    onCtaPress: { control: false },
  },
  args: { tone: 'info', layout: 'left-cta', icon: true, text: 'Extra X% cashback on Amazon today', ctaLabel: 'Shop now' },
  decorators: [(Story) => <View style={{ width: 390 }}><Story /></View>],
} satisfies Meta<typeof StripAlert>;
export default meta;
type Story = StoryObj<typeof meta>;

const Label = ({ children }: { children: string }) => (
  <Text variant="body12Medium" style={{ marginBottom: spacing[4], marginTop: spacing[12] }}>{children}</Text>
);

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <View style={{ width: 390 }}>
      <Label>layout: center</Label>
      <StripAlert layout="center" text="Cashback tracked for your Flipkart order" />
      <Label>layout: left-cta</Label>
      <StripAlert layout="left-cta" text="Cashback tracked for your Flipkart order" ctaLabel="Details" />
      <Label>layout: left-cta with icon</Label>
      <StripAlert layout="left-cta" icon text="Cashback tracked for your Flipkart order" ctaLabel="Details" />
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The caption has numberOfLines=1, so long text is cut off with an ellipsis. In "center" layout the CTA is ignored. Open question for the owner: should long text wrap on a second line, or stay cut off?' } } },
  render: () => (
    <View style={{ width: 390, gap: spacing[4] }}>
      {TONES.map((t) => <StripAlert key={t} tone={t} layout="left-cta" icon text={`Tone ${t}: X% on Myntra`} ctaLabel="Shop now" />)}
      <StripAlert tone="warning" layout="left-cta" icon leadingIcon="clock-outline" text="Your HDFC Millennia application for ₹1,00,000 limit is awaiting documents and review" ctaLabel="Resume" />
      <StripAlert tone="success" layout="center" text="₹1,250 cashback added" />
    </View>
  ),
};
