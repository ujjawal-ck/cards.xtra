import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Image } from 'react-native';
import { MissingCashbackResult } from '../../../src/screens/MissingCashbackResult';
import { MissingCashbackNewUserCheck } from '../../../src/screens/MissingCashbackNewUserCheck';
import { MissingCashbackCategorySelect } from '../../../src/screens/MissingCashbackCategorySelect';
import { MissingCashbackInvoiceUpload } from '../../../src/screens/MissingCashbackInvoiceUpload';
import { MissingCashbackTicketSuccess } from '../../../src/screens/MissingCashbackTicketSuccess';
import { InlineMessage } from '../../../src/molecules/InlineMessage';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { Text } from '../../../src/atoms/Text';
import { StepProgress } from '../../../src/atoms/StepProgress';
import { images } from '../../../src/assets/images';
import { colors, spacing, radius } from '../../../src/tokens';
import { ScreenHarness } from '../../../storybook/harness';
import { api, reply, mcDraftFixture } from '../../../storybook/fixtures';
import { tap } from './_dom';
import { ProposedPage } from './_proposed';

const meta: Meta = {
  title: 'Flows/8 Orders and missing cashback/Outcomes',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const R = 'src/screens/MissingCashbackResult.tsx';
const result = (params: object) => <ScreenHarness name="MissingCashbackResult" component={MissingCashbackResult} auth="signedIn" params={params} api={api.ok()} />;

/** Cashback tracked on the spot (`cashback_id` in the answer). Button: "View Details". */
export const Tracked: Story = {
  tags: ['live'],
  parameters: { source: `${R}:36`, docs: { description: { story: 'Params as `resultParamsFromOutcome` builds them for a tracked outcome. `cashbackId` set, so the button opens the order.' } } },
  render: () => result({ variant: 'tracked', title: 'Cashback Tracked', message: 'Your cashback has been tracked.', cashbackId: 24600003 }),
};

/** Claim added to the queue (Pending, group A or D). Button: "Ok, Got It". */
export const Queued: Story = {
  tags: ['live'],
  parameters: { source: `${R}:60` },
  render: () => result({ variant: 'queued', title: 'Claim Submitted', message: 'Your missing cashback claim has been added to the queue.' }),
};

/** The retailer tracks it automatically (`under_tracking: yes`). */
export const AutoTracking: Story = {
  tags: ['live'],
  parameters: { source: `${R}:60` },
  render: () => result({ variant: 'tracking', title: 'Under Auto-Tracking', message: 'Your order is under auto-tracking. We will credit your cashback once it is confirmed.' }),
};

/** Group B1: "Are you a new user on this retailer?" Two answers. */
export const NewUserCheck: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/MissingCashbackNewUserCheck.tsx:72' },
  render: () => <ScreenHarness name="MissingCashbackNewUserCheck" component={MissingCashbackNewUserCheck} auth="signedIn" params={{ draft: mcDraftFixture.b1Queued }} api={api.ok()} />,
};

/** Group C1: pick the product category. "Submit" turns to "Continue" for "Other Category". */
export const CategorySelect: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/MissingCashbackCategorySelect.tsx:72' },
  render: () => <ScreenHarness name="MissingCashbackCategorySelect" component={MissingCashbackCategorySelect} auth="signedIn" params={{ draft: mcDraftFixture.c1Queued }} api={api.ok()} />,
};

/** Group C2 (and C1 "Other Category"): upload an invoice screenshot. No file yet, Submit disabled. */
export const InvoiceUpload: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/MissingCashbackInvoiceUpload.tsx:81',
    docs: { description: { story: 'The photo picker is a native call, so a picked-file state is not reachable here. Submit is disabled with no file, so the "add at least one screenshot" error cannot show.' } },
  },
  render: () => <ScreenHarness name="MissingCashbackInvoiceUpload" component={MissingCashbackInvoiceUpload} auth="signedIn" params={{ draft: mcDraftFixture.c2Queued }} api={api.ok()} />,
};

/** R18, PROPOSED: the file is above the size limit. Today nothing checks the limit. */
export const InvoiceFileTooLarge: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'R18. The screen text says "Max 2MB" (`MissingCashbackInvoiceUpload.tsx:174`) but nothing checks it, and the BFF body limit (about 4.4 MB) fails the ticket late. Copy from ux-states.md: "This file is too big. Use a file under 2 MB." or "Use a JPG, PNG, PDF or BMP file." Open question: which limit is real (2 MB in the text, 6 MB in the app, about 4.4 MB at the BFF), and whether the app should compress. The picked-file thumbnail below uses a bundled brand image as a stand-in.' } },
  },
  render: () => (
    <ProposedPage
      title="Did You Shop?"
      footer={<View style={{ padding: spacing[16] }}><FooterButtons buttons="single" primaryLabel="Submit" primaryDisabled onPrimary={() => {}} /></View>}
    >
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        <Text variant="body16Bold" color={colors.text.primary}>Upload your invoice</Text>
        <Text variant="body14SemiBold" color={colors.action.accent.default}>Add screenshot</Text>
        <Text variant="body12Regular" color={colors.text.secondary}>Allowed: .jpg, .png, .jpeg, .pdf, .bmp · Max 2MB</Text>
        <Image source={images.brands.flipkart} style={{ width: spacing[64], height: spacing[64], borderRadius: radius.md }} />
        <InlineMessage tone="error" message="This file is too big. Use a file under 2 MB." />
      </View>
    </ProposedPage>
  ),
};

/** PROPOSED: photo access denied. Today a native Alert with no way to settings. */
export const InvoicePhotoPermissionDenied: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Today `MissingCashbackInvoiceUpload.tsx:59` shows a native `Alert` ("Permission needed"). Proposed: `InlineMessage` tone warning with "Open settings". Open question: copy and whether to offer a camera option.' } },
  },
  render: () => (
    <ProposedPage
      title="Did You Shop?"
      footer={<View style={{ padding: spacing[16] }}><FooterButtons buttons="single" primaryLabel="Submit" primaryDisabled onPrimary={() => {}} /></View>}
    >
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        <Text variant="body16Bold" color={colors.text.primary}>Upload your invoice</Text>
        <Text variant="body14SemiBold" color={colors.action.accent.default}>Add screenshot</Text>
        <InlineMessage tone="warning" message="Allow photo access to attach your invoice." primaryActionLabel="Open settings" onPrimaryAction={() => {}} />
      </View>
    </ProposedPage>
  ),
};

/** Ticket raised after the invoice upload. */
export const TicketRaised: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/MissingCashbackTicketSuccess.tsx:41' },
  render: () => <ScreenHarness name="MissingCashbackTicketSuccess" component={MissingCashbackTicketSuccess} auth="signedIn" params={{ ticketId: '413500' }} api={api.ok()} />,
};

// ── Edge and loader states ───────────────────────────────────────────────────

const U = 'src/screens/MissingCashbackNewUserCheck.tsx';
const C = 'src/screens/MissingCashbackCategorySelect.tsx';
const newUser = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="MissingCashbackNewUserCheck" component={MissingCashbackNewUserCheck} auth="signedIn" params={{ draft: mcDraftFixture.b1Queued }} api={a} />;
const category = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="MissingCashbackCategorySelect" component={MissingCashbackCategorySelect} auth="signedIn" params={{ draft: mcDraftFixture.c1Queued }} api={a} />;
const NEW_USER = "Yes, I'm a new user";

/** B1: the update call fails, the raw error text shows. */
export const NewUserCheckSubmitError: Story = {
  tags: ['live'],
  parameters: { source: `${U}:96`, docs: { description: { story: 'Reached by a tap on "Yes, I\'m a new user". The PUT answers 500. The screen shows the error message text as it is (G15).' } } },
  render: () => newUser(api.ok({ mcUpdate: reply.error(500) })),
  play: async () => { await tap(NEW_USER); },
};

/** C1: the update call fails after a category is picked. */
export const CategorySelectSubmitError: Story = {
  tags: ['live'],
  parameters: { source: `${C}:66`, docs: { description: { story: 'Reached by taps: "Mobile Recharge", then Submit. The PUT answers 500. The screen shows the error message text as it is (G15).' } } },
  render: () => category(api.ok({ mcUpdate: reply.error(500) })),
  play: async () => { await tap('Mobile Recharge'); await tap('Submit'); },
};

/** B1: the update call is running: the button shows its loading state and both answers are disabled. */
export const NewUserCheckSubmitting: Story = {
  tags: ['live'],
  parameters: { source: `${U}:152`, docs: { description: { story: 'Reached by a tap on "Yes, I\'m a new user". The PUT hangs.' } } },
  render: () => newUser(api.ok({ mcUpdate: reply.hang() })),
  play: async () => { await tap(NEW_USER); },
};

/** C1: the update call is running: Submit shows its loading state. */
export const CategorySelectSubmitting: Story = {
  tags: ['live'],
  parameters: { source: `${C}:166`, docs: { description: { story: 'Reached by taps: "Mobile Recharge", then Submit. The PUT hangs.' } } },
  render: () => category(api.ok({ mcUpdate: reply.hang() })),
  play: async () => { await tap('Mobile Recharge'); await tap('Submit'); },
};

/** The invoice layout the two proposed upload states share. */
function InvoiceLayout({ children, loading = false }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <ProposedPage
      title="Did You Shop?"
      footer={<View style={{ padding: spacing[16] }}><FooterButtons buttons="single" primaryLabel="Submit" primaryLoading={loading} onPrimary={() => {}} /></View>}
    >
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        <Text variant="body16Bold" color={colors.text.primary}>Upload your invoice</Text>
        <Text variant="body14SemiBold" color={colors.action.accent.default}>Add screenshot</Text>
        <Text variant="body12Regular" color={colors.text.secondary}>Allowed: .jpg, .png, .jpeg, .pdf, .bmp · Max 2MB</Text>
        <View style={{ flexDirection: 'row', gap: spacing[8] }}>
          {[images.brands.flipkart, images.brands.amazon, images.brands.ajio].map((src, i) => (
            <Image key={i} source={src} style={{ width: spacing[64], height: spacing[64], borderRadius: radius.md }} />
          ))}
        </View>
        {children}
      </View>
    </ProposedPage>
  );
}

/** PROPOSED: three photos uploading on a slow network. */
export const UploadingProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'G16 (P0, inferred, not measured). Today one POST carries every photo with a 15 s deadline, no retry and only a button spinner. Proposed: a step bar and a keep-open note. Open question: upload one photo at a time so progress is real and a failure costs one file. The bar here is a design stand-in: the app has no per-file progress. Thumbnails are bundled brand images.' } },
  },
  render: () => (
    <InvoiceLayout loading>
      <StepProgress value={1} total={3} label="Uploading 1 of 3" showCount={false} />
      <InlineMessage tone="info" message="Keep the app open until the upload finishes." />
    </InvoiceLayout>
  ),
};

/** PROPOSED: the upload timed out and the outcome is unknown. */
export const UploadUnknownOutcomeProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'G2b. Today the catch shows raw text and a retry can raise a second ticket. Proposed: a warning that sends the user to the Others tab before they upload again. Open question: block a new upload until the user has opened the list, or only warn?' } },
  },
  render: () => (
    <InvoiceLayout>
      <InlineMessage tone="warning" title="We couldn't confirm your upload" message="Check the Others tab in your claims before you upload again." primaryActionLabel="View claims" onPrimaryAction={() => {}} />
    </InvoiceLayout>
  ),
};
