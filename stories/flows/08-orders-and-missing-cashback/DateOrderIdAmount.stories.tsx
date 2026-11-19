import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { MissingCashbackChooseDate } from '../../../src/screens/MissingCashbackChooseDate';
import { MissingCashbackEnterOrderId } from '../../../src/screens/MissingCashbackEnterOrderId';
import { MissingCashbackEnterAmount } from '../../../src/screens/MissingCashbackEnterAmount';
import { ScreenHarness } from '../../../storybook/harness';
import { api, reply, mcDraftFixture, mcExitDatesFixture, mcValidateFixture, mcSubmitFixture, MC_SAMPLE_ORDER_ID } from '../../../storybook/fixtures';
import { sleep, tap, typeInto } from './_dom';

const meta: Meta = {
  title: 'Flows/8 Orders and missing cashback/Date, order ID, amount',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const DATE = 'src/screens/MissingCashbackChooseDate.tsx';
const ORDER = 'src/screens/MissingCashbackEnterOrderId.tsx';
const AMOUNT = 'src/screens/MissingCashbackEnterAmount.tsx';

const date = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="MissingCashbackChooseDate" component={MissingCashbackChooseDate} auth="signedIn" params={{ draft: mcDraftFixture.start }} api={a} />;
const orderId = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="MissingCashbackEnterOrderId" component={MissingCashbackEnterOrderId} auth="signedIn" params={{ draft: mcDraftFixture.withDate }} api={a} />;
const amount = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="MissingCashbackEnterAmount" component={MissingCashbackEnterAmount} auth="signedIn" params={{ draft: mcDraftFixture.withOrderId }} api={a} />;

// ── Choose date ──────────────────────────────────────────────────────────────

/** Visit dates for Amazon, grouped by month; the first date is pre-selected. Fixture: `mcExitDatesFixture.default`. */
export const ChooseDate: Story = { tags: ['live'], parameters: { source: `${DATE}:34` }, render: () => date(api.ok()) };

/** Recent dates in two months (November and October 2026). */
export const ChooseDateRecent: Story = {
  tags: ['live'],
  parameters: { source: `${DATE}:94`, docs: { description: { story: 'Fixture `mcExitDatesFixture.recent`.' } } },
  render: () => date(api.ok({ mcExitDates: mcExitDatesFixture.recent })),
};

/** First load: bare spinner. */
export const ChooseDateLoading: Story = { tags: ['live'], parameters: { source: `${DATE}:77` }, render: () => date(api.loading()) };

/** The dates call answers 500: "Couldn't load your visit dates." with Retry. Wait 1 to 2 s. */
export const ChooseDateError: Story = {
  tags: ['live'],
  parameters: { source: `${DATE}:81`, docs: { description: { story: 'Inline text and link. ux-states.md proposes a `ScreenState` ("Couldn\'t load your visit dates").' } } },
  render: () => date(api.ok({ mcExitDates: reply.error(500) })),
};

/** No visit dates: "We couldn't find any recent visits", Continue disabled. */
export const ChooseDateNoDates: Story = {
  tags: ['live'],
  parameters: { source: `${DATE}:92` },
  render: () => date(api.ok({ mcExitDates: mcExitDatesFixture.empty })),
};

// ── Order ID ─────────────────────────────────────────────────────────────────

/** Empty input with the store's order-ID hint under the heading. */
export const OrderIdEmpty: Story = { tags: ['live'], parameters: { source: `${ORDER}:39` }, render: () => orderId(api.ok()) };

/** A wrong format is caught on each keystroke: "Enter a correct Order ID ...". A play function types "ABC". */
export const OrderIdFormatError: Story = {
  tags: ['live'],
  parameters: { source: `${ORDER}:142`, docs: { description: { story: 'Reached by typing: the play function waits for the visit-date meta, then types "ABC". Continue turns disabled.' } } },
  render: () => orderId(api.ok()),
  play: async () => { await sleep(1500); await typeInto('Enter order ID', 'ABC'); },
};

/** A well-formed ID that the server refuses: the API message shows under the field. */
export const OrderIdServerError: Story = {
  tags: ['live'],
  parameters: { source: `${ORDER}:98`, docs: { description: { story: 'Reached by typing a well-formed fixture ID and tapping Continue. The validate call answers 400 "Please enter a valid order ID."' } } },
  render: () => orderId(api.ok({ mcValidate: mcValidateFixture.invalidOrderId })),
  play: async () => { await sleep(1500); await typeInto('Enter order ID', MC_SAMPLE_ORDER_ID); await tap('Continue'); },
};

// ── Amount ───────────────────────────────────────────────────────────────────

/** Empty amount input. */
export const AmountEmpty: Story = { tags: ['live'], parameters: { source: `${AMOUNT}:39` }, render: () => amount(api.ok()) };

/** A non-amount: "Please enter the amount you paid, e.g. 1299 or 1299.50." The play function types "abc" and taps Submit. */
export const AmountInvalid: Story = {
  tags: ['live'],
  parameters: { source: `${AMOUNT}:59`, docs: { description: { story: 'Reached by typing and a tap on Submit.' } } },
  render: () => amount(api.ok()),
  play: async () => { await typeInto('Enter amount', 'abc'); await tap('Submit'); },
};

/** The submit call is refused (duplicate claim): the API message shows under the field. */
export const AmountSubmitError: Story = {
  tags: ['live'],
  parameters: { source: `${AMOUNT}:76`, docs: { description: { story: 'Reached by typing "1299" and a tap on Submit. The queue call answers 400 "A claim for this order already exists."' } } },
  render: () => amount(api.ok({ mcSubmit: mcSubmitFixture.duplicate })),
  play: async () => { await typeInto('Enter amount', '1299'); await tap('Submit'); },
};

/** The submit call is running: the Submit button shows its loading state. */
export const AmountSubmitting: Story = {
  tags: ['live'],
  parameters: { source: `${AMOUNT}:142`, docs: { description: { story: 'Reached by typing "1299" and a tap on Submit. The queue call hangs.' } } },
  render: () => amount(api.ok({ mcSubmit: reply.hang() })),
  play: async () => { await typeInto('Enter amount', '1299'); await tap('Submit'); },
};
