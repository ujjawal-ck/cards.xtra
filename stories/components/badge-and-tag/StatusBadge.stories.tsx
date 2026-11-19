import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { StatusBadge } from '../../../src/atoms/StatusBadge';

const STATUSES = ['requested', 'pending', 'delayed', 'cancelled', 'confirmed', 'paid', 'expired'] as const;

const meta = {
  title: 'Components/Badge and Tag/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/StatusBadge.tsx',
    docs: { description: { component: 'Dot plus label for the cashback lifecycle: requested, pending, delayed, cancelled, confirmed, paid, expired. Default is "Cashback Pending" at h36; pill is "Pending" at h24.' } },
  },
  argTypes: {
    status: { control: 'select', options: [...STATUSES] },
    size: { control: 'select', options: ['default', 'pill'] },
    rounded: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: { status: 'pending', size: 'default', rounded: true },
} satisfies Meta<typeof StatusBadge>;
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
      <Cell label="size default (h36)"><Wrap>{STATUSES.map((s) => <StatusBadge key={s} status={s} />)}</Wrap></Cell>
      <Cell label="size pill (h24)"><Wrap>{STATUSES.map((s) => <StatusBadge key={s} status={s} size="pill" />)}</Wrap></Cell>
      <Cell label="rounded false (radius xs)"><Wrap>{STATUSES.map((s) => <StatusBadge key={s} status={s} size="pill" rounded={false} />)}</Wrap></Cell>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Every status is a state. The border is always drawn, there is no opt-out. Label override is for copy such as an order with a rupee amount. The label has no truncation: long text grows the badge.' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 320 }}>
      <Cell label="label override with amount"><StatusBadge status="confirmed" label="Confirmed ₹1,00,000" /></Cell>
      <Cell label="long label"><StatusBadge status="delayed" label="Delayed: Myntra order awaiting merchant confirmation" /></Cell>
    </View>
  ),
};
