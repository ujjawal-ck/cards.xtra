import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { OrdersList } from '../../../src/screens/OrdersList';
import { OrderCard } from '../../../src/organisms/OrderCard';
import { InlineMessage } from '../../../src/molecules/InlineMessage';
import { images } from '../../../src/assets/images';
import { Text } from '../../../src/atoms/Text';
import { Skeleton } from '../../../src/atoms/Skeleton';
import { colors, spacing } from '../../../src/tokens';
import { ScreenHarness, type ApiRequest } from '../../../storybook/harness';
import { api, ordersFixture, reply, clone, FAKE } from '../../../storybook/fixtures';
import { sleep, tap, scrollToEnd } from './_dom';
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

// ── Edge and loader states ───────────────────────────────────────────────────

/** A list body of `n` rows built from the typical fixture rows, with ids and order ids counting up from `start`. */
function rowsBody(n: number, start: number, total: number, page = '1') {
  const data = Array.from({ length: n }, (_, i) => {
    const row = clone(ordersFixture.typical.data[i % ordersFixture.typical.data.length]);
    row.id = 24600100 + start + i;
    row.attributes.order_id = FAKE.orderId(start + i + 1);
    return row;
  });
  return { meta: { total_records: total, page_number: page, page_size: '20' }, data };
}

/** One row of the typical fixture with some attributes changed. */
function oneRow(attrs: Record<string, unknown>, index = 0) {
  const row = clone(ordersFixture.typical.data[index]);
  Object.assign(row.attributes, attrs);
  return { meta: { ...ordersFixture.typical.meta, total_records: 1 }, data: [row] };
}

/** Page 1 is 20 rows of 45; page 2 answers `second`. */
const pagedOrders = (second: Parameters<typeof reply.delay>[1]) => (req: ApiRequest) =>
  Number(req.query.get('page[number]') ?? 1) <= 1 ? rowsBody(20, 0, 45) : second;

const PAGING = 'Reached by scrolling: the play function waits for page 1 (20 rows of 45), then scrolls the frame to its end, which asks for page 2.';

/** Page 2 is loading: a spinner under the last row. */
export const NextPageLoading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:454`, docs: { description: { story: PAGING + ' Page 2 hangs, so the spinner shows under the rows.' } } },
  render: () => harness({ orders: pagedOrders(reply.hang()) }),
  play: async () => { await sleep(1500); await scrollToEnd(); await sleep(500); await scrollToEnd(); },
};

/** Page 2 fails: the app drops the rows and shows the full-screen error. */
export const NextPageFailedLive: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:407`, docs: { description: { story: PAGING + ' Page 2 answers 500. `isError` is checked before the rows, so the whole list is replaced by "Couldn\'t load your orders" after the retries (2 to 4 s). Pairs with the proposed "Next page failed" story. If the rows stay, the app changed.' } } },
  render: () => harness({ orders: pagedOrders(reply.error(500)) }),
  play: async () => { await sleep(1500); await scrollToEnd(); },
};

/** One order only. */
export const OneOrder: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:436` },
  render: () => harness({ orders: oneRow({}) }),
};

/** The cashback amount is null: the card reads ₹0. */
export const NullAmount: Story = {
  tags: ['live'],
  parameters: { source: 'src/api/ordersMapper.ts:103', docs: { description: { story: 'G6. `cashback_amount: null` maps to "₹0" (`money()`), so a partial response reads as "no money". Open design question: show a dash or hide the amount when it is unknown.' } } },
  render: () => harness({ orders: oneRow({ cashback_amount: null }) }),
};

/** A status string the app does not know shows as "Pending". */
export const UnknownStatus: Story = {
  tags: ['live'],
  parameters: { source: 'src/api/ordersMapper.ts:193', docs: { description: { story: '`cashback_status: "On Hold"` falls to the default and shows the Pending badge. Open question Q7: keep "Pending", or a neutral "Processing" badge?' } } },
  render: () => harness({ orders: oneRow({ cashback_status: 'On Hold' }) }),
};

/** The store logo fails to load: a blank tile. */
export const LogoFailed: Story = {
  tags: ['live'],
  parameters: { source: 'src/atoms/LogoContainer.tsx:52', docs: { description: { story: 'G8. The logo URL points at the blocked `storybook.invalid` host. `LogoContainer` has no `onError` fallback, so the tile stays blank. `BrandLogoTile` has one.' } } },
  render: () => harness({ orders: oneRow({ merchant_image_url: 'https://storybook.invalid/logo.png' }) }),
};

/** A 60-character store name at 360 dp: one line, cut with an ellipsis. */
export const LongStoreName360: Story = {
  tags: ['live'],
  globals: { viewport: { value: 'android360', isRotated: false } },
  parameters: { source: 'src/organisms/OrderCard.tsx:218', docs: { description: { story: 'The store name has `numberOfLines={1}`. Pinned to the Android 360 dp viewport.' } } },
  render: () => <ScreenHarness name="OrdersList" component={OrdersList} auth="signedIn" width={360} api={api.ok({ orders: oneRow({ merchant_name: 'Test Store With A Very Long Name That Keeps Going On And On Now' }) })} />,
};

/** PROPOSED: three skeleton rows instead of the bare spinner. */
export const LoadingProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: 'Copy-free. Matches Earnings, which uses `Skeleton`. Open question: none; the app shows a bare spinner today.' } } },
  render: () => (
    <ProposedPage title="Orders">
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[12], gap: spacing[12] }}>
        <Skeleton height={spacing[80]} radius="lg" />
        <Skeleton height={spacing[80]} radius="lg" />
        <Skeleton height={spacing[80]} radius="lg" />
      </View>
    </ProposedPage>
  ),
};

/** PROPOSED: a closing line under the last card. */
export const EndOfListProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: 'Today nothing tells the user the list ended (`getNextPageParam` just stops). Proposed: "That\'s all your orders." under the last card. Open question: worth the line for short lists, or only after a second page has loaded? The app also renders every loaded row with no virtualisation (G14).' } } },
  render: () => (
    <ProposedPage title="Orders">
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[12], gap: spacing[12] }}>
        <OrderCard type="cashback" status="confirmed" amount="₹312" metaValue="CKORDER0003" logoSrc={images.brands.ajio} />
        <OrderCard type="cashback" status="paid" amount="₹250" metaValue="CKORDER0004" logoSrc={images.brands.amazon} />
        <Text variant="body12Regular" color={colors.text.secondary} align="center">That's all your orders.</Text>
      </View>
    </ProposedPage>
  ),
};
