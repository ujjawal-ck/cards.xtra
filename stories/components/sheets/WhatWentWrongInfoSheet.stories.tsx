import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { WhatWentWrongInfoSheet, type WhatWentWrongInfoSheetProps } from '../../../src/organisms/WhatWentWrongInfoSheet';
import { Open } from './_present';

const meta: Meta<WhatWentWrongInfoSheetProps> = {
  title: 'Components/Sheets/WhatWentWrongInfoSheet',
  component: WhatWentWrongInfoSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/WhatWentWrongInfoSheet.tsx:41',
    docs: { description: { component: 'Information on the "Oops" missing-cashback screen: what can go wrong with tracking and where to write. The support email comes from config.' } },
  },
  argTypes: { supportEmail: { control: 'text' } },
  render: (args) => <Open>{(ref) => <WhatWentWrongInfoSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<WhatWentWrongInfoSheetProps>;

export const Default: Story = {};
export const CustomEmail: Story = { args: { supportEmail: 'support@example.com' } };
