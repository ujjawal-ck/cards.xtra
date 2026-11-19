import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { IneligibleSheet } from '../../../src/organisms/IneligibleSheet';
import { InlineMessage } from '../../../src/molecules';
import { Text, Button } from '../../../src/atoms';
import { BottomSheetHeader } from '../../../src/organisms/BottomSheetHeader';
import { PhoneFrame, SheetHarness } from '../../../storybook/harness';
import { ResultHost } from '../01-launch-and-login/_hosts';
import { REGALIA, CARDS_BY_ID, REJECTION } from '../03a-card-detail-and-apply/_data';
import { colors, spacing, radius } from '../../../src/tokens';

const details = { pincode: '110001', occupation: 'Salaried', amount: '₹30K' };
const noop = () => {};

const Rejected = ({ reasons, picks = REJECTION.picks, eligibleCount = REJECTION.seeAllCount }: { reasons: string[]; picks?: typeof REJECTION.picks; eligibleCount?: number }) => (
  <SheetHarness>
    {(ref) => (
      <ResultHost ref={ref as never} snap="90%">
        <IneligibleSheet reasons={reasons} {...details} sourceCard={REGALIA} picks={picks} cardsById={CARDS_BY_ID} eligibleCount={eligibleCount}
          onContinue={noop} onEditPress={noop} onPickPress={noop} onSeeAll={noop} />
      </ResultHost>
    )}
  </SheetHarness>
);

const meta: Meta = {
  title: 'Flows/3b Rejection/Rejection sheet',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'The recovery moment after "no". The red result sheet names the reason, offers up to three alternatives (the closest card, the one with the most Rewards, a lifetime-free one), a "See all N cards you can get" button, "Edit" to reopen the checker, and "Continue to Apply". HomeScreen hosts it in a 90% modal (src/screens/HomeScreen.tsx:2833); the stories use the same host, the same props and the app\'s own pick logic over the harness fixture cards. Eligible and maybe sheets are in Card detail and apply, Result sheets. Money-sensitive: a pick tapped here opens the Home card detail, so its Apply runs the Home gate; Apply on the next page skips it (R11).' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Income reason with the alternatives (closest, most Rewards, lifetime free). */
export const IncomeReasonWithPicks: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/IneligibleSheet.tsx:130', docs: { description: { story: 'Reason from the app\'s rejectionReason(): the card needs about ₹12L a year, the user entered ₹3.6L. Events rejection_sheet_view, rejection_pick_tap, rejection_edit_details, rejection_see_all.' } } },
  render: () => <Rejected reasons={REJECTION.reasonIncome.lines} />,
};

/** Generic reason: income is not the cause. */
export const GenericReason: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/IneligibleSheet.tsx:130', docs: { description: { story: 'When income is not the cause (PIN code, employment type, unknown bar) the sheet shows one generic line.' } } },
  render: () => <Rejected reasons={REJECTION.reasonGeneric.lines} />,
};

/** Zero alternatives, as it is today: blocks 2 and 3 are simply left out (R15). */
export const ZeroPicksToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/IneligibleSheet.tsx:130', docs: { description: { story: 'Risk R15 (PARTIAL). With no alternatives the sheet drops the "Cards you can get instead" block and the See-all button, so the only exits are Edit and Continue to Apply.' } } },
  render: () => <Rejected reasons={REJECTION.reasonIncome.lines} picks={[]} eligibleCount={0} />,
};

/** Proposed: zero alternatives with a way forward. */
export const ZeroPicksProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/organisms/IneligibleSheet.tsx:130', docs: { description: { story: 'Not built (R15). Proposal: an InlineMessage, tone info, "No other card fits these details yet. Try different details, or browse all cards.", plus an outline Button "Browse all cards". Open questions: where does "Browse all cards" go (Home with the filter off)? Should "Continue to Apply" stay for a card the bank will probably refuse?' } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.background.default, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface.default, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], paddingBottom: spacing[24] }}>
          <BottomSheetHeader showStroke={false} />
          <View style={{ padding: spacing[16], gap: spacing[16] }}>
            <Text variant="heading20SemiBold" color={colors.text.primary}>We're sorry! You're ineligible for this card.</Text>
            {REJECTION.reasonIncome.lines.map((l) => <Text key={l} variant="body14Regular" color={colors.text.secondary}>{l}</Text>)}
            <InlineMessage tone="info" message="No other card fits these details yet. Try different details, or browse all cards." />
            <Button label="Browse all cards" variant="outline" tone="second" fullWidth />
            <Button label="Continue to Apply" variant="solid" tone="second" fullWidth />
          </View>
        </View>
      </View>
    </PhoneFrame>
  ),
};
