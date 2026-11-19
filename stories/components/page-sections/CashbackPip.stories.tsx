import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CashbackPip } from '../../../src/organisms/CashbackPip';
import { ComponentHarness } from '../../../storybook/harness';
import { Labeled, Stack } from './_chrome';

const WEB_NOTE = 'The pip is Android only. It returns null when Platform.OS is not "android". Storybook runs on web, so the area below is empty. A blank frame is the web output, not a crash. It also needs the CashbackGuard native module. To see the drag, snap and genie collapse, run the app on an Android device.';
const noop = () => {};
const Frame = ({ children }: { children: React.ReactNode }) => (
  <ComponentHarness><View style={{ width: 390, height: 844, alignSelf: 'center' }}>{children}</View></ComponentHarness>
);

const meta = {
  title: 'Components/Page sections/CashbackPip',
  component: CashbackPip,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/CashbackPip.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'A draggable floating pip on the Orders screen that links to Never Miss Cashback setup. It collapses to a side notch. Android only.' } },
  },
  argTypes: {
    autoExpand: { control: 'boolean', description: 'False keeps the pip docked as the side notch. Used on the Orders empty state.' },
    onPress: { control: false },
  },
  args: { onPress: noop, autoExpand: true },
  render: (args) => <Frame><CashbackPip {...args} /></Frame>,
} satisfies Meta<typeof CashbackPip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { parameters: { docs: { description: { story: WEB_NOTE } } } };

export const Variants: Story = {
  parameters: { docs: { description: { story: `Expanded (autoExpand true) and docked notch (autoExpand false). ${WEB_NOTE}` } } },
  render: () => (
    <Stack>
      <Labeled label="autoExpand = true"><Frame><CashbackPip onPress={noop} autoExpand /></Frame></Labeled>
      <Labeled label="autoExpand = false (docked notch)"><Frame><CashbackPip onPress={noop} autoExpand={false} /></Frame></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: `States in the app: expanded pip with two rolling lines, dragging, snapped to an edge, collapsed notch. The pip is hidden when the feature is already on. ${WEB_NOTE}` } } },
  render: () => <Frame><CashbackPip onPress={noop} /></Frame>,
};
