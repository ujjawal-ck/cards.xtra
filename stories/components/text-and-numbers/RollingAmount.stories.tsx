import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { RollingAmount } from '../../../src/atoms/RollingAmount';
import { Button } from '../../../src/atoms/Button';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing, radius } from '../../../src/tokens';

const meta = {
  title: 'Components/Text and numbers/RollingAmount',
  component: RollingAmount,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/RollingAmount.tsx',
    docs: {
      description: {
        component: 'An odometer reveal for a money value: each digit rolls through reels and settles left to right. Used for the Earnings headline. Default colour is white, so it sits on a dark surface.',
        story: 'WEB RENDERING PROBLEM (known black box): it uses reanimated worklets and a masked view, so on react-native-web it may render blank or static. If the number is blank, the app behaviour has to be checked on a device. The component is not changed here.',
      },
    },
  },
  decorators: [(Story) => <View style={{ backgroundColor: colors.surface.inverse, padding: spacing[24], borderRadius: radius.lg }}><Story /></View>],
  argTypes: {
    value: { control: 'text' },
    variant: { control: 'select', options: ['display40ExtraBold', 'display36ExtraBold', 'heading28Bold', 'heading20Bold'] },
    duration: { control: { type: 'number', min: 200, max: 3000, step: 100 } },
    playToken: { control: 'text' },
    color: { control: 'select', options: [colors.text.inverse, colors.cashback.default] },
  },
  args: { value: '₹1,00,000', variant: 'display36ExtraBold', color: colors.text.inverse, duration: 900, playToken: 1 },
} satisfies Meta<typeof RollingAmount>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);

export const Playground: Story = {};

function Replay() {
  const [t, setT] = useState(1);
  return (
    <View style={{ gap: spacing[16], alignItems: 'flex-start' }}>
      <RollingAmount value="₹12,34,567" playToken={t} />
      <Button label="Replay" variant="outline" tone="main" size={36} onPress={() => setT((n) => n + 1)} />
    </View>
  );
}

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Typography variants, and replay through playToken (change the token to roll again; the app bumps it on every screen focus).' } } },
  render: () => (
    <View style={{ gap: spacing[24] }}>
      {(['display40ExtraBold', 'display36ExtraBold', 'heading28Bold', 'heading20Bold'] as const).map((v) => (
        <Cell key={v} label={v}><RollingAmount value="₹1,500" variant={v} /></Cell>
      ))}
      <Cell label="replay"><Replay /></Cell>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled, loading or error state. Only 0 to 9 spin; the rupee sign, commas and the decimal point are static. Shown: paise, a very large amount with Indian grouping, zero, and a slow roll.' } } },
  render: () => (
    <View style={{ gap: spacing[24] }}>
      <Cell label="paise"><RollingAmount value="₹775.60" /></Cell>
      <Cell label="zero"><RollingAmount value="₹0" /></Cell>
      <Cell label="very large"><RollingAmount value="₹12,34,56,789" /></Cell>
      <Cell label="slow (3000 ms)"><RollingAmount value="₹1,00,000" duration={3000} /></Cell>
    </View>
  ),
};
