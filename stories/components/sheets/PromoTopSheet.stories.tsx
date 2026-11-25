import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PromoTopSheet, type PromoTopSheetProps } from '../../../src/organisms/PromoTopSheet';
import { images } from '../../../src/assets/images';
import { Frame } from './_present';

const meta: Meta<PromoTopSheetProps> = {
  title: 'Components/Sheets/PromoTopSheet',
  component: PromoTopSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/PromoTopSheet.tsx:100',
    docs: { description: { component: 'A full-bleed promo banner that slides down from the top over a dim backdrop. Close with the glass X, a tap on the backdrop or a swipe down. Offers shows it once per session, and only when stores exist. An RN Modal, so on web it covers the whole preview.' } },
  },
  argTypes: { aspectRatio: { control: 'number' }, onClose: { action: 'close' } },
  args: { visible: true, source: images.promos.shopAsUsual },
  render: (args) => <Frame><PromoTopSheet {...args} /></Frame>,
};
export default meta;
type Story = StoryObj<PromoTopSheetProps>;

export const ShopAsUsual: Story = {};
export const WiderBanner: Story = { args: { aspectRatio: 1 } };
