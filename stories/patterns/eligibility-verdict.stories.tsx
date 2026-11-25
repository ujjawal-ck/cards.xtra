import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EligibleSheet } from '../../src/organisms/EligibleSheet';
import { MaybeSheet } from '../../src/organisms/MaybeSheet';
import { IneligibleSheet } from '../../src/organisms/IneligibleSheet';
import { InlineMessage } from '../../src/molecules/InlineMessage';
import { Button } from '../../src/atoms/Button';
import { images } from '../../src/assets/images';
import { spacing, colors, radius } from '../../src/tokens';
import { Board, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/Eligibility verdict',
  parameters: { layout: 'padded', docs: { description: { component: 'One classifier gives one of three results: eligible, maybe, ineligible. Each has its own sheet.' } } },
};
export default meta;
type Story = StoryObj;

const details = { pincode: '110001', amount: '₹1,50,000', occupation: 'Salaried' };
const Frame = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: 390, backgroundColor: colors.surface.dark, overflow: 'hidden', borderRadius: radius['2xl'] }}>{children}</View>
);

export const Eligible: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/EligibleSheet.tsx:38', docs: { description: { story: 'Eligible: confetti masthead, the reward headline and "Apply Now". Home passes several card images to show a fanned stack.' } } },
  render: () => (
    <Board><Frame>
      <EligibleSheet {...details} cardImage={images.cards.axisMagnus} onApply={noop} onEditPress={noop} />
    </Frame></Board>
  ),
};

export const Maybe: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/MaybeSheet.tsx:29', docs: { description: { story: 'Maybe: the user may qualify. The sheet lists cards they can explore and keeps "Continue to Apply".' } } },
  render: () => (
    <Board><Frame>
      <MaybeSheet
        {...details}
        cards={[
          { id: 'a', cardImage: images.cards.axisMagnus, cardName: 'Axis Bank Magnus', cashbackText: '₹1,200' },
          { id: 'b', cardImage: images.cards.hdfcRegaliaGold, cardName: 'HDFC Regalia Gold', cashbackText: '₹1,000' },
          { id: 'c', cardImage: images.cards.sbiCashback, cardName: 'SBI Cashback', cashbackText: '₹800' },
        ]}
        onContinue={noop}
        onEditPress={noop}
      />
    </Frame></Board>
  ),
};

export const IneligibleNoAlternatives: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/IneligibleSheet.tsx:130', docs: { description: { story: 'Ineligible with no alternatives: the real sheet with no picks. Blocks 2 and 3 (alternatives, "See all") are left out, so the only exits are Edit and "Continue to Apply" (D22: a rejection is not a hard stop). The audit rates this PARTIAL (R15). The with-alternatives look needs card cross-sell data that these stories do not have.' } } },
  render: () => (
    <Board><Frame>
      <IneligibleSheet {...details} onContinue={noop} onEditPress={noop} picks={[]} />
    </Frame></Board>
  ),
};

export const IneligibleZeroAlternativesProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 3 (IneligibleSheet, zero alternatives)', docs: { description: { story: 'Proposed: under the sheet, an InlineMessage and an outline button give a way forward. Open question: where does "Browse all cards" go, and does it keep the details the user typed (R15)?' } } },
  render: () => (
    <Board><Frame>
      <IneligibleSheet {...details} onContinue={noop} onEditPress={noop} picks={[]} />
      <View style={{ backgroundColor: colors.surface.default, padding: spacing[16], gap: spacing[12] }}>
        <InlineMessage tone="info" message="No other card fits these details yet. Try different details, or browse all cards." />
        <Button label="Browse all cards" variant="outline" tone="second" size={44} fullWidth onPress={noop} />
      </View>
    </Frame></Board>
  ),
};
