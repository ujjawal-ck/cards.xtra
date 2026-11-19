import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardsYouCanGetScreen } from '../../../src/screens/CardsYouCanGetScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { REGALIA, ALIASES, ELIGIBLE_ALIASES } from '../03a-card-detail-and-apply/_data';

const Page = ({ known }: { known: boolean }) => (
  <ScreenHarness name="CardsYouCanGet" component={CardsYouCanGetScreen} auth="guest" api={api.ok()}
    params={routeParams('CardsYouCanGet', { rejectedCardId: REGALIA.id, eligibleAliases: known ? ELIGIBLE_ALIASES : ALIASES, source: 'bounce', eligibilityKnown: known })} />
);

const meta: Meta = {
  title: 'Flows/3c Bounce/Cards you can get (bounce)',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'The same page as in flow 3b, opened by "View all cards" on the cross-sell rail after the user left a card without applying. The title is "More cards to consider" and the copy does not promise eligibility unless the user\'s result is known. Without a result, every card is listed, closest first (Home passes all aliases). Money-sensitive: click-out source cards_you_can_get.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Eligibility unknown: "N cards, closest first", no promise. */
export const EligibilityUnknown: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:127' },
  render: () => <Page known={false} />,
};

/** Eligibility known: the count reads "N cards you can get". */
export const EligibilityKnown: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:127' },
  render: () => <Page known />,
};
