import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ReviewCard } from '../../../src/molecules/ReviewCard';
import { Frame, Label } from './_shared';

const review = {
  stars: 5,
  title: 'Cashback came in on time',
  body: 'I booked a flight through the app and the cashback showed as pending in a day. It was confirmed in the next week.',
  author: 'Test User, Mar 02, 2023',
};

const meta = {
  title: 'Components/Cards/ReviewCard',
  component: ReviewCard,
  tags: ['autodocs', 'hidden'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/ReviewCard.tsx',
    docs: {
      description: {
        component:
          'HIDDEN (decision D14: Review Us is hidden because its reviews were made up and Write Review had no endpoint). One review: star rating, title, body and attribution. The text here is invented for the story.',
      },
    },
  },
  argTypes: {
    review: { control: 'object' },
    style: { control: false },
  },
  args: { review },
} satisfies Meta<typeof ReviewCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      {[5, 4, 3, 1, 0].map((n) => (
        <React.Fragment key={n}>
          <Label>{`stars=${n}`}</Label>
          <ReviewCard review={{ ...review, stars: n }} />
        </React.Fragment>
      ))}
    </>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question for product (D14): reviews need a real source before this card can return. Long text wraps with no cut.' } } },
  render: () => (
    <>
      <Label>long title and body</Label>
      <ReviewCard
        review={{
          stars: 4,
          title: 'Good rewards, but the withdrawal took a few days longer than I expected for the first time I used it',
          body: 'The rewards on my card were credited after the bank approved it. The first withdrawal of ₹10,00,000 across several months was slow, but support answered every question I raised and the second one was quick.',
          author: 'Test User, Mar 02, 2023',
        }}
      />
      <Label>short body</Label>
      <ReviewCard review={{ stars: 5, title: 'Great', body: 'Easy to use.', author: 'Test User, Mar 02, 2023' }} />
      <Label>list of reviews</Label>
      {[1, 2, 3].map((i) => <ReviewCard key={i} review={{ ...review, stars: 5 - i }} />)}
    </>
  ),
};
