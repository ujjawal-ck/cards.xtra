import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { PartnerCard, type PartnerModel } from '../../../src/molecules/PartnerCard';
import { SAMPLE_PARTNERS } from '../../../src/data/partners';
import { Frame, Label } from './_shared';

const p = SAMPLE_PARTNERS[0];
const COLORS = ['saffron', 'cobalt', 'fern', 'violet', 'sky', 'rose'] as const;

const meta = {
  title: 'Components/Cards/PartnerCard',
  component: PartnerCard,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><View style={{ width: 170 }}><Story /></View></Frame>],
  parameters: {
    source: 'src/molecules/PartnerCard.tsx',
    docs: {
      description: {
        component:
          'UNUSED today: no screen renders it. A cell for a 2 column offers grid: logo box and name, a picture box, and a full width "Shop & Earn" button. Logo and picture are coloured placeholders with an emoji. Fixture: SAMPLE_PARTNERS in src/data/partners.ts.',
      },
    },
  },
  argTypes: {
    partner: { control: 'object' },
    onPress: { control: false },
    style: { control: false },
  },
  args: { partner: p, onPress: () => {} },
} satisfies Meta<typeof PartnerCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'One tile per placeholderColor key: saffron, cobalt, fern, violet, sky, rose. The rates here come from the fixture file.' } } },
  decorators: [(Story) => <View style={{ width: 360 }}><Story /></View>],
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {SAMPLE_PARTNERS.map((m, i) => (
        <View key={m.id} style={{ width: 168, gap: 4 }}>
          <Label>{`placeholderColor="${COLORS[i]}"`}</Label>
          <PartnerCard partner={m} onPress={() => {}} />
        </View>
      ))}
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question for product: the part is unused, so should it stay in the design system? A long name is cut to one line. The rate text is plain copy, here "X%" or the fixture value.' } } },
  render: () => {
    const long: PartnerModel = { id: 'long', name: 'Reliance Digital Electronics Superstore', logo: '🖥', placeholderColor: 'violet', rate: 'X%' };
    const zero: PartnerModel = { id: 'zero', name: 'Foxtale', logo: '🧴', placeholderColor: 'sky', rate: '0%' };
    return (
      <>
        <Label>long name</Label>
        <PartnerCard partner={long} onPress={() => {}} />
        <Label>rate 0%</Label>
        <PartnerCard partner={zero} onPress={() => {}} />
      </>
    );
  },
};
