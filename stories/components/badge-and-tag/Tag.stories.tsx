import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { Tag } from '../../../src/atoms/Tag';

const TONES = ['brand', 'gray', 'success', 'warning', 'error', 'info', 'purple', 'sky', 'rose'] as const;

const meta = {
  title: 'Components/Badge and Tag/Tag',
  component: Tag,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Tag.tsx',
    docs: { description: { component: 'The general tone-coloured pill: 9 tones, 4 sizes, 3 appearances, 6 icon options. Pass status to get the Figma status tag (tone, dot and shape from one word).' } },
  },
  argTypes: {
    label: { control: 'text' },
    size: { control: 'select', options: ['xxs', 'xs', 'sm', 'md'] },
    tone: { control: 'select', options: [...TONES] },
    appearance: { control: 'select', options: ['default', 'subtle', 'gradient'] },
    pill: { control: 'boolean' },
    icon: { control: 'select', options: ['none', 'dot', 'icon-left', 'icon-right', 'icon-only', 'x-close'] },
    iconName: { control: 'select', options: ['star-filled', 'feat-dining-outline', 'check-circle-filled', 'chevron-right'] },
    status: { control: 'select', options: [undefined, 'success', 'warning', 'error', 'info', 'neutral'] },
  },
  args: { label: 'Dining', size: 'sm', tone: 'brand', appearance: 'default', pill: false, icon: 'none', iconName: 'feat-dining-outline' },
} satisfies Meta<typeof Tag>;
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
      <Cell label="tones (default appearance, size sm)">
        <Wrap>{TONES.map((t) => <Cell key={t} label={t}><Tag label="Shopping" tone={t} /></Cell>)}</Wrap>
      </Cell>
      <Cell label="appearance">
        <Wrap>
          <Cell label="default"><Tag label="Travel" tone="info" /></Cell>
          <Cell label="subtle"><Tag label="Travel" tone="info" appearance="subtle" /></Cell>
          <Cell label="gradient (pair with info)"><Tag label="Travel" tone="info" appearance="gradient" /></Cell>
        </Wrap>
      </Cell>
      <Cell label="sizes">
        <Wrap>{(['xxs', 'xs', 'sm', 'md'] as const).map((s) => <Cell key={s} label={s}><Tag label="Fuel" size={s} tone="success" /></Cell>)}</Wrap>
      </Cell>
      <Cell label="shape">
        <Wrap>
          <Cell label="square (radius xs)"><Tag label="Fuel" tone="success" /></Cell>
          <Cell label="pill"><Tag label="Fuel" tone="success" pill /></Cell>
        </Wrap>
      </Cell>
      <Cell label="icon options">
        <Wrap>
          <Cell label="none"><Tag label="Dining" /></Cell>
          <Cell label="dot"><Tag label="Dining" icon="dot" /></Cell>
          <Cell label="icon-left"><Tag label="Dining" icon="icon-left" iconName="feat-dining-outline" iconPx={12} /></Cell>
          <Cell label="icon-right"><Tag label="Dining" icon="icon-right" iconName="chevron-right" iconPx={12} /></Cell>
          <Cell label="icon-only"><Tag icon="icon-only" iconName="star-filled" iconPx={12} /></Cell>
          <Cell label="x-close"><Tag label="Myntra" icon="x-close" onClose={() => {}} /></Cell>
        </Wrap>
      </Cell>
      <Cell label="status prop (forces xxs, dot, not pill)">
        <Wrap>{(['success', 'warning', 'error', 'info', 'neutral'] as const).map((s) => <Cell key={s} label={s}><Tag label={s === 'success' ? 'Active' : s === 'warning' ? 'Pending' : s === 'error' ? 'Failed' : s === 'info' ? 'Processing' : 'Expired'} status={s} /></Cell>)}</Wrap>
      </Cell>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Tag has no disabled, loading or error prop (use tone="error" for an error look). Pressable when onPress is set; hover or click to see it. Height is a minHeight, so large OS fonts and long text grow the tag instead of clipping.' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 300 }}>
      <Cell label="pressable"><Tag label="Flipkart" tone="info" onPress={() => {}} /></Cell>
      <Cell label="long text"><Tag label="Lifetime free HDFC Millennia credit card on Amazon" size="md" tone="success" /></Cell>
      <Cell label="rupee amount"><Tag label="Annual fee ₹1,00,000" tone="warning" size="md" /></Cell>
      <Cell label="override colours (bgColor, labelColor, borderColor)"><Tag label="Custom" bgColor={colors.background.lavender} labelColor={colors.text.link} borderColor={colors.action.secondary.border} /></Cell>
    </View>
  ),
};
