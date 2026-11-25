import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { HowItWorksSheet, OrnamentLabel, type HowItWorksSheetProps } from '../../../src/organisms/HowItWorksSheet';
import { CARDS } from './_data';
import { Open } from './_present';
import { colors, spacing } from '../../../src/tokens';

const meta: Meta<HowItWorksSheetProps> = {
  title: 'Components/Sheets/HowItWorksSheet',
  component: HowItWorksSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/HowItWorksSheet.tsx:185',
    docs: { description: { component: 'The "Learn how it works?" sheet of a card: card art on the top edge, a heading with the reward and the tracking steps. It is an RN Modal with its own animation, not a gorhom sheet. It has no back handler beyond the Modal close.' } },
  },
  argTypes: { rewardValue: { control: 'text' }, title: { control: 'text' }, ctaLabel: { control: 'text' }, onConfirm: { action: 'confirm' }, onDismiss: { action: 'dismiss' } },
  args: { cardImage: CARDS[0].cardImage, rewardValue: '₹2,500' },
  render: (args) => <Open>{(ref) => <HowItWorksSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<HowItWorksSheetProps>;

export const Default: Story = {};
export const CustomSteps: Story = { args: { title: 'Apply through Cards.xtra and earn ₹1,200', rewardValue: '₹1,200', cardImage: CARDS[1].cardImage, steps: [{ icon: 'wallet-outline', title: 'Apply for the card from the app', caption: 'Takes about 5 minutes' }, { icon: 'wallet-outline', title: 'The bank approves your application', caption: 'Generally 2 to 7 days' }, { icon: 'wallet-outline', title: 'Rewards are credited to your account', caption: 'Within 90 days of activation' }] } };
export const Ornament: Story = {
  render: () => <View style={{ width: 390, padding: spacing[16], backgroundColor: colors.surface.default }}><OrnamentLabel label="How it works" /></View>,
  parameters: { layout: 'centered', docs: { description: { story: 'OrnamentLabel: the gradient rule with a diamond and a small caps label, used in the sheet heading.' } } },
};
