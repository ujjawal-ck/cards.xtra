import React from 'react';
import { Image, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ComponentHarness, PhoneFrame } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { Text, Button } from '../../../src/atoms';
import { InlineMessage, Toast } from '../../../src/molecules';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { ScreenState } from '../../../src/organisms/ScreenState';
import { images } from '../../../src/assets/images';
import { useClickOut } from '../../../src/lib/useClickOut';
import { colors, spacing } from '../../../src/tokens';
import { REGALIA, NO_URL } from './_data';
import { Script, clickByText } from '../01-launch-and-login/_flow';

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

const Real = ({ auth, a, url }: { auth: 'guest' | 'signedIn'; a: ApiParams; url?: string }) => (
  <>
    <ComponentHarness auth={auth} api={a}><ApplyHost url={url} /></ComponentHarness>
    <Script steps={[[1500, () => clickByText('Apply Now')]]} />
  </>
);

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
