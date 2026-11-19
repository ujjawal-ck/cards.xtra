import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardsYouCanGetScreen } from '../../../src/screens/CardsYouCanGetScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, reply } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { Script, clickByText } from '../01-launch-and-login/_flow';
import { REGALIA, ELIGIBLE_ALIASES } from '../03a-card-detail-and-apply/_data';

const Page = ({ a, aliases = ELIGIBLE_ALIASES, tap }: { a: ApiParams; aliases?: string[]; tap?: string }) => (
  <>
    <ScreenHarness name="CardsYouCanGet" component={CardsYouCanGetScreen} auth="guest" api={a}
      params={routeParams('CardsYouCanGet', { rejectedCardId: REGALIA.id, eligibleAliases: aliases, reasonKind: 'income', source: 'rejection' })} />
    {tap ? <Script steps={[[2200, () => clickByText(tap)]]} /> : null}
  </>
);

const meta: Meta = {
  title: 'Flows/3b Rejection/Cards you can get (rejection)',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'Opened by "See all N cards you can get" on the rejection sheet. A strip says what the user wanted, the closest card sits in a row, then category chips, a lifetime-free toggle, a sort control and the card list. Copy claims eligibility ("cards you can get") because every card here passed the check. Apply on this page skips Home\'s eligibility gate on purpose (R11). The stories use the rejected card HDFC Regalia Gold and the harness cards.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Loading: card list skeleton. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:273' },
  render: () => <Page a={api.loading()} />,
};

/** Loaded: context strip, closest row, chips, list. */
export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:127' },
  render: () => <Page a={api.ok()} />,
};

/** A filter on: "Lifetime free only" tapped. */
export const FilterApplied: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:443', docs: { description: { story: 'The story taps the "Lifetime free only" chip. Events filter_apply and filter_clear.' } } },
  render: () => <Page a={api.ok()} tap="Lifetime free only" />,
};

/** Filters match nothing. */
export const NoMatch: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:478', docs: { description: { story: 'Only one eligible card is passed (SBI Cashback, ₹999 fee) and the story taps "Lifetime free only", so no card matches. The screen shows its no-match block with a way to clear.' } } },
  render: () => <Page a={api.ok()} aliases={['sbi-cashback-credit-card']} tap="Lifetime free only" />,
};

/** Cards request fails. */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:280', docs: { description: { story: 'The cards call answers 500, shown after the app\'s retries (about 2 seconds). The offline case is not handled: it falls into "No cards to show" (R6).' } } },
  render: () => <Page a={api.ok({ cards: reply.error(500) })} />,
};
