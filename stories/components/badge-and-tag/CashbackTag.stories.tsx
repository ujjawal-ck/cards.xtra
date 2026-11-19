import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { CashbackTag } from '../../../src/atoms/CashbackTag';
import { images } from '../../../src/assets/images';

const meta = {
  title: 'Components/Badge and Tag/CashbackTag',
  component: CashbackTag,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/CashbackTag.tsx',
    docs: { description: { component: 'A squared, upper-case reward tag ("₹1,400 REWARDS") that can lead with up to two brand logos and end with an info glyph (md and lg). CashbackBadge is the pill version.' } },
  },
  argTypes: {
    label: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    logos: { control: false },
    onInfoPress: { control: false },
  },
  args: { label: '₹1,400 Rewards', size: 'sm' },
} satisfies Meta<typeof CashbackTag>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[16], maxWidth: 520, alignItems: 'flex-start' }}>{children}</View>
);

const logos = [images.brands.amazon, images.brands.myntra];

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <View style={{ gap: spacing[24] }}>
      <Cell label="without image"><Wrap>{(['sm', 'md', 'lg'] as const).map((s) => <Cell key={s} label={s}><CashbackTag label="₹1,400 Rewards" size={s} /></Cell>)}</Wrap></Cell>
      <Cell label="with one logo"><Wrap>{(['sm', 'md', 'lg'] as const).map((s) => <Cell key={s} label={s}><CashbackTag label="₹1,400 Rewards" size={s} logos={[images.brands.amazon]} /></Cell>)}</Wrap></Cell>
      <Cell label="with two logos"><Wrap>{(['sm', 'md', 'lg'] as const).map((s) => <Cell key={s} label={s}><CashbackTag label="₹1,400 Rewards" size={s} logos={logos} /></Cell>)}</Wrap></Cell>
      <Cell label="with info glyph (md, lg only)"><Wrap>{(['md', 'lg'] as const).map((s) => <Cell key={s} label={s}><CashbackTag label="₹1,400 Rewards" size={s} logos={logos} onInfoPress={() => {}} /></Cell>)}</Wrap></Cell>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled or loading state. Label is upper-cased by the component. Long text is cut to one line (numberOfLines 1) inside maxWidth 100 percent. A third logo is ignored (max two).' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 220 }}>
      <Cell label="large amount"><CashbackTag label="₹1,00,000 Rewards" size="md" /></Cell>
      <Cell label="long text in 220 px"><CashbackTag label="Flat ₹1,200 Rewards on Amazon and Flipkart" size="md" logos={logos} onInfoPress={() => {}} /></Cell>
    </View>
  ),
};
