import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SpendQuizScreen } from '../../../src/screens/tools/SpendQuizScreen';
import { BeatMyCardPickScreen } from '../../../src/screens/tools/BeatMyCardPickScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { ANSWERS, SPENDS } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4b Beat my card/Spends',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

export const QuizFirstQuestion: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/SpendQuizScreen.tsx:43',
    docs: { description: { story: 'No saved spends: Home sends the user to the 21-question quiz with `next: "beat"`. Question 1, with "Skip to results" and a close button. On the last question the button reads "Pick your card".' } },
  },
  render: () => (
    <ScreenHarness name="SpendQuiz" component={SpendQuizScreen} params={routeParams('SpendQuiz', { next: 'beat' })} api={api.ok()} />
  ),
};

export const FromSavedSpends: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/BeatMyCardPickScreen.tsx:89',
    docs: { description: { story: 'Saved spends on the device: Home skips the quiz and opens the pick screen with the saved spends as route params. The pill "Annual spends" shows the sum and opens the edit sheet. Saved spends cannot be seeded on web (memory only), so the route params stand in for them.' } },
  },
  render: () => (
    <ScreenHarness
      name="BeatMyCardPick"
      component={BeatMyCardPickScreen}
      params={routeParams('BeatMyCardPick', { spends: SPENDS, answers: ANSWERS })}
      api={api.ok()}
    />
  ),
};
