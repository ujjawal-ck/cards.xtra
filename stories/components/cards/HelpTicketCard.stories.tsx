import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { HelpTicketCard } from '../../../src/molecules/HelpTicketCard';
import { images } from '../../../src/assets/images';
import { Frame, Label } from './_shared';

const base = {
  status: 'in-review' as const,
  brandLogo: images.stores.myntra31,
  title: 'Myntra order, cashback not tracked',
  orderId: 'CKORDER0001',
  orderAmount: '2,499',
  timer: '23:59',
  ctaLabel: 'Add Details',
  onCtaPress: () => {},
};

const meta = {
  title: 'Components/Cards/HelpTicketCard',
  component: HelpTicketCard,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/HelpTicketCard.tsx',
    docs: { description: { component: 'The state of one missing cashback request: logo, title, order info, and a countdown, a date, a reason or a link, by status. Five statuses.' } },
  },
  argTypes: {
    status: { control: 'select', options: ['in-review', 'need-details', 'tracked', 'under-review', 'not-tracked'] },
    title: { control: 'text' },
    orderId: { control: 'text' },
    orderAmount: { control: 'text' },
    ticketId: { control: 'text' },
    timer: { control: 'text' },
    timerLabel: { control: 'text' },
    expectByDate: { control: 'text' },
    ctaLabel: { control: 'select', options: ['Add Details', 'Upload Screenshot', 'View Details'] },
    reason: { control: 'text' },
    brandLogo: { control: false },
    timerTarget: { control: false },
    onCtaPress: { control: false },
    style: { control: false },
  },
  args: base,
} satisfies Meta<typeof HelpTicketCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'All five statuses. in-review uses the fixed `timer` string here, not a live `timerTarget`, so the story does not tick. Bug seen: the source header names three statuses, the type has five.' } } },
  render: () => (
    <>
      <Label>in-review: countdown "hh:mm"</Label>
      <HelpTicketCard {...base} />
      <Label>need-details: alert fill, NEED DETAILS tag, link CTA</Label>
      <HelpTicketCard {...base} status="need-details" />
      <Label>tracked: link CTA "View Details"</Label>
      <HelpTicketCard {...base} status="tracked" ctaLabel="View Details" />
      <Label>under-review: ticket id, fixed date, no CTA</Label>
      <HelpTicketCard {...base} status="under-review" ticketId="HT-00001" expectByDate="9th Jun '26" />
      <Label>not-tracked: reason, no CTA</Label>
      <HelpTicketCard {...base} status="not-tracked" reason="The store did not confirm this order." />
    </>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The title is cut to 2 lines. The amount gets the ₹ symbol from the part, so pass digits only. Without `timer` the countdown reads 00:00.' } } },
  render: () => (
    <>
      <Label>long title</Label>
      <HelpTicketCard {...base} title="Myntra order for a pair of shoes and a jacket in the end of season sale, cashback was not tracked in the app" />
      <Label>amount ₹0</Label>
      <HelpTicketCard {...base} orderAmount="0" status="tracked" ctaLabel="View Details" />
      <Label>amount ₹10,00,000</Label>
      <HelpTicketCard {...base} orderAmount={(1000000).toLocaleString('en-IN')} status="need-details" />
      <Label>in-review without a timer (00:00)</Label>
      <HelpTicketCard {...base} timer={undefined} />
      <Label>not-tracked, long reason</Label>
      <HelpTicketCard {...base} status="not-tracked" reason="The store reported this order as cancelled and returned on the same day, so no commission was paid to CashKaro and no cashback can be added." />
    </>
  ),
};
