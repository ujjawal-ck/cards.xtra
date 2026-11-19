import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { Header } from '../../../src/organisms/Header';
import { colors, spacing, typography } from '../../../src/tokens';

const meta = {
  title: 'Components/Header and titles/Header',
  component: Header,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/Header.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'Plain screen header: a leading back or close glyph, an optional title, an optional trailing icon and an optional TabPrimary row below.' } },
  },
  argTypes: {
    surface: { control: 'select', options: ['default', 'transparent'] },
    leading: { control: 'select', options: ['back', 'close'] },
    align: { control: 'select', options: ['start', 'end'] },
    title: { control: 'text' },
    trailingIcon: { control: 'select', options: [undefined, 'bell-outline', 'message-outline', 'headset-outline', 'filter-outline', 'clipboard-search-outline'] },
    activeTab: { control: { type: 'number', min: 0, max: 3 } },
  },
  args: { surface: 'default', leading: 'back', title: 'Earnings', activeTab: 0 },
} satisfies Meta<typeof Header>;
export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children, label, dark }: { children: React.ReactNode; label?: string; dark?: boolean }) => (
  <View style={{ width: 390, alignSelf: 'center', marginBottom: spacing[16] }}>
    {label ? <Text style={{ ...typography.caption10Medium, color: colors.text.secondary, padding: spacing[8] }}>{label}</Text> : null}
    <View style={{ backgroundColor: dark ? colors.surface.dark : colors.surface.sunken }}>{children}</View>
  </View>
);
function WithTabs(props: React.ComponentProps<typeof Header>) {
  const [i, setI] = useState(props.activeTab ?? 0);
  return <Header {...props} activeTab={i} onTabChange={setI} />;
}

export const Playground: Story = { render: (args) => <Frame><Header {...args} /></Frame> };

export const Variants: Story = {
  render: () => (
    <View>
      <Frame label="leading=back, with title"><Header surface="default" leading="back" title="Withdraw cashback" /></Frame>
      <Frame label="leading=close, with title"><Header surface="default" leading="close" title="Eligibility check" /></Frame>
      <Frame label="leading=back, trailing icon"><Header surface="default" leading="back" title="Notifications" trailingIcon="bell-outline" /></Frame>
      <Frame label="leading=close, align=end, no title"><Header surface="default" leading="close" align="end" /></Frame>
      <Frame label="surface=transparent (over a dark page)" dark><Header surface="transparent" leading="back" title="Cards you can get" /></Frame>
      <Frame label="with tabs row"><WithTabs surface="default" leading="back" title="My earnings" tabs={[{ label: 'All' }, { label: 'Pending', count: 3 }, { label: 'Paid' }]} /></Frame>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Header has no pressed, disabled or loading state of its own. Back and trailing slots are Pressables with no visible pressed style. A long title is not tested for truncation here: open question for product (one line with ellipsis, or wrap?).' } } },
  render: () => (
    <View>
      <Frame label="Long title"><Header surface="default" leading="back" title="HDFC Millennia Credit Card benefits and eligibility details" trailingIcon="headset-outline" /></Frame>
      <Frame label="Large rupee amount in title"><Header surface="default" leading="back" title="Withdraw ₹1,00,000" /></Frame>
      <Frame label="No title, leading only"><Header surface="default" leading="back" /></Frame>
      <Frame label="Many tabs (scroll)"><WithTabs surface="default" leading="back" title="Offers" tabs={['Fashion', 'Electronics', 'Beauty', 'Travel', 'Food', 'Pharmacy'].map((label) => ({ label }))} /></Frame>
    </View>
  ),
};
