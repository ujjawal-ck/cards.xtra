import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AccountSettingsScreen } from '../../../src/screens/AccountSettingsScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api, reply } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Account settings',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/AccountSettingsScreen.tsx';
const DEMO = 'R5. DEMO: no profile-update API is wired. "Save Changes" only goes back and saves nothing, and the screen can say a contact change succeeded without any server check. Open question: hide the Edit Profile row until the CashKaro profile APIs exist, or keep it (pm-flows question 7).';
const screen = (params?: object, a: ReturnType<typeof api.ok> = api.ok()) => (
  <ScreenHarness name="AccountSettings" component={AccountSettingsScreen} auth="signedIn" params={params} api={a} />
);

/** Profile fields filled from the fixture; "Save Changes" is disabled until the name changes. */
export const Loaded: Story = { tags: ['demo'], parameters: { source: `${SRC}:204`, docs: { description: { story: DEMO } } }, render: () => screen() };

/** Back from the contact-change flow with a new email: the success message and the new value show. */
export const EmailChanged: Story = {
  tags: ['demo'],
  parameters: { source: `${SRC}:187`, docs: { description: { story: DEMO + ' Params `{ updated: "email", newValue }` as the last contact step sends them. Any 6-digit code passes in that flow.' } } },
  render: () => screen({ updated: 'email', newValue: 'new.user@example.com' }),
};

/** Back from the contact-change flow with a new mobile number. */
export const MobileChanged: Story = {
  tags: ['demo'],
  parameters: { source: `${SRC}:187`, docs: { description: { story: DEMO } } },
  render: () => screen({ updated: 'mobile', newValue: '9800000010' }),
};

/** Profile still loading: the email and mobile fields read empty (no skeleton). */
export const ProfileLoading: Story = {
  tags: ['demo'],
  parameters: { source: `${SRC}:90`, docs: { description: { story: DEMO + ' The profile call hangs.' } } },
  render: () => screen(undefined, api.ok({ profile: reply.hang() })),
};
