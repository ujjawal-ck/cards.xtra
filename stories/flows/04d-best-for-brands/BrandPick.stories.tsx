import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BestForBrandsScreen } from '../../../src/screens/tools/BestForBrandsScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/4d Best for brands/Brand pick',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/tools/BestForBrandsScreen.tsx';

export const NothingPicked: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:176`,
    docs: { description: { story: 'Search box, category tabs (All, Shopping, Ordering Food, Groceries, Paying Bills) and 13 text-only brand tiles (no brand logos exist). No footer until a brand is picked.' } },
  },
  render: () => <ScreenHarness name="BestForBrands" component={BestForBrandsScreen} api={api.ok()} />,
};

export const Preselected: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:50`,
    docs: { description: { story: 'Opened from the Home tile showing "Amazon" (`brandId: "amazon"`): the brand starts picked, the tray shows "Picked 1 of 5", and the footer reads "Enter spends for 1 brand".' } },
  },
  render: () => (
    <ScreenHarness name="BestForBrands" component={BestForBrandsScreen} params={routeParams('BestForBrands', { brandId: 'amazon' })} api={api.ok()} />
  ),
};
