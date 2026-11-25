import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Switch } from '../../../src/atoms/Switch';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Switches/Switch',
  component: Switch,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Switch.tsx',
    docs: { description: { component: 'The on and off toggle: a Cobalt track with a sliding white thumb, in md (44 by 24) and sm (24 by 16). It is controlled: the parent holds the value.' } },
  },
  argTypes: {
    value: { control: 'boolean' },
    size: { control: 'select', options: ['md', 'sm'] },
    disabled: { control: 'boolean' },
    accessibilityLabel: { control: 'text' },
    onValueChange: { control: false },
  },
  args: { value: false, size: 'md', disabled: false, accessibilityLabel: 'Cashback alerts' },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);

/** Holds the value so a click flips the switch; follows the control when it changes. */
function Controlled({ value: initial, ...rest }: React.ComponentProps<typeof Switch>) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  return <Switch {...rest} value={value} onValueChange={setValue} />;
}

export const Playground: Story = { render: (args) => <Controlled {...args} /> };

export const Variants: Story = {
  render: () => (
    <View style={{ gap: spacing[16] }}>
      <Cell label="md off"><Controlled value={false} size="md" accessibilityLabel="Off" /></Cell>
      <Cell label="md on"><Controlled value size="md" accessibilityLabel="On" /></Cell>
      <Cell label="sm off"><Controlled value={false} size="sm" accessibilityLabel="Off" /></Cell>
      <Cell label="sm on"><Controlled value size="sm" accessibilityLabel="On" /></Cell>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Disabled uses the grey-lavender track and ignores taps. The off state has a hairline border so the pale track is visible on white. Pressed fades to 0.85 opacity (hover or hold a click). Switch has no loading or error state. Shown in a settings row with a label, since a lone switch needs an accessibilityLabel.' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 320 }}>
      <Cell label="disabled off"><Switch value={false} disabled accessibilityLabel="Disabled off" /></Cell>
      <Cell label="disabled on"><Switch value disabled accessibilityLabel="Disabled on" /></Cell>
      <Cell label="in a settings row">
        <View style={{ width: 320, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: spacing[16] }}>
            <Text variant="body14Medium">Cashback alerts</Text>
            <Text variant="body12Regular" color={colors.text.secondary}>Tell me when ₹1,00,000 or more is confirmed from Amazon, Flipkart or Myntra</Text>
          </View>
          <Controlled value accessibilityLabel="Cashback alerts" />
        </View>
      </Cell>
    </View>
  ),
};
