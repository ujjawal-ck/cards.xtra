import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ComponentHarness, PhoneFrame, ScreenHarness } from '../../../storybook/harness';
import { OnboardingScreen } from '../../../src/screens/OnboardingScreen';
import { api, authFixture, reply } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { Text, Button, Input } from '../../../src/atoms';
import { InlineMessage } from '../../../src/molecules';
import { BottomSheetHeader } from '../../../src/organisms/BottomSheetHeader';
import { colors, spacing, radius } from '../../../src/tokens';
import { OpenLogin, Script, clickByText, clickByPart, typeInto, type Step } from './_flow';

const SRC = 'src/auth/LoginSheetProvider.tsx';
const PHONE = '9800000010';

/**
 * The real login sheet (LoginSheetProvider) opened over an empty app page, then driven by the story:
 * it types into the real inputs and taps the real buttons. The harness fetch mock answers the OTP calls.
 */
function Login({ api: a, steps = [] }: { api: ApiParams; steps?: Step[] }) {
  return (
    <ComponentHarness api={a} auth="guest">
      <OpenLogin steps={steps} />
    </ComponentHarness>
  );
}

const typePhone: Step = [300, () => typeInto(0, PHONE)];
const tapGetOtp: Step = [400, () => clickByText('Get OTP')];
const typeOtp: Step = [900, () => typeInto(1, '123456')];

const meta: Meta = {
  title: 'Flows/1 Launch and login/Login sheet',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'One app-wide sheet: phone step, then OTP step. A number that is new to CashKaro also gets a name field on the OTP step. Stories type and tap through the real sheet after it opens; wait about two seconds.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Phone step, nothing typed: "Get OTP" disabled. */
export const PhoneEmpty: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:462` },
  render: () => <Login api={api.ok()} />,
};

/** Phone step with 5 digits: still invalid, "Get OTP" stays disabled. */
export const PhoneInvalid: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:462`, docs: { description: { story: 'The story types 5 digits. A valid number has 10.' } } },
  render: () => <Login api={api.ok()} steps={[[300, () => typeInto(0, '98000')]]} />,
};

/** Valid number, Get OTP tapped, API never answers: button shows its spinner. */
export const PhoneRequestingOtp: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:461`, docs: { description: { story: 'The story types a valid number and taps Get OTP while the OTP call hangs.' } } },
  render: () => <Login api={api.ok({ loginOtp: reply.hang() })} steps={[typePhone, tapGetOtp]} />,
};

/** Send OTP fails: the API message shows under the button. */
export const PhoneSendFailed: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:231`, docs: { description: { story: 'The OTP call answers 500. The sheet shows the error text under the button (or its fallback line "Could not send OTP. Please try again.").' } } },
  render: () => <Login api={api.ok({ loginOtp: reply.error(500) })} steps={[typePhone, tapGetOtp]} />,
};

/** Rate limit today: the raw API message, no retry time (R20). */
export const RateLimitToday: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:466`, docs: { description: { story: 'Risk R20. The API answers 429 after 5 requests per number or 10 per IP in 10 minutes. The sheet prints the raw API message and says nothing about when to retry.' } } },
  render: () => <Login api={api.ok({ loginOtp: authFixture.otpRateLimited })} steps={[typePhone, tapGetOtp]} />,
};

/** OTP step: 6 boxes, resend timer running. */
export const OtpEntry: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:519`, docs: { description: { story: 'The story types a number, taps Get OTP, and waits for the slide to the OTP step. The resend timer counts down from 30.' } } },
  render: () => <Login api={api.ok()} steps={[typePhone, tapGetOtp]} />,
};

/** OTP step with the code typed, Verify enabled. */
export const OtpFilled: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:564` },
  render: () => <Login api={api.ok()} steps={[typePhone, tapGetOtp, typeOtp]} />,
};

/** Wrong OTP: boxes turn red, API message below. */
export const OtpWrong: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:519`, docs: { description: { story: 'The story types 123456 and taps Verify; the login call answers 400 / 7002.' } } },
  render: () => <Login api={api.ok({ login: authFixture.wrongOtp })} steps={[typePhone, tapGetOtp, typeOtp, [500, () => clickByText('Verify & log in')]]} />,
};

/** Verifying: Verify tapped, API hangs. */
export const OtpVerifying: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:564` },
  render: () => <Login api={api.ok({ login: reply.hang() })} steps={[typePhone, tapGetOtp, typeOtp, [500, () => clickByText('Verify & log in')]]} />,
};

/** Resend ready: the 30 s timer has run out. */
export const ResendReady: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:520`, docs: { description: { story: 'The timer is real: this story shows the "Resend OTP" link only after about 33 seconds.' } } },
  render: () => <Login api={api.ok()} steps={[typePhone, tapGetOtp]} />,
};

/** New number: login says "not registered", the app falls back to signup; OTP step asks for a name. */
export const NewNumberName: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:537`, docs: { description: { story: 'Decision D16: a new number creates an account here. The title becomes "Verify and finish" and a name field appears. The story types the OTP and the name "Test User", so "Verify & create account" is enabled. Risk R9: the account gets a generated placeholder email.' } } },
  render: () => <Login api={api.ok({ loginOtp: authFixture.notRegistered })} steps={[typePhone, tapGetOtp, typeOtp, [300, () => typeInto(2, 'Test User')]]} />,
};

/** New number, OTP typed but no name: Verify stays disabled. */
export const NewNumberNameMissing: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:564` },
  render: () => <Login api={api.ok({ loginOtp: authFixture.notRegistered })} steps={[typePhone, tapGetOtp, typeOtp]} />,
};

/** Offline when requesting the OTP, as it is today: transport text, no offline wording (A12). */
export const PhoneOfflineToday: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:231`, docs: { description: { story: 'Edge case (A12). The OTP call fails like a dropped network. The sheet shows the transport text under the button, not an offline message.' } } },
  render: () => <Login api={api.ok({ loginOtp: reply.network() })} steps={[typePhone, tapGetOtp]} />,
};

/** The OTP call never answers: after 15 seconds the sheet shows the timeout line. */
export const PhoneTimeoutToday: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:263`, docs: { description: { story: 'Slow story: wait about 17 seconds. Login OTP calls are not retried, so there is one 15 s attempt (G1), then "Request timed out. Check your connection and try again." Until then the button shows its spinner and nothing else.' } } },
  render: () => <Login api={api.ok({ loginOtp: reply.hang() })} steps={[typePhone, tapGetOtp]} />,
};

/** Verify tapped but the login call is lost: the OTP step shows an error and the code stays. */
export const OtpVerifyDropped: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:319`, docs: { description: { story: 'Edge case. The story gets to the OTP step with a good network, types 123456 and taps "Verify & log in" while the login call fails like a dropped network. The sheet shows the transport text under the boxes (A12).' } } },
  render: () => <Login api={api.ok({ login: reply.network() })} steps={[typePhone, tapGetOtp, typeOtp, [500, () => clickByText('Verify & log in')]]} />,
};

/** Resend fails: the second OTP request answers 500. */
export const ResendFailed: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:520`, docs: { description: { story: 'Slow story: wait about 36 seconds. The first OTP request works; the resend timer runs out after 30 s, and the story taps "Resend OTP", which answers 500. The sheet shows the API error text.' } } },
  render: () => <Login api={api.ok({ loginOtp: reply.sequence(authFixture.otpSent, reply.error(500)) })} steps={[typePhone, tapGetOtp, [31000, () => clickByPart('Resend')]]} />,
};

// ── Success: driven from Onboarding, because the app navigates only there ──────

function OnboardingLoginFlow({ a, steps }: { a: ApiParams; steps: Step[] }) {
  return (
    <>
      <ScreenHarness name="Onboarding" component={OnboardingScreen} auth="guest" api={a} />
      <Script steps={[[1200, () => clickByText('Log in with your CashKaro account')], ...steps]} />
    </>
  );
}

/** Success, returning user: sheet closes and the app goes to the tabs. */
export const SuccessReturning: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:564`, docs: { description: { story: 'Driven from Onboarding: tap "Log in", type a number, get the OTP, verify. The sheet closes and the navigation resets to MainTabs (harness stub page "→ MainTabs"). Money-sensitive: on production a verified OTP signs in a real account.' } } },
  render: () => <OnboardingLoginFlow a={api.ok()} steps={[typePhone, tapGetOtp, typeOtp, [500, () => clickByText('Verify & log in')]]} />,
};

/** Success, new number: account is created and the app shows the Greeting. */
export const SuccessNewNumber: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:567`, docs: { description: { story: 'Driven from Onboarding with a number that is new to CashKaro: the story also types a name, taps "Verify & create account", and the app goes to Greeting (harness stub page "→ Greeting" with the name). Money-sensitive: on production this creates a real account with a generated placeholder email (D16, R9).' } } },
  render: () => <OnboardingLoginFlow a={api.ok({ loginOtp: authFixture.notRegistered })} steps={[typePhone, tapGetOtp, typeOtp, [300, () => typeInto(2, 'Test User')], [500, () => clickByText('Verify & create account')]]} />,
};

/** New number, signup call fails: the sheet stays on the OTP step with an error. */
export const SignupFailed: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:567`, docs: { description: { story: 'Edge case. Same steps as "Success, new number", but the signup call answers 500. The user typed a valid OTP and a name and gets an error under the button; no account is created and the app stays on the sheet. Driven from Onboarding.' } } },
  render: () => <OnboardingLoginFlow a={api.ok({ loginOtp: authFixture.notRegistered, signup: reply.error(500) })} steps={[typePhone, tapGetOtp, typeOtp, [300, () => typeInto(2, 'Test User')], [500, () => clickByText('Verify & create account')]]} />,
};

// ── Proposed: composed from DS parts, never imports the real sheet ────────────

/** The phone panel of the sheet, rebuilt from atoms. Shape copies LoginSheetProvider panel 1. */
function PhonePanelReplica({ title, body, message, tone }: { title: string; body: string; message?: string; tone?: 'warning' | 'info' | 'error' }) {
  return (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.background.default, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface.default, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], paddingBottom: spacing[20] }}>
          <BottomSheetHeader showStroke={false} />
          <View style={{ padding: spacing[20], gap: spacing[24] }}>
            <View style={{ alignItems: 'center', gap: spacing[4] }}>
              <Text variant="heading24SemiBold" color={colors.text.primary} align="center">{title}</Text>
              <Text variant="body14Regular" color={colors.text.secondary} align="center">{body}</Text>
            </View>
            {message ? <InlineMessage tone={tone ?? 'warning'} message={message} /> : null}
            <Input label="Mobile Number" value={PHONE} onChangeText={() => {}} keyboardType="number-pad" />
            <Button label="Get OTP" variant="solid" tone="second" size={52} fullWidth />
          </View>
        </View>
      </View>
    </PhoneFrame>
  );
}

/** Proposed: session expired. Same sheet, title and body say why. */
export const SessionExpiredProposed: Story = {
  tags: ['proposed'],
  parameters: { source: `${SRC}:427`, docs: { description: { story: 'Today (PARTIAL) the sheet opens by itself with the title "Log in or sign up", so the user does not know why. Proposal: title "Please log in again", body "You were logged out to keep your account safe. Your cashback is safe." DS gap: the sheet has no title or body slot per source. Open question: is "Your cashback is safe" a promise product wants to make while a withdrawal may be mid-flight (R17)?' } } },
  render: () => <PhonePanelReplica title="Please log in again" body="You were logged out to keep your account safe. Your cashback is safe." />,
};

/** Proposed: offline when requesting the OTP. */
export const OfflineProposed: Story = {
  tags: ['proposed'],
  parameters: { source: `${SRC}:466`, docs: { description: { story: 'Today (PARTIAL) the sheet prints the raw API error. Proposal: InlineMessage, tone warning, "You\'re offline. Connect to get your OTP." Open question: show it before the tap by watching NetInfo, or only after a failed request?' } } },
  render: () => <PhonePanelReplica title="Log in or sign up" body="Enter your mobile number. We will text you a 6-digit OTP." message="You're offline. Connect to get your OTP." />,
};

/** Proposed: rate limit with a retry time. */
export const RateLimitProposed: Story = {
  tags: ['proposed'],
  parameters: { source: `${SRC}:466`, docs: { description: { story: 'Not built (R20). Proposal: InlineMessage, tone warning, "Too many OTP requests. Try again in 10 minutes." Open question: the 429 body carries no retry-after, so the 10 minutes is a fixed window from the readiness doc. Product decides whether to show a fixed number or a generic "later".' } } },
  render: () => <PhonePanelReplica title="Log in or sign up" body="Enter your mobile number. We will text you a 6-digit OTP." message="Too many OTP requests. Try again in 10 minutes." />,
};

/** Proposed: the OTP request failed on the server. */
export const ServerErrorProposed: Story = {
  tags: ['proposed'],
  parameters: { source: `${SRC}:231`, docs: { description: { story: 'Today the sheet prints the raw API text or "Could not send OTP. Please try again." Proposal: InlineMessage, tone error, "We couldn\'t send your OTP. Try again in a minute." Open question: does a retry hint of "a minute" match the real rate limit window (R20)?' } } },
  render: () => <PhonePanelReplica title="Log in or sign up" body="Enter your mobile number. We will text you a 6-digit OTP." message="We couldn't send your OTP. Try again in a minute." tone="error" />,
};

/** Proposed: the OTP request is slow. */
export const RequestingOtpSlowProposed: Story = {
  tags: ['proposed'],
  parameters: { source: `${SRC}:461`, docs: { description: { story: 'MISSING today: the button spinner is the only sign for up to 15 s (G1, G2). Proposal: InlineMessage, tone info, "Still sending your OTP. This can take a few seconds." Open question: after how many seconds does the line appear (5 s is a guess)?' } } },
  render: () => <PhonePanelReplica title="Log in or sign up" body="Enter your mobile number. We will text you a 6-digit OTP." message="Still sending your OTP. This can take a few seconds." tone="info" />,
};
