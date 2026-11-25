import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Input, type InputProps } from '../../../src/atoms/Input';
import { Group, Stack } from './_kit';

/** Input with its own value state, so it responds to typing. */
function Live(props: InputProps) {
  const [v, setV] = useState(props.value ?? '');
  return <Input {...props} value={v} onChangeText={setV} />;
}

const meta = {
  title: 'Components/Input fields/Input',
  component: Input,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Input.tsx',
    docs: { description: { component: 'A single-line text field with a floating label, optional icons, a text prefix and a hint line.' } },
  },
  argTypes: {
    size: { control: 'select', options: ['md', 'sm'] },
    state: { control: 'select', options: [undefined, 'unfilled', 'selected', 'filled', 'error', 'disabled'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    leadingText: { control: 'text' },
    leadingIcon: { control: 'text' },
    trailingIcon: { control: 'text' },
    hintIcon: { control: 'text' },
  },
  args: { label: 'Full name', placeholder: 'As on your PAN card', size: 'md', hint: 'Use the name on your card statement' },
  render: (args) => <Stack width={358}><Live {...args} /></Stack>,
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Group label="size md (56)"><Live label="Annual income" placeholder="Annual income" size="md" /></Group>
      <Group label="size sm (48)"><Live label="Annual income" placeholder="Annual income" size="sm" /></Group>
      <Group label="leadingText (rupee prefix)"><Live label="Monthly spend" placeholder="Monthly spend" leadingText="₹" keyboardType="number-pad" value="1,00,000" /></Group>
      <Group label="leadingIcon"><Live label="Search card" placeholder="Search card" leadingIcon="search-outline" /></Group>
      <Group label="trailingIcon with press"><Live label="Pincode" placeholder="Pincode" trailingIcon="close" onTrailingPress={() => {}} value="560001" /></Group>
      <Group label="hint with icon"><Live label="Mobile number" placeholder="Mobile number" hint="We send an OTP to this number" hintIcon="check-circle-outline" /></Group>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Without an explicit `state` the field derives it: focus gives selected, a value gives filled. The forced states below are for review. Web has no on-screen keyboard, so no layout shift shows here.' } } },
  render: () => (
    <Stack>
      <Group label="unfilled"><Live label="Email" placeholder="Email" state="unfilled" /></Group>
      <Group label="selected (focus)"><Live label="Email" placeholder="Email" state="selected" value="user@example.com" /></Group>
      <Group label="filled"><Live label="Email" placeholder="Email" state="filled" value="user@example.com" /></Group>
      <Group label="error"><Live label="Email" placeholder="Email" state="error" value="user@example" hint="Enter a valid email" hintIcon="check-circle-outline" /></Group>
      <Group label="disabled"><Live label="Email" placeholder="Email" state="disabled" value="user@example.com" /></Group>
      <Group label="long text"><Live label="Card name" placeholder="Card name" state="filled" value="HDFC Bank Millennia Credit Card with Amazon Pay and Flipkart reward points" /></Group>
      <Group label="large rupee amount"><Live label="Annual income" placeholder="Annual income" leadingText="₹" state="filled" value="1,00,00,000" /></Group>
    </Stack>
  ),
};
