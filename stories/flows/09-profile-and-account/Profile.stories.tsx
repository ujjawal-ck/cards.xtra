import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api, reply, profileFixture, clone } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Profile',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/ProfileScreen.tsx';
const profile = (props: Partial<React.ComponentProps<typeof ScreenHarness>>) => (
  <ScreenHarness name="Profile" component={ProfileScreen} api={api.ok()} {...props} />
);

/** Signed out: a "Your CashKaro account" prompt. No earnings, withdraw, missing cashback or logout rows. Help, call and privacy still work. */
export const Guest: Story = { tags: ['live'], parameters: { source: `${SRC}:134` }, render: () => profile({}) };

/** Signed in: name and masked contact in the account card, account rows and Logout. */
export const SignedIn: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:57`, docs: { description: { story: 'The mobile reads short ("98********10" masks from the fixture number "98XXXXXX10"): a fixture limit, see the harness README.' } } },
  render: () => profile({ auth: 'signedIn', displayName: 'Test User' }),
};

/** R9: a new user's email is the generated placeholder, shown masked in the account card. */
export const PlaceholderEmail: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:97`,
    docs: { description: { story: 'R9 (D16). New accounts get `cardsxtra.<phone>@cashkaro-demo.app`. The card shows it masked, so the user sees an email they never typed. Payout, claim and reset emails do not reach it. Open question: collect a real email, and at which step (signup, first withdrawal, first claim).' } },
  },
  render: () => {
    const p = clone(profileFixture.default);
    p.data[0].attributes.email = 'cardsxtra.9800000010@cashkaro-demo.app';
    return profile({ auth: 'signedIn', displayName: 'Test User', api: api.ok({ profile: p }) });
  },
};

/** Profile still loading: name and contact are empty (no skeleton). */
export const ProfileLoading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:64`, docs: { description: { story: 'The profile call hangs. The masthead renders empty name and contact. ux-states.md proposes `Skeleton` lines.' } } },
  render: () => profile({ auth: 'signedIn', api: api.ok({ profile: reply.hang() }) }),
};

/** Profile call failed: nothing tells the user. The screen never reads `isError`. */
export const ProfileFailed: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:64`, docs: { description: { story: 'The profile call answers 500. The masthead stays empty and no message shows. ux-states.md proposes an `InlineMessage` "Couldn\'t load your details." with "Try again". Wait 1 to 2 s.' } } },
  render: () => profile({ auth: 'signedIn', api: api.ok({ profile: reply.error(500) }) }),
};

/** A very long display name: the name has no line limit. */
export const LongName: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/Masthead.tsx:341', docs: { description: { story: 'The name has no `numberOfLines`; the contact line has one. ux-states.md proposes one line with a tail ellipsis.' } } },
  render: () => profile({ auth: 'signedIn', displayName: 'Test User With A Very Long Name That Keeps Going Past One Line' }),
};
