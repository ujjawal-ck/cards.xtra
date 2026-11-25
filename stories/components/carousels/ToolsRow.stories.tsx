import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ToolsRow } from '../../../src/organisms/ToolsRow';
import { Block, Stack, phoneDecorator } from './_chrome';

const meta = {
  title: 'Components/Carousels/ToolsRow',
  component: ToolsRow,
  tags: ['autodocs', 'live'],
  decorators: [phoneDecorator],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/ToolsRow.tsx',
    docs: { description: { component: 'One row of four card-tool tiles under the Home masthead; two tiles rotate a word every few seconds.' } },
  },
  argTypes: {
    onPress: { control: false, description: 'Fires with the tool id and the word on screen (undefined for fixed tiles).' },
    style: { control: false },
  },
  args: { onPress: () => {} },
} satisfies Meta<typeof ToolsRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'The row has one layout in the app. Tiles share the row width at normal text size and scroll sideways at a larger OS font size. A browser story cannot change the OS font scale, so only the shared-width layout shows.' } } },
  render: () => (
    <Stack>
      <Block label="Default: four tiles, two rotate (Best card for ...)"><ToolsRow onPress={() => {}} /></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Rotation runs while the story is open and is skipped when the browser asks for reduced motion. No loading, empty or error state exists: the tiles are fixed. HomeSkeleton reserves the row height with TOOLS_ROW_FIT_H.' } } },
  render: () => (
    <Stack>
      <Block label="Rotating (wait about 4 seconds for the words to change)"><ToolsRow onPress={() => {}} /></Block>
    </Stack>
  ),
};
