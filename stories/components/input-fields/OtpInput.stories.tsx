import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OtpInput, type OtpInputProps } from '../../../src/atoms/OtpInput';
import { Group, Stack } from './_kit';

function Live(props: Omit<OtpInputProps, 'value' | 'onChangeText'> & { value?: string }) {
  const [v, setV] = useState(props.value ?? '');
  return <OtpInput {...props} value={v} onChangeText={setV} />;
}

const meta = {
  title: 'Components/Input fields/OtpInput',
  component: OtpInput,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/OtpInput.tsx',
    docs: { description: { component: 'A row of 6 (or 4) digit slots over one hidden text field, with a hint line and a resend timer. Login and withdraw use 6 digits (D19).' } },
  },
  argTypes: {
    length: { control: 'select', options: [4, 6] },
    state: { control: 'select', options: [undefined, 'default', 'focused', 'error'] },
    resend: { control: 'select', options: ['hidden', 'timer', 'ready'] },
    seconds: { control: 'number' },
    hint: { control: 'text' },
    hintIcon: { control: 'text' },
    autoFocus: { control: 'boolean' },
    value: { control: 'text' },
  },
  args: { length: 6, value: '', onChangeText: () => {}, resend: 'timer', seconds: 24, hint: 'Sent to 98XXXXXX10' },
  render: ({ value, onChangeText, ...args }) => <Stack><Live {...args} value={value} /></Stack>,
} satisfies Meta<typeof OtpInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Group label="length 6 (login, withdraw)"><Live length={6} value="482" /></Group>
      <Group label="length 4 (Figma, not shipped)"><Live length={4} value="48" /></Group>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Resend row: hidden, timer (fixed at 24 s here, it does not count down in this story) and ready. Type to fill the slots; the box with the blue border is the next slot to fill.' } } },
  render: () => (
    <Stack>
      <Group label="default, empty"><Live state="default" /></Group>
      <Group label="focused, half filled"><Live state="focused" value="482" /></Group>
      <Group label="full"><Live value="482913" hint="Code entered" /></Group>
      <Group label="error"><Live state="error" value="000000" hint="Wrong code. Try again." hintIcon="check-circle-outline" /></Group>
      <Group label="resend: timer"><Live resend="timer" seconds={24} value="48" /></Group>
      <Group label="resend: ready"><Live resend="ready" onResend={() => {}} value="" /></Group>
      <Group label="resend: hidden"><Live resend="hidden" value="" /></Group>
    </Stack>
  ),
};
