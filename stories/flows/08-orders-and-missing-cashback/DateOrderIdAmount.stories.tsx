import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { MissingCashbackChooseDate } from '../../../src/screens/MissingCashbackChooseDate';
import { MissingCashbackEnterOrderId } from '../../../src/screens/MissingCashbackEnterOrderId';
import { MissingCashbackEnterAmount } from '../../../src/screens/MissingCashbackEnterAmount';
import { View } from 'react-native';
import { InlineMessage } from '../../../src/molecules/InlineMessage';
import { Text } from '../../../src/atoms/Text';
import { Input } from '../../../src/atoms/Input';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { colors, spacing } from '../../../src/tokens';
import { ScreenHarness } from '../../../storybook/harness';
import { api, reply, mcDraftFixture, mcExitDatesFixture, mcValidateFixture, mcSubmitFixture, MC_SAMPLE_ORDER_ID } from '../../../storybook/fixtures';
import { sleep, tap, typeInto } from './_dom';
import { ProposedPage } from './_proposed';

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
  parameters: { source: `${DATE}:110` },
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

/** A claim submit that drops the connection, then a second tap that hits "already exists". */
export const SubmitTimeoutThenDuplicate: Story = {
  tags: ['live'],
  parameters: {
    source: `${AMOUNT}:76`,
    docs: { description: { story: 'G2b. Reached by typing "1299" and tapping Submit twice. The first POST fails like a dropped connection (the app shows the raw transport text under the field). The second POST answers 400/6001 "already exists", as if the first claim had landed. The POST is not retried by the client, so the user has to guess.' } },
  },
  render: () => amount(api.ok({ mcSubmit: reply.sequence(reply.network(), mcSubmitFixture.duplicate) })),
  play: async () => {
    await typeInto('Enter amount', '1299');
    await tap('Submit', { settleMs: 1200 });
    await sleep(800);
    await tap('Submit');
  },
};

/** The order-ID check is running: Continue shows its loading state. */
export const OrderIdChecking: Story = {
  tags: ['live'],
  parameters: { source: `${ORDER}:169`, docs: { description: { story: 'Reached by typing a well-formed fixture ID and tapping Continue. The validate call hangs, so the button stays in its loading state.' } } },
  render: () => orderId(api.ok({ mcValidate: reply.hang() })),
  play: async () => { await sleep(1500); await typeInto('Enter order ID', MC_SAMPLE_ORDER_ID); await tap('Continue'); },
};

/** The order-ID check loses the connection: the raw transport text shows under the field. */
export const OrderIdNetworkError: Story = {
  tags: ['live'],
  parameters: { source: `${ORDER}:107`, docs: { description: { story: 'G15. Reached by typing a well-formed fixture ID and tapping Continue. The validate call fails like a dropped network, and the screen shows the error message text as it is.' } } },
  render: () => orderId(api.ok({ mcValidate: reply.network() })),
  play: async () => { await sleep(1500); await typeInto('Enter order ID', MC_SAMPLE_ORDER_ID); await tap('Continue'); },
};

/** N2 (fixed on branch `claude/mc-p0-fixes`): Choose date with no connection and no cache. */
export const ChooseDateOffline: Story = {
  tags: ['live'],
  parameters: { source: `${DATE}:92`, docs: { description: { story: 'N2, fixed on branch `claude/mc-p0-fixes` (4d40166), not yet in `Anmol--changes`. Offline with no cache, the dates query is paused. The screen now shows a ScreenState block: "You\'re offline", "Connect to the internet and try again." and a "Try again" action. It no longer reads "We couldn\'t find any recent visits". `api.offline()` reproduces the pause.' } } },
  render: () => date(api.offline()),
};

/** An amount with no upper bound is accepted: 10,00,00,000. */
export const HugeAmount: Story = {
  tags: ['live'],
  parameters: { source: `${AMOUNT}:57`, docs: { description: { story: 'Reached by typing 100000000 and tapping Submit. The regex has no upper bound, so the claim posts. The mock answers with the default pending claim. Open question Q8: add a bound or a confirm step?' } } },
  render: () => amount(api.ok()),
  play: async () => { await typeInto('Enter amount', '100000000'); await tap('Submit'); },
};

/** PROPOSED: the claim submit has an unknown outcome (timeout or dropped connection). */
export const SubmitUnknownOutcomeProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'G2b. Today the catch shows raw transport text and a second tap can hit "already exists". Proposed: a warning that sends the user to the claims list before they submit again. Open question: block Submit until the user has opened the list, or only warn? Copy from the audit, not yet in ux-states.md.' } },
  },
  render: () => (
    <ProposedPage
      title="Did You Shop?"
      footer={<View style={{ padding: spacing[16] }}><FooterButtons buttons="single" primaryLabel="Submit" onPrimary={() => {}} /></View>}
    >
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        <Text variant="body16Bold" color={colors.text.primary}>Almost there! Tell us your order amount</Text>
        <Text variant="body14Regular" color={colors.text.secondary}>Enter the amount you paid after discounts</Text>
        <Input size="sm" placeholder="Enter amount" value="1299" onChangeText={() => {}} />
        <InlineMessage tone="warning" title="We couldn't confirm your claim" message="Check your claims list before you submit again." primaryActionLabel="View claims" onPrimaryAction={() => {}} />
      </View>
    </ProposedPage>
  ),
};
