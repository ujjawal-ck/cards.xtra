import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text as RNText } from 'react-native';
import { BreakdownTable } from '../../../src/molecules/BreakdownTable';
import { colors, spacing, typography } from '../../../src/tokens';

const FRAME = 390;
const Frame = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: FRAME, padding: spacing[16], gap: spacing[12] }}>{children}</View>
);
const Label = ({ children }: { children: React.ReactNode }) => (
  <RNText style={{ ...typography.caption10Medium, color: colors.text.tertiary }}>{children}</RNText>
);

const rows = [
  { label: 'Amazon spends', a: 4200, b: 5900 },
  { label: 'Dining and delivery', a: 1800, b: 3600 },
  { label: 'Milestones', a: 0, b: 2500 },
  { label: 'Annual fee', a: -2950, b: -999 },
];

const meta = {
  title: 'Components/Tables/BreakdownTable',
  component: BreakdownTable,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/BreakdownTable.tsx',
    docs: { description: { component: 'Two cards line by line (Breakdown, Your pick, Our pick) with a net total and a "Better" mark under the winner.' } },
  },
  argTypes: {
    rows: { control: 'object' },
    headers: { control: 'object' },
    totalLabel: { control: 'text' },
    total: { control: 'object' },
    lowerIsBetter: { control: 'boolean' },
  },
  args: { rows, totalLabel: 'Your net savings', lowerIsBetter: false },
} satisfies Meta<typeof BreakdownTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      <Label>higher total wins (default)</Label>
      <BreakdownTable rows={rows} />
      <Label>lowerIsBetter: lower total wins (fees)</Label>
      <BreakdownTable
        rows={[{ label: 'Joining fee', a: 2500, b: 999 }, { label: 'Annual fee', a: 2500, b: 999 }]}
        totalLabel="Fees you pay"
        lowerIsBetter
      />
      <Label>custom headers</Label>
      <BreakdownTable rows={rows} headers={{ label: 'Per year', a: 'HDFC Regalia', b: 'SBI Cashback' }} />
      <Label>total overridden by the caller</Label>
      <BreakdownTable rows={rows} total={{ a: 3050, b: 11001 }} />
    </>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A tie shows no "Better" mark. Negative values show as a minus, for example -₹2,950. Totals add in paise. The "Better" word is added by the app so colour is not the only cue; it is not in the Figma.',
      },
    },
  },
  render: () => (
    <>
      <Label>tie</Label>
      <BreakdownTable rows={[{ label: 'Amazon spends', a: 3000, b: 3000 }]} />
      <Label>zero and ₹10,00,000</Label>
      <BreakdownTable rows={[{ label: 'Welcome benefit', a: 0, b: 1000000 }, { label: 'Annual fee', a: 0, b: -2500 }]} />
      <Label>1 row</Label>
      <BreakdownTable rows={[{ label: 'Fuel surcharge waiver', a: 450, b: 300 }]} />
      <Label>many rows, long label</Label>
      <BreakdownTable
        rows={[
          { label: 'Amazon spends', a: 4200, b: 5900 },
          { label: 'Flipkart spends', a: 1200, b: 800 },
          { label: 'Myntra and Ajio fashion spends', a: 900, b: 1500 },
          { label: 'Swiggy and Zomato dining and food delivery', a: 1800, b: 3600 },
          { label: 'Fuel', a: 300, b: 300 },
          { label: 'Milestones', a: 0, b: 2500 },
          { label: 'Annual fee', a: -2950, b: -999 },
        ]}
      />
      <Label>no rows</Label>
      <BreakdownTable rows={[]} />
    </>
  ),
};
