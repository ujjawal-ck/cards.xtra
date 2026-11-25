import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { HowItWorks } from '../../../src/organisms/Carousels';
import { Block, Stack, phoneDecorator } from './_chrome';
import { howSteps } from './_fixtures';

const meta = {
  title: 'Components/Carousels/HowItWorks',
  component: HowItWorks,
  tags: ['autodocs', 'live'],
  decorators: [phoneDecorator],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/Carousels.tsx',
    docs: { description: { component: 'A sideways row of step cards, each with text on the left and a 72 round icon on the right.' } },
  },
  argTypes: {
    steps: { control: 'object', description: 'Items: id, text, icon (IconName).' },
    style: { control: false },
  },
  args: { steps: howSteps },
} satisfies Meta<typeof HowItWorks>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Block label="Four steps (as on Home)"><HowItWorks steps={howSteps} /></Block>
      <Block label="Two steps"><HowItWorks steps={howSteps.slice(0, 2)} /></Block>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <Block label="1 step"><HowItWorks steps={howSteps.slice(0, 1)} /></Block>
      <Block label="Many steps (8)"><HowItWorks steps={[...howSteps, ...howSteps.map((s) => ({ ...s, id: s.id + 'b' }))]} /></Block>
      <Block label="Long text (clips inside the 214 wide text column)">
        <HowItWorks steps={[{ id: 'long', text: 'Apply for the Axis Bank Magnus Credit Card using the Cards.xtra link so your spends are tracked and your cashback is credited', icon: 'feat-rewards-outline' }]} />
      </Block>
    </Stack>
  ),
};
