import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EditSpendsSheet, type EditSpendsSheetProps } from '../../../src/organisms/EditSpendsSheet';
import { Open } from './_present';

const answers = { amazon_spends: 10000, flipkart_spends: 5000, other_online_spends: 3000, grocery_spends_online: 4000 };

const meta: Meta<EditSpendsSheetProps> = {
  title: 'Components/Sheets/EditSpendsSheet',
  component: EditSpendsSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/EditSpendsSheet.tsx:104',
    docs: { description: { component: 'Edit the monthly spends behind a tool result: a list of spend rulers with typed entry, and a confirm button. The sheet closes itself and returns all answers. 90% snap, pans only on clear vertical moves so the rulers keep horizontal drags.' } },
  },
  argTypes: { onSubmit: { action: 'submit' } },
  args: { answers },
  render: (args) => <Open>{(ref) => <EditSpendsSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<EditSpendsSheetProps>;

export const AllQuestions: Story = {};
export const SomeQuestions: Story = { args: { keys: ['amazon_spends', 'flipkart_spends', 'other_online_spends'] }, parameters: { docs: { description: { story: 'Best card for a category: only that category questions are listed.' } } } };
export const NoAnswersYet: Story = { args: { answers: {} } };
