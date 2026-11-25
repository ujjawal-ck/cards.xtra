import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { GreetingScreen } from '../../../src/screens/GreetingScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/1 Launch and login/Greeting',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'Shown once after a signup that started on Onboarding: a short animated hello, then the tabs (auto-advance or tap). A returning login skips it.' },
    },
  },
};
export default meta;
type Story = StoryObj;

const Greeting = ({ name }: { name: string }) => (
  <ScreenHarness name="Greeting" component={GreetingScreen} auth="signedIn" api={api.ok()} params={routeParams('Greeting', { name })} />
);

/** Signup name "Test User": the screen says the first name. */
export const Default: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/GreetingScreen.tsx:65' },
  render: () => <Greeting name="Test User" />,
};

/** No name: the screen falls back to "there". */
export const NoName: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/GreetingScreen.tsx:65' },
  render: () => <Greeting name="" />,
};

/** A very long first name: no line limit today. */
export const LongName: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/GreetingScreen.tsx:184', docs: { description: { story: 'Edge case (PARTIAL). The name renders in a 40 px display style with no line limit, and the backend does not cap the name. Proposal from the UX audit: one line with a tail ellipsis. Open question: cap the signup name field instead?' } } },
  render: () => <Greeting name="Testuserwithaverylongfirstnamethatkeepsgoing Test" />,
};

/** The same long name on the small Android viewport (360 dp). */
export const LongName360: Story = {
  tags: ['live'],
  globals: { viewport: { value: 'android360', isRotated: false } },
  parameters: { source: 'src/screens/GreetingScreen.tsx:184', docs: { description: { story: 'Edge case at 360 dp. Pinned to the Android small viewport (360 x 800). The 40 px name has no line limit, so a long first name wraps over several lines in the narrower frame. Open question: cap the signup name field, or truncate here?' } } },
  render: () => (
    <ScreenHarness name="Greeting" component={GreetingScreen} auth="signedIn" api={api.ok()} width={360} height={800} params={routeParams('Greeting', { name: 'Testuserwithaverylongfirstnamethatkeepsgoing Test' })} />
  ),
};
