import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BestForCategoryScreen } from '../../../src/screens/tools/BestForCategoryScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4a Best for category/Category pick',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/tools/BestForCategoryScreen.tsx';

export const NothingSelected: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:206`,
    docs: { description: { story: 'Ten category tiles, text only (no category illustrations exist). The footer button is hidden until one tile is picked.' } },
  },
  render: () => <ScreenHarness name="BestForCategory" component={BestForCategoryScreen} api={api.ok()} />,
};

export const Preselected: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:51`,
    docs: { description: { story: 'Opened from the Home tile with `categoryId: "fuel"`: Fuel starts picked and the footer shows "Enter spends".' } },
  },
  render: () => (
    <ScreenHarness name="BestForCategory" component={BestForCategoryScreen} params={routeParams('BestForCategory', { categoryId: 'fuel' })} api={api.ok()} />
  ),
};

export const ThreePicked: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:206`,
    docs: { description: { story: 'Three tiles picked by tapping (Shopping, Ordering Food, Fuel). The screen takes no route param for more than one tile, so a short tap script runs after mount.' } },
  },
  render: () => (
    <>
      <ScreenHarness name="BestForCategory" component={BestForCategoryScreen} api={api.ok()} />
      <TapScript steps={[{ click: 'Shopping' }, { click: 'Ordering Food' }, { click: 'Fuel' }]} />
    </>
  ),
};
