import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { IneligibleSheet, type IneligibleSheetProps } from '../../../src/organisms/IneligibleSheet';
import { REJECTED_CARD, REJECTION_CARDS_BY_ID, REJECTION_PICKS } from './_data';
import { Open } from './_present';
import { ResultHost } from './_ResultHost';

const meta: Meta<IneligibleSheetProps> = {
  title: 'Components/Sheets/IneligibleSheet',
  component: IneligibleSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/IneligibleSheet.tsx:64',
    docs: { description: { component: 'The red verdict, a "no" with a way forward: the reason, Edit, up to 3 cards the user can get instead, and a link to all of them. A plain view hosted in a 95% sheet by HomeScreen.' } },
  },
  argTypes: { message: { control: 'text' }, ctaLabel: { control: 'text' }, eligibleCount: { control: 'number' }, onContinue: { action: 'continue' }, onEditPress: { action: 'edit' }, onPickPress: { action: 'pick' }, onSeeAll: { action: 'see all' } },
  args: { reasons: ['Your income is below the minimum for this card.'], pincode: '110001', amount: '₹15,000', occupation: 'Salaried', sourceCard: REJECTED_CARD, picks: REJECTION_PICKS, cardsById: REJECTION_CARDS_BY_ID, eligibleCount: 14 },
  render: (args) => <Open>{(ref) => <ResultHost ref={ref} snap="95%"><IneligibleSheet {...args} /></ResultHost>}</Open>,
};
export default meta;
type Story = StoryObj<IneligibleSheetProps>;

export const WithThreeAlternatives: Story = {};
export const OneAlternative: Story = { args: { picks: REJECTION_PICKS.slice(0, 1), eligibleCount: 1 } };
export const GenericReason: Story = { args: { reasons: ['We could not match your details to this card.'] } };
export const ZeroAlternatives: Story = {
  args: { picks: [], eligibleCount: 0 },
  parameters: { docs: { description: { story: 'Live today, but partial: blocks 2 and 3 are left out, so the only ways out are Edit and Continue to Apply (flow risk R15, UX gap 18). Open question for the owner: which copy and action replace the missing blocks. This story shows the code as it is.' } } },
};
