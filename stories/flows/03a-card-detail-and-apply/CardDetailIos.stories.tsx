import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardDetailSheet, type CardDetailSheetProps } from '../../../src/organisms/CardDetailSheet';
import { SheetHarness } from '../../../storybook/harness';
import { api, reply } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { MODELS, REGALIA, NO_TILES, RECOMMENDED, INCOME } from './_data';

const Detail = ({ a, ...p }: { a: ApiParams } & Partial<CardDetailSheetProps>) => (
  <SheetHarness api={a}>
    {(ref) => <CardDetailSheet ref={ref as never} card={REGALIA} cards={MODELS} initialCardId={REGALIA.id} recommended={RECOMMENDED} {...p} />}
  </SheetHarness>
);
const alias = REGALIA.filterMeta?.cardAlias as string;

const meta: Meta = {
  title: 'Flows/3a Card detail and apply/Card detail (iOS sheet)',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'Card detail on iOS and web: a two-stage sheet (75%, then 100%) with benefits, fees, an inline eligibility checker, recommended cards and a sticky Apply. Android uses a full screen with the same states (next step). The tools, advisor, store page and Cards you can get open this same sheet. The card, its fees and its benefits come from the harness BankKaro fixture, run through the app mapper. The rail, ranking and verdict logic are the real ones.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** A card whose list entry has no benefit tiles: the sheet fetches the detail, and shows a skeleton until it lands. */
export const BenefitsLoading: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:1138' },
  render: () => <Detail a={api.ok({ cardDetail: reply.hang() })} card={NO_TILES} cards={[NO_TILES]} initialCardId={NO_TILES.id} />,
};

/** Loaded: benefit tiles, fees, checker, recommended cards, Apply bar. */
export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:2597' },
  render: () => <Detail a={api.ok()} />,
};

/** Inline result: eligible. The user saved details on Home, so the card shows its own result. */
export const InlineEligible: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:521', docs: { description: { story: 'Details saved (PIN 110001, income ₹1,50,000), and the card is in the eligible set: green banner and a result strip above Apply. A first-time check from this card opens the colored result sheets instead (see Result sheets).' } } },
  render: () => <Detail a={api.ok()} index={1} eligibilityDefaults={{ pincode: '110001', income: INCOME.eligible, incomeType: 'salaried' }} eligibleAliases={[alias]} />,
};

/** Inline result: maybe. */
export const InlineMaybe: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:540', docs: { description: { story: 'The API rejected the card but income ₹90,000 is within 20% of the card\'s bar (₹1,00,000): amber banner "You might qualify".' } } },
  render: () => <Detail a={api.ok()} index={1} eligibilityDefaults={{ pincode: '110001', income: INCOME.maybe, incomeType: 'salaried' }} eligibleAliases={[]} />,
};

/** Inline result: ineligible. Story 3b starts from here. */
export const InlineIneligible: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:530', docs: { description: { story: 'The API rejected the card and income ₹30,000 is far under the bar: red banner "We\'re sorry! You\'re ineligible". Apply then opens the rejection sheet (flow 3b).' } } },
  render: () => <Detail a={api.ok()} index={1} eligibilityDefaults={{ pincode: '110001', income: INCOME.ineligible, incomeType: 'salaried' }} eligibleAliases={[]} />,
};

/** Detail fetch failed: benefits fall back silently. */
export const DetailFetchFailed: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:1111', docs: { description: { story: 'PARTIAL. Only isPending is read: on error the benefits block shows nothing and no message, so the user decides on incomplete benefits. Proposal from the UX audit: InlineMessage, tone warning, "Couldn\'t load all benefits for this card.", action "Try again". Open question: show it, or keep failing silently?' } } },
  render: () => <Detail a={api.ok({ cardDetail: reply.error(500) })} card={NO_TILES} cards={[NO_TILES]} initialCardId={NO_TILES.id} />,
};
