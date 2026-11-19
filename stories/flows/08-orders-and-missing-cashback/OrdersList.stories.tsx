import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { OrdersList } from '../../../src/screens/OrdersList';
import { OrderCard } from '../../../src/organisms/OrderCard';
import { InlineMessage } from '../../../src/molecules/InlineMessage';
import { images } from '../../../src/assets/images';
import { spacing } from '../../../src/tokens';
import { ScreenHarness, type ApiRequest } from '../../../storybook/harness';
import { api, ordersFixture } from '../../../storybook/fixtures';
import { tap } from './_dom';
import { ProposedPage } from './_proposed';

const meta: Meta = {
  title: 'Flows/8 Orders and missing cashback/Orders list',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/OrdersList.tsx';

/** The orders API filters by `filter[status]`. This answers like it: rows whose status is in the filter. */
function ordersByStatus(req: ApiRequest) {
  const f = req.query.get('filter[status]');
  if (!f) return ordersFixture.typical;
  const want = f.split(',').map((s) => s.trim().toLowerCase());
  const data = ordersFixture.typical.data.filter((r) => want.includes(String(r.attributes.cashback_status).toLowerCase()));
  return { meta: { ...ordersFixture.typical.meta, total_records: data.length }, data };
}

/** Any applied filter answers with no rows. */
const ordersNoMatch = (req: ApiRequest) =>
  Array.from(req.query.keys()).some((k) => k.startsWith('filter[')) ? ordersFixture.empty : ordersFixture.typical;

const harness = (answers: Parameters<typeof api.ok>[0], base: typeof api.ok = api.ok) => (
  <ScreenHarness name="OrdersList" component={OrdersList} auth="signedIn" api={base(answers)} />
);

/** Signed in, six orders, one per status (pending, delayed, confirmed, paid, cancelled, requested). Fixture: `ordersFixture.typical`. */
export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:436` },
  render: () => harness({}),
};

/** First load. The app shows a bare spinner here (no skeleton). Every call hangs. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:403`, docs: { description: { story: 'The app shows a bare `ActivityIndicator`. ux-states.md proposes 3 `Skeleton` rows, as Earnings does.' } } },
  render: () => <ScreenHarness name="OrdersList" component={OrdersList} auth="signedIn" api={api.loading()} />,
};

/** Filters sheet open on the Status rail. A play function taps the "Filter" chip. */
export const FiltersOpen: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:467`, docs: { description: { story: 'Reached by a tap: the play function taps the "Filter" chip after mount.' } } },
  render: () => harness({}),
  play: async () => { await tap('Filter'); },
};

/** Filter applied: Status = Confirmed. The play function taps Filter, Confirmed, Apply Filter; the mock answers like the API (`filter[status]`). */
export const FilterApplied: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:210`, docs: { description: { story: 'Reached by taps (Filter, Confirmed, Apply Filter). The mock returns only rows whose status is in `filter[status]`. The Filter chip shows a count.' } } },
  render: () => harness({ orders: ordersByStatus }),
  play: async () => {
    await tap('Filter');
    await tap('Confirmed', { nth: 'last' });
    await tap(/^Apply Filter/);
  },
};

/** Filter applied and nothing matches: "No matching results" with "Clear filters". */
export const NoMatchingResults: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:417`, docs: { description: { story: 'Reached by taps (Filter, Paid, Apply Filter). The mock answers every filtered call with no rows.' } } },
  render: () => harness({ orders: ordersNoMatch }),
  play: async () => {
    await tap('Filter');
    await tap('Paid', { nth: 'last' });
    await tap(/^Apply Filter/);
  },
};

/** Signed in, no orders: "No orders yet". The Filter row is hidden. */
export const NoOrders: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:425` },
  render: () => <ScreenHarness name="OrdersList" component={OrdersList} auth="signedIn" api={api.empty()} />,
};

/** Every call answers 500. The error shows after the app's own retries (1 to 2 s). */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:407`, docs: { description: { story: '"Couldn\'t load your orders" with "Try again". GET calls retry twice with backoff, so wait 1 to 2 s.' } } },
  render: () => <ScreenHarness name="OrdersList" component={OrdersList} auth="signedIn" api={api.error()} />,
};

/** PROPOSED: page 2 fails. Keep the rows and show a footer message. */
export const NextPageFailed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Today `isError` is checked before the rows (`OrdersList.tsx:407`), so a failed page 2 likely replaces the whole list with the error block. Open question: keep the rows and show a footer message (this design), or keep today\'s full-screen error? Copy from ux-states.md section 7.' } },
  },
  render: () => (
    <ProposedPage title="Orders">
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[12], gap: spacing[12] }}>
        <OrderCard type="cashback" status="confirmed" amount="₹312" metaValue="CKORDER0003" logoSrc={images.brands.ajio} />
        <OrderCard type="cashback" status="pending" amount="₹184.50" metaValue="CKORDER0001" logoSrc={images.brands.amazon} />
        <InlineMessage tone="warning" message="Couldn't load more orders." primaryActionLabel="Try again" onPrimaryAction={() => {}} />
      </View>
    </ProposedPage>
  ),
};
