import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { WithdrawVerifyOTP } from '../../../src/screens/withdraw/WithdrawVerifyOTP';
import { InlineMessage } from '../../../src/molecules';
import { ScreenState } from '../../../src/organisms';
import { images } from '../../../src/assets/images';
import { ScreenHarness } from '../../../storybook/harness';
import { api, reply, verifyOtpFixture, sendOtpFixture, paymentFixture, paymentInfoFixture } from '../../../storybook/fixtures';
import { ProposedOtp } from './_ProposedOtp';
import { logNativeAlerts, sleep, tapText, typeInto } from './_interact';
import { ANDROID_360, CODE, verifyParams } from './_shared';

/**
 * Flow 7, step 5. MONEY STEP: the 6 digit OTP, then the payout POST.
 * Typing the 6th digit submits by itself (verify, then paymentV1).
 * Stories marked "types the code" run a small DOM interaction after mount
 * (play function): they write the digits into the real OTP input.
 * Several outcomes are native `Alert.alert` calls in the app. The preview draws
 * them as a plain dialog over the screen (web shim in .storybook/preview.tsx),
 * so the live stories show the real title, message and buttons.
 */
const meta: Meta = {
  title: 'Flows/7 Earnings and withdraw/Verify OTP',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/withdraw/WithdrawVerifyOTP.tsx';

const Screen = ({ a = api.ok(), auth = 'signedIn' as const, width }: { a?: ReturnType<typeof api.ok>; auth?: 'signedIn' | 'sessionExpired'; width?: number }) => (
  <ScreenHarness name="WithdrawVerifyOTP" component={WithdrawVerifyOTP} auth={auth} params={verifyParams()} api={a} width={width} />
);

const typeCode = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  logNativeAlerts();
  await typeInto(canvasElement, 0, CODE);
};

/** Fresh arrival from the UPI form: 6 empty boxes, "OTP sent to 98XXXXXX10", resend timer counting from 30 s. */
export const Entry: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:54` },
  render: () => <Screen />,
};

/** The OTP is wrong: /users/verify answers 200 with an error item. Boxes turn red, hint "Enter a valid OTP". Types the code. */
export const WrongOtp: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:140` },
  render: () => <Screen a={api.ok({ verifyOtp: verifyOtpFixture.wrong })} />,
  play: typeCode,
};

/** Verifying and paying: the code was right and the payout POST has not answered. Verify button spins, input is blocked. Types the code. The POST never answers here; after the app's 30 s deadline it becomes the unknown outcome. */
export const Verifying: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:297` },
  render: () => <Screen a={api.ok({ payment: reply.hang() })} />,
  play: typeCode,
};

/** Resend link. The countdown is real: the link appears 30 s after the screen opens ("Resend OTP in: 29s", then "Resend OTP"). Nothing is patched. Open the story and wait. */
export const ResendReady: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:280` },
  render: () => <Screen a={api.ok({ sendOtp: sendOtpFixture.default })} />,
};

/** Too many attempts: /users/verify answers HTTP 429. APP BUG seen in code: any non-network error becomes "Enter a valid OTP", so a rate limit reads as a wrong code. Types the code. */
export const RateLimited: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:136` },
  render: () => <Screen a={api.ok({ verifyOtp: verifyOtpFixture.rateLimited })} />,
  play: typeCode,
};

/** Connection problem while verifying (no network on /users/verify). The app calls a native Alert "Connection problem"; the boxes stay as typed and are not marked wrong. The preview draws the Alert as a plain dialog. Types the code. */
export const ConnectionProblem: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:134` },
  render: () => <Screen a={api.ok({ verifyOtp: reply.network() })} />,
  play: typeCode,
};

/** Payout rejected by CashKaro (HTTP 400 on paymentV1). The app calls a native Alert "Payment failed"; the screen returns to the entry state. The preview draws the Alert as a plain dialog. Types the code. */
export const PaymentFailed: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:177` },
  render: () => <Screen a={api.ok({ payment: reply.code(400, '5001', 'Invalid UPI ID') })} />,
  play: typeCode,
};

/** Unknown outcome: the payout POST drops after it was sent and the re-check gives no answer. The app calls a native Alert "Couldn't confirm your withdrawal" (Go to Earnings / OK) and blocks a second submit of the same code. The preview draws the Alert as a plain dialog. Types the code. */
export const UnknownOutcome: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:89` },
  render: () => <Screen a={api.ok({ payment: reply.network() })} />,
  play: typeCode,
};

/** R17. The session is already dead when the user types (401 on user and payment calls, refresh 401). The login sheet opens on its own over the step. With no token, typing the code calls a native Alert "Session expired" (drawn by the preview as a plain dialog). Today nothing returns the user to this step after login. A different case, the OTP timing out by itself, is not reachable: the countdown only enables Resend. Types the code. */
export const SessionExpired: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:111` },
  render: () => <Screen auth="sessionExpired" />,
  play: typeCode,
};

// ── Edge cases (audit/edge-flows-7-10.md, 7.6) ──

const SESSION_DEAD = reply.code(401, '2004', 'Session expired');

/** MONEY. The payout POST answers HTTP 504 (gateway timeout). APP BUG (G2, P0): only a dropped connection counts as "unknown"; a 5xx is shown as a final "Payment failed" Alert and invites a retry, while the payout may have landed. Types the code. */
export const PayoutGateway504: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:177` },
  render: () => <Screen a={api.ok({ payment: reply.error(504) })} />,
  play: typeCode,
};

/** MONEY. The payout POST drops, then the re-check (payment info) answers 400 / 5002: the payout did land. The app treats it as submitted and replaces the stack with Success (the stub "→ WithdrawSuccess" shows). Types the code. */
export const RecheckFoundPayout: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:162` },
  render: () => <Screen a={api.ok({ payment: reply.network(), paymentInfo: paymentInfoFixture.inProcess })} />,
  play: typeCode,
};

/** Pending is a payout state, not an error (user, 2026-11-19). The withdraw gate shows it with the "Payment Is Processing" sheet before the OTP step. This story is the rare race where the gate passed and the payout POST then answers 5002: today the screen shows it in the generic "Payment failed" dialog. */
export const PayoutAlreadyPending: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:177` },
  render: () => <Screen a={api.ok({ payment: paymentFixture.alreadyPending })} />,
  play: typeCode,
};

/** The code check answers HTTP 500. APP BUG (B1): every non-network error becomes "Enter a valid OTP", so a server fault reads as a wrong code. Types the code. */
export const VerifyServerError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:133` },
  render: () => <Screen a={api.ok({ verifyOtp: reply.error(500) })} />,
  play: typeCode,
};

/** The session dies at the code check (token alive at mount; verify answers 401 and the refresh answers 401). APP BUG (B1): the boxes say "Enter a valid OTP" while the login sheet opens. Differs from Session expired, which has no token at mount. Types the code. */
export const SessionEndsOnVerify: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:136` },
  render: () => <Screen a={api.ok({ verifyOtp: reply.error(401), refreshToken: SESSION_DEAD })} />,
  play: typeCode,
};

/** MONEY. The session dies at the payout POST (401, refresh 401). The outcome is known (401 means not accepted). The app calls the native Alert "Payment failed" with the session text; the login sheet opens too. Types the code. */
export const SessionEndsOnPayout: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:177` },
  render: () => <Screen a={api.ok({ payment: reply.error(401), refreshToken: SESSION_DEAD })} />,
  play: typeCode,
};

/** MONEY. Open question Q1. After an unknown outcome the double-submit guard is per OTP guid, and Resend sets a fresh guid, so the same draft can be paid again. Only the server 5002 rule stops a second payout. Types the code, taps OK on the dialog, waits for Resend (30 s timer), taps it, types again. Watch the console for a second POST /payment/paymentV1. */
export const ResendAfterUnknownOutcome: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:114` },
  render: () => <Screen a={api.ok({ payment: reply.network(), sendOtp: sendOtpFixture.default })} />,
  play: async ({ canvasElement }) => {
    await typeCode({ canvasElement });
    // The Alert shim draws its dialog on document.body, outside the story root.
    await tapText(canvasElement.ownerDocument.body, 'OK', 20000);
    await tapText(canvasElement, 'Resend OTP', 45000);
    await sleep(500);
    await typeInto(canvasElement, 0, '713958');
  },
};

/** Resend fails with HTTP 500. The app calls the native Alert "Could not resend OTP" with the server text. Waits for the 30 s timer, then taps Resend. */
export const ResendFailed: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:204` },
  render: () => <Screen a={api.ok({ sendOtp: reply.error(500) })} />,
  play: async ({ canvasElement }) => {
    logNativeAlerts();
    await tapText(canvasElement, 'Resend OTP', 45000);
  },
};

/** Resend hits the rate limit (HTTP 429). The native Alert "Could not resend OTP" shows the raw server text, with no wait time. Waits for the 30 s timer, then taps Resend. */
export const ResendRateLimited: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:204` },
  render: () => <Screen a={api.ok({ sendOtp: sendOtpFixture.rateLimited })} />,
  play: async ({ canvasElement }) => {
    logNativeAlerts();
    await tapText(canvasElement, 'Resend OTP', 45000);
  },
};

/** 360 dp Android width: six OTP boxes and the "OTP sent to ... / Edit details" row in the narrow frame. */
export const Narrow360: Story = {
  tags: ['live'],
  globals: ANDROID_360,
  parameters: { source: `${SRC}:247` },
  render: () => <Screen width={360} />,
};

// ── Proposed: the same failures as inline UI (copy from audit/ux-states.md, flow 6) ──

const OPEN_Q = 'Open question: native alerts are not themed and vanish on tap. Inline message or full screen? Owner: product owner.';

/** PROPOSED. Connection problem as an inline warning over the footer; the code stays in the boxes. */
export const ConnectionProblemProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the native Alert at ${SRC}:134. ${OPEN_Q}` } } },
  render: () => <ProposedOtp notice={<InlineMessage tone="warning" message="Connection problem. Please try again." />} />,
};

/** PROPOSED. Payout failed as an inline error with Try again. */
export const PaymentFailedProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the native Alert at ${SRC}:177. ${OPEN_Q}` } } },
  render: () => (
    <ProposedOtp
      notice={<InlineMessage tone="error" title="Withdrawal didn't go through" message="Please try again in a few minutes." action="single" primaryActionLabel="Try again" />}
    />
  ),
};

/** PROPOSED. Unknown outcome as its own screen: a money state with no certain result needs a place to read it. */
export const UnknownOutcomeProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the native Alert at ${SRC}:89. Open question: should "Go to Earnings" also show the payout as pending (R4)? ${OPEN_Q}` } } },
  render: () => (
    <ProposedOtp
      cta="Go to Earnings"
      body={
        <ScreenState
          image={images.screenstate.tracking}
          title="We're confirming your withdrawal"
          body="This can take a few minutes. Don't request again until it shows in Earnings."
        />
      }
    />
  ),
};

/** PROPOSED. Session or OTP expired shown with the screen's own expired state (red boxes, "OTP is expired", Resend ready). The live code never sets that state (setError('expired') has no caller). */
export const SessionExpiredProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the native Alert at ${SRC}:111. Reuses the hint at ${SRC}:215, which no code path sets today. Open question: after login, return to this step with the draft kept, or restart from the method list (R17)?` } } },
  render: () => <ProposedOtp otpError otpHint="OTP is expired" resend="ready" />,
};

// ── Edge cases, proposed ──

/** PROPOSED. A payout is already pending (5002): shown as the pending state, the same as the gate does, in place of the generic "Payment failed" dialog. */
export const PayoutAlreadyPendingProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the native Alert at ${SRC}:177 for code 5002. Copy from audit/edge-flows-7-10.md 7.6. Open question: should the screen also show the pending amount and start time (needs requested_earnings and a date from the API)? Owner: product owner.` } } },
  render: () => (
    <ProposedOtp
      footer={false}
      body={
        <ScreenState
          image={images.screenstate.tracking}
          title="A withdrawal is already in progress"
          body="You can request a new one after it settles."
          actionLabel="Go to Earnings"
          onAction={() => undefined}
        />
      }
    />
  ),
};

/** PROPOSED. Slow payout: while the 30 s payout runs, an info line after 5 s. Today nothing says anything. */
export const SlowPayoutProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Adds a line to ${SRC}:297, shown after 5 s of waiting. Open question: should the line also appear on the unknown-outcome path, and is "go back" blocked by the overlay only, or also by Android back (G9)? Owner: product owner.` } } },
  render: () => <ProposedOtp busy notice={<InlineMessage tone="info" message="Still working on it. Please don't close the app or go back." />} />,
};

/** PROPOSED. Resend failed as an inline warning with the Resend link ready again, in place of the native Alert. */
export const ResendFailedProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the native Alert at ${SRC}:204. ${OPEN_Q} Open question: for a 429, show a wait time? The API gives none (Q5).` } } },
  render: () => <ProposedOtp resend="ready" notice={<InlineMessage tone="warning" message="We couldn't send a new OTP. Please try again." />} />,
};
