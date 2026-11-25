import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OnboardingScreen } from '../../../src/screens/OnboardingScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { Script, clickByText } from './_flow';

const meta: Meta = {
  title: 'Flows/1 Launch and login/Onboarding',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'Three full-bleed slides on first launch. "Get Started" enters the app as a guest. "Already on CashKaro? Log in" opens the app-wide login sheet. Storybook stubs the Lottie slides, so the slide art is blank; the copy, progress bars and buttons are real.' },
    },
  },
};
export default meta;
type Story = StoryObj;

const Onboarding = ({ extra }: { extra?: React.ReactNode }) => (
  <>
    <ScreenHarness name="Onboarding" component={OnboardingScreen} auth="guest" api={api.ok()} />
    {extra}
  </>
);

/** Slides with the two buttons. */
export const Slides: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OnboardingScreen.tsx:393' },
  render: () => <Onboarding />,
};

/** "Get Started": enters the app as a guest, lands on the tabs. */
export const GuestStart: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OnboardingScreen.tsx:398', docs: { description: { story: 'The story taps "Get Started" after the page loads. The navigation resets to MainTabs and the harness shows its stub page "→ MainTabs". The app saves "onboarded" so a returning guest skips this screen (event onboarding_guest_start).' } } },
  render: () => <Onboarding extra={<Script steps={[[1200, () => clickByText('Get Started')]]} />} />,
};

/** "Already on CashKaro? Log in": the login sheet opens over the slides. */
export const LoginTapped: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OnboardingScreen.tsx:401', docs: { description: { story: 'The story taps the log-in link. The real login sheet opens over the slides (see the Login sheet step for its states).' } } },
  render: () => <Onboarding extra={<Script steps={[[1200, () => clickByText('Log in with your CashKaro account')]]} />} />,
};
