import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { GetHelpScreen } from '../../../src/screens/GetHelpScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { tap } from './_dom';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Get help',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/GetHelpScreen.tsx';

/** Five topics (How Cards.xtra works, Your Cashback, Missing Cashback or Rewards, Payment related, Unable to Login). Signed in. */
export const TopicsSignedIn: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:76`, docs: { description: { story: 'The grid width uses the iframe width, not the 390 frame (harness limit), so tile sizes can differ from a phone.' } } },
  render: () => <ScreenHarness name="GetHelp" component={GetHelpScreen} auth="signedIn" api={api.ok()} />,
};

/** Signed out: same topics. Get Help works without an account. */
export const TopicsGuest: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:76` },
  render: () => <ScreenHarness name="GetHelp" component={GetHelpScreen} api={api.ok()} />,
};

/** Guest taps "Missing Cashback or Rewards": the login sheet opens (source `get_help`). */
export const GuestGate: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:121`, docs: { description: { story: 'Reached by a tap. After login the claim intake opens. R13: for a signed-in user this topic restarts the same intake that a not-tracked claim points to.' } } },
  render: () => <ScreenHarness name="GetHelp" component={GetHelpScreen} api={api.ok()} />,
  play: async () => { await tap('Missing Cashback or Rewards'); },
};

/** Signed in taps "Missing Cashback or Rewards": goes straight to the claim intake (stub page here). */
export const MissingCashbackTopic: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:121`, docs: { description: { story: 'Reached by a tap. The next route shows as a stub page.' } } },
  render: () => <ScreenHarness name="GetHelp" component={GetHelpScreen} auth="signedIn" api={api.ok()} />,
  play: async () => { await tap('Missing Cashback or Rewards'); },
};

/** "How Cards.xtra Works?" opens the tracking steps sheet. */
export const HowItWorksSheet: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/HowItWorksSheet.tsx:1', docs: { description: { story: 'Reached by a tap. This sheet is an RN `<Modal>`, so on web it portals to `document.body`, outside the phone frame (harness limit).' } } },
  render: () => <ScreenHarness name="GetHelp" component={GetHelpScreen} auth="signedIn" api={api.ok()} />,
  play: async () => { await tap('How Cards.xtra Works?'); },
};
