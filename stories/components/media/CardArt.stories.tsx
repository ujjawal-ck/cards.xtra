import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardArt, CARD_ART_W, CARD_ART_H } from '../../../src/organisms/CardArt';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import { Block, Stack } from '../carousels/_chrome';
import { spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Media/CardArt',
  component: CardArt,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/CardArt.tsx',
    docs: { description: { component: 'The credit card picture on its own: rounded clip, specular glare and a gyro tilt with a tilt-tracking shadow.' } },
  },
  argTypes: {
    card: { control: false },
    width: { control: { type: 'number', min: 80, max: 340 }, description: `Default ${CARD_ART_W}.` },
    height: { control: { type: 'number', min: 50, max: 213 }, description: `Default ${CARD_ART_H}.` },
    tilt: { control: 'boolean', description: 'Listens to the accelerometer. Stories keep it false: a browser has no sensor and may prompt.' },
    tiltSuppress: { control: false },
  },
  args: { card: SAMPLE_CARDS[0], tilt: false },
} satisfies Meta<typeof CardArt>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'All five SAMPLE_CARDS at the default size, tilt off.' } } },
  render: () => (
    <Stack width={480}>
      <Block label="Sample cards, tilt={false}">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[16], paddingHorizontal: spacing[16] }}>
          {SAMPLE_CARDS.map((c) => <CardArt key={c.id} card={c} tilt={false} />)}
        </View>
      </Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Local art paints at once (no skeleton). The slate skeleton and fade-in only show for remote card URLs. Tilt needs a phone sensor, so it is not shown.' } } },
  render: () => (
    <Stack width={480}>
      <Block label="Default 204 by 127.5"><View style={{ paddingHorizontal: spacing[16] }}><CardArt card={SAMPLE_CARDS[4]} tilt={false} /></View></Block>
      <Block label="Thumbnail 88 by 56 (132:84 ratio, as in rows)"><View style={{ paddingHorizontal: spacing[16] }}><CardArt card={SAMPLE_CARDS[1]} width={88} height={56} tilt={false} /></View></Block>
      <Block label="Large 320 by 200"><View style={{ paddingHorizontal: spacing[16] }}><CardArt card={SAMPLE_CARDS[2]} width={320} height={200} tilt={false} /></View></Block>
    </Stack>
  ),
};
