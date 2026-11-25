import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { RankBadge } from '../../../src/atoms/RankBadge';

const meta = {
  title: 'Components/Badge and Tag/RankBadge',
  component: RankBadge,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/RankBadge.tsx',
    docs: { description: { component: 'A 24 px round number for a ranked list ("1", "2"). Cobalt-soft fill, link-coloured digit. Used by RankedCardRow.' } },
  },
  argTypes: { rank: { control: { type: 'number', min: 1, max: 999 } } },
  args: { rank: 1 },
} satisfies Meta<typeof RankBadge>;
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
  parameters: { docs: { description: { story: 'RankBadge has one style. Variants shows the first five ranks.' } } },
  render: () => (
    <Wrap>{[1, 2, 3, 4, 5].map((n) => <Cell key={n} label={`rank ${n}`}><RankBadge rank={n} /></Cell>)}</Wrap>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'minWidth 24 grows for 2 and 3 digit ranks. No disabled or loading state.' } } },
  render: () => (
    <Wrap>
      <Cell label="two digits"><RankBadge rank={10} /></Cell>
      <Cell label="three digits"><RankBadge rank={128} /></Cell>
    </Wrap>
  ),
};
