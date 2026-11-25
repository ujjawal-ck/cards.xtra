import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { BottomNav, type BottomNavTab } from '../../../src/organisms/BottomNav';
import { colors, spacing, typography } from '../../../src/tokens';

const TABS: BottomNavTab[] = ['home', 'offers', 'earnings', 'profile'];

const meta = {
  title: 'Components/Tab bar/BottomNav',
  component: BottomNav,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/BottomNav.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'App navigation: a floating dark pill with four tabs and one spotlight that slides to the active tab. The caller places it above the home indicator.' } },
  },
  argTypes: {
    activeTab: { control: 'select', options: TABS },
  },
  args: { activeTab: 'home' },
} satisfies Meta<typeof BottomNav>;
export default meta;
type Story = StoryObj<typeof meta>;

function Frame({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View style={{ width: 390, alignSelf: 'center', backgroundColor: colors.surface.sunken, padding: spacing[16], gap: spacing[8] }}>
      {label ? <Text style={{ ...typography.caption10Medium, color: colors.text.secondary }}>{label}</Text> : null}
      {children}
    </View>
  );
}

function Interactive({ initial }: { initial: BottomNavTab }) {
  const [tab, setTab] = useState<BottomNavTab>(initial);
  return <Frame><BottomNav activeTab={tab} onTabPress={setTab} /></Frame>;
}

export const Playground: Story = { render: (args) => <Interactive initial={args.activeTab} key={args.activeTab} /> };

export const Variants: Story = {
  render: () => (
    <View style={{ gap: spacing[8] }}>
      {TABS.map((t) => (<Frame key={t} label={`activeTab="${t}"`}><BottomNav activeTab={t} /></Frame>))}
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Press state (scale 0.92 with a spring) shows only on touch, not in a static render. Tap a tab in Playground to see it. The component has no disabled, loading or badge state. Open question for product: should Earnings show a dot when a withdraw is pending? Not decided here.' } } },
  render: () => <Interactive initial="earnings" />,
};
