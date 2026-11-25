import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Stepper, type StepperStep } from '../../../src/molecules/Stepper';
import { Text } from '../../../src/atoms';
import { images } from '../../../src/assets/images';
import { colors, spacing } from '../../../src/tokens';

const STEPS: StepperStep[] = [
  { title: 'Order placed', subtext: 'Shop through CashKaro' },
  { title: 'Cashback tracked', subtext: 'Within 72 hours' },
  { title: 'Cashback confirmed', subtext: 'After the return window' },
  { title: 'Cashback paid', subtext: 'Withdraw from ₹250' },
];

const meta = {
  title: 'Components/Steppers/Stepper',
  component: Stepper,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/Stepper.tsx',
    docs: { description: { component: 'Vertical stepper with a 20 px marker, a solid connector and a title with optional subtext. State comes from currentIndex.' } },
  },
  decorators: [(Story) => <View style={{ width: 340 }}><Story /></View>],
  argTypes: {
    currentIndex: { control: { type: 'number', min: -1, max: 5, step: 1 }, description: 'Before it = done, at it = current, after it = locked. Below 0 = all locked. At or past the count = all done.' },
    steps: { control: 'object' },
  },
  args: { steps: STEPS, currentIndex: 1 },
} satisfies Meta<typeof Stepper>;
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
  parameters: { docs: { description: { story: 'A step can override the state marker with indicator: info, footprints, cashback or image.' } } },
  render: () => (
    <View style={{ width: 340, gap: spacing[24] }}>
      <Block title="milestone (done, current, locked)"><Stepper steps={STEPS} currentIndex={1} /></Block>
      <Block title="per-step indicator: info, footprints, cashback">
        <Stepper
          currentIndex={0}
          steps={[
            { title: 'Know the rules', subtext: 'Read before you shop', indicator: 'info' },
            { title: 'Visit the store', subtext: 'Use the CashKaro link', indicator: 'footprints' },
            { title: 'Earn cashback', subtext: 'Up to X% on this store', indicator: 'cashback' },
          ]}
        />
      </Block>
      <Block title="per-step indicator: image">
        <Stepper
          currentIndex={0}
          steps={[
            { title: 'Open Amazon', subtext: 'From the store page', indicator: 'image', image: images.brands.amazon },
            { title: 'Open Flipkart', subtext: 'From the store page', indicator: 'image', image: images.brands.flipkart },
          ]}
        />
      </Block>
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <View style={{ width: 340, gap: spacing[24] }}>
      <Block title="currentIndex 0 (first step current)"><Stepper steps={STEPS} currentIndex={0} /></Block>
      <Block title="currentIndex 3 (last step current)"><Stepper steps={STEPS} currentIndex={3} /></Block>
      <Block title="currentIndex 4 (all done)"><Stepper steps={STEPS} currentIndex={4} /></Block>
      <Block title="currentIndex -1 (all locked)"><Stepper steps={STEPS} currentIndex={-1} /></Block>
      <Block title="one step"><Stepper steps={[STEPS[0]]} currentIndex={0} /></Block>
      <Block title="long title and subtext">
        <Stepper
          currentIndex={1}
          steps={[
            { title: 'Order placed on the partner store through the CashKaro app link', subtext: 'Keep the order confirmation email until the cashback is paid to your bank account' },
            { title: 'Cashback tracked', subtext: '₹10,00,000 order value is the cap' },
          ]}
        />
      </Block>
    </View>
  ),
};
