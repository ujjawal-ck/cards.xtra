import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ToolResultsScreen } from '../../../src/screens/tools/ToolResultsScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { ANSWERS, LARGE_ALIAS_200, SPENDS, TapScript, calcLarge } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4b Beat my card/Full ranking',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

export const Loaded: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/ToolResultsScreen.tsx:176',
    docs: { description: { story: 'The shared league table opened from the result with `highlightAlias` set to the user\'s card (HDFC Regalia Gold): the row is marked, "Find my card" is the first chip, and the breakdown sheet hides Apply for that card.' } },
  },
  render: () => (
    <ScreenHarness
      name="ToolResults"
      component={ToolResultsScreen}
      params={routeParams('ToolResults', { tool: 'beat', spends: SPENDS, answers: ANSWERS, title: 'All cards', highlightAlias: 'hdfc-regalia-gold' })}
      api={api.ok()}
    />
  ),
};

export const FindMyCardFar: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/ToolResultsScreen.tsx:291',
    docs: { description: { story: 'The calculate answer has 220 rows (9 fixture rows cloned) and the user\'s card is far down the list (about row 200). "Find my card" is tapped after mount: the list scrolls to the row, retrying until the windowed list has measured it (`onScrollToIndexFailed`). The user\'s card is a clone of a fixture card, not in the app list.' } },
  },
  render: () => (
    <>
      <ScreenHarness
        name="ToolResults"
        component={ToolResultsScreen}
        params={routeParams('ToolResults', { tool: 'beat', spends: SPENDS, answers: ANSWERS, title: 'All cards', highlightAlias: LARGE_ALIAS_200 })}
        api={api.ok({ calculate: calcLarge(220) })}
      />
      <TapScript steps={[{ click: 'Find my card' }]} startMs={2500} />
    </>
  ),
};
