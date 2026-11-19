import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { WhatWentWrongFeedbackSheet, type WhatWentWrongFeedbackSheetProps } from '../../../src/organisms/WhatWentWrongFeedbackSheet';
import { Open, OpenThenTap } from './_present';

const meta: Meta<WhatWentWrongFeedbackSheetProps> = {
  title: 'Components/Sheets/WhatWentWrongFeedbackSheet',
  component: WhatWentWrongFeedbackSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/WhatWentWrongFeedbackSheet.tsx:54',
    docs: { description: { component: 'After "No, I did not shop": the user ticks why. Submit stays disabled until one box is ticked. Reasons reset when the sheet closes.' } },
  },
  argTypes: { onSubmit: { action: 'submit' } },
  render: (args) => <Open>{(ref) => <WhatWentWrongFeedbackSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<WhatWentWrongFeedbackSheetProps>;

export const NothingTicked: Story = { parameters: { docs: { description: { story: 'Submit Feedback is disabled.' } } } };
export const OneTicked: Story = {
  render: (args) => <OpenThenTap tap="No price difference">{(ref) => <WhatWentWrongFeedbackSheet ref={ref} {...args} />}</OpenThenTap>,
  parameters: { docs: { description: { story: 'The story ticks the third reason, so Submit Feedback is enabled.' } } },
};
