import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TermsAndConditions, type TermsAndConditionsProps } from '../../../src/molecules/TermsAndConditions';
import { Group, Stack } from './_kit';

const LABEL = 'I agree to the Terms and Conditions and the Privacy Policy of CashKaro';
const LINKS = ['Terms and Conditions', 'Privacy Policy'];

function Live(props: TermsAndConditionsProps) {
  const [v, setV] = useState<boolean | 'none'>(props.checked);
  return <TermsAndConditions {...props} checked={v} onChange={(n) => setV(n)} onPressLink={() => {}} />;
}

const meta = {
  title: 'Components/Selections/TermsAndConditions',
  component: TermsAndConditions,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/TermsAndConditions.tsx',
    docs: { description: { component: 'A consent row: an optional checkbox and small text with blue links, plus an error line. Used above a primary action.' } },
  },
  argTypes: {
    checked: { control: 'select', options: [false, true, 'none'] },
    placement: { control: 'select', options: ['default', 'sticky'] },
    body: { control: 'select', options: ['multi-line', '1-line'] },
    state: { control: 'select', options: ['default', 'error'] },
    label: { control: 'text' },
    description: { control: 'text' },
    errorText: { control: 'text' },
  },
  args: { checked: false, label: LABEL, linkLabels: LINKS, placement: 'default', body: 'multi-line', state: 'default' },
  render: (args) => <Stack><Live {...args} /></Stack>,
} satisfies Meta<typeof TermsAndConditions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Group label="default placement, checkbox"><Live checked={false} label={LABEL} linkLabels={LINKS} /></Group>
      <Group label="sticky placement (top border, shadow)"><Live checked placement="sticky" label={LABEL} linkLabels={LINKS} /></Group>
      <Group label="checked none (text only, passive copy)"><Live checked="none" label="By continuing you agree to the Terms and Conditions" linkLabels={['Terms and Conditions']} /></Group>
      <Group label="with description"><Live checked={false} label={LABEL} linkLabels={LINKS} description="Your cashback is paid after the store confirms the order." /></Group>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The error line is shown only when `state` is error; the parent decides when. The 1-line body cuts long copy with an ellipsis.' } } },
  render: () => (
    <Stack>
      <Group label="error, default message"><Live checked={false} state="error" label={LABEL} linkLabels={LINKS} /></Group>
      <Group label="error, custom message"><Live checked={false} state="error" errorText="Accept the terms to apply for HDFC Millennia" label={LABEL} linkLabels={LINKS} /></Group>
      <Group label="1-line body (truncates)"><Live checked={false} body="1-line" label="I agree to the Terms and Conditions, the Privacy Policy and to share my details with the bank for the SBI Cashback card" linkLabels={LINKS} /></Group>
      <Group label="multi-line long copy"><Live checked={false} label="I agree to the Terms and Conditions, the Privacy Policy and to share my details with the bank for the SBI Cashback card application" linkLabels={LINKS} /></Group>
    </Stack>
  ),
};
