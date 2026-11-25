import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { HowItWorksSheet, type HowItWorksSheetRef } from '../../../src/organisms/HowItWorksSheet';
import { SheetHarness } from '../../../storybook/harness';
import { REGALIA } from './_data';

const meta: Meta = {
  title: 'Flows/3a Card detail and apply/How it works sheet',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false }, description: { component: 'The opt-in "Learn how it works?" link on the card detail opens it. It is the only place that explains how a click-out becomes tracked Rewards (R8). It is an RN Modal, so on web it can sit outside the 390 px frame.' } } },
};
export default meta;
type Story = StoryObj;

/** Tracking steps and the "Okay, got it!" button. */
export const TrackingSteps: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/HowItWorksSheet.tsx:185' },
  render: () => (
    <SheetHarness<HowItWorksSheetRef>>
      {(ref) => <HowItWorksSheet ref={ref} cardImage={REGALIA.cardImage} rewardValue={REGALIA.cashbackValue} />}
    </SheetHarness>
  ),
};
