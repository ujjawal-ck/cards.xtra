import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { TestimonialSavingsTag } from '../../../src/atoms/TestimonialSavingsTag';

const meta = {
  title: 'Components/Badge and Tag/TestimonialSavingsTag',
  component: TestimonialSavingsTag,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/TestimonialSavingsTag.tsx',
    docs: {
      description: {
        component: 'Unused today. A spaced-capitals line between two short gradient rules ("SAVED ₹30,000 ANNUALLY"), for a testimonial.',
        story: 'Web rendering: the label uses GradientText (masked view), which may render blank or solid on react-native-web. The two side lines render.',
      },
    },
  },
  argTypes: { label: { control: 'text' } },
  args: { label: 'Saved ₹30,000 annually' },
} satisfies Meta<typeof TestimonialSavingsTag>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[16], maxWidth: 520, alignItems: 'flex-start' }}>{children}</View>
);

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'One style. Variants shows 3 label lengths. The right line is the left line mirrored (inferred in code, only the left was read from Figma).' } } },
  render: () => (
    <View style={{ gap: spacing[16] }}>
      <Cell label="short"><TestimonialSavingsTag label="Saved ₹5,000" /></Cell>
      <Cell label="typical"><TestimonialSavingsTag label="Saved ₹30,000 annually" /></Cell>
      <Cell label="large amount"><TestimonialSavingsTag label="Saved ₹1,00,000 annually" /></Cell>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled or loading state. Long text does not wrap or truncate; the row grows. Needs a device check for the gradient label.' } } },
  render: () => (
    <View style={{ width: 360 }}>
      <TestimonialSavingsTag label="Saved ₹12,34,567 on HDFC Millennia and SBI Cashback" />
    </View>
  ),
};
