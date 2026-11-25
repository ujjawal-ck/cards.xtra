import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { LogoutConfirmSheet, type LogoutConfirmSheetProps } from '../../../src/organisms/LogoutConfirmSheet';
import { Open } from './_present';

const meta: Meta<LogoutConfirmSheetProps> = {
  title: 'Components/Sheets/LogoutConfirmSheet',
  component: LogoutConfirmSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/LogoutConfirmSheet.tsx:42',
    docs: { description: { component: 'Asks "Log out?" with Yes and No. Yes dismisses the sheet, then runs onConfirm. The profile screen opens it.' } },
  },
  argTypes: { onConfirm: { action: 'confirmed' } },
  render: (args) => <Open>{(ref) => <LogoutConfirmSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<LogoutConfirmSheetProps>;

export const Playground: Story = {};
