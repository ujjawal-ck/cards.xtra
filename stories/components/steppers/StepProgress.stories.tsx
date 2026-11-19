import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StepProgress } from '../../../src/atoms';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Steppers/StepProgress',
  component: StepProgress,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/StepProgress.tsx',
    docs: { description: { component: 'A determinate progress bar with an optional label and a "2 of 6" count. No steps are drawn.' } },
  },
  decorators: [(Story) => <View style={{ width: 340 }}><Story /></View>],
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 10, step: 1 } },
    total: { control: { type: 'number', min: 0, max: 10, step: 1 } },
    label: { control: 'text' },
    showCount: { control: 'boolean' },
    tone: { control: 'inline-radio', options: ['accent', 'success'] },
  },
  args: { value: 2, total: 6, label: 'Your spends', showCount: true, tone: 'accent' },
} satisfies Meta<typeof StepProgress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4] }}>
    <Text variant="body12Medium" color={colors.text.secondary}>{title}</Text>
    {children}
  </View>
);

export const Variants: Story = {
  render: () => (
    <View style={{ width: 340, gap: spacing[20] }}>
      <Block title="tone accent"><StepProgress value={3} total={6} label="Step 3" tone="accent" /></Block>
      <Block title="tone success"><StepProgress value={3} total={6} label="Step 3" tone="success" /></Block>
      <Block title="no label"><StepProgress value={3} total={6} /></Block>
      <Block title="no count"><StepProgress value={3} total={6} label="Spend questions" showCount={false} /></Block>
    </View>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The fill animates with reanimated (width as a percentage). Value is clamped to 0..total and total 0 gives an empty bar, shown below. Check the fill width on web: it needs the reanimated web build.',
      },
    },
  },
  render: () => (
    <View style={{ width: 340, gap: spacing[20] }}>
      <Block title="0 of 6"><StepProgress value={0} total={6} label="Not started" /></Block>
      <Block title="6 of 6, success"><StepProgress value={6} total={6} label="Done" tone="success" /></Block>
      <Block title="value above total (clamped to 6 of 6)"><StepProgress value={9} total={6} /></Block>
      <Block title="total 0 (empty bar)"><StepProgress value={2} total={0} /></Block>
      <Block title="long label"><StepProgress value={2} total={5} label="Tell us your monthly spends on groceries, fuel, dining and travel so we can rank cards" /></Block>
    </View>
  ),
};
