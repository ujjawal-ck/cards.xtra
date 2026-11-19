import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Image, Text as RNText } from 'react-native';
import { CompareTable, type CompareTableColumn, type CompareTableRow } from '../../../src/molecules/CompareTable';
import { Text, Tag, Button } from '../../../src/atoms';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import { colors, spacing, radius, typography } from '../../../src/tokens';

const FRAME = 390;
const Frame = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: FRAME, padding: spacing[16], gap: spacing[12] }}>{children}</View>
);
const Label = ({ children }: { children: React.ReactNode }) => (
  <RNText style={{ ...typography.caption10Medium, color: colors.text.tertiary }}>{children}</RNText>
);

/** Hero cell: tag, art, name, button. The table gives it 146 by 172. */
function Hero({ i, tag }: { i: number; tag?: string }) {
  const c = SAMPLE_CARDS[i];
  return (
    <View style={{ flex: 1, padding: spacing[8], gap: spacing[6], alignItems: 'center', justifyContent: 'center' }}>
      {tag ? <Tag label={tag} tone="success" size="xxs" /> : null}
      <Image source={c.cardImage} style={{ width: spacing[80], aspectRatio: 132 / 84, borderRadius: radius.sm, backgroundColor: colors.surface.sunken }} />
      <Text variant="body12SemiBold" color={colors.text.primary} numberOfLines={2} align="center">{c.name.replace(' Credit Card', '')}</Text>
      <Button label="Apply" size={36} onPress={() => {}} />
    </View>
  );
}

const columns: CompareTableColumn[] = [
  { id: 'joining', header: 'Joining fee' },
  { id: 'annual', header: 'Annual fee' },
  { id: 'reward', header: 'Reward rate' },
  { id: 'lounge', header: 'Lounge visits' },
  { id: 'cashback', header: 'CashKaro reward' },
];
const rows: CompareTableRow[] = [
  { id: 'regalia', hero: <Hero i={0} tag="Best match" />, values: ['₹2,500', '₹2,500', '4 points per ₹150', '12 a year', 'Upto ₹2,500'] },
  { id: 'swiggy', hero: <Hero i={1} />, values: ['Free', 'Free', 'X% on Swiggy', '4 a year', 'Upto ₹1,200'] },
  { id: 'sbi', hero: <Hero i={2} />, values: ['₹999', '₹999', '5% online', '–', 'Flat ₹2,000'] },
];

function Controlled(props: React.ComponentProps<typeof CompareTable>) {
  const [sel, setSel] = useState<string | null | undefined>(props.selectedColumnId);
  return <CompareTable {...props} selectedColumnId={sel} onSelectColumn={setSel} />;
}

const meta = {
  title: 'Components/Tables/CompareTable',
  component: CompareTable,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/CompareTable.tsx',
    docs: { description: { component: 'Cards as rows: a pinned hero column on the left and attribute columns that scroll sideways. Tap a header to select a column.' } },
  },
  argTypes: {
    columns: { control: 'object' },
    rows: { control: false },
    cornerLabel: { control: 'text' },
    selectedColumnId: { control: 'select', options: [null, ...columns.map((c) => c.id)] },
    onSelectColumn: { control: false },
  },
  args: { columns, rows, cornerLabel: 'Compare cards', selectedColumnId: 'annual', onSelectColumn: () => {} },
} satisfies Meta<typeof CompareTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { render: (args) => <Controlled {...args} /> };

export const Variants: Story = {
  render: () => (
    <>
      <Label>no selected column</Label>
      <Controlled columns={columns} rows={rows} cornerLabel="Compare cards" selectedColumnId={null} />
      <Label>selected column (tap a header to move it, tap again to clear)</Label>
      <Controlled columns={columns} rows={rows} cornerLabel="Compare cards" selectedColumnId="reward" />
      <Label>no corner label</Label>
      <Controlled columns={columns.slice(0, 3)} rows={rows} />
    </>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Open question for product: the inner layout was inferred from the Figma cells, and the value cells are taller than the Figma 88 square because the row height follows the hero. A missing value shows a dash. A selected id that is not a column selects nothing. On web the sideways scroll uses the mouse wheel with shift, or a trackpad.',
      },
    },
  },
  render: () => (
    <>
      <Label>1 card</Label>
      <Controlled columns={columns} rows={rows.slice(0, 1)} cornerLabel="Compare cards" />
      <Label>missing values show a dash</Label>
      <Controlled columns={columns} rows={[{ id: 'short', hero: <Hero i={3} />, values: ['₹500'] }]} cornerLabel="Compare cards" />
      <Label>long values and ₹10,00,000</Label>
      <Controlled
        columns={columns.slice(0, 2)}
        rows={[{ id: 'big', hero: <Hero i={4} tag="Invite only" />, values: ['₹0', `₹${(1000000).toLocaleString('en-IN')} annual spend waives the fee`] }]}
        cornerLabel="Compare cards"
      />
      <Label>no rows</Label>
      <Controlled columns={columns} rows={[]} cornerLabel="Compare cards" />
      <Label>selected id not in columns</Label>
      <Controlled columns={columns} rows={rows.slice(0, 2)} selectedColumnId="nope" />
    </>
  ),
};
