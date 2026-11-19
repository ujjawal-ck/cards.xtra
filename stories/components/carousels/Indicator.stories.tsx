import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Indicator } from '../../../src/atoms/Indicator';
import { Block, Stack } from './_chrome';
import { colors, spacing, radius } from '../../../src/tokens';

const meta = {
  title: 'Components/Carousels/Indicator',
  component: Indicator,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/atoms/Indicator.tsx',
    docs: { description: { component: 'Shows where you are in a sideways row: step dots, a sliding scroll thumb, or timed story bars.' } },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['steps', 'scroll', 'progress'] },
    total: { control: { type: 'number', min: 1, max: 12 }, description: 'steps and progress: number of dots or bars.' },
    active: { control: { type: 'number', min: 0, max: 11 }, description: 'steps and progress: 0-based active index.' },
    progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, description: 'scroll only: 0 to 1 along the track.' },
    durationMs: { control: 'number', description: 'progress only: fill time of the active bar. 0 fills at once.' },
    style: { control: false },
  },
  args: { variant: 'steps', total: 4, active: 1, progress: 0.5, durationMs: 3000 },
} satisfies Meta<typeof Indicator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  decorators: [(Story, ctx) => (
    // The progress variant is white on translucent white, so it needs a dark ground.
    <View style={{ width: 320, padding: spacing[24], alignItems: 'center', borderRadius: radius.xl, backgroundColor: ctx.args.variant === 'progress' ? colors.surface.dark : colors.surface.default }}>
      <Story />
    </View>
  )],
};

const Dark = ({ children }: { children: React.ReactNode }) => (
  <View style={{ marginHorizontal: spacing[16], padding: spacing[16], borderRadius: radius.lg, backgroundColor: colors.surface.dark }}>{children}</View>
);

export const Variants: Story = {
  render: () => (
    <Stack width={360}>
      <Block label="steps: 4 dots, active 0"><View style={{ paddingHorizontal: spacing[16] }}><Indicator variant="steps" total={4} active={0} /></View></Block>
      <Block label="steps: 4 dots, active 2"><View style={{ paddingHorizontal: spacing[16] }}><Indicator variant="steps" total={4} active={2} /></View></Block>
      <Block label="scroll: progress 0"><View style={{ paddingHorizontal: spacing[16] }}><Indicator variant="scroll" progress={0} /></View></Block>
      <Block label="scroll: progress 0.5"><View style={{ paddingHorizontal: spacing[16] }}><Indicator variant="scroll" progress={0.5} /></View></Block>
      <Block label="scroll: progress 1"><View style={{ paddingHorizontal: spacing[16] }}><Indicator variant="scroll" progress={1} /></View></Block>
      <Block label="progress: bar 1 of 3 fills over 3 s (on a dark ground)"><Dark><Indicator variant="progress" total={3} active={1} durationMs={3000} /></Dark></Block>
      <Block label="progress: durationMs 0 (static position)"><Dark><Indicator variant="progress" total={3} active={1} durationMs={0} /></Dark></Block>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack width={360}>
      <Block label="steps: 1 dot"><View style={{ paddingHorizontal: spacing[16] }}><Indicator variant="steps" total={1} active={0} /></View></Block>
      <Block label="steps: 12 dots, last active"><View style={{ paddingHorizontal: spacing[16] }}><Indicator variant="steps" total={12} active={11} /></View></Block>
      <Block label="steps: active beyond total (no active dot)"><View style={{ paddingHorizontal: spacing[16] }}><Indicator variant="steps" total={4} active={7} /></View></Block>
      <Block label="scroll: progress above 1 (clamped to the end)"><View style={{ paddingHorizontal: spacing[16] }}><Indicator variant="scroll" progress={1.5} /></View></Block>
      <Block label="progress: first and last bar"><Dark><View style={{ gap: spacing[12] }}><Indicator variant="progress" total={5} active={0} durationMs={0} /><Indicator variant="progress" total={5} active={4} durationMs={0} /></View></Dark></Block>
    </Stack>
  ),
};
