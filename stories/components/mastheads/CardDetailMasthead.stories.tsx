import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { CardDetailMasthead } from '../../../src/organisms/CardDetailMasthead';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import { colors, spacing, typography } from '../../../src/tokens';

type Args = { progress: number; cardIndex: number; containCard: boolean; active: boolean; topInset: number };

const meta = {
  title: 'Components/Mastheads/CardDetailMasthead',
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/CardDetailMasthead.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'Collapsing hero at the top of the card detail sheet. One shared value, progress, runs it from expanded (0) to collapsed (1). The story drives progress with a number control.' } },
  },
  argTypes: {
    progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    cardIndex: { control: { type: 'range', min: 0, max: SAMPLE_CARDS.length - 1, step: 1 } },
    containCard: { control: 'boolean' },
    active: { control: 'boolean' },
    topInset: { control: { type: 'number', min: 0, max: 60 } },
  },
  args: { progress: 0, cardIndex: 0, containCard: true, active: true, topInset: 0 },
} as Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

function Driven({ progress, cardIndex, containCard, active, topInset, label }: Args & { label?: string }) {
  const sv = useSharedValue(progress);
  useEffect(() => { sv.value = progress; }, [progress, sv]);
  return (
    <View style={{ width: 390, alignSelf: 'center', marginBottom: spacing[16], backgroundColor: colors.surface.sunken }}>
      <Text style={{ ...typography.caption10Medium, color: colors.text.secondary, padding: spacing[8] }}>{label ?? `${SAMPLE_CARDS[cardIndex].name}, progress ${progress}`}</Text>
      <CardDetailMasthead progress={sv} card={SAMPLE_CARDS[cardIndex]} containCard={containCard} active={active} topInset={topInset} />
    </View>
  );
}

export const Playground: Story = { render: (args) => <Driven {...args} /> };

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Expanded (0) and collapsed (1), with the card contained in the masthead (Android layout). Without containCard the card floats half out of the sheet via FloatingCardRail, which this story does not mount, so the art is hidden at partial height.' } } },
  render: () => (
    <View>
      <Driven progress={0} cardIndex={0} containCard active topInset={0} label="Expanded, HDFC card" />
      <Driven progress={1} cardIndex={0} containCard active topInset={0} label="Collapsed" />
      <Driven progress={0} cardIndex={2} containCard active topInset={0} label="Expanded, SBI Cashback" />
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Not rendered here: the gyro tilt (needs a device accelerometer, active=true subscribes to it, on web it is a no-op or may warn) and the FloatingCardRail overlay. Card image falls back to the card placeholder colour while it loads. Open question for product: should the collapsed bar show the cashback badge?' } } },
  render: () => (
    <View>
      <Driven progress={0.5} cardIndex={1} containCard active topInset={0} label="Mid transition (0.5)" />
      <Driven progress={0} cardIndex={3} containCard={false} active={false} topInset={0} label="containCard=false, inactive page (art hidden at partial)" />
      <Driven progress={0} cardIndex={0} containCard active topInset={44} label="topInset=44 (full-screen sheet under the status bar)" />
    </View>
  ),
};
