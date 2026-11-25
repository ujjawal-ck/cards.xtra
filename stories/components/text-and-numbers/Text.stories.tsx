import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing, typography, borderWidth } from '../../../src/tokens';

const VARIANTS = Object.keys(typography) as (keyof typeof typography)[];

const meta = {
  title: 'Components/Text and numbers/Text',
  component: Text,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Text.tsx',
    docs: { description: { component: 'The only way to put text on screen: one `variant` from the typography scale, a colour token and an alignment. Never set font size or family by hand.' } },
  },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    color: { control: 'select', options: [colors.text.primary, colors.text.secondary, colors.text.tertiary, colors.text.link, colors.text.inverse, colors.feedback.error.text, colors.feedback.success.text] },
    align: { control: 'select', options: ['left', 'center', 'right'] },
    numberOfLines: { control: { type: 'number', min: 0, max: 5 } },
    children: { control: 'text' },
  },
  args: { variant: 'body16Regular', color: colors.text.primary, align: 'left', children: 'HDFC Millennia earns X% cashback on Amazon and Flipkart.' },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);

export const Playground: Story = { decorators: [(Story) => <View style={{ width: 340 }}><Story /></View>] };

export const Variants: Story = {
  parameters: { layout: 'padded', docs: { description: { story: 'Every variant in the typography scale, large to small. Names read family, size and weight: display, heading, body, caption.' } } },
  render: () => (
    <View style={{ gap: spacing[12], width: 520 }}>
      {VARIANTS.map((v) => (
        <Cell key={v} label={`${v} · ${typography[v].fontSize}/${typography[v].lineHeight}`}>
          <Text variant={v}>Amazon ₹1,00,000</Text>
        </Cell>
      ))}
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled or loading state. Shown: colour tokens, alignment, long text wrapped and truncated with numberOfLines, and rupee amounts with Indian grouping. Text follows the OS font size uncapped (a cap was tried and reverted, see the file comment), so check long text at large font sizes.' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 320 }}>
      <Cell label="colours">
        <View style={{ gap: spacing[4] }}>
          <Text color={colors.text.primary}>text.primary</Text>
          <Text color={colors.text.secondary}>text.secondary</Text>
          <Text color={colors.text.tertiary}>text.tertiary</Text>
          <Text color={colors.text.link}>text.link</Text>
          <Text color={colors.feedback.error.text}>feedback.error.text</Text>
          <Text color={colors.feedback.success.text}>feedback.success.text</Text>
        </View>
      </Cell>
      <Cell label="align center / right">
        <View style={{ width: 320, gap: spacing[4] }}>
          <Text align="center">Centred</Text>
          <Text align="right">Right aligned</Text>
        </View>
      </Cell>
      <Cell label="long text, wrapped"><Text variant="body14Regular">Get up to X% cashback on Amazon, Flipkart and Myntra with the SBI Cashback card. Offer valid on select categories, terms apply.</Text></Cell>
      <Cell label="long text, numberOfLines 1"><Text variant="body14Regular" numberOfLines={1}>Get up to X% cashback on Amazon, Flipkart and Myntra with the SBI Cashback card.</Text></Cell>
      <Cell label="rupee amounts"><Text variant="heading24Bold">₹1,00,000 · ₹12,34,567 · ₹775.60</Text></Cell>
      <Cell label="empty string"><View style={{ borderWidth: borderWidth.thin, borderColor: colors.border.default, minWidth: 80, minHeight: 20 }}><Text>{''}</Text></View></Cell>
    </View>
  ),
};
