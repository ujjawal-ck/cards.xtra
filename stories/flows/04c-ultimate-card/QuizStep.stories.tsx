import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SpendQuizScreen } from '../../../src/screens/tools/SpendQuizScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4c Ultimate card/Quiz step',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/tools/SpendQuizScreen.tsx';
const ultimate = routeParams('SpendQuiz', { next: 'ultimate' });

export const FirstQuestion: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:156`,
    docs: { description: { story: 'Question 1 of 21: step progress with the category label, the question with its hint, the ruler and typed amount, "Skip to results" and "Next".' } },
  },
  render: () => <ScreenHarness name="SpendQuiz" component={SpendQuizScreen} params={ultimate} api={api.ok()} />,
};

export const MiddleQuestion: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:156`,
    docs: { description: { story: 'Question 8 of 21. The question index is not a route param, so "Next" is tapped 7 times after mount (about 3 s).' } },
  },
  render: () => (
    <>
      <ScreenHarness name="SpendQuiz" component={SpendQuizScreen} params={ultimate} api={api.ok()} />
      <TapScript steps={[{ click: 'Next', times: 7 }]} gapMs={300} />
    </>
  ),
};

export const LastQuestion: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:212`,
    docs: { description: { story: 'Question 21 of 21: the button reads "See my cards". Reached with 20 taps on "Next" after mount (about 8 s).' } },
  },
  render: () => (
    <>
      <ScreenHarness name="SpendQuiz" component={SpendQuizScreen} params={ultimate} api={api.ok()} />
      <TapScript steps={[{ click: 'Next', times: 20 }]} gapMs={300} />
    </>
  ),
};

export const TypedAmountCapped: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/molecules/SpendCard.tsx:186',
    docs: { description: { story: 'After mount, 99999999 is typed into the "Amazon amount" field of question 1, then the field loses focus. The entry is clamped to the question\'s maximum: the field shows ₹10,00,000 (a month at most) and the "+" button is disabled. While the field has focus it keeps the digits as typed.' } },
  },
  render: () => (
    <>
      <ScreenHarness name="SpendQuiz" component={SpendQuizScreen} params={ultimate} api={api.ok()} />
      <TapScript steps={[{ type: '99999999', into: 'Amazon amount', blur: true }]} startMs={1500} />
    </>
  ),
};
