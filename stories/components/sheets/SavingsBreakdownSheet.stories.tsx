import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SavingsBreakdownSheet, type SavingsBreakdownSheetProps } from '../../../src/organisms/SavingsBreakdownSheet';
import { ROW_IN_APP, ROW_NOT_IN_APP, ROW_LOUNGE_WAIVER } from './_data';
import { Open } from './_present';

const meta: Meta<SavingsBreakdownSheetProps> = {
  title: 'Components/Sheets/SavingsBreakdownSheet',
  component: SavingsBreakdownSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/SavingsBreakdownSheet.tsx:108',
    docs: { description: { component: 'The sum behind a league row: each spend line, the fee, lounge and fee-waiver benefits, with a year and month switch. Apply lives here only (the league rows have no Apply). It opens with present(row), so the story passes a row built from the trimmed calculate fixture.' } },
  },
  argTypes: { yearlySpend: { control: 'number' }, hideApply: { control: 'boolean' }, onApply: { action: 'apply' }, onViewCard: { action: 'view card' } },
  args: { yearlySpend: 270000 },
  render: (args) => <Open args={[ROW_IN_APP]}>{(ref) => <SavingsBreakdownSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<SavingsBreakdownSheetProps>;

export const CardInApp: Story = { parameters: { docs: { description: { story: 'The app lists this card: Apply and View card details show.' } } } };
export const CardNotInApp: Story = { render: (args) => <Open args={[ROW_NOT_IN_APP]}>{(ref) => <SavingsBreakdownSheet ref={ref} {...args} />}</Open>, parameters: { docs: { description: { story: 'The app does not list this card: no Apply and no card page.' } } } };
export const LoungeAndFeeWaiver: Story = { render: (args) => <Open args={[ROW_LOUNGE_WAIVER]}>{(ref) => <SavingsBreakdownSheet ref={ref} {...args} />}</Open>, parameters: { docs: { description: { story: 'Row from the lounge and fee-waiver response.' } } } };
export const UsersOwnCard: Story = { args: { hideApply: true }, parameters: { docs: { description: { story: 'Beat my card: the card is the one the user holds, so Apply and View card details are hidden.' } } } };
