import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OrdersDetail } from '../../../src/screens/OrdersDetail';
import { ScreenHarness } from '../../../storybook/harness';
import { api, orderDetailFixture, reply, clone } from '../../../storybook/fixtures';
import { View } from 'react-native';
import { ScreenState } from '../../../src/organisms/ScreenState';
import { Skeleton } from '../../../src/atoms/Skeleton';
import { spacing } from '../../../src/tokens';
import { tap } from './_dom';
import { ProposedPage } from './_proposed';

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

/** The order id is unknown: the generic error shows, and "Retry" cannot help. */
export const NotFound: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:199`, docs: { description: { story: 'The order call answers 404. The screen shows the same text as for a 500 ("Couldn\'t load this order.") with a Retry link. Wait 1 to 2 s for the retries to end. See the proposed story for a copy that fits.' } } },
  render: () => show(reply.error(404)),
};

/** PROPOSED: the order is not found. */
export const NotFoundProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: 'Open question: where does "Go to orders" lead when the user came from a notification or deep link with no list behind it?' } } },
  render: () => (
    <ProposedPage title="Order Details">
      <ScreenState title="We couldn't find this order" body="It may have been removed. Check your orders list." actionLabel="Go to orders" onAction={() => {}} />
    </ProposedPage>
  ),
};

/** PROPOSED: the order cannot load, as a screen state. */
export const LoadErrorProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: 'Today the error is an off-pattern text with a link. Copy from ux-states.md flow 7. Open question: none.' } } },
  render: () => (
    <ProposedPage title="Order Details">
      <ScreenState title="Couldn't load this order" body="Check your connection and try again." actionLabel="Try again" onAction={() => {}} />
    </ProposedPage>
  ),
};

/** PROPOSED: a masthead block and three rows instead of the bare spinner. */
export const LoadingProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: 'Open question: none; the app shows a bare spinner today.' } } },
  render: () => (
    <ProposedPage title="Order Details">
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        <Skeleton height={spacing[128]} radius="lg" />
        <Skeleton height={spacing[48]} radius="lg" />
        <Skeleton height={spacing[48]} radius="lg" />
        <Skeleton height={spacing[48]} radius="lg" />
      </View>
    </ProposedPage>
  ),
};
