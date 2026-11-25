import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SpendQuizScreen } from '../../../src/screens/tools/SpendQuizScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4c Ultimate card/Skip',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

export const SkipWithNothingEntered: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/SpendQuizScreen.tsx:212',
    docs: {
      description: {
        story:
          '"Skip to results" tapped while every answer is 0: the warning "Add at least one spend above 0 to see your cards." shows and the quiz stays. With at least one spend above 0 the button replaces the screen with the league table (shown in Results). A typed spend is not scripted here.',
      },
    },
  },
  render: () => (
    <>
      <ScreenHarness name="SpendQuiz" component={SpendQuizScreen} params={routeParams('SpendQuiz', { next: 'ultimate' })} api={api.ok()} />
      <TapScript steps={[{ click: 'Skip to results' }]} />
    </>
  ),
};
