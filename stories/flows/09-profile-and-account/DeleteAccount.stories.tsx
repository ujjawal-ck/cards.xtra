import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { DeleteAccountScreen } from '../../../src/screens/DeleteAccountScreen';
import { DeleteAccountOtpScreen } from '../../../src/screens/DeleteAccountOtpScreen';
import { AccountDeletedScreen } from '../../../src/screens/AccountDeletedScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { tap } from './_dom';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Delete account',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const HIDDEN = 'HIDDEN (D23, R16): the entry link in Account settings is hidden because the screens only simulate deletion. Any 4-digit code passes, "Account deleted" shows, and nothing is deleted. Result: a user who wants to leave has no path (R16, store compliance risk). Open question: build the deletion API and show the link, or keep a support route.';

/** Landing: what is lost, a terms checkbox, and the destructive "Delete Account" (disabled until the box is ticked). */
export const Landing: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/DeleteAccountScreen.tsx:155', docs: { description: { story: HIDDEN } } },
  render: () => <ScreenHarness name="DeleteAccount" component={DeleteAccountScreen} auth="signedIn" api={api.ok()} />,
};

/** Terms ticked: "Delete Account" is enabled. A play function ticks the box. */
export const TermsTicked: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/DeleteAccountScreen.tsx:137', docs: { description: { story: HIDDEN + ' Reached by a tap on the checkbox label.' } } },
  render: () => <ScreenHarness name="DeleteAccount" component={DeleteAccountScreen} auth="signedIn" api={api.ok()} />,
  play: async () => { await tap('I agree to the terms & conditions'); },
};

/** OTP step: a code is "sent" to the masked mobile number. */
export const Otp: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/DeleteAccountOtpScreen.tsx:52', docs: { description: { story: HIDDEN + ' The masked mobile reads short here (fixture number, see the harness README).' } } },
  render: () => <ScreenHarness name="DeleteAccountOtp" component={DeleteAccountOtpScreen} auth="signedIn" api={api.ok()} />,
};

/** The "Account deleted" confirmation. Nothing was deleted. */
export const Deleted: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/AccountDeletedScreen.tsx:109', docs: { description: { story: HIDDEN } } },
  render: () => <ScreenHarness name="AccountDeleted" component={AccountDeletedScreen} auth="signedIn" api={api.ok()} />,
};
