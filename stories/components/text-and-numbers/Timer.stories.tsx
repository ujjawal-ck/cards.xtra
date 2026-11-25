import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Timer } from '../../../src/atoms/Timer';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Text and numbers/Timer',
  component: Timer,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Timer.tsx',
    docs: { description: { component: 'A red countdown chip: clock icon and zero-padded time ("23:59", "01 : 23 : 59", "02d : 48m : 53s"). It can tick live from targetTime, or show a fixed label such as an update date.' } },
  },
  argTypes: {
    surface: { control: 'select', options: ['default', 'transparent'] },
    format: { control: 'select', options: ['hh:mm', 'dd:hh:mm', 'dd:mm:ss'] },
    days: { control: { type: 'number', min: 0, max: 99 } },
    hours: { control: { type: 'number', min: 0, max: 99 } },
    minutes: { control: { type: 'number', min: 0, max: 99 } },
    seconds: { control: { type: 'number', min: 0, max: 99 } },
    targetTime: { control: false },
    label: { control: 'text' },
  },
  args: { surface: 'default', format: 'hh:mm', days: 1, hours: 23, minutes: 59, seconds: 30 },
} satisfies Meta<typeof Timer>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <View style={{ gap: spacing[16] }}>
      <Cell label="hh:mm"><Timer format="hh:mm" hours={23} minutes={59} /></Cell>
      <Cell label="dd:hh:mm"><Timer format="dd:hh:mm" days={1} hours={23} minutes={59} /></Cell>
      <Cell label="dd:mm:ss"><Timer format="dd:mm:ss" days={2} minutes={48} seconds={53} /></Cell>
      <Cell label="surface transparent"><Timer surface="transparent" hours={4} minutes={5} /></Cell>
      <Cell label="label (fixed date, no icon)"><Timer label="Expect update by 9th Jun '26" /></Cell>
    </View>
  ),
};

function Live() {
  const [target] = React.useState(() => Date.now() + 2 * 86400000 + 48 * 60000 + 53000);
  return <Timer format="dd:mm:ss" targetTime={target} />;
}

export const States: Story = {
  parameters: { docs: { description: { story: 'The live chip ticks every second from targetTime and stops at 00. Zero and out-of-range values: values are floored and clamped at 0, a single digit pads to two, 3 digits are not capped. No disabled or error state (the chip is always the Error tone). Open question for product: what the chip shows when the countdown ends ("00:00" stays visible).' } } },
  render: () => (
    <View style={{ gap: spacing[16] }}>
      <Cell label="live countdown to a target time"><Live /></Cell>
      <Cell label="ended (all zero)"><Timer format="dd:mm:ss" /></Cell>
      <Cell label="single digits are padded"><Timer hours={3} minutes={7} /></Cell>
      <Cell label="out of range (3 digits)"><Timer format="dd:hh:mm" days={120} hours={100} minutes={5} /></Cell>
    </View>
  ),
};
