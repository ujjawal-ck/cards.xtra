import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { NeverMissCashbackNudge } from '../../../src/organisms/NeverMissCashbackNudge';
import { ComponentHarness } from '../../../storybook/harness';
import { sizing } from '../../../src/tokens';
import { Labeled, Stack } from './_chrome';

const WEB_NOTE = 'This prompt shows only on Android, with the CashbackGuard native module linked, at least one tracked order, and no earlier dismiss. Storybook runs on web, so Platform.OS is "web" and the component renders nothing. A blank area is the web output, not a crash. To see it, run the app on an Android device or emulator.';

const meta = {
  title: 'Components/Page sections/NeverMissCashbackNudge',
  component: NeverMissCashbackNudge,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/NeverMissCashbackNudge.tsx',
    layout: 'padded',
    docs: { description: { component: 'A Home card that asks the user to turn on Never Miss Cashback after a first tracked order. Android only.' } },
  },
  render: () => (
    <ComponentHarness><View style={{ width: sizing.containerMobile }}><NeverMissCashbackNudge /></View></ComponentHarness>
  ),
} satisfies Meta<typeof NeverMissCashbackNudge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { parameters: { docs: { description: { story: WEB_NOTE } } } };

export const Variants: Story = {
  parameters: { docs: { description: { story: `The component has no props, so there are no variants. ${WEB_NOTE}` } } },
  render: () => (
    <Stack><Labeled label="Default (no props)"><ComponentHarness><NeverMissCashbackNudge /></ComponentHarness></Labeled></Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: `Hidden states: not Android, native module missing, feature already on, already dismissed, no tracked orders. All render nothing. The visible card has one state with a dismiss button that saves the choice in SecureStore. ${WEB_NOTE}` } } },
  render: () => (
    <Stack><Labeled label="Web (hidden)"><ComponentHarness><NeverMissCashbackNudge /></ComponentHarness></Labeled></Stack>
  ),
};
