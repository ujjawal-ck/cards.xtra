import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BestForBrandsScreen } from '../../../src/screens/tools/BestForBrandsScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4d Best for brands/Limit reached',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

export const FiveBrandsPicked: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/BestForBrandsScreen.tsx:188',
    docs: { description: { story: 'Five brands picked by tapping (Amazon, Flipkart, Myntra, Swiggy, Zomato): the info message "You can pick up to 5 brands. Remove one to pick another." shows and the other tiles are disabled. The picks are not a route param, so five taps run after mount.' } },
  },
  render: () => (
    <>
      <ScreenHarness name="BestForBrands" component={BestForBrandsScreen} api={api.ok()} />
      <TapScript steps={[{ click: 'Amazon' }, { click: 'Flipkart' }, { click: 'Myntra' }, { click: 'Swiggy' }, { click: 'Zomato' }]} />
    </>
  ),
};
