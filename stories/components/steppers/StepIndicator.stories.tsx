import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StepIndicator, type StepIndicatorKind } from '../../../src/atoms/StepIndicator';
import { Text } from '../../../src/atoms';
import { images } from '../../../src/assets/images';
import { colors, spacing } from '../../../src/tokens';

const KINDS: StepIndicatorKind[] = ['done', 'current', 'locked', 'info', 'footprints', 'cashback', 'image'];

const meta = {
  title: 'Components/Steppers/StepIndicator',
  component: StepIndicator,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/StepIndicator.tsx',
    docs: { description: { component: 'The marker at the start of a step: done, current, locked, info, footprints, cashback or an image.' } },
  },
  argTypes: {
    kind: { control: 'select', options: KINDS },
    image: { control: false, description: 'Required for kind image. Any ImageSourcePropType.' },
  },
  args: { kind: 'current', image: images.brands.amazon },
} satisfies Meta<typeof StepIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ alignItems: 'center', gap: spacing[8], minWidth: 72 }}>
    {children}
    <Text variant="body12Medium" color={colors.text.secondary}>{label}</Text>
  </View>
);

export const Variants: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[16], alignItems: 'flex-end', maxWidth: 420 }}>
      {KINDS.map((k) => (
        <Cell key={k} label={k}><StepIndicator kind={k} image={images.brands.flipkart} /></Cell>
      ))}
    </View>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A path of three steps (done, current, locked) and the edge case of kind image with no image set (an empty 56 px frame). The footprints marker draws a small dot: the shoe-prints glyph is not built (see the source header).',
      },
    },
  },
  render: () => (
    <View style={{ gap: spacing[16] }}>
      <View style={{ flexDirection: 'row', gap: spacing[16], alignItems: 'center' }}>
        <StepIndicator kind="done" /><StepIndicator kind="current" /><StepIndicator kind="locked" />
      </View>
      <Cell label="image, no source"><StepIndicator kind="image" /></Cell>
    </View>
  ),
};
