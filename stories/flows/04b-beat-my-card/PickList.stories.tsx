import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BeatMyCardPickScreen } from '../../../src/screens/tools/BeatMyCardPickScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { ANSWERS, SPENDS } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4b Beat my card/Pick list',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const params = routeParams('BeatMyCardPick', { spends: SPENDS, answers: ANSWERS, fromQuiz: true });

export const Loaded: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/BeatMyCardPickScreen.tsx:89',
    docs: { description: { story: 'Every card the calculate call returned, A to Z (not rank order, so the winner is not shown before the result). Search and bank chips on top.' } },
  },
  render: () => <ScreenHarness name="BeatMyCardPick" component={BeatMyCardPickScreen} params={params} api={api.ok()} />,
};
