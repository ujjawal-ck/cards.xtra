import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AmountActionRow } from '../../../src/molecules/AmountActionRow';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

const noop = () => {};
const VARIANTS = ['solid', 'outline', 'subtle', 'destructive', 'ghost', 'link'] as const;
const TONES = ['main', 'second', 'accent'] as const;

const meta = {
  title: 'Components/Lists/AmountActionRow',
  component: AmountActionRow,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/AmountActionRow.tsx',
    docs: { description: { component: 'A card row with an icon, a caption and amount on the left and a trailing button on the right.' } },
  },
  decorators: [(Story) => <View style={{ width: 340 }}><Story /></View>],
  argTypes: {
    caption: { control: 'text' },
    value: { control: 'text' },
    loading: { control: 'boolean' },
    iconName: { control: 'select', options: [undefined, 'desc-withdrawcash', 'desc-pendingcash', 'desc-cashback', 'desc-rewards', 'desc-paid'] },
    iconSource: { control: false },
    buttonLabel: { control: 'text' },
    buttonVariant: { control: 'select', options: VARIANTS },
    buttonTone: { control: 'inline-radio', options: TONES },
    buttonLabelColor: { control: 'color' },
    onButtonPress: { control: false },
    style: { control: false },
  },
  args: {
    caption: 'Confirmed cashback',
    value: '₹1,250',
    loading: false,
    iconName: 'desc-withdrawcash',
    buttonLabel: 'Withdraw',
    buttonVariant: 'solid',
    buttonTone: 'main',
    onButtonPress: noop,
  },
} satisfies Meta<typeof AmountActionRow>;
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
  parameters: { docs: { description: { story: 'The button variant and tone pass straight to the Button atom. Rows below show each variant in the main tone, then the accent tone with an outline.' } } },
  render: () => (
    <View style={{ width: 340, gap: spacing[12] }}>
      {VARIANTS.map((v) => (
        <Block key={v} title={`buttonVariant ${v}`}>
          <AmountActionRow caption="Pending cashback" value="₹480" iconName="desc-pendingcash" buttonLabel="Know Why?" buttonVariant={v} onButtonPress={noop} />
        </Block>
      ))}
      {TONES.map((t) => (
        <Block key={t} title={`outline, tone ${t}`}>
          <AmountActionRow caption="Confirmed cashback" value="₹1,250" iconName="desc-withdrawcash" buttonLabel="Withdraw" buttonVariant="outline" buttonTone={t} onButtonPress={noop} />
        </Block>
      ))}
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <View style={{ width: 340, gap: spacing[12] }}>
      <Block title="loading (amount skeleton)"><AmountActionRow caption="Confirmed cashback" value="" loading iconName="desc-withdrawcash" buttonLabel="Withdraw" onButtonPress={noop} /></Block>
      <Block title="₹0"><AmountActionRow caption="Confirmed cashback" value={`₹${(0).toLocaleString('en-IN')}`} iconName="desc-withdrawcash" buttonLabel="Withdraw" buttonVariant="outline" onButtonPress={noop} /></Block>
      <Block title="₹10,00,000"><AmountActionRow caption="Confirmed cashback" value={`₹${(1000000).toLocaleString('en-IN')}`} iconName="desc-withdrawcash" buttonLabel="Withdraw" onButtonPress={noop} /></Block>
      <Block title="long caption and long button label"><AmountActionRow caption="Cashback waiting for the store to confirm your order" value="₹2,35,000" iconName="desc-pendingcash" buttonLabel="Know why it is pending" buttonVariant="outline" onButtonPress={noop} /></Block>
      <Block title="no icon"><AmountActionRow caption="Referral bonus" value="₹100" buttonLabel="Claim" onButtonPress={noop} /></Block>
    </View>
  ),
};
