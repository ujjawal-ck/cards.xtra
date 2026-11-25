import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { WithdrawTerms } from '../../../src/screens/withdraw/WithdrawTerms';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';

/**
 * Flow 7, step 4b. Terms and conditions behind the "here" link of the consent line on each details form.
 * One screen, four copies (route param `variant`). Static text, no API.
 */
const meta: Meta = {
  title: 'Flows/7 Earnings and withdraw/Terms',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/withdraw/WithdrawTerms.tsx';
const Terms = ({ variant }: { variant: 'upi' | 'amazon' | 'flipkart' | 'bank' }) => (
  <ScreenHarness name="WithdrawTerms" component={WithdrawTerms} auth="signedIn" params={routeParams('WithdrawTerms', { variant })} api={api.ok()} />
);

/** UPI payment terms. */
export const Upi: Story = { tags: ['live'], parameters: { source: `${SRC}:86` }, render: () => <Terms variant="upi" /> };
/** Amazon Pay Balance terms. */
export const Amazon: Story = { tags: ['live'], parameters: { source: `${SRC}:86` }, render: () => <Terms variant="amazon" /> };
/** Flipkart gift card terms. */
export const Flipkart: Story = { tags: ['live'], parameters: { source: `${SRC}:86` }, render: () => <Terms variant="flipkart" /> };
/** Bank transfer terms exist in code, but no screen links to them: Bank Transfer is "Coming soon" (R12). */
export const Bank: Story = {
  tags: ['hidden'],
  parameters: { source: `${SRC}:86`, docs: { description: { story: 'Hidden: the copy is written (src/screens/withdraw/termsContent.ts) but the Bank Transfer row is not tappable (R12), so no consent link opens it.' } } },
  render: () => <Terms variant="bank" />,
};
