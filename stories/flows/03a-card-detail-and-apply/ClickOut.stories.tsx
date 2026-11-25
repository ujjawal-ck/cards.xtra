import React from 'react';
import { Image, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ComponentHarness, PhoneFrame } from '../../../storybook/harness';
import { api, profileFixture, reply } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { Text, Button } from '../../../src/atoms';
import { InlineMessage, Toast } from '../../../src/molecules';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { ScreenState } from '../../../src/organisms/ScreenState';
import { images } from '../../../src/assets/images';
import { useClickOut } from '../../../src/lib/useClickOut';
import { colors, spacing } from '../../../src/tokens';
import { REGALIA, NO_URL } from './_data';
import { Script, clickByText, typeInto, type Step } from '../01-launch-and-login/_flow';
import { useBottomSheetModal } from '@gorhom/bottom-sheet';

// Card art at the CardTile art ratio (132:84), 2 x spacing[128] wide.
const ART = { width: spacing[128] * 2, height: Math.round((spacing[128] * 2 * 84) / 132) };

/** The card page background for the proposed states: art, name, and the part the footer sits under. */
function Page({ children, footer }: { children?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
        <View style={{ padding: spacing[24], alignItems: 'center', gap: spacing[12] }}>
          <Image source={REGALIA.cardImage} style={ART} resizeMode="contain" />
          <Text variant="heading20SemiBold" color={colors.text.primary} align="center">{REGALIA.name}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
        {footer}
      </View>
    </PhoneFrame>
  );
}

/** A host for the real useClickOut hook: one Apply button that stands in for the sticky Apply bar. */
function ApplyHost({ url = REGALIA.applyUrl }: { url?: string | null }) {
  const { openClickOut, clickOutSheets } = useClickOut();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.default, padding: spacing[24], gap: spacing[16], justifyContent: 'center' }}>
      <Image source={REGALIA.cardImage} style={[ART, { alignSelf: 'center' }]} resizeMode="contain" />
      <Text variant="heading20SemiBold" color={colors.text.primary} align="center">{REGALIA.name}</Text>
      <Button label="Apply Now" variant="solid" tone="second" size={52} fullWidth onPress={() => openClickOut({ kind: 'card', url, itemId: REGALIA.id, itemName: REGALIA.name, source: 'home_detail', alias: REGALIA.filterMeta?.cardAlias })} />
      {clickOutSheets}
    </View>
  );
}

/** Closes every open sheet, like a swipe down. Runs once after `after` ms. Renders nothing. */
function DismissAll({ after }: { after: number }) {
  const { dismissAll } = useBottomSheetModal();
  React.useEffect(() => {
    const t = setTimeout(() => dismissAll(), after);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** `extra` steps run after the first Apply tap (each delay is from the step before). `dismissAfter` closes all sheets that many ms after mount. */
const Real = ({ auth, a, url, extra = [], dismissAfter }: { auth: 'guest' | 'signedIn'; a: ApiParams; url?: string; extra?: Step[]; dismissAfter?: number }) => (
  <>
    <ComponentHarness auth={auth} api={a}>
      <ApplyHost url={url} />
      {dismissAfter != null ? <DismissAll after={dismissAfter} /> : null}
    </ComponentHarness>
    <Script steps={[[1500, () => clickByText('Apply Now')], ...extra]} />
  </>
);

const SLOW_PROFILE = reply.delay(8000, profileFixture.default);
const PHONE = '9800000010';
/** Guest path: tap "Log in to earn cashback", type the number, get the OTP. */
const guestLoginSteps: Step[] = [
  [1200, () => clickByText('Log in to earn cashback')],
  [1800, () => typeInto(0, PHONE)],
  [400, () => clickByText('Get OTP')],
];

const meta: Meta = {
  title: 'Flows/3a Card detail and apply/Click-out',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'The money step. Apply opens the bank page through a CashKaro tracking link (user id and click id). A guest is asked to log in first; a signed-in user goes straight out. The real useClickOut hook runs in the two live stories (hosted on a small page with an Apply button; the sticky Apply bar is not used). Money-sensitive: on production a click-out sets the affiliate attribution. The user-id, empty-link, redirect and return states do not exist in the app, so they are proposals.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Guest: the earn prompt sheet. */
export const GuestEarnPrompt: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:89', docs: { description: { story: 'The story taps Apply as a guest. The real EarnLoginSheet opens: "Log in to earn cashback" or "Apply without cashback". After login the click continues by itself.' } } },
  render: () => <Real auth="guest" a={api.ok()} />,
};

/** Signed in: the link opens in the browser; the app shows nothing new. */
export const SignedIn: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:96', docs: { description: { story: 'The story taps Apply as a signed-in user. The hook resolves the user id from the profile, logs the click (event click_out) and opens the link. Storybook logs "[storybook] click-out <url>" and opens nothing, so the page looks unchanged. In the app the user leaves for the bank and returns to the same screen (R1, R8: no redirect step, no return state).' } } },
  render: () => <Real auth="signedIn" a={api.ok()} />,
};

/** Empty apply link, as it is today: the tap does nothing (R3). */
export const EmptyUrlToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:87', docs: { description: { story: 'Risk R3. The card has no apply link. The story taps Apply as a signed-in user and nothing happens: no sheet, no message, no event. The page looks unchanged because that is the whole behavior.' } } },
  render: () => <Real auth="signedIn" a={api.ok()} url={NO_URL.applyUrl} />,
};

/** Proposed: the user id is being resolved (the tap looks dead today). */
export const ResolvingUserIdProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/lib/useClickOut.tsx:96', docs: { description: { story: 'MISSING today: the hook awaits a profile refetch with no feedback, so the tap looks dead. Proposal: the Apply button shows its spinner (primaryLoading) until the link opens. No copy.' } } },
  render: () => <Page footer={<FooterButtons buttons="single" size={52} primaryLabel="Apply Now" primaryLoading />} />,
};

/** Proposed: user id could not be resolved. */
export const UserIdMissingProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/lib/useClickOut.tsx:106', docs: { description: { story: 'Today (PARTIAL) a native Alert "Couldn\'t open this right now" shows, and it logs nothing. Proposal: a Toast, tone error. DS gap: there is no app-level toast host, each screen mounts its own. Open question: should the failure fire an analytics event (clickout_blocked is defined but its hook has no caller, R3)?' } } },
  render: () => (
    <Page footer={<FooterButtons buttons="single" size={52} primaryLabel="Apply Now" />}>
      <View style={{ paddingHorizontal: spacing[16] }}>
        <Toast tone="error" message="Couldn't open this. We couldn't confirm your account, so cashback would not be tracked. Check your connection and try again." />
      </View>
    </Page>
  ),
};

/** Proposed: the card has no apply link. */
export const EmptyUrlProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/lib/useClickOut.tsx:87', docs: { description: { story: 'No state today (R3): the hook returns silently, so the CTA is dead. Proposal: the Apply button is disabled and an InlineMessage, tone info, says "Applications for this card are paused. See similar cards below." Open question: the "similar cards below" list is not built either; point to the recommended row?' } } },
  render: () => (
    <Page footer={<FooterButtons buttons="single" size={52} primaryLabel="Apply Now" primaryDisabled />}>
      <View style={{ paddingHorizontal: spacing[16] }}>
        <InlineMessage tone="info" message="Applications for this card are paused. See similar cards below." />
      </View>
    </Page>
  ),
};

/** Proposed: the redirect step before the bank page. */
export const RedirectProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/lib/useClickOut.tsx:112', docs: { description: { story: 'Not built (R8). Proposal: a full-screen step for 1 to 2 seconds, "Taking you to HDFC Bank", "Your cashback is being tracked. Finish there to earn it." DS gap: a redirect interstitial organism (the cat animation exists only inside FilterTransitionOverlay). Open questions: also show terms to accept (finish in one session, claim window)? Who owns the copy: product with the tracking team (pm-flows Q5).' } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.surface.default, justifyContent: 'center' }}>
        <ScreenState image={images.screenstate.tracking} title="Taking you to HDFC Bank" body="Your cashback is being tracked. Finish there to earn it." />
      </View>
    </PhoneFrame>
  ),
};

/** Proposed: back from the bank page. */
export const ReturnProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/lib/useClickOut.tsx:112', docs: { description: { story: 'Not built (R1). Today the app shows the same screen on return, with no record of the click. Proposal: a prompt on return, "Back from HDFC Bank?", asking whether the user applied. The copy is new, not from the audit. Open questions: what does "Yes, I applied" create (a pending Rewards record, a claim stub)? Bank decisions are not visible to us, so what does the record say?' } } },
  render: () => (
    <Page>
      <View style={{ paddingHorizontal: spacing[16], gap: spacing[12] }}>
        <InlineMessage tone="info" title="Back from HDFC Bank?" message="Did you finish applying for the HDFC Regalia Gold card? We keep the tracked click for you." action="two" primaryActionLabel="Yes, I applied" secondaryActionLabel="Not yet" />
      </View>
    </Page>
  ),
};

// ── Edge cases and loaders (audit edge-flows-1-3) ────────────────────────────

/** Apply while the user id is still loading: the tap looks dead (A1, P0). */
export const ResolvingSlowToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:96', docs: { description: { story: 'Slow story: wait about 10 seconds. Signed-in user; the profile call answers after 8 seconds and the story taps Apply at about 1.5 s. The hook waits for the profile with no spinner, no message and no disabled state, so the button looks dead. After the profile lands, the click-out goes out by itself (console line "[storybook] click-out"). On a real slow network the wait can reach about 46 s (G1). Open question Q1: block the button with a spinner, or open the link unattributed after N seconds?' } } },
  render: () => <Real auth="signedIn" a={api.ok({ profile: SLOW_PROFILE })} />,
};

/** A second tap while the first waits: two click ids for one Apply (A1, P0). */
export const DoubleTapToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:85', docs: { description: { story: 'Slow story: wait about 10 seconds. Same setup as "Resolving slow", and the story taps Apply a second time 1 second after the first. There is no in-flight guard, so when the profile lands the app sends two click-outs, each with its own click id and its own click_out event. Check the console: two "[storybook] click-out" lines with different click ids. Money-sensitive: attribution (A1, Q1).' } } },
  render: () => <Real auth="signedIn" a={api.ok({ profile: SLOW_PROFILE })} extra={[[1000, () => clickByText('Apply Now')]]} />,
};

/** The user id cannot be resolved: a native Alert, no retry (A3). */
export const UserIdMissingToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:106', docs: { description: { story: 'Edge case (A3, P0). Signed-in user, the profile call answers 500. After the app\'s retries (about 2 seconds) the hook shows a native Alert, "Couldn\'t open this right now" (drawn as a DOM dialog in Storybook). It has OK only: no retry, no event. No link opens. On web the Alert is the only sign; on a device it is the OS dialog.' } } },
  render: () => <Real auth="signedIn" a={api.ok({ profile: reply.error(500) })} />,
};

/** The session expires at the Apply tap: login sheet plus Alert (verify). Not seen in a browser. */
export const SessionExpiresAtApply: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:96', docs: { description: { story: 'Edge case (inferred from code, not seen in a browser). The first profile load (3 attempts) drops like a network failure, so the hook has no user id at the Apply tap. The refetch at the tap answers 401 and the refresh token is rejected (401 / 2004). The app drops to guest and opens the login sheet, and the hook also shows the "Couldn\'t open this right now" Alert. Two prompts for one tap, and the Apply is lost. Check the console for the call order.' } } },
  render: () => (
    <Real
      auth="signedIn"
      a={api.ok({ profile: reply.sequence(reply.network(), reply.network(), reply.network(), reply.error(401)), refreshToken: reply.code(401, '2004', 'Session expired') })}
    />
  ),
};

/** Guest logs in from the earn prompt: the Apply continues by itself. */
export const GuestLoginContinues: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:117', docs: { description: { story: 'Edge case, long path (about 15 seconds). The story taps Apply as a guest, taps "Log in to earn cashback", types a number and taps Get OTP on the real login sheet. The story stops at the OTP step; after a verified OTP the hook resolves the new user id with the fresh token and opens the link attributed (launchAfterLogin). Money-sensitive: on production a verified OTP signs in a real account.' } } },
  render: () => <Real auth="guest" a={api.ok()} extra={guestLoginSteps} />,
};

/** Guest opens the login sheet, then closes it: the Apply is dropped (Q2). */
export const GuestLoginCancelled: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:89', docs: { description: { story: 'Edge case (Q2). The story taps Apply as a guest, taps "Log in to earn cashback", then closes the login sheet (all sheets dismissed, like a swipe down, at about 6 seconds). The pending Apply is dropped: no link, no message, the user is back on the card page. Open question Q2: drop the Apply (today), or offer "Apply without cashback" again?' } } },
  render: () => <Real auth="guest" a={api.ok()} extra={[[1200, () => clickByText('Log in to earn cashback')]]} dismissAfter={6000} />,
};
