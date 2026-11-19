import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ToolResultsScreen } from '../../../src/screens/tools/ToolResultsScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, spends } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/4d Best for brands/Results',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

export const Loaded: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/ToolResultsScreen.tsx:176',
    docs: { description: { story: 'League table for Amazon ₹8,000, Flipkart ₹4,000 and Myntra ₹3,000 a month. Brand runs are not saved to the device. The subtitle is one honest line about how brands were counted; the text here is written for the story, the app builds its own from `brandsSubtitle`.' } },
  },
  render: () => (
    <ScreenHarness
      name="ToolResults"
      component={ToolResultsScreen}
      params={routeParams('ToolResults', {
        tool: 'brands',
        spends: spends({ amazon_spends: 8000, flipkart_spends: 4000, other_online_spends: 3000 }),
        answers: { amazon_spends: 8000, flipkart_spends: 4000, other_online_spends: 3000 },
        brandIds: ['amazon', 'flipkart', 'myntra'],
        title: 'Best cards for your brands',
        subtitle: 'Myntra is counted as online shopping.',
      })}
      api={api.ok()}
    />
  ),
};
