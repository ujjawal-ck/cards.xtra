import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SelectMonthSheet, type SelectMonthSheetProps } from '../../../src/organisms/SelectMonthSheet';
import { Open } from './_present';

const meta: Meta<SelectMonthSheetProps> = {
  title: 'Components/Sheets/SelectMonthSheet',
  component: SelectMonthSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/SelectMonthSheet.tsx:64',
    docs: { description: { component: 'A BottomSheet with the month-picker body. Pass value and onChange to make it controlled; leave both out and it keeps its own choice (first month).' } },
  },
  argTypes: { value: { control: 'number' }, onChange: { action: 'change' } },
  render: (args) => <Open>{(ref) => <SelectMonthSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<SelectMonthSheetProps>;

export const Default: Story = { parameters: { docs: { description: { story: 'Default options are fixed months from 2025 and 2026 in code.' } } } };
export const SecondSelected: Story = { args: { options: ['November 2026', 'October 2026', 'September 2026', 'August 2026'], value: 1 } };
export const ManyMonths: Story = { args: { options: ['November 2026', 'October 2026', 'September 2026', 'August 2026', 'July 2026', 'June 2026', 'May 2026', 'April 2026', 'March 2026'], value: 0 } };
