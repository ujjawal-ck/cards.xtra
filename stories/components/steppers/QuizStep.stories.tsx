import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { QuizStep } from '../../../src/organisms/QuizStep';
import { Chip } from '../../../src/atoms';
import { spacing } from '../../../src/tokens';

const noop = () => {};

const Phone = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: 360, height: 640 }}>{children}</View>
);

const meta = {
  title: 'Components/Steppers/QuizStep',
  component: QuizStep,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/QuizStep.tsx',
    layout: 'centered',
    docs: {
      description: {
        component: 'Shell of one question per screen: back, StepProgress, skip, title, scrolling body slot and a sticky FooterButtons. No screen uses it today; it is in the design system gallery only.',
      },
    },
  },
  decorators: [(Story) => <Phone><Story /></Phone>],
  argTypes: {
    step: { control: { type: 'number', min: 1, max: 10, step: 1 } },
    total: { control: { type: 'number', min: 1, max: 10, step: 1 } },
    title: { control: 'text' },
    subtitle: { control: 'text' },
    onBack: { control: false },
    onSkip: { control: false },
    onClose: { control: false },
    primary: { control: 'object' },
    children: { control: false },
  },
  args: {
    step: 2,
    total: 6,
    title: 'How much do you spend on groceries?',
    subtitle: 'A monthly figure is fine.',
    onBack: noop,
    onSkip: noop,
    primary: { label: 'Continue', onPress: noop },
    children: (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
        {['Under ₹5,000', '₹5,000 to ₹10,000', '₹10,000 to ₹25,000', 'Above ₹25,000'].map((l, i) => (
          <Chip key={l} label={l} state={i === 1 ? 'selected' : 'default'} onPress={noop} />
        ))}
      </View>
    ),
  },
} satisfies Meta<typeof QuizStep>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Header actions are optional: Skip (onSkip) and Close (onClose). Shown here: back only, back plus skip, back plus skip plus close.' } } },
  render: (args) => (
    <View style={{ gap: spacing[24], flexDirection: 'row', flexWrap: 'wrap' }}>
      <View style={{ width: 360, height: 520 }}><QuizStep {...args} onSkip={undefined} onClose={undefined} /></View>
      <View style={{ width: 360, height: 520 }}><QuizStep {...args} onSkip={noop} /></View>
      <View style={{ width: 360, height: 520 }}><QuizStep {...args} onSkip={noop} onClose={noop} /></View>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'First step, last step, disabled primary and an empty body.' } } },
  render: (args) => (
    <View style={{ gap: spacing[24], flexDirection: 'row', flexWrap: 'wrap' }}>
      <View style={{ width: 360, height: 520 }}><QuizStep {...args} step={1} /></View>
      <View style={{ width: 360, height: 520 }}><QuizStep {...args} step={6} primary={{ label: 'See my cards', onPress: noop }} /></View>
      <View style={{ width: 360, height: 520 }}><QuizStep {...args} primary={{ label: 'Continue', onPress: noop, disabled: true }} /></View>
      <View style={{ width: 360, height: 520 }}><QuizStep {...args} title="A very long question that asks how much you spend every month on groceries, fuel, dining, travel and online shopping" subtitle={undefined}>{null}</QuizStep></View>
    </View>
  ),
};
