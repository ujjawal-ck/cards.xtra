import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { WithdrawEnterUPI } from '../../../src/screens/withdraw/WithdrawEnterUPI';
import { WithdrawAmazon } from '../../../src/screens/withdraw/WithdrawAmazon';
import { WithdrawFlipkart } from '../../../src/screens/withdraw/WithdrawFlipkart';
import { WithdrawGiftCard } from '../../../src/screens/withdraw/WithdrawGiftCard';
import { InlineMessage } from '../../../src/molecules';
import { Text, Input } from '../../../src/atoms';
import { Header, Masthead, FooterButtons } from '../../../src/organisms';
import { colors, spacing } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, reply, sendOtpFixture } from '../../../storybook/fixtures';
import { View } from 'react-native';
import { logNativeAlerts, nthInput, sleep, tapText, tickTerms, typeInto } from './_interact';
import { AMOUNT } from './_shared';

/**
 * Flow 7, step 4. MONEY STEP. Where the money goes: UPI id, Amazon Pay mobile, Flipkart email, or the gift card chooser.
 * "Get Paid" sends the payout OTP and opens Verify OTP. It stays off until the terms box is ticked
 * (and, for Amazon and Flipkart, until both fields are valid and equal).
 * Stories that type or tap run a small DOM interaction after mount (play function).
 */
const meta: Meta = {
  title: 'Flows/7 Earnings and withdraw/Details',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const P = { amount: AMOUNT, paymentType: 'cashback' as const };
const UPI_SRC = 'src/screens/withdraw/WithdrawEnterUPI.tsx';
const AMZ_SRC = 'src/screens/withdraw/WithdrawAmazon.tsx';
const FLK_SRC = 'src/screens/withdraw/WithdrawFlipkart.tsx';

const Upi = ({ a = api.ok(), auth = 'signedIn' as const }: { a?: ReturnType<typeof api.ok>; auth?: 'signedIn' | 'sessionExpired' }) => (
  <ScreenHarness name="WithdrawEnterUPI" component={WithdrawEnterUPI} auth={auth} params={routeParams('WithdrawEnterUPI', P)} api={a} />
);
const Amazon = () => (
  <ScreenHarness name="WithdrawAmazon" component={WithdrawAmazon} auth="signedIn" params={routeParams('WithdrawAmazon', P)} api={api.ok()} />
);
const Flipkart = () => (
  <ScreenHarness name="WithdrawFlipkart" component={WithdrawFlipkart} auth="signedIn" params={routeParams('WithdrawFlipkart', P)} api={api.ok()} />
);
type Ctx = { canvasElement: HTMLElement };

// ── UPI ──

/** UPI id form, untouched: empty field, terms unticked, Get Paid off. */
export const UpiEmpty: Story = {
  tags: ['live'],
  parameters: { source: `${UPI_SRC}:41` },
  render: () => <Upi />,
};

/** Invalid UPI id: types "bad id", ticks the terms, taps Get Paid. Red field, "Invalid UPI ID. Please enter correct UPI ID". The check is only "looks like name@bank"; the server does the real check at submit. */
export const UpiInvalid: Story = {
  tags: ['live'],
  parameters: { source: `${UPI_SRC}:55` },
  render: () => <Upi />,
  play: async ({ canvasElement }: Ctx) => {
    await typeInto(canvasElement, 0, 'bad id');
    await tickTerms(canvasElement);
    await sleep(200);
    await tapText(canvasElement, 'Get Paid');
  },
};

/** Valid id and consent given: types user@upi and ticks the terms. Get Paid is on. */
export const UpiConsent: Story = {
  tags: ['live'],
  parameters: { source: `${UPI_SRC}:148` },
  render: () => <Upi />,
  play: async ({ canvasElement }: Ctx) => {
    await typeInto(canvasElement, 0, 'user@upi');
    await tickTerms(canvasElement);
  },
};

/** Sending the OTP: the sendotp call never answers, so Get Paid keeps its spinner. Types, ticks and taps after mount. */
export const UpiSendingOtp: Story = {
  tags: ['live'],
  parameters: { source: `${UPI_SRC}:149` },
  render: () => <Upi a={api.ok({ sendOtp: reply.hang() })} />,
  play: async ({ canvasElement }: Ctx) => {
    await typeInto(canvasElement, 0, 'user@upi');
    await tickTerms(canvasElement);
    await sleep(200);
    await tapText(canvasElement, 'Get Paid');
  },
};

/** OTP send failed (HTTP 500 on sendotp). The app calls a native Alert "Could not send OTP". The preview draws the Alert as a plain dialog over the consent state. Same code on the Amazon and Flipkart forms. */
export const UpiSendOtpFailed: Story = {
  tags: ['live'],
  parameters: { source: `${UPI_SRC}:75` },
  render: () => <Upi a={api.ok({ sendOtp: reply.error(500) })} />,
  play: async ({ canvasElement }: Ctx) => {
    logNativeAlerts();
    await typeInto(canvasElement, 0, 'user@upi');
    await tickTerms(canvasElement);
    await sleep(200);
    await tapText(canvasElement, 'Get Paid');
  },
};

/** PROPOSED. OTP send failed as an inline error above the footer, in place of the native Alert. Open question: same pattern on the Amazon and Flipkart forms? */
export const UpiSendOtpFailedProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the native Alert at ${UPI_SRC}:75. Copy from audit/ux-states.md flow 6. Open question: keep the typed id and the ticked terms when the error shows (assumed yes).` } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.background.default }}>
        <View style={{ gap: spacing[24], flex: 1 }}>
          <Header leading="back" title="Withdraw Cashback" />
          <Masthead variant="payment" amount="₹1,240" subtitle="Cashback Available For Payment" />
          <View style={{ gap: spacing[40] }}>
            <Text variant="body16SemiBold" color={colors.text.primary} style={{ paddingHorizontal: spacing[16] }}>Enter Your UPI ID</Text>
            <View style={{ paddingHorizontal: spacing[16] }}>
              <Input label="Enter UPI ID" size="sm" value="user@upi" onChangeText={() => undefined} />
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: spacing[16], paddingBottom: spacing[12] }}>
          <InlineMessage tone="error" message="We couldn't send the OTP. Please try again." />
        </View>
        <FooterButtons
          buttons="single" size={52} color="second" strip="tnc" primaryLabel="Get Paid"
          stripText="I agree to the terms & conditions governing payment transfer request listed here."
          tncChecked stripLinkLabels={['here']}
        />
      </View>
    </PhoneFrame>
  ),
};

// ── UPI edge cases (audit/edge-flows-7-10.md, 7.4) ──

const fillAndGetPaid = async ({ canvasElement }: Ctx) => {
  logNativeAlerts();
  await typeInto(canvasElement, 0, 'user@upi');
  await tickTerms(canvasElement);
  await sleep(200);
  await tapText(canvasElement, 'Get Paid');
};

/** The OTP send drops the connection (no network on sendotp). The same native Alert "Could not send OTP", with a transport message. Same code on the Amazon and Flipkart forms. Types, ticks and taps after mount. */
export const UpiSendOtpOffline: Story = {
  tags: ['live'],
  parameters: { source: `${UPI_SRC}:75` },
  render: () => <Upi a={api.ok({ sendOtp: reply.network() })} />,
  play: fillAndGetPaid,
};

/** The OTP send hits the rate limit (HTTP 429). The native Alert "Could not send OTP" shows the raw server text, with no wait time (open question Q5). Same code on the Amazon and Flipkart forms. Types, ticks and taps after mount. */
export const UpiSendOtpRateLimited: Story = {
  tags: ['live'],
  parameters: { source: `${UPI_SRC}:75` },
  render: () => <Upi a={api.ok({ sendOtp: sendOtpFixture.rateLimited })} />,
  play: fillAndGetPaid,
};

/** The session ended while the user filled the form (every user call answers 401, refresh 401). Get Paid does nothing: the handler returns at once when there is no token, so no message shows. The login sheet opens on its own. Waits 2.5 s, then types, ticks and taps. Design twin: Mid-flow return, "withdraw otp session ended". */
export const UpiSessionEnded: Story = {
  tags: ['live'],
  parameters: { source: `${UPI_SRC}:59` },
  render: () => <Upi auth="sessionExpired" />,
  play: async (ctx: Ctx) => {
    await sleep(2500);
    await fillAndGetPaid(ctx);
  },
};

/** PROPOSED. OTP send rate limited as an inline warning above the footer, with Get Paid off until the user can retry. */
export const UpiSendOtpRateLimitedProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the native Alert at ${UPI_SRC}:75 for HTTP 429. Open question Q5: the API gives no wait time, so the copy says "a few minutes". Should Get Paid stay off for a fixed time? Owner: product owner.` } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.background.default }}>
        <View style={{ gap: spacing[24], flex: 1 }}>
          <Header leading="back" title="Withdraw Cashback" />
          <Masthead variant="payment" amount="₹1,240" subtitle="Cashback Available For Payment" />
          <View style={{ gap: spacing[40] }}>
            <Text variant="body16SemiBold" color={colors.text.primary} style={{ paddingHorizontal: spacing[16] }}>Enter Your UPI ID</Text>
            <View style={{ paddingHorizontal: spacing[16] }}>
              <Input label="Enter UPI ID" size="sm" value="user@upi" onChangeText={() => undefined} />
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: spacing[16], paddingBottom: spacing[12] }}>
          <InlineMessage tone="warning" message="Too many OTP requests. Please try again in a few minutes." />
        </View>
        <FooterButtons
          buttons="single" size={52} color="second" strip="tnc" primaryLabel="Get Paid" primaryDisabled
          stripText="I agree to the terms & conditions governing payment transfer request listed here."
          tncChecked stripLinkLabels={['here']}
        />
      </View>
    </PhoneFrame>
  ),
};

// ── Amazon Pay ──

/** Amazon Pay form, untouched: two empty mobile fields, a note about the 5 minute to 72 hour delay. */
export const AmazonEmpty: Story = {
  tags: ['live'],
  parameters: { source: `${AMZ_SRC}:56` },
  render: () => <Amazon />,
};

/** Invalid mobile: types a short number "98000" and leaves the field. Red field, "Invalid mobile number". */
export const AmazonInvalid: Story = {
  tags: ['live'],
  parameters: { source: `${AMZ_SRC}:74` },
  render: () => <Amazon />,
  play: async ({ canvasElement }: Ctx) => {
    await typeInto(canvasElement, 0, '98000');
    (await nthInput(canvasElement, 0)).blur();
  },
};

/** Numbers do not match: first 9800000010, second starts 98000001 (8 digits). Red second field, "Mobile numbers do not match". */
export const AmazonMismatch: Story = {
  tags: ['live'],
  parameters: { source: `${AMZ_SRC}:79` },
  render: () => <Amazon />,
  play: async ({ canvasElement }: Ctx) => {
    await typeInto(canvasElement, 0, '9800000010');
    await typeInto(canvasElement, 1, '98000001');
  },
};

/** Valid and confirmed: both fields 9800000010 and the terms ticked. Get Paid is on. */
export const AmazonConsent: Story = {
  tags: ['live'],
  parameters: { source: `${AMZ_SRC}:187` },
  render: () => <Amazon />,
  play: async ({ canvasElement }: Ctx) => {
    await typeInto(canvasElement, 0, '9800000010');
    await typeInto(canvasElement, 1, '9800000010');
    await tickTerms(canvasElement);
  },
};

// ── Flipkart ──

/** Flipkart gift card form, untouched: two empty email fields. */
export const FlipkartEmpty: Story = {
  tags: ['live'],
  parameters: { source: `${FLK_SRC}:54` },
  render: () => <Flipkart />,
};

/** Invalid email: types "user@" and leaves the field. Red field, "Invalid Email ID". */
export const FlipkartInvalid: Story = {
  tags: ['live'],
  parameters: { source: `${FLK_SRC}:71` },
  render: () => <Flipkart />,
  play: async ({ canvasElement }: Ctx) => {
    await typeInto(canvasElement, 0, 'user@');
    (await nthInput(canvasElement, 0)).blur();
  },
};

/** Emails do not match: user@example.com then other@example.com. Red second field. */
export const FlipkartMismatch: Story = {
  tags: ['live'],
  parameters: { source: `${FLK_SRC}:72` },
  render: () => <Flipkart />,
  play: async ({ canvasElement }: Ctx) => {
    await typeInto(canvasElement, 0, 'user@example.com');
    await typeInto(canvasElement, 1, 'other@example.com');
  },
};

/** Valid and confirmed: both fields user@example.com and the terms ticked. Get Paid is on. */
export const FlipkartConsent: Story = {
  tags: ['live'],
  parameters: { source: `${FLK_SRC}:181` },
  render: () => <Flipkart />,
  play: async ({ canvasElement }: Ctx) => {
    await typeInto(canvasElement, 0, 'user@example.com');
    await typeInto(canvasElement, 1, 'user@example.com');
    await tickTerms(canvasElement);
  },
};

// ── Gift card chooser (rewards and combined buckets, and the gift card row of cashback) ──

const GIFT_SRC = 'src/screens/withdraw/WithdrawGiftCard.tsx';

/** "Choose Your Payment Method": Amazon Pay Balance or Flipkart Gift Card. Cashback variant. */
export const GiftCardChooser: Story = {
  tags: ['live'],
  parameters: { source: `${GIFT_SRC}:44` },
  render: () => (
    <ScreenHarness name="WithdrawGiftCard" component={WithdrawGiftCard} auth="signedIn" params={routeParams('WithdrawGiftCard', { amount: AMOUNT, variant: 'cashback' })} api={api.ok()} />
  ),
};

/** Same chooser for the combined bucket (cashback + rewards, ₹1,590): the subtitle says it includes Rewards. */
export const GiftCardChooserCombined: Story = {
  tags: ['live'],
  parameters: { source: `${GIFT_SRC}:38` },
  render: () => (
    <ScreenHarness name="WithdrawGiftCard" component={WithdrawGiftCard} auth="signedIn" params={routeParams('WithdrawGiftCard', { amount: 1590, variant: 'combined' })} api={api.ok()} />
  ),
};
