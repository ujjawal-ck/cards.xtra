import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FeedbackAppreciatedSheet, type FeedbackAppreciatedSheetProps } from '../../../src/organisms/FeedbackAppreciatedSheet';
import { Open } from './_present';

const meta: Meta<FeedbackAppreciatedSheetProps> = {
  title: 'Components/Sheets/FeedbackAppreciatedSheet',
  component: FeedbackAppreciatedSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/FeedbackAppreciatedSheet.tsx:45',
    docs: { description: { component: 'Thank-you after feedback: a green seal with a check and Ok, Got It.' } },
  },
  argTypes: { onDone: { action: 'done' } },
  render: (args) => <Open>{(ref) => <FeedbackAppreciatedSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<FeedbackAppreciatedSheetProps>;

export const Default: Story = {};
