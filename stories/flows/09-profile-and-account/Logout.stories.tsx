import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';
import { LogoutConfirmSheet, type LogoutConfirmSheetRef } from '../../../src/organisms/LogoutConfirmSheet';
import { ScreenHarness, SheetHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { tap } from './_dom';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Logout',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

/** The confirm sheet on its own: "Yes" signs out, "No" closes. */
export const ConfirmSheet: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/LogoutConfirmSheet.tsx:121' },
  render: () => (
    <SheetHarness<LogoutConfirmSheetRef>>
      {(ref) => <LogoutConfirmSheet ref={ref} onConfirm={() => console.log('[storybook] logout confirmed')} />}
    </SheetHarness>
  ),
};

/** From the Profile tab: a play function taps "Logout" and the sheet rises over the screen. */
export const FromProfile: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/ProfileScreen.tsx:279',
    docs: { description: { story: 'Reached by a tap. "Yes" signs out and resets to Home as a guest; the harness shows a stub page for that route.' } },
  },
  render: () => <ScreenHarness name="Profile" component={ProfileScreen} auth="signedIn" displayName="Test User" api={api.ok()} />,
  play: async () => { await tap('Logout'); },
};
