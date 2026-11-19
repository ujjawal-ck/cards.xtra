import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { CardTypeTag } from '../../../src/atoms/CardTypeTag';

const KINDS = ['lifetimeFree', 'inviteOnly', 'discontinued'] as const;
const PLACEMENTS = ['table', 'general', 'onCard'] as const;

const meta = {
  title: 'Components/Badge and Tag/CardTypeTag',
  component: CardTypeTag,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/CardTypeTag.tsx',
    docs: { description: { component: 'An upper-case tag for a credit card type: Lifetime free, Invite only or Discontinued, in 3 placements (table, general, on a card). On a card the word "card" is added.' } },
  },
  argTypes: {
    kind: { control: 'select', options: [...KINDS] },
    placement: { control: 'select', options: [...PLACEMENTS] },
  },
  args: { kind: 'lifetimeFree', placement: 'general' },
} satisfies Meta<typeof CardTypeTag>;
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
  parameters: { docs: { description: { story: 'Rows are kinds, columns are placements. Not built: the folded corner under the on-card chip, and the Figma gradient fills (flat tone colours here).' } } },
  render: () => (
    <View style={{ gap: spacing[16] }}>
      {KINDS.map((k) => (
        <Wrap key={k}>
          {PLACEMENTS.map((p) => <Cell key={p} label={`${k} / ${p}`}><CardTypeTag kind={k} placement={p} /></Cell>)}
        </Wrap>
      ))}
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled, loading or error state; the three kinds are the states. Label text is fixed by kind (no text prop), so there is no long-text case.' } } },
  render: () => (
    <Wrap>
      <Cell label="in a card row (HDFC Millennia)"><CardTypeTag kind="lifetimeFree" placement="table" /></Cell>
      <Cell label="in a card row (SBI Cashback)"><CardTypeTag kind="inviteOnly" placement="general" /></Cell>
    </Wrap>
  ),
};
