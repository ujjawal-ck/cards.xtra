import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ScreenState } from '../../src/organisms/ScreenState';
import { images } from '../../src/assets/images';
import { Board, Phone, Labelled, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/Empty',
  parameters: { layout: 'padded', docs: { description: { component: 'ScreenState is the one block for empty, no-results and error screens.' } } },
};
export default meta;
type Story = StoryObj;

export const NothingYet: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OrdersList.tsx:425', docs: { description: { story: 'First-use empty. An illustration, a title that says what is missing, one line on how it fills.' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState image={images.screenstate.appOrders} title="No orders yet" body="Shop via Cards.xtra and your orders will show up here." />
    </Phone></Board>
  ),
};

export const NoMatchingResults: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OrdersList.tsx:418', docs: { description: { story: 'Filters hide everything. Offer one tap to clear them.' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="No matching results" body="Try adjusting your filters." actionLabel="Clear filters" onAction={noop} />
    </Phone></Board>
  ),
};

export const NoCardsForTheseDetails: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:293', docs: { description: { story: 'The list is empty because of what the user entered. The action changes the input.' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="No cards to show" body="We could not find a card you can get with these details." actionLabel="Change my details" onAction={noop} />
    </Phone></Board>
  ),
};

export const NoOffers: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OffersScreen.tsx:552', docs: { description: { story: 'Empty tab with a way forward. The audit notes this can be the default on production (R10) and shows the same text when the device is offline with no cache (see the Offline pattern).' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="No offers here yet" body="New stores are added often. Pull down to refresh, or find a card that earns you cashback." actionLabel="Explore cards" onAction={noop} />
    </Phone></Board>
  ),
};

export const AllCaughtUp: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/NotificationsScreen.tsx:172', docs: { description: { story: 'Notifications always shows this (R19): the bell suggests a feature that does not exist yet.' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="You're all caught up" body="Offers and updates about your cashback will show up here." />
    </Phone></Board>
  ),
};

export const WithIllustration: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/MissingCashbackDidYouShop.tsx:212', docs: { description: { story: 'Per-tab empty on the claims list, with the tracking illustration. Parts: optional 156 px illustration, title (heading18SemiBold), optional body (body14Regular), one optional action.' } } },
  render: () => (
    <Board>
      <Labelled label="Closed tab">
        <Phone padded={false}><ScreenState image={images.screenstate.tracking} title="No closed claims yet" body="Cashback being tracked shows up here." /></Phone>
      </Labelled>
    </Board>
  ),
};
