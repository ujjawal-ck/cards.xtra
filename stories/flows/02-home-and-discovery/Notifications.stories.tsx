import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { NotificationsScreen } from '../../../src/screens/NotificationsScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/2 Home and discovery/Notifications',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false }, description: { component: 'Reached from the bell on the Home header.' } } },
};
export default meta;
type Story = StoryObj;

/** Always empty: there is no notifications API (R19). */
export const AlwaysEmpty: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/NotificationsScreen.tsx:110', docs: { description: { story: 'Risk R19. The screen always says "You\'re all caught up". The bell implies a feature that does not exist. Open question: hide the bell until an API exists?' } } },
  render: () => <ScreenHarness name="Notifications" component={NotificationsScreen} auth="signedIn" api={api.ok()} />,
};
