import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardFeeStrip } from '../../../src/molecules/CardFeeStrip';
import { Frame, Label, inr } from './_shared';

const meta = {
  title: 'Components/Cards/CardFeeStrip',
  component: CardFeeStrip,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/CardFeeStrip.tsx',
    docs: { description: { component: 'The bottom strip of the Home tile: fees and a CTA. Three types: lifetime-free, discontinued, with-fees.' } },
  },
  argTypes: {
    type: { control: 'select', options: ['lifetime-free', 'discontinued', 'with-fees'] },
    joiningFee: { control: 'text' },
    annualFee: { control: 'text' },
    ctaLabel: { control: 'text' },
    joiningSub: { control: false },
    annualSub: { control: false },
    onPress: { control: false },
    style: { control: false },
  },
  args: { type: 'with-fees', joiningFee: '₹2,950', annualFee: '₹2,950', onPress: () => {} },
} satisfies Meta<typeof CardFeeStrip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      <Label>type="with-fees"</Label>
      <CardFeeStrip type="with-fees" joiningFee="₹2,950" annualFee="₹2,950" onPress={() => {}} />
      <Label>type="lifetime-free"</Label>
      <CardFeeStrip type="lifetime-free" onPress={() => {}} />
      <Label>type="discontinued"</Label>
      <CardFeeStrip type="discontinued" onPress={() => {}} />
      <Label>custom ctaLabel</Label>
      <CardFeeStrip type="with-fees" joiningFee="₹999" annualFee="₹999" ctaLabel="Check eligibility" onPress={() => {}} />
    </>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'With-fees defaults a missing fee to "Free". When the fees and the button do not fit one line (large text), the button wraps under the fees and stays right aligned.' } } },
  render: () => (
    <>
      <Label>fees ₹0</Label>
      <CardFeeStrip type="with-fees" joiningFee="₹0" annualFee="₹0" onPress={() => {}} />
      <Label>fees not given (defaults to Free)</Label>
      <CardFeeStrip type="with-fees" onPress={() => {}} />
      <Label>fees ₹10,00,000 (long amounts, the button may wrap)</Label>
      <CardFeeStrip type="with-fees" joiningFee={inr(1000000)} annualFee={inr(1000000)} onPress={() => {}} />
    </>
  ),
};
