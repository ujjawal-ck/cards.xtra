import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Button } from '../../../src/atoms/Button';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing, radius } from '../../../src/tokens';

const meta = {
  title: 'Components/Buttons/Button',
  component: Button,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Button.tsx',
    docs: { description: { component: 'The one tappable action: 6 variants, 3 tones, 3 sizes. Solid is Saffron only (D17); Cobalt solid is tone="accent" for the partner Shop & Earn CTA.' } },
  },
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['solid', 'outline', 'subtle', 'destructive', 'ghost', 'link'] },
    tone: { control: 'select', options: ['main', 'second', 'accent'] },
    size: { control: 'select', options: [36, 44, 52] },
    icon: { control: 'select', options: ['none', 'leading', 'trailing', 'only'] },
    iconName: { control: 'select', options: ['chevron-right', 'cart-outline', 'search-outline', 'wallet-outline', 'copy-outline'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    haptic: { control: 'select', options: [undefined, 'none', 'light', 'medium', 'success'] },
  },
  args: { label: 'Apply now', variant: 'solid', tone: 'main', size: 44, icon: 'none', iconName: 'chevron-right', disabled: false, loading: false, fullWidth: false },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[16], maxWidth: 520 }}>{children}</View>
);

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Every variant at size 44. Solid main and second are both Saffron (D17). Ghost has a white label and only reads on a dark surface.' } } },
  render: () => (
    <View style={{ gap: spacing[24] }}>
      <Wrap>
        <Cell label="solid / main"><Button label="Apply now" variant="solid" tone="main" /></Cell>
        <Cell label="solid / second (same Saffron)"><Button label="Apply now" variant="solid" tone="second" /></Cell>
        <Cell label="solid / accent (Cobalt)"><Button label="Shop & Earn upto X%" variant="solid" tone="accent" /></Cell>
        <Cell label="outline / main"><Button label="Compare" variant="outline" tone="main" /></Cell>
        <Cell label="outline / second"><Button label="View details" variant="outline" tone="second" /></Cell>
        <Cell label="subtle"><Button label="Share" variant="subtle" /></Cell>
        <Cell label="destructive"><Button label="Log out" variant="destructive" /></Cell>
        <Cell label="link"><Button label="Read terms" variant="link" /></Cell>
      </Wrap>
      <Cell label="ghost (on dark surface)">
        <View style={{ backgroundColor: colors.surface.inverse, padding: spacing[16], borderRadius: radius.lg }}>
          <Button label="Skip for now" variant="ghost" />
        </View>
      </Cell>
    </View>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Wrap>
      {([36, 44, 52] as const).map((s) => (
        <Cell key={s} label={`size ${s}`}><Button label="Check eligibility" size={s} /></Cell>
      ))}
    </Wrap>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Wrap>
      <Cell label="leading"><Button label="Search cards" icon="leading" iconName="search-outline" /></Cell>
      <Cell label="trailing"><Button label="Continue" icon="trailing" iconName="chevron-right" /></Cell>
      <Cell label="only (label = a11y name)"><Button label="Open cart" icon="only" iconName="cart-outline" /></Cell>
      <Cell label="outline + leading"><Button label="Copy code" variant="outline" tone="second" icon="leading" iconName="copy-outline" /></Cell>
    </Wrap>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Disabled drops opacity to 0.4. Loading swaps the label for a spinner and blocks taps. Pressed has no static prop (Pressable state); hover or click a button to see it. Full width keeps a 16 px inset. Long text stays on one line (numberOfLines 1), so a long label clips: open question for product, shorten the copy or allow two lines.' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 340 }}>
      <Cell label="disabled"><Button label="Apply now" disabled /></Cell>
      <Cell label="disabled outline"><Button label="Compare" variant="outline" tone="second" disabled /></Cell>
      <Cell label="loading"><Button label="Apply now" loading /></Cell>
      <Cell label="loading destructive"><Button label="Log out" variant="destructive" loading /></Cell>
      <Cell label="fullWidth"><View style={{ alignSelf: 'stretch', width: 340 }}><Button label="Withdraw ₹1,00,000" fullWidth size={52} /></View></Cell>
      <Cell label="long text in 200 px"><View style={{ width: 200 }}><Button label="Apply for HDFC Millennia credit card" fullWidth /></View></Cell>
    </View>
  ),
};
