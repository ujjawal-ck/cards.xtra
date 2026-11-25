import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EligibleSheet } from '../../../src/organisms/EligibleSheet';
import { MaybeSheet } from '../../../src/organisms/MaybeSheet';
import { IneligibleSheet } from '../../../src/organisms/IneligibleSheet';
import { SheetHarness } from '../../../storybook/harness';
import { ResultHost } from '../01-launch-and-login/_hosts';
import { MODELS, REGALIA, CARDS_BY_ID, REJECTION } from './_data';

const carousel = MODELS.slice(0, 6).map((c) => ({ id: c.id, cardImage: c.cardImage, cardName: c.name, cashbackText: c.cashbackValue, tags: c.tags, benefits: c.tileBenefits }));
const details = { pincode: '110001', occupation: 'Salaried' };

const Host = ({ children }: { children: React.ReactNode }) => (
  <SheetHarness>{(ref) => <ResultHost ref={ref as never}>{children}</ResultHost>}</SheetHarness>
);

const meta: Meta = {
  title: 'Flows/3a Card detail and apply/Result sheets',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'After a first check from a card, Apply opens one colored sheet: eligible (green), maybe (amber) or ineligible (red). Eligible and maybe show once per card; ineligible shows on every Apply. The sheets are plain content that HomeScreen hosts in a 90% gorhom modal (src/screens/HomeScreen.tsx:2745); these stories use the same host and the same props, with fixture cards.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Eligible: confetti off here, hero card, reward headline, "Apply Now". */
export const Eligible: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2763', docs: { description: { story: 'Confetti is switched off in Storybook (the screen turns it on). "Apply Now" continues to the click-out.' } } },
  render: () => <Host><EligibleSheet showConfetti={false} cardImage={REGALIA.cardImage} rewardHeadline={`${REGALIA.cashbackValue} Rewards`} amount="₹1.5L" {...details} onApply={() => {}} onEditPress={() => {}} /></Host>,
};

/** Maybe: carousel of cards to explore, "Continue to Apply". */
export const Maybe: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2811' },
  render: () => <Host><MaybeSheet cards={carousel} exploreLead={`Explore ${carousel.length} Cards`} amount="₹90K" {...details} onContinue={() => {}} onEditPress={() => {}} /></Host>,
};

/** Ineligible: reason, three alternatives, "See all N cards you can get". Continues in flow 3b. */
export const Ineligible: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2850', docs: { description: { story: 'The same sheet as in flow 3b (Rejection), where its states are shown.' } } },
  render: () => (
    <Host>
      <IneligibleSheet reasons={REJECTION.reasonIncome.lines} amount="₹30K" {...details} sourceCard={REGALIA} picks={REJECTION.picks} cardsById={CARDS_BY_ID} eligibleCount={REJECTION.seeAllCount} onContinue={() => {}} onEditPress={() => {}} onPickPress={() => {}} onSeeAll={() => {}} />
    </Host>
  ),
};

// ── Edge cases (audit edge-flows-1-3) ────────────────────────────────────────

/** Eligible sheet with no reward headline: the default rupee figure shows (A4, P0, rare). */
export const EligibleNoRewardToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/EligibleSheet.tsx:135', docs: { description: { story: 'Edge case (A4). Home passes undefined for the headline when the card has no reward value. The sheet then falls back to its built-in "Flat ₹1400 Rewards", a figure that is not this card\'s. Rare, but it is a wrong money claim on the sheet that leads to Apply.' } } },
  render: () => <Host><EligibleSheet showConfetti={false} cardImage={REGALIA.cardImage} rewardHeadline={undefined} amount="₹1.5L" {...details} onApply={() => {}} onEditPress={() => {}} /></Host>,
};

/** The multi-card Home result with exactly one eligible card. */
export const EligibleCardsModeOne: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2763', docs: { description: { story: 'Edge case. The Home toggle path with one eligible card: no reward block, one card image, "Congrats! You\'re eligible for 1 card" and "Great, Show Cards". Check the singular wording and the single-card hero (the stack needs two or more images).' } } },
  render: () => <Host><EligibleSheet showConfetti={false} hideReward cardImages={[REGALIA.cardImage]} message={"Congrats!\nYou're eligible for 1 card"} ctaLabel="Great, Show Cards" amount="₹1.5L" {...details} onApply={() => {}} onEditPress={() => {}} /></Host>,
};
