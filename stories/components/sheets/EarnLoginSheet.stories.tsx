import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EarnLoginSheet, type EarnLoginSheetProps } from '../../../src/organisms/EarnLoginSheet';
import { Open } from './_present';

const meta: Meta<EarnLoginSheetProps> = {
  title: 'Components/Sheets/EarnLoginSheet',
  component: EarnLoginSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/EarnLoginSheet.tsx:44',
    docs: { description: { component: 'Shown to a guest before a click-out. "Log in to earn cashback", or continue without it. This is not the login form. Log in opens the real login sheet.' } },
  },
  argTypes: { kind: { control: 'radio', options: ['card', 'store'] }, onLogin: { action: 'login' }, onContinue: { action: 'continue' } },
  args: { kind: 'card' },
  render: (args) => <Open>{(ref) => <EarnLoginSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<EarnLoginSheetProps>;

export const Card: Story = { args: { kind: 'card' }, parameters: { docs: { description: { story: 'Opens when a guest taps Apply on a card.' } } } };
export const Store: Story = { args: { kind: 'store' }, parameters: { docs: { description: { story: 'Opens when a guest taps Shop on a store page.' } } } };
