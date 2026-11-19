import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { GainBand } from '../../../src/molecules/GainBand';
import { Frame, Label } from './_shared';

const TONES = ['success', 'brand', 'info', 'purple', 'gray'] as const;
const ICONS = ['feat-savings-outline', 'feat-rewards-outline', 'feat-discount-outline', 'check-circle-outline', 'clock-outline'] as const;

const meta = {
  title: 'Components/Cards/GainBand',
  component: GainBand,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/GainBand.tsx',
    docs: { description: { component: 'A flat colour band across the top of a card: icon, an optional big amount, and a caption, or the gray "Viewed" state.' } },
  },
  argTypes: {
    tone: { control: 'select', options: [...TONES] },
    icon: { control: 'select', options: [...ICONS] },
    text: { control: 'text' },
    amount: { control: 'text' },
    viewed: { control: 'boolean' },
  },
  args: { tone: 'success', icon: 'feat-savings-outline', text: 'less a year', amount: '₹1,180', viewed: false },
} satisfies Meta<typeof GainBand>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      {TONES.map((t, i) => (
        <React.Fragment key={t}>
          <Label>{`tone="${t}"`}</Label>
          <GainBand tone={t} icon={ICONS[i]} amount="₹1,180" text="less a year" />
        </React.Fragment>
      ))}
      <Label>no amount: caption in body14SemiBold</Label>
      <GainBand tone="info" icon="feat-rewards-outline" text="Same fees, better rewards" />
    </>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Viewed turns the band gray and adds a check and "Viewed" at the right end. On native a long caption shrinks to 85% before it is cut. On web `adjustsFontSizeToFit` does nothing, so a long caption only ends with an ellipsis.',
      },
    },
  },
  render: () => (
    <>
      <Label>viewed</Label>
      <GainBand tone="success" icon="feat-savings-outline" amount="₹1,180" text="less a year" viewed />
      <Label>amount ₹0</Label>
      <GainBand tone="gray" icon="clock-outline" amount="₹0" text="no change a year" />
      <Label>amount ₹10,00,000</Label>
      <GainBand tone="purple" icon="feat-rewards-outline" amount={`₹${(1000000).toLocaleString('en-IN')}`} text="more in rewards every year" />
      <Label>long caption, never cuts the amount</Label>
      <GainBand tone="success" icon="feat-savings-outline" amount="₹1,180" text="less a year on fees and fuel and dining and travel and shopping" />
      <Label>long caption, viewed (no shrink, ellipsis)</Label>
      <GainBand tone="info" icon="feat-savings-outline" amount="₹1,180" text="less a year on fees and fuel and dining and travel" viewed />
    </>
  ),
};
