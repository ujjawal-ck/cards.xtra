import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SplashScreen } from '../../../src/screens/SplashScreen';
import { ScreenHarness, STORAGE_KEYS } from '../../../storybook/harness';
import { api, reply } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/1 Launch and login/Splash',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'The Lottie intro. It plays once, then replaces itself with Onboarding (first launch) or the tabs. A 7 second safety timer does the same if the animation never reports it has finished. Storybook stubs Lottie, so the frame is blank; after 7 seconds a stub page shows where the app would go.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Guest on a fresh install: after the intro the app goes to Onboarding. */
export const Default: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/SplashScreen.tsx:63' },
  render: () => <ScreenHarness name="Splash" component={SplashScreen} auth="guest" api={api.ok()} />,
};

/** Signed in (saved session): after the intro the app goes to the tabs. */
export const SessionLoading: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/SplashScreen.tsx:63', docs: { description: { story: 'A saved session is read while the intro plays. The route is decided when the intro ends: signed in goes to the tabs, a first launch goes to Onboarding. The stub page "→ MainTabs" appears after 7 seconds.' } } },
  render: () => <ScreenHarness name="Splash" component={SplashScreen} auth="signedIn" api={api.loading()} />,
};

/** Saved session, no network: the session is kept and the user still reaches the tabs. */
export const OfflineWithSavedSession: Story = {
  tags: ['live'],
  parameters: { source: 'src/auth/AuthContext.tsx:127', docs: { description: { story: 'A network failure while the app restores the session does not log the user out. The splash behaves as with a good network.' } } },
  render: () => <ScreenHarness name="Splash" component={SplashScreen} auth="signedIn" api={api.offline()} />,
};

/** A three-part token with an `exp` in the past (2020). Opaque tokens never count as expiring, so the app would not try a refresh. No personal data. */
const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const EXPIRED_JWT = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'storybook', exp: 1577836800 })}.storybook-signature`;

/** Saved session whose refresh token is rejected: the user is logged out without a word (A10, Q3). */
export const RefreshRejectedAtLaunch: Story = {
  tags: ['live'],
  parameters: { source: 'src/auth/AuthContext.tsx:136', docs: { description: { story: 'Edge case. The saved access token is expired (a test token with a past exp), so the app asks for a new one and the API answers 401 / 2004. The app clears the session and sets no "session expired" marker, so no login sheet opens and nothing explains it. The splash plays out as for a guest, then goes to Onboarding after 7 seconds (stub page "→ Onboarding"). Open question Q3: tell the user ("You were logged out") or stay silent?' } } },
  render: () => (
    <ScreenHarness
      name="Splash"
      component={SplashScreen}
      auth="signedIn"
      storage={{ [STORAGE_KEYS.accessToken]: EXPIRED_JWT }}
      api={api.ok({ refreshToken: reply.code(401, '2004', 'Session expired') })}
    />
  ),
};
