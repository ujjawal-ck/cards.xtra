import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EligibilityCheckerSheet, type EligibilityCheckerSheetProps } from '../../../src/organisms/EligibilityCheckerSheet';
import { ComponentHarness, type ApiParams } from '../../../storybook/harness';
import { Open, OpenThenTap } from './_present';

const eligible: ApiParams = { mode: 'ok', routes: [{ match: '/cardgenius/eligiblity', body: { data: [{ eligible: true, card_alias: 'hdfc-swiggy' }, { eligible: true, card_alias: 'sbi-cashback' }] } }] };
const notEligible: ApiParams = { mode: 'ok', routes: [{ match: '/cardgenius/eligiblity', body: { data: [{ eligible: false, card_alias: 'hdfc-swiggy' }] } }] };

const meta: Meta<EligibilityCheckerSheetProps> = {
  title: 'Components/Sheets/EligibilityCheckerSheet',
  component: EligibilityCheckerSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/EligibilityCheckerSheet.tsx:168',
    docs: { description: { component: 'PIN code, monthly income and salaried or self-employed. Check Eligibility calls the eligibility API. The result shows inline, or goes to a result sheet when routeResultExternally is set.' } },
  },
  argTypes: {
    defaultPincode: { control: 'text' }, defaultIncome: { control: 'text' },
    defaultIncomeType: { control: 'radio', options: ['salaried', 'self-employed'] },
    threshold: { control: 'number' }, routeResultExternally: { control: 'boolean' },
    onCheck: { action: 'check' }, onClear: { action: 'clear' }, onDismiss: { action: 'dismiss' },
  },
  args: { threshold: 50000 },
  render: (args) => <ComponentHarness api={eligible}><Open>{(ref) => <EligibilityCheckerSheet ref={ref} {...args} />}</Open></ComponentHarness>,
};
export default meta;
type Story = StoryObj<EligibilityCheckerSheetProps>;

const tapRender = (api: ApiParams): Story['render'] => (args) => (
  <ComponentHarness api={api}><OpenThenTap tap="Check Eligibility">{(ref) => <EligibilityCheckerSheet ref={ref} {...args} />}</OpenThenTap></ComponentHarness>
);

export const EmptyForm: Story = {};
export const Prefilled: Story = { args: { defaultPincode: '110001', defaultIncome: '₹75,000', defaultIncomeType: 'salaried' }, parameters: { docs: { description: { story: 'Opened with saved details: the footer shows Clear and Check.' } } } };
export const SelfEmployed: Story = { args: { defaultPincode: '400001', defaultIncome: '₹1,20,000', defaultIncomeType: 'self-employed' } };
export const ValidationError: Story = { render: tapRender(eligible), parameters: { docs: { description: { story: 'The story taps Check Eligibility with an empty form, so the PIN and income errors show.' } } } };
export const Checking: Story = { args: { defaultPincode: '110001', defaultIncome: '₹75,000' }, render: tapRender({ mode: 'loading' }), parameters: { docs: { description: { story: 'The story taps Check Eligibility while the API never answers: the button shows its spinner.' } } } };
export const ApiError: Story = { args: { defaultPincode: '110001', defaultIncome: '₹75,000' }, render: tapRender({ mode: 'error' }), parameters: { docs: { description: { story: 'The API fails. The sheet shows an error banner and no verdict, so nobody is told they qualify when we do not know.' } } } };
export const ResultEligible: Story = { args: { defaultPincode: '110001', defaultIncome: '₹75,000' }, render: tapRender(eligible), parameters: { docs: { description: { story: 'Inline "You are eligible" banner (routeResultExternally off).' } } } };
export const ResultNotEligible: Story = { args: { defaultPincode: '110001', defaultIncome: '₹15,000' }, render: tapRender(notEligible), parameters: { docs: { description: { story: 'API says no, income under 80% of the threshold: inline red banner.' } } } };
