import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { MissingCashbackMasthead } from '../../../src/organisms/MissingCashbackMasthead';
import { colors, spacing, typography } from '../../../src/tokens';

const meta = {
  title: 'Components/Mastheads/MissingCashbackMasthead',
  component: MissingCashbackMasthead,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/MissingCashbackMasthead.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'Cobalt "Missing Cashback?" hero at the top of the help intake flow. One full-bleed image with the heading baked in, rounded bottom corners and a floating white back button.' } },
  },
  args: {},
} satisfies Meta<typeof MissingCashbackMasthead>;
export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children, label, width = 390 }: { children: React.ReactNode; label: string; width?: number }) => (
  <View style={{ width, alignSelf: 'center', marginBottom: spacing[16], backgroundColor: colors.surface.sunken }}>
    <Text style={{ ...typography.caption10Medium, color: colors.text.secondary, padding: spacing[8] }}>{label}</Text>
    {children}
  </View>
);

export const Playground: Story = { render: (args) => <Frame label="Default"><MissingCashbackMasthead {...args} /></Frame> };

export const Variants: Story = {
  parameters: { docs: { description: { story: 'One variant only. The hero keeps its 360 by 268 ratio at any width.' } } },
  render: () => (
    <View>
      <Frame label="Width 390"><MissingCashbackMasthead /></Frame>
      <Frame label="Width 320" width={320}><MissingCashbackMasthead /></Frame>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No loading, error or disabled state. The heading is part of the image, so it cannot be localised or scaled with the OS font size. Open question for product: swap to live text before a second language ships? The safe-area top inset is 0 in Storybook, so the back button sits higher than on a notched phone.' } } },
  render: () => <Frame label="Default, back button tap does nothing"><MissingCashbackMasthead onBack={() => {}} /></Frame>,
};
