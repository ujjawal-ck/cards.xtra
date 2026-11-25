import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ToolResultsScreen } from '../../../src/screens/tools/ToolResultsScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { ANSWERS, SPENDS } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4c Ultimate card/Results',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

export const Loaded: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/ToolResultsScreen.tsx:176',
    docs: { description: { story: 'The shared league table after the quiz, title "Your best cards". All states are in Flows/4 Shared result/League table.' } },
  },
  render: () => (
    <ScreenHarness
      name="ToolResults"
      component={ToolResultsScreen}
      params={routeParams('ToolResults', { tool: 'ultimate', spends: SPENDS, answers: ANSWERS, title: 'Your best cards' })}
      api={api.ok()}
    />
  ),
};
