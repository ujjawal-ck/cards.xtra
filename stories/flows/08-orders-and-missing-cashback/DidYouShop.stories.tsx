import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { MissingCashbackHelp } from '../../../src/screens/MissingCashbackHelp';
import { InlineMessage } from '../../../src/molecules/InlineMessage';
import { Button } from '../../../src/atoms/Button';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing, radius } from '../../../src/tokens';
import { ScreenHarness } from '../../../storybook/harness';
import { api, reply } from '../../../storybook/fixtures';
import { sleep, tap } from './_dom';
import { ProposedPage } from './_proposed';

const meta: Meta = {
  title: 'Flows/8 Orders and missing cashback/Did you shop',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/MissingCashbackHelp.tsx';
const screen = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="MissingCashbackHelp" component={MissingCashbackHelp} auth="signedIn" api={a} />;
const REASON = 'I didn’t understand how cashback works';

/** The question: "Did You Shop?" with Yes and No. Store visits are fetched in the background. */
export const Question: Story = { tags: ['live'], parameters: { source: `${SRC}:45` }, render: () => screen(api.ok()) };

/** The store-visit lookup is running: the Yes button shows a spinner. */
export const CheckingStoreVisits: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:149`, docs: { description: { story: 'Every call hangs, so the lookup never ends and the Yes button stays in its loading state.' } } },
  render: () => screen(api.loading()),
};

/** Yes with store visits: moves on to "Where did you shop?". The harness shows a stub page for that route. */
export const YesWithVisits: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:61`, docs: { description: { story: 'Reached by a tap on Yes. The next screen is on the Where did you shop step; here the harness shows its stub page.' } } },
  render: () => screen(api.ok()),
  play: async () => { await tap('Yes'); },
};

/** Yes with no store visits in 30 days: goes to the Oops screen (stub page here). */
export const YesWithoutVisits: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:61`, docs: { description: { story: 'Reached by a tap on Yes, with an empty retailer list. See the Where did you shop step for the Oops screen itself.' } } },
  render: () => screen(api.empty()),
  play: async () => { await tap('Yes'); },
};

/** No: the "What Went Wrong?" feedback sheet. */
export const NoFeedbackSheet: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/WhatWentWrongFeedbackSheet.tsx:101', docs: { description: { story: 'Reached by a tap on No. "Submit Feedback" stays disabled until one reason is ticked.' } } },
  render: () => screen(api.ok()),
  play: async () => { await tap('No'); },
};

/** No, one reason ticked and submitted: the "Your Feedback is Appreciated" sheet. */
export const FeedbackAppreciated: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/FeedbackAppreciatedSheet.tsx:84', docs: { description: { story: 'Reached by taps: No, the first reason, Submit Feedback.' } } },
  render: () => screen(api.ok()),
  play: async () => {
    await tap('No');
    await tap(REASON, { nth: 'last' });
    await tap('Submit Feedback', { nth: 'last', settleMs: 900 });
  },
};

/** The store-visit lookup failed: a native Alert shows, rendered as a dialog on web. */
export const LookupFailedAlert: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:72`, docs: { description: { story: 'Reached by a tap on Yes after the lookup has failed. The retailers call answers 500; the play function waits 2 s for the retries, then taps Yes. The native Alert shows as a dialog through the web shim. Design: see "Lookup failed" below.' } } },
  render: () => screen(api.ok({ mcRetailers: reply.error(500) })),
  play: async () => { await sleep(2000); await tap('Yes'); },
};

/** N1 (fixed on branch `claude/mc-p0-fixes`): Yes while the lookup is paused offline. */
export const YesOffline: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:72`, docs: { description: { story: 'N1, fixed on branch `claude/mc-p0-fixes` (4d40166), not yet in `Anmol--changes`. Every call fails like a dropped network, so the retailers lookup is paused with no data. A tap on Yes shows the Alert "You\'re offline" / "Connect to the internet and try again." with Cancel and "Try again". It no longer routes to the Oops screen and does not track has_visits. The native Alert shows as a dialog through the web shim.' } } },
  render: () => screen(api.offline()),
  play: async () => { await sleep(1000); await tap('Yes'); },
};

/** PROPOSED: the store-visit lookup failed. Today a native Alert. */
export const LookupFailed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Today `MissingCashbackHelp.tsx:72` shows a native `Alert` ("Couldn\'t check your store visits"). Offline with no cache now has its own Alert ("You\'re offline", see the Yes offline story). Open question: inline message above the buttons (this design) or keep the Alert.' } },
  },
  render: () => (
    <ProposedPage title="Missing Cashback" background={colors.background.muted}>
      <View style={{ padding: spacing[16], gap: spacing[16] }}>
        <Text variant="body16SemiBold" color={colors.text.primary}>We are here to help.</Text>
        <InlineMessage tone="warning" message="Couldn't check your store visits." primaryActionLabel="Try again" onPrimaryAction={() => {}} />
        <View style={{ backgroundColor: colors.surface.default, borderRadius: radius.xl, padding: spacing[24], gap: spacing[12], alignItems: 'center' }}>
          <Text variant="heading24Bold" color={colors.text.primary}>Did You Shop?</Text>
          <Button label="Yes" variant="solid" tone="second" size={52} onPress={() => {}} />
          <Button label="No" variant="outline" tone="second" size={52} onPress={() => {}} />
        </View>
      </View>
    </ProposedPage>
  ),
};
