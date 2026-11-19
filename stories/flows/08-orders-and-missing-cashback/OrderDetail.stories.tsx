import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OrdersDetail } from '../../../src/screens/OrdersDetail';
import { ScreenHarness } from '../../../storybook/harness';
import { api, orderDetailFixture, reply, clone } from '../../../storybook/fixtures';
import { tap } from './_dom';

const meta: Meta = {
  title: 'Flows/8 Orders and missing cashback/Order detail',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/OrdersDetail.tsx';
type Attrs = Record<string, unknown>;

/** A detail body built from the pending fixture, with some attributes changed. */
function detail(attrs: Attrs) {
  const d = clone(orderDetailFixture.pending);
  Object.assign(d.data.attributes, attrs);
  return d;
}

const show = (orderDetail: unknown, id = '24600001') => (
  <ScreenHarness name="OrdersDetail" component={OrdersDetail} auth="signedIn" params={{ id }} api={api.ok({ orderDetail: orderDetail as never })} />
);

/** Pending Amazon order, expected confirmation date shown, "Need Help" visible. */
export const Pending: Story = { tags: ['live'], parameters: { source: `${SRC}:232` }, render: () => show(orderDetailFixture.pending) };

/** `is_delayed: yes` on a pending order: the masthead turns to the delayed tone. */
export const Delayed: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:232`, docs: { description: { story: 'Built in the story from the pending fixture with `is_delayed: "yes"`. `orderDetailFixture` has no delayed variant.' } } },
  render: () => show(detail({ is_delayed: 'yes' })),
};

/** Cancelled order. */
export const Cancelled: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:232`, docs: { description: { story: 'Built in the story from the pending fixture with `cashback_status: "Cancelled"`. The fixture file has no cancelled order (only `doc`, a cancelled referral).' } } },
  render: () => show(detail({ cashback_status: 'Cancelled', comments: null })),
};

/** Confirmed order. */
export const Confirmed: Story = { tags: ['live'], parameters: { source: `${SRC}:232` }, render: () => show(orderDetailFixture.confirmed, '24600003') };

/** Paid order with the full timeline. */
export const Paid: Story = { tags: ['live'], parameters: { source: `${SRC}:232` }, render: () => show(orderDetailFixture.paid, '24600004') };

/** First load: the app shows a bare spinner. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:211`, docs: { description: { story: 'Bare `ActivityIndicator`. ux-states.md proposes a masthead `Skeleton` plus 3 rows.' } } },
  render: () => <ScreenHarness name="OrdersDetail" component={OrdersDetail} auth="signedIn" params={{ id: '24600001' }} api={api.loading()} />,
};

/** The order call answers 500: text "Couldn't load this order." and a Retry link. */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:215`, docs: { description: { story: 'Text and a link, not `ScreenState`. Wait 1 to 2 s for the retries to end.' } } },
  render: () => <ScreenHarness name="OrdersDetail" component={OrdersDetail} auth="signedIn" params={{ id: '24600001' }} api={api.ok({ orderDetail: reply.error(500) })} />,
};

/** R14: "Need Help" opens the claim flow at store choice. The order's store, date and ID are not passed. */
export const NeedHelpWithoutContext: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:272`,
    docs: { description: { story: 'R14. A play function taps "Need Help". The harness shows a stub page for the next route: `MissingCashbackWhereDidYouShop` with no params. The user has to pick the store again. Open question: carry store, date and order ID into the claim.' } },
  },
  render: () => show(orderDetailFixture.pending),
  play: async () => { await tap('Need Help'); },
};
