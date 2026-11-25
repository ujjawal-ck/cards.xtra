import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { Masthead, OffersCategoryStrip } from '../../../src/organisms/Masthead';
import { images } from '../../../src/assets/images';
import { colors, spacing, typography } from '../../../src/tokens';

const meta = {
  title: 'Components/Mastheads/Masthead',
  component: Masthead,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/Masthead.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'Per-screen hero block. The variant prop picks the layout: profile, earnings, payment, cashback-status, home or offers. OffersCategoryStrip is the offers strip, exported on its own.' } },
  },
  argTypes: {
    variant: { control: 'select', options: ['profile', 'earnings', 'payment', 'cashback-status', 'home', 'offers'] },
    name: { control: 'text' }, contact: { control: 'text' }, avatarInitial: { control: 'text' },
    totalEarnings: { control: 'text' }, subtitle: { control: 'text' }, cashbackValue: { control: 'text' }, rewardsValue: { control: 'text' },
    loading: { control: 'boolean' },
    amount: { control: 'text' }, statusLabel: { control: 'text' }, expectedText: { control: 'text' },
    tone: { control: 'select', options: ['requested', 'pending', 'delayed', 'cancelled', 'confirmed', 'paid', 'expired'] },
    size: { control: 'select', options: ['default', 'compact'] },
    notificationCount: { control: { type: 'number', min: 0, max: 120 } },
    placeholder: { control: 'text' },
  },
  args: {
    variant: 'profile', name: 'Test User', contact: 'user@example.com', avatarInitial: 'T',
    totalEarnings: '1,24,500', subtitle: 'Total cashback earned', cashbackValue: '₹1,00,000', rewardsValue: '₹24,500',
    amount: '₹12,450', statusLabel: 'Confirmed', expectedText: 'Expected by 15 Dec', tone: 'pending',
    size: 'default', notificationCount: 3, placeholder: 'Search by card name',
  },
} satisfies Meta<typeof Masthead>;
export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children, label }: { children: React.ReactNode; label?: string }) => (
  <View style={{ width: 390, alignSelf: 'center', marginBottom: spacing[16], backgroundColor: colors.surface.sunken }}>
    {label ? <Text style={{ ...typography.caption10Medium, color: colors.text.secondary, padding: spacing[8] }}>{label}</Text> : null}
    {children}
  </View>
);

export const Playground: Story = { render: (args) => <Frame><Masthead {...args} /></Frame> };

export const Variants: Story = {
  render: () => (
    <View>
      <Frame label="profile"><Masthead variant="profile" name="Test User" contact="user@example.com" avatarInitial="T" /></Frame>
      <Frame label="earnings"><Masthead variant="earnings" totalEarnings="1,24,500" subtitle="Total cashback earned" cashbackValue="₹1,00,000" rewardsValue="₹24,500" /></Frame>
      <Frame label="payment"><Masthead variant="payment" amount="₹12,450" subtitle="Will be sent to your bank" /></Frame>
      <Frame label="cashback-status"><Masthead variant="cashback-status" amount="₹850" brandLogo={images.brands.amazon} statusLabel="Pending" tone="pending" expectedText="Expected by 15 Dec" /></Frame>
      <Frame label="home, size=default"><Masthead variant="home" size="default" notificationCount={3} placeholder="Search by card name" /></Frame>
      <Frame label="home, size=compact"><Masthead variant="home" size="compact" notificationCount={3} placeholder="Search by card name" /></Frame>
      <Frame label="offers"><Masthead variant="offers" placeholder="Search stores" /></Frame>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Earnings loading shows skeletons in place of amounts. Cashback-status tone covers every StatusBadge status. Avatar falls back to the initial when no image is passed. Home shows a bell badge only when notificationCount is above 0. The 2-row card on profile is 328 wide inside a 360 container: on screens wider than 360 the hero does not stretch. Open question for product: does the hero need to scale up on large phones?' } } },
  render: () => (
    <View>
      <Frame label="earnings, loading"><Masthead variant="earnings" loading totalEarnings="0" cashbackValue="0" rewardsValue="0" /></Frame>
      <Frame label="earnings, zero"><Masthead variant="earnings" totalEarnings="0" subtitle="Total cashback earned" cashbackValue="₹0" rewardsValue="₹0" /></Frame>
      <Frame label="earnings, large amount"><Masthead variant="earnings" totalEarnings="12,34,56,789" subtitle="Total cashback earned" cashbackValue="₹10,00,00,000" rewardsValue="₹2,34,56,789" /></Frame>
      <Frame label="cashback-status, confirmed"><Masthead variant="cashback-status" amount="₹1,250" brandLogo={images.brands.flipkart} statusLabel="Confirmed" tone="confirmed" expectedText="Paid on 20 Dec" /></Frame>
      <Frame label="cashback-status, cancelled"><Masthead variant="cashback-status" amount="₹0" brandLogo={images.brands.amazon} statusLabel="Cancelled" tone="cancelled" expectedText="Order was returned" /></Frame>
      <Frame label="profile, long name"><Masthead variant="profile" name="Test User With A Very Long Display Name" contact="user@example.com" avatarInitial="T" /></Frame>
      <Frame label="home, no notifications"><Masthead variant="home" notificationCount={0} /></Frame>
    </View>
  ),
};

export const OffersCategoryStripStory: Story = {
  name: 'OffersCategoryStrip',
  parameters: { docs: { description: { story: 'The saffron category strip with a sliding white indicator, exported on its own so Offers can pin it as a sticky header. Tap a circle to move the indicator. Pass tintColor to re-theme it to the selected category.' } } },
  render: () => (
    <View>
      <Frame label="Default (uncontrolled, saffron)"><OffersCategoryStrip /></Frame>
      <Frame label="selectedIndex=2 with tintColor"><OffersCategoryStrip selectedIndex={2} tintColor={colors.action.secondary.default} /></Frame>
    </View>
  ),
};
