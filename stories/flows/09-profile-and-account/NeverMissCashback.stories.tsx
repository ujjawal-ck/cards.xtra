import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CashbackGuardScreen } from '../../../src/screens/CashbackGuardScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Never miss cashback',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

/** Not available: "This feature is available on the Android app build only." This is what iOS shows, and what web renders. */
export const NotAvailable: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/CashbackGuardScreen.tsx:135',
    docs: { description: { story: 'The native module is a no-op off Android, so web renders the iOS notice. The Android setup steps (usage access and notification permissions, "Re-check permissions", `CashbackGuardScreen.tsx:222` to `:263`) cannot render on web and are not shown. The `cashback_guard_toggle` event is defined but never fired.' } },
  },
  render: () => <ScreenHarness name="CashbackGuard" component={CashbackGuardScreen} auth="signedIn" api={api.ok()} />,
};
