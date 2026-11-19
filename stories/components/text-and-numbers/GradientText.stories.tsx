import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { GradientText } from '../../../src/atoms/GradientText';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing, gradients } from '../../../src/tokens';

const NAMES = ['primary', 'premium', 'reward', 'urgent', 'success'] as const;

const meta = {
  title: 'Components/Text and numbers/GradientText',
  component: GradientText,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/GradientText.tsx',
    docs: {
      description: {
        component: 'One run of text filled with a named gradient (masked view plus a linear gradient). Pass a gradient from `gradients`, never raw hex.',
        story: 'WEB RENDERING PROBLEM: it uses @react-native-masked-view/masked-view, which on react-native-web may render blank, or solid text without the gradient. Treat the story as a screenshot-only check on a device. The component is not changed here.',
      },
    },
  },
  argTypes: {
    children: { control: 'text' },
    variant: { control: 'select', options: ['display40ExtraBold', 'heading24Bold', 'heading20SemiBold', 'body16SemiBold', 'body14SemiBold', 'caption10SemiBold'] },
    italic: { control: 'boolean' },
    colors: { control: false },
    start: { control: false },
    end: { control: false },
  },
  args: { children: 'Earn up to ₹1,00,000', variant: 'heading24Bold', colors: gradients.reward.colors, italic: false },
} satisfies Meta<typeof GradientText>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'One row for each named gradient. See the web rendering note on the page header.' } } },
  render: () => (
    <View style={{ gap: spacing[16] }}>
      {NAMES.map((n) => (
        <Cell key={n} label={`gradients.${n}`}>
          <GradientText variant="heading24Bold" colors={gradients[n].colors} start={gradients[n].start} end={gradients[n].end}>Earn up to ₹1,00,000</GradientText>
        </Cell>
      ))}
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled or loading state. Italic is a synthesised oblique on iOS and upright on Android (only upright Outfit faces are loaded). A long string does not wrap well in the mask: open question for the build owner.' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 320 }}>
      <Cell label="italic"><GradientText variant="heading24Bold" colors={gradients.primary.colors} italic>HDFC Millennia</GradientText></Cell>
      <Cell label="long text"><GradientText variant="body16SemiBold" colors={gradients.premium.colors}>Flipkart, Amazon and Myntra rewards on every order</GradientText></Cell>
    </View>
  ),
};
