import React from 'react';
import { View, Image } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Footer } from '../../../src/organisms/Footer';
import { Text } from '../../../src/atoms';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import { colors, spacing } from '../../../src/tokens';

const noop = () => {};
const art = SAMPLE_CARDS[0].cardImage;
const CardArtSlot = () => (
  <Image source={art} accessibilityIgnoresInvertColors style={{ width: 240, height: 152, resizeMode: 'contain', alignSelf: 'center' }} />
);

/** The light theme has white text: it needs a dark surface behind it. */
const Surface = ({ theme, children }: { theme: 'dark' | 'light'; children: React.ReactNode }) => (
  <View style={{ width: 360, backgroundColor: theme === 'light' ? colors.surface.dark : colors.background.default, paddingBottom: spacing[24] }}>{children}</View>
);

const meta = {
  title: 'Components/Footers/Footer',
  component: Footer,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/Footer.tsx',
    docs: { description: { component: 'The big closing block at the end of a page: a headline, a supporting line, an optional saffron CTA and a slot for card art.' } },
  },
  decorators: [
    (Story, ctx) => <Surface theme={ctx.args.theme ?? 'dark'}><Story /></Surface>,
  ],
  argTypes: {
    theme: { control: 'inline-radio', options: ['dark', 'light'], description: 'Text colour: dark text over a light surface, light text over a dark surface or image.' },
    headline: { control: 'text' },
    subtext: { control: 'text' },
    ctaLabel: { control: 'text', description: 'When set, a saffron solid button shows.' },
    onCtaPress: { control: false },
    children: { control: false },
    style: { control: false },
  },
  args: {
    theme: 'dark',
    headline: 'Find your card',
    subtext: 'Rewards that pay you back, on every spend.',
    ctaLabel: 'Apply Now',
    onCtaPress: noop,
    children: <CardArtSlot />,
  },
} satisfies Meta<typeof Footer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Dark theme (dark text, light surface) and light theme (white text, dark surface), each with a CTA and card art.' } } },
  decorators: [(Story) => <View><Story /></View>],
  render: (args) => (
    <View style={{ gap: spacing[16] }}>
      <Surface theme="dark"><Footer {...args} theme="dark" /></Surface>
      <Surface theme="light"><Footer {...args} theme="light" /></Surface>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Without a CTA, without art, headline only wrapped on several lines, and long copy. Both text lines render at 0.32 opacity in the source (see its comment): check contrast on your surface.' } } },
  decorators: [(Story) => <View><Story /></View>],
  render: (args) => (
    <View style={{ gap: spacing[16] }}>
      <Surface theme="dark"><Footer {...args} ctaLabel={undefined}>{null}</Footer></Surface>
      <Surface theme="dark"><Footer {...args} children={null} /></Surface>
      <Surface theme="dark"><Footer {...args} headline="Earn up to ₹10,00,000 in rewards every year on all your spends" subtext="Pay no joining fee in the first year. Lifetime free on spends of ₹2,00,000 or more." /></Surface>
      <Surface theme="dark"><Footer {...args} headline="₹0 fees" subtext="No hidden charges." ctaLabel="Apply Now" /></Surface>
    </View>
  ),
};
