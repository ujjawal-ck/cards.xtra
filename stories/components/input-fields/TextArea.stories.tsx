import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TextArea, type TextAreaProps } from '../../../src/atoms/TextArea';
import { Group, Stack } from './_kit';

function Live(props: TextAreaProps) {
  const [v, setV] = useState(props.value ?? '');
  return <TextArea {...props} value={v} onChangeText={setV} />;
}

const meta = {
  title: 'Components/Input fields/TextArea',
  component: TextArea,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/TextArea.tsx',
    docs: { description: { component: 'A multi-line text field. Same states and floating label as Input, taller box, top-aligned text.' } },
  },
  argTypes: {
    size: { control: 'select', options: ['md', 'sm'] },
    state: { control: 'select', options: [undefined, 'unfilled', 'selected', 'filled', 'error', 'disabled'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    hintIcon: { control: 'text' },
  },
  args: { label: 'Describe the issue', placeholder: 'Describe the issue', size: 'md', hint: 'Add the store name and order date' },
  render: (args) => <Stack><Live {...args} /></Stack>,
} satisfies Meta<typeof TextArea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Group label="size md (120)"><Live label="Describe the issue" placeholder="Describe the issue" size="md" /></Group>
      <Group label="size sm (80)"><Live label="Describe the issue" placeholder="Describe the issue" size="sm" /></Group>
      <Group label="hint with icon"><Live label="Remarks" placeholder="Remarks" hint="Optional" hintIcon="chat-outline" /></Group>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <Group label="unfilled"><Live label="Remarks" placeholder="Remarks" state="unfilled" /></Group>
      <Group label="selected (focus)"><Live label="Remarks" placeholder="Remarks" state="selected" value="Amazon order not tracked" /></Group>
      <Group label="filled"><Live label="Remarks" placeholder="Remarks" state="filled" value="Amazon order CKORDER0001 placed on 12 Nov, cashback of ₹1,250 not tracked." /></Group>
      <Group label="error"><Live label="Remarks" placeholder="Remarks" state="error" hint="Add at least 20 characters" hintIcon="chat-outline" value="Not tracked" /></Group>
      <Group label="disabled"><Live label="Remarks" placeholder="Remarks" state="disabled" value="Locked after submit" /></Group>
      <Group label="long text (scrolls inside the box)"><Live label="Remarks" placeholder="Remarks" state="filled" size="sm" value="Flipkart order for a phone worth ₹1,29,999 placed through CashKaro. Cashback of X% was shown on the store page but no entry appears in the activity list after 7 days. I paid with an HDFC Millennia card and used a coupon on the cart page." /></Group>
    </Stack>
  ),
};
