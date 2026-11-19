import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { Badge } from '../../../src/atoms/Badge';

const meta = {
  title: 'Components/Badge and Tag/Badge',
  component: Badge,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Badge.tsx',
    docs: { description: { component: 'A saffron category or highlight label ("New", "Popular"). Always cashback-orange text on a pale saffron fill; it does not take a tone. For other colours use Tag.' } },
  },
  argTypes: {
    label: { control: 'text' },
    size: { control: 'select', options: ['xxs', 'xs', 'sm', 'md'] },
    appearance: { control: 'select', options: ['default', 'subtle'] },
    pill: { control: 'boolean' },
    icon: { control: 'select', options: ['none', 'dot', 'left', 'right', 'only', 'close'] },
    iconName: { control: 'select', options: ['star-filled', 'feat-rewards-filled', 'check-circle-filled', 'chevron-right'] },
  },
  args: { label: 'Popular', size: 'md', appearance: 'default', pill: false, icon: 'none', iconName: 'star-filled' },
} satisfies Meta<typeof Badge>;
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

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <View style={{ gap: spacing[24] }}>
      <Wrap>
        {(['xxs', 'xs', 'sm', 'md'] as const).map((s) => (
          <Cell key={s} label={`size ${s}`}><Badge label="New" size={s} /></Cell>
        ))}
      </Wrap>
      <Wrap>
        <Cell label="default"><Badge label="Lifetime free" /></Cell>
        <Cell label="subtle (gradient)"><Badge label="Lifetime free" appearance="subtle" /></Cell>
        <Cell label="pill"><Badge label="Lifetime free" pill /></Cell>
        <Cell label="subtle + pill"><Badge label="Lifetime free" appearance="subtle" pill /></Cell>
      </Wrap>
      <Wrap>
        <Cell label="icon none"><Badge label="Top pick" /></Cell>
        <Cell label="dot"><Badge label="Top pick" icon="dot" /></Cell>
        <Cell label="left"><Badge label="Top pick" icon="left" iconName="star-filled" /></Cell>
        <Cell label="right"><Badge label="Top pick" icon="right" iconName="chevron-right" /></Cell>
        <Cell label="only"><Badge label="Top pick" icon="only" iconName="star-filled" /></Cell>
        <Cell label="close"><Badge label="Amazon" icon="close" onClose={() => {}} /></Cell>
      </Wrap>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Badge has no disabled, loading or error state. Long text is not truncated: the badge grows, and a very long label wraps inside its row. The close icon (desc-cross) has a baked red stroke and does not tint to the badge colour: a component issue, not fixed here.' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 300 }}>
      <Cell label="long text"><Badge label="HDFC Millennia lifetime free card with 5% cashback on Amazon and Flipkart" size="sm" /></Cell>
      <Cell label="rupee amount"><Badge label="Save ₹1,00,000" size="md" pill /></Cell>
      <Cell label="close (baked red cross)"><Badge label="SBI Cashback" icon="close" onClose={() => {}} /></Cell>
    </View>
  ),
};
