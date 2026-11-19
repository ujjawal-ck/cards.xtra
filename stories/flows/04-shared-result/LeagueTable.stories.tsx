import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ToolResultsScreen } from '../../../src/screens/tools/ToolResultsScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, calculateFixture, reply } from '../../../storybook/fixtures';
import { ANSWERS, SPENDS, TapScript, calcAllPaid } from './_shared';

const meta: Meta = {
  title: 'Flows/4 Shared result/League table',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/tools/ToolResultsScreen.tsx';
const params = routeParams('ToolResults', { tool: 'ultimate', spends: SPENDS, answers: ANSWERS, title: 'Your best cards' });
const table = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="ToolResults" component={ToolResultsScreen} params={params} api={a} />;

export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:522`, docs: { description: { story: 'The calculate call never answers: four skeleton rows and the line "Checking every card against your spends. This can take up to a minute."' } } },
  render: () => table(api.loading()),
};

export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:176`, docs: { description: { story: 'Nine rows from the UAT calculate fixture in rank order. Controls on top: annual spends pill, "Search", "Lifetime free", "Include invite only", Quick view and By category tabs, sort chips. Rank 1 (CRED IndusInd) is a card the app does not list.' } } },
  render: () => table(api.ok()),
};

export const ByCategory: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:176`, docs: { description: { story: 'The "By category" tab, reached by one tap after mount: one savings column per spend the user entered.' } } },
  render: () => (
    <>
      {table(api.ok())}
      <TapScript steps={[{ click: 'By category' }]} />
    </>
  ),
};

export const Offline: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:536`, docs: { description: { story: '"You\'re offline" with "Try again". The query is paused, not failed. This is the only league state that handles the paused case; most other screens show a false empty state (see the offline finding in the UX audit).' } } },
  render: () => table(api.offline()),
};

export const Error: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:545`, docs: { description: { story: '"Couldn\'t load your cards" with "Try again". The calculate call answers 500; the state shows after the call\'s one retry.' } } },
  render: () => table(api.ok({ calculate: reply.error(500) })),
};

export const Empty: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:554`, docs: { description: { story: 'The calculate call answers with no rows: "No cards came back for these spends" with "Try again".' } } },
  render: () => table(api.ok({ calculate: calculateFixture.empty })),
};

export const NoFilterMatch: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:563`, docs: { description: { story: 'The calculate answer is cut to cards that have a joining fee, then "Lifetime free" is tapped after mount: "No card matches these filters" with "Clear filters".' } } },
  render: () => (
    <>
      {table(api.ok({ calculate: calcAllPaid() }))}
      <TapScript steps={[{ click: 'Lifetime free' }]} />
    </>
  ),
};

/** R7: a row for a card the app cannot sell. */
export const RowNotInApp: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:176`,
    docs: {
      description: {
        story:
          'Risk R7 (decision D27, directional). The first row (CRED IndusInd) is not in the app list, so it has no card page. The row is tapped after mount and the breakdown sheet says "You cannot apply for this card in this app." with no Apply. Open question: keep rows the app cannot sell?',
      },
    },
  },
  render: () => (
    <>
      {table(api.ok())}
      <TapScript steps={[{ click: 'CRED IndusInd', prefix: true }]} startMs={1800} />
    </>
  ),
};
