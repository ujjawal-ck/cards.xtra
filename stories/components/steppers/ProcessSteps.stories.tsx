import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ProcessSteps, type ProcessStep } from '../../../src/organisms/ProcessSteps';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

const STEPS: ProcessStep[] = [
  { title: 'Click on a store from CashKaro', caption: 'Pick the store and tap Shop Now' },
  { title: 'Shop as usual on the store', caption: 'Do not use another coupon site in between' },
  { title: 'Cashback shows as Pending', caption: 'Generally takes 2 to 72 hrs' },
  { title: 'Withdraw your cashback', caption: 'Minimum ₹250 to your bank or UPI' },
];

const meta = {
  title: 'Components/Steppers/ProcessSteps',
  component: ProcessSteps,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/ProcessSteps.tsx',
    docs: { description: { component: 'Vertical "what happens next" explainer: numbered saffron tiles joined by a dotted line, title and caption per step.' } },
  },
  decorators: [(Story) => <View style={{ width: 340 }}><Story /></View>],
  argTypes: { steps: { control: 'object' }, style: { control: false } },
  args: { steps: STEPS },
} satisfies Meta<typeof ProcessSteps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[8] }}>
    <Text variant="body12Medium" color={colors.text.secondary}>{title}</Text>
    {children}
  </View>
);

export const Variants: Story = {
  parameters: { docs: { description: { story: 'There is one layout. The caption is optional per step. The icon field of ProcessStep is declared but the tile shows the step number today.' } } },
  render: () => (
    <View style={{ width: 340, gap: spacing[24] }}>
      <Block title="title and caption"><ProcessSteps steps={STEPS.slice(0, 3)} /></Block>
      <Block title="title only"><ProcessSteps steps={STEPS.slice(0, 3).map(({ title }) => ({ title }))} /></Block>
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <View style={{ width: 340, gap: spacing[24] }}>
      <Block title="one step (no connector)"><ProcessSteps steps={STEPS.slice(0, 1)} /></Block>
      <Block title="eight steps">
        <ProcessSteps steps={Array.from({ length: 8 }, (_, i) => ({ title: `Step ${i + 1}: ${STEPS[i % 4].title}`, caption: STEPS[i % 4].caption }))} />
      </Block>
      <Block title="long copy">
        <ProcessSteps steps={[{ title: 'Place an order of ₹10,00,000 or more on the partner store using the CashKaro link only', caption: 'Orders placed through an app that was already open, or after clearing the cart, may not track at all' }, { title: 'Wait', caption: '₹0 until tracked' }]} />
      </Block>
    </View>
  ),
};
