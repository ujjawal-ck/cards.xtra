import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EligibilityCheckerSheet, type EligibilityCheckerSheetRef } from '../../../src/organisms/EligibilityCheckerSheet';
import { View } from 'react-native';
import { PhoneFrame, SheetHarness } from '../../../storybook/harness';
import { api, reply, eligibilityFixture } from '../../../storybook/fixtures';
import { Input, Button, Text, Selector } from '../../../src/atoms';
import { InlineMessage } from '../../../src/molecules';
import { icons } from '../../../src/assets/icons';
import { BottomSheetHeader } from '../../../src/organisms/BottomSheetHeader';
import { colors, spacing, radius } from '../../../src/tokens';
import type { ApiParams } from '../../../storybook/harness';
import { Script, clickByText } from '../01-launch-and-login/_flow';

const Checker = ({ a, defaults, tap, inline }: { a: ApiParams; defaults?: { pin: string; income: string }; tap?: boolean; inline?: boolean }) => (
  <>
    <SheetHarness<EligibilityCheckerSheetRef> api={a}>
      {(ref) => <EligibilityCheckerSheet ref={ref} routeResultExternally={!inline} defaultPincode={defaults?.pin} defaultIncome={defaults?.income} onCheck={() => {}} />}
    </SheetHarness>
    {tap ? <Script steps={[[1400, () => clickByText('Check Eligibility')]]} /> : null}
  </>
);

const meta: Meta = {
  title: 'Flows/2 Home and discovery/Eligibility checker',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'PIN code, monthly income and salaried or self-employed. It opens from the Eligibility toggle on Home and from Apply when no details are saved. On a result the caller opens a result sheet (see Card detail and apply, Result sheets). The stories open the real sheet; those that need a tap do it after the sheet opens.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Empty form. */
export const Empty: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/EligibilityCheckerSheet.tsx:168' },
  render: () => <Checker a={api.ok()} />,
};

/** Check tapped with an empty form: PIN and income errors show. */
export const ValidationErrors: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/EligibilityCheckerSheet.tsx:292', docs: { description: { story: 'The story taps "Check Eligibility" with nothing filled in.' } } },
  render: () => <Checker a={api.ok()} tap />,
};

/** Checking: the API never answers, the button shows its spinner. */
export const Checking: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/EligibilityCheckerSheet.tsx:383', docs: { description: { story: 'The form is prefilled with PIN 110001 and income ₹75,000, and the story taps Check while the API hangs.' } } },
  render: () => <Checker a={api.loading()} defaults={{ pin: '110001', income: '₹75,000' }} tap />,
};

/** API failed: an error banner, no verdict. */
export const ApiError: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/EligibilityCheckerSheet.tsx:448', docs: { description: { story: 'The API answers 500. The sheet shows "We couldn\'t check your eligibility right now" and no verdict, so nobody is told they qualify when we do not know.' } } },
  render: () => <Checker a={api.ok({ eligibility: reply.error(500) })} defaults={{ pin: '110001', income: '₹75,000' }} tap />,
};

// ── Edge cases and loaders (audit edge-flows-1-3) ────────────────────────────

/** Invalid PIN, as it is today: the API answers 422 and the sheet blames the connection (A7). */
export const InvalidPincodeToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/EligibilityCheckerSheet.tsx:328', docs: { description: { story: 'Edge case (A7). PIN 000000 passes the 6-digit check on the device, the API rejects it, and the sheet shows "We couldn\'t check your eligibility right now": the same line as a network failure. Nothing tells the user the PIN is wrong.' } } },
  render: () => <Checker a={api.ok({ eligibility: eligibilityFixture.invalidPincode })} defaults={{ pin: '000000', income: '₹75,000' }} tap />,
};

/** The sheet body rebuilt from DS parts for the proposed states. */
function SheetReplica({ pin, income, pinHint, incomeHint, loading, message }: { pin: string; income: string; pinHint?: string; incomeHint?: string; loading?: boolean; message?: string }) {
  return (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.background.default, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface.default, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], paddingBottom: spacing[24] }}>
          <BottomSheetHeader title="Check Your Eligibility" showStroke />
          <View style={{ padding: spacing[16], gap: spacing[24] }}>
            {message ? <InlineMessage tone="info" message={message} /> : null}
            <View style={{ gap: spacing[16] }}>
              <Input label="PIN Code" value={pin} onChangeText={() => {}} keyboardType="number-pad" state={pinHint ? 'error' : undefined} hint={pinHint} />
              <Input label="Monthly Income" leadingText="₹" value={income} onChangeText={() => {}} keyboardType="number-pad" hint={incomeHint} />
            </View>
            <View style={{ gap: spacing[8] }}>
              <Text variant="body12Medium" color={colors.text.secondary}>Income type</Text>
              <View style={{ flexDirection: 'row', gap: spacing[12] }}>
                <Selector title="Salaried" source={icons['feat-salaried']} selected style={{ flex: 1 }} />
                <Selector title="Self-employed" source={icons['feat-self-employed']} selected={false} style={{ flex: 1 }} />
              </View>
            </View>
            <Button label="Check Eligibility" variant="solid" tone="second" size={52} fullWidth loading={loading} />
          </View>
        </View>
      </View>
    </PhoneFrame>
  );
}

/** Proposed: a PIN error that says the PIN is the problem. */
export const InvalidPincodeProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/organisms/EligibilityCheckerSheet.tsx:328', docs: { description: { story: 'Proposal for A7. Map the 422 to a field error: PIN Input in the error state with the hint "We couldn\'t find this PIN code. Check it and try again." Open question: does the BankKaro API return a stable status or code for a bad PIN, so the app can tell it from a server fault?' } } },
  render: () => <SheetReplica pin="000000" income="75,000" pinHint="We couldn't find this PIN code. Check it and try again." />,
};

/** Very high monthly income: the app accepts it (A8). */
export const VeryHighIncome: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/EligibilityCheckerSheet.tsx:509', docs: { description: { story: 'Edge case (A8, Q6). Income ₹15,00,000 and PIN 110001 go to the API as monthly income. There is no upper bound and no hint, so a yearly figure typed by mistake inflates the result. The story shows the inline verdict (the sheet is not routed to a result sheet here): the API answers "all eligible".' } } },
  render: () => <Checker a={api.ok({ eligibility: eligibilityFixture.allEligible })} defaults={{ pin: '110001', income: '₹15,00,000' }} tap inline />,
};

/** Proposed: a hint when the income looks yearly. */
export const VeryHighIncomeProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/organisms/EligibilityCheckerSheet.tsx:509', docs: { description: { story: 'Proposal for A8. A hint under the income field: "That\'s ₹15,00,000 a month. Enter your monthly income, not yearly." Open question Q6: at what figure does the hint appear, and does it block the check or only warn? The Input has no warning state, so the field stays in its default state here.' } } },
  render: () => <SheetReplica pin="110001" income="15,00,000" incomeHint="That's ₹15,00,000 a month. Enter your monthly income, not yearly." />,
};

/** Proposed: checking takes a while. */
export const CheckingSlowProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/organisms/EligibilityCheckerSheet.tsx:383', docs: { description: { story: 'MISSING today (A5): the CTA spinner is the only sign for up to about 46 s (G1). Proposal: keep the loading CTA and add an InlineMessage, tone info, "Still checking with the banks. This can take a few seconds." Open question: after how many seconds does the line appear?' } } },
  render: () => <SheetReplica pin="110001" income="75,000" loading message="Still checking with the banks. This can take a few seconds." />,
};
