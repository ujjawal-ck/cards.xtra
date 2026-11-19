import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { LoginSheet, type LoginSheetProps } from '../../../src/organisms/LoginSheet';
import { Open } from './_present';

const meta: Meta<LoginSheetProps> = {
  title: 'Components/Sheets/LoginSheet',
  component: LoginSheet,
  tags: ['autodocs', 'hidden'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/LoginSheet.tsx:96',
    docs: { description: { component: 'Phone number step with the logo on the scrim. Not used by the app: the real login is the UI inside LoginSheetProvider (see Flows, Login). Kept here as the standalone sheet.' } },
  },
  argTypes: { defaultPhone: { control: 'text' }, onSubmit: { action: 'submit' } },
  render: (args) => <Open>{(ref) => <LoginSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<LoginSheetProps>;

export const Empty: Story = {};
export const Prefilled: Story = { args: { defaultPhone: '98XXXXXX10' } };
