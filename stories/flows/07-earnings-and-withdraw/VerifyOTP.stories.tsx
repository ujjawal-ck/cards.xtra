import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { WithdrawVerifyOTP } from '../../../src/screens/withdraw/WithdrawVerifyOTP';
import { InlineMessage } from '../../../src/molecules';
import { ScreenState } from '../../../src/organisms';
import { images } from '../../../src/assets/images';
import { ScreenHarness } from '../../../storybook/harness';
import { api, reply, verifyOtpFixture, sendOtpFixture } from '../../../storybook/fixtures';
import { ProposedOtp } from './_ProposedOtp';
import { logNativeAlerts, typeInto } from './_interact';
import { CODE, verifyParams } from './_shared';

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

const Screen = ({ a = api.ok(), auth = 'signedIn' as const }: { a?: ReturnType<typeof api.ok>; auth?: 'signedIn' | 'sessionExpired' }) => (
  <ScreenHarness name="WithdrawVerifyOTP" component={WithdrawVerifyOTP} auth={auth} params={verifyParams()} api={a} />
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
