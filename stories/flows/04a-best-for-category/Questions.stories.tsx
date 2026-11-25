import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BestForCategoryScreen } from '../../../src/screens/tools/BestForCategoryScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4a Best for category/Questions',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/tools/BestForCategoryScreen.tsx';
const fuel = routeParams('BestForCategory', { categoryId: 'fuel' });

export const FirstCategory: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:129`,
    docs: { description: { story: 'Step 1 of 1 for Fuel: the questions of that category, each with a ruler and a typed amount. The step number is not a route param, so one tap on "Enter spends" runs after mount.' } },
  },
  render: () => (
    <>
      <ScreenHarness name="BestForCategory" component={BestForCategoryScreen} params={fuel} api={api.ok()} />
      <TapScript steps={[{ click: 'Enter spends' }]} />
    </>
  ),
};

export const SecondCategoryOfTwo: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:129`,
    docs: { description: { story: 'Two categories picked (Fuel, Shopping). Taps move to step 2 of 2, where the button reads "Find my best card".' } },
  },
  render: () => (
    <>
      <ScreenHarness name="BestForCategory" component={BestForCategoryScreen} params={fuel} api={api.ok()} />
      <TapScript steps={[{ click: 'Shopping' }, { click: 'Enter spends' }, { click: 'Next category' }]} />
    </>
  ),
};

export const NothingEntered: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:195`,
    docs: { description: { story: 'Every answer left at 0 and "Find my best card" tapped: the warning "Add at least one spend above 0 to see your cards." shows and nothing navigates.' } },
  },
  render: () => (
    <>
      <ScreenHarness name="BestForCategory" component={BestForCategoryScreen} params={fuel} api={api.ok()} />
      <TapScript steps={[{ click: 'Enter spends' }, { click: 'Find my best card' }]} />
    </>
  ),
};
