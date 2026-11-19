import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BestForBrandsScreen } from '../../../src/screens/tools/BestForBrandsScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4d Best for brands/Spends',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

export const OneBrand: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/BestForBrandsScreen.tsx:101',
    docs: { description: { story: 'Step 2 for Amazon: the honesty line (only Amazon and Flipkart are exact brands in BankKaro; every other brand is counted in its category), then one monthly spend card. The step is not a route param, so one tap on the footer runs after mount.' } },
  },
  render: () => (
    <>
      <ScreenHarness name="BestForBrands" component={BestForBrandsScreen} params={routeParams('BestForBrands', { brandId: 'amazon' })} api={api.ok()} />
      <TapScript steps={[{ click: 'Enter spends for 1 brand' }]} />
    </>
  ),
};

export const NothingEntered: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/BestForBrandsScreen.tsx:101',
    docs: { description: { story: 'Two brands (Amazon, Myntra), every spend left at 0, "See my cards" tapped: the warning "Add a spend above 0 for at least one brand." shows and the screen stays.' } },
  },
  render: () => (
    <>
      <ScreenHarness name="BestForBrands" component={BestForBrandsScreen} params={routeParams('BestForBrands', { brandId: 'amazon' })} api={api.ok()} />
      <TapScript steps={[{ click: 'Myntra' }, { click: 'Enter spends for 2 brands' }, { click: 'See my cards' }]} />
    </>
  ),
};
