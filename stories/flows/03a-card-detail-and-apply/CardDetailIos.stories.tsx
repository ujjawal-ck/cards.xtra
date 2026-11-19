import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardDetailSheet, type CardDetailSheetProps } from '../../../src/organisms/CardDetailSheet';
import { SheetHarness } from '../../../storybook/harness';
import { api, reply, BK_CARDS } from '../../../storybook/fixtures';
import { mapBkCardToCardModel } from '../../../src/api/cardMapper';
import { Script, clickByText } from '../01-launch-and-login/_flow';
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

// ── Edge cases and loaders (audit edge-flows-1-3) ────────────────────────────

/** A card with no benefit tiles, offline with no cache: the skeleton holds and nothing says why (A13). */
export const BenefitsOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:1138', docs: { description: { story: 'Edge case (A13, G4). The detail query is paused offline, so the sheet keeps the benefits skeleton with no message and no way to retry. Compare "Benefits loading" (same look, but the call is in flight).' } } },
  render: () => <Detail a={api.offline()} card={NO_TILES} cards={[NO_TILES]} initialCardId={NO_TILES.id} />,
};

/** Fees the list does not expect: no annual fee text, a joining fee in words. */
export const OddFees: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:979', docs: { description: { story: 'Edge case. The card comes from the app mapper with annual_fee_text null and joining_fee_text "Contact bank". Check the fee block, the fee strip and the waiver line for empty values or a broken amount.' } } },
  render: () => {
    const raw = BK_CARDS.find((c) => c.card_alias === 'hdfc-regalia-gold');
    const odd = mapBkCardToCardModel({ ...raw!, annual_fee_text: null as never, joining_fee_text: 'Contact bank' });
    return <Detail a={api.ok()} card={odd} cards={[odd]} initialCardId={odd.id} />;
  },
};

/** Card art that fails to load. */
export const BrokenArt: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:979', docs: { description: { story: 'Edge case. The card image address does not load. Check the hero art slot and the strip: they should keep their size and not collapse.' } } },
  render: () => {
    const broken = { ...REGALIA, cardImage: { uri: 'https://storybook.invalid/none.png' } };
    return <Detail a={api.ok()} card={broken} cards={[broken]} initialCardId={broken.id} />;
  },
};

/** The inline eligibility check fails: an error banner and no verdict. */
export const InlineCheckError: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CardDetailSheet.tsx:673', docs: { description: { story: 'Edge case (A7). Details are saved (PIN 110001, income ₹75,000) and the story taps "Check Eligibility" in the card\'s own checker while the API answers 500. The card shows its error line and no verdict. A bad PIN would show the same line (A7).' } } },
  render: () => (
    <>
      <Detail a={api.ok({ eligibility: reply.error(500) })} index={1} eligibilityDefaults={{ pincode: '110001', income: '₹75,000', incomeType: 'salaried' }} />
      <Script steps={[[2600, () => clickByText('Check Eligibility')]]} />
    </>
  ),
};
