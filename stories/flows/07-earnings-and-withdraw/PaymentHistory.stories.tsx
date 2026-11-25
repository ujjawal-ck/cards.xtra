import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ProfilePaymentHistory } from '../../../src/screens/ProfilePaymentHistory';
import { ProfilePaymentHistoryDetails } from '../../../src/screens/ProfilePaymentHistoryDetails';
import { ProfilePaymentHistoryEmpty } from '../../../src/screens/ProfilePaymentHistoryEmpty';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';

/**
 * Flow 7, step 7. Payment history. HIDDEN: decision D4 removed every link to it, so a user cannot reach it.
 * The screens ship Figma sample payouts (a sample request and amount), not data from an API: there is no payout history endpoint.
 * Shown for reference only. Related risk: R4 (no record of a payout after success).
 */
const meta: Meta = {
  title: 'Flows/7 Earnings and withdraw/Payment history',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const D4 = 'Hidden by decision D4 (docs/decision.md): no route links to it. Figma sample values, no API behind it.';

/** List with two sample payout cards and a month dropdown. */
export const List: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/ProfilePaymentHistory.tsx:94', docs: { description: { story: D4 } } },
  render: () => <ScreenHarness name="ProfilePaymentHistory" component={ProfilePaymentHistory} auth="signedIn" api={api.ok()} />,
};

/** Details of one sample payout. */
export const Details: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/ProfilePaymentHistoryDetails.tsx:100', docs: { description: { story: D4 } } },
  render: () => <ScreenHarness name="ProfilePaymentHistoryDetails" component={ProfilePaymentHistoryDetails} auth="signedIn" api={api.ok()} />,
};

/** Empty state: no payments yet. It is a standalone screen with its own route; nothing decides between it and the list. */
export const Empty: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/ProfilePaymentHistoryEmpty.tsx:76', docs: { description: { story: D4 } } },
  render: () => <ScreenHarness name="ProfilePaymentHistoryEmpty" component={ProfilePaymentHistoryEmpty} auth="signedIn" api={api.ok()} />,
};
