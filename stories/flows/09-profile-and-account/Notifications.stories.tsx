import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { NotificationsScreen } from '../../../src/screens/NotificationsScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { tap } from './_dom';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Notifications',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const R19 = 'R19. The list is a hard-coded empty array and there is no feed API, so the screen always says "You\'re all caught up". The bell on Home suggests a feature that does not exist. Open question: hide the bell until a feed exists, or build one.';

/** All tab: always "You're all caught up". */
export const AllCaughtUp: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/NotificationsScreen.tsx:172', docs: { description: { story: R19 } } },
  render: () => <ScreenHarness name="Notifications" component={NotificationsScreen} auth="signedIn" api={api.ok()} />,
};

/** Offers tab: the same empty state. A play function taps the Offers pill. */
export const OffersTab: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/NotificationsScreen.tsx:112', docs: { description: { story: R19 + ' Reached by a tap on the Offers pill.' } } },
  render: () => <ScreenHarness name="Notifications" component={NotificationsScreen} auth="signedIn" api={api.ok()} />,
  play: async () => { await tap('Offers'); },
};
