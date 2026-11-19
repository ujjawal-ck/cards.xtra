import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EligibilityCheckerSheet, type EligibilityCheckerSheetRef } from '../../../src/organisms/EligibilityCheckerSheet';
import { SheetHarness } from '../../../storybook/harness';
import { api, reply } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { Script, clickByText } from '../01-launch-and-login/_flow';

const Checker = ({ a, defaults, tap }: { a: ApiParams; defaults?: { pin: string; income: string }; tap?: boolean }) => (
  <>
    <SheetHarness<EligibilityCheckerSheetRef> api={a}>
      {(ref) => <EligibilityCheckerSheet ref={ref} routeResultExternally defaultPincode={defaults?.pin} defaultIncome={defaults?.income} onCheck={() => {}} />}
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
