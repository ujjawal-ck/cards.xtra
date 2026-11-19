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
import { images } from '../../../src/assets/images';
import { colors, spacing, radius } from '../../../src/tokens';
import { ScreenHarness } from '../../../storybook/harness';
import { api, mcDraftFixture } from '../../../storybook/fixtures';
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
