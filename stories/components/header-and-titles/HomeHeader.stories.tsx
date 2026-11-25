import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, ImageBackground, Text } from 'react-native';
import { HomeHeader } from '../../../src/organisms/HomeHeader';
import { images } from '../../../src/assets/images';
import { colors, spacing, typography } from '../../../src/tokens';

const meta = {
  title: 'Components/Header and titles/HomeHeader',
  component: HomeHeader,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/HomeHeader.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'Home screen header with two states. scrolled=false: transparent over the dark masthead with logo, help, message and bell. scrolled=true: frosted bar with logo, search and filter chips.' } },
  },
  argTypes: {
    scrolled: { control: 'boolean' },
    notificationCount: { control: { type: 'number', min: 0, max: 120 } },
    filtersCategoryLabel: { control: 'text' },
    categoryCount: { control: { type: 'number', min: 0, max: 15 } },
    filtersCount: { control: { type: 'number', min: 0, max: 15 } },
    eligibilityOn: { control: 'boolean' },
    eligibilityChecked: { control: 'boolean' },
  },
  args: { scrolled: false, notificationCount: 3, filtersCategoryLabel: 'Category', categoryCount: 0, filtersCount: 0, eligibilityOn: false, eligibilityChecked: false },
} satisfies Meta<typeof HomeHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

function Backdrop({ children, scrolled, label }: { children: React.ReactNode; scrolled?: boolean; label?: string }) {
  return (
    <View style={{ width: 390, alignSelf: 'center', marginBottom: spacing[16] }}>
      {label ? <Text style={{ ...typography.caption10Medium, color: colors.text.secondary, padding: spacing[8] }}>{label}</Text> : null}
      {scrolled
        ? <View style={{ backgroundColor: colors.surface.sunken, minHeight: 140 }}>{children}</View>
        : <ImageBackground source={images.backgrounds.home} resizeMode="cover" style={{ minHeight: 140 }}>{children}</ImageBackground>}
    </View>
  );
}

export const Playground: Story = { render: (args) => <Backdrop scrolled={args.scrolled}><HomeHeader {...args} /></Backdrop> };

export const Variants: Story = {
  render: () => (
    <View>
      <Backdrop label="scrolled=false (over the dark masthead)"><HomeHeader scrolled={false} notificationCount={3} /></Backdrop>
      <Backdrop scrolled label="scrolled=true (frosted bar with chips)"><HomeHeader scrolled filtersCategoryLabel="Category" /></Backdrop>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Frosted look is a LinearGradient, not a real blur, so it matches native. Notification badge is 12 dp: a count of 100 or more is not specified. Open question for product: cap at 9+ ?' } } },
  render: () => (
    <View>
      <Backdrop label="No notifications"><HomeHeader notificationCount={0} /></Backdrop>
      <Backdrop label="Large count (120)"><HomeHeader notificationCount={120} /></Backdrop>
      <Backdrop scrolled label="Category and Filters selected with counts"><HomeHeader scrolled categoryCount={2} filtersCount={3} filtersCategoryLabel="Category" /></Backdrop>
      <Backdrop scrolled label="Eligibility on, details saved (edit pencil shown)"><HomeHeader scrolled eligibilityOn eligibilityChecked /></Backdrop>
      <Backdrop scrolled label="Long category label"><HomeHeader scrolled filtersCategoryLabel="Travel and Entertainment" categoryCount={1} /></Backdrop>
    </View>
  ),
};
