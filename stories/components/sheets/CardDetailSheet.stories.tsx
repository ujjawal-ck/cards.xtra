import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardDetailSheet, type CardDetailSheetProps } from '../../../src/organisms/CardDetailSheet';
import { ComponentHarness, type ApiParams } from '../../../storybook/harness';
import { CARDS } from './_data';
import { Open } from './_present';

const api: ApiParams = { mode: 'error' };

const meta: Meta<CardDetailSheetProps> = {
  title: 'Components/Sheets/CardDetailSheet',
  component: CardDetailSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/CardDetailSheet.tsx:2597',
    docs: { description: { component: 'Card detail on iOS and web: a two-stage sheet (75%, then 100%) with benefits, fees, eligibility checker, Recommended cards and a sticky Apply. Android uses CardDetailScreenAndroid, a full screen. Sample cards carry their own benefits, so no fetch is needed. Any extra call fails by design in Storybook.' } },
  },
  argTypes: { index: { control: 'radio', options: [0, 1] }, onApply: { action: 'apply' }, onLearnHow: { action: 'learn how' }, onSharePress: { action: 'share' }, onViewAllBenefits: { action: 'view all benefits' }, onRecommendedPress: { action: 'recommended' } },
  args: { card: CARDS[1], cards: CARDS, initialCardId: CARDS[1].id, recommended: [CARDS[2], CARDS[3]] },
  render: (args) => <ComponentHarness api={api}><Open>{(ref) => <CardDetailSheet ref={ref} {...args} />}</Open></ComponentHarness>,
};
export default meta;
type Story = StoryObj<CardDetailSheetProps>;

export const LifetimeFreeCard: Story = {};
export const WithFees: Story = { args: { card: CARDS[0], initialCardId: CARDS[0].id } };
export const FullScreenStage: Story = { args: { index: 1 }, parameters: { docs: { description: { story: 'Opens at the second snap (100%), as when the user returns from All Card Benefits.' } } } };
export const WithSavedEligibility: Story = { args: { eligibilityDefaults: { pincode: '110001', income: '₹75,000', incomeType: 'salaried' }, eligibleAliases: [CARDS[1].id] }, parameters: { docs: { description: { story: 'The user entered details on Home before, so the card shows its result inline.' } } } };
