import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ScreenState } from '../../../src/organisms/ScreenState';
import { Block, Stack } from '../carousels/_chrome';
import { images } from '../../../src/assets/images';
import { colors, radius, borderWidth, spacing } from '../../../src/tokens';

const frame = { width: 360, borderRadius: radius.xl, borderWidth: borderWidth.thin, borderColor: colors.border.default, backgroundColor: colors.surface.default } as const;
const noop = () => {};

const meta = {
  title: 'Components/Empty and error/ScreenState',
  component: ScreenState,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/ScreenState.tsx',
    docs: { description: { component: 'The one empty, error and no-results block for every screen: optional picture, title, one line of body, and an optional action.' } },
  },
  argTypes: {
    image: { control: false, description: 'Optional 156 by 156 illustration from images.screenstate.' },
    title: { control: 'text' },
    body: { control: 'text' },
    actionLabel: { control: 'text', description: 'The button shows only when onAction is also set.' },
    onAction: { control: false },
    style: { control: false },
  },
  args: { title: 'Couldn’t load your orders', body: 'Something went wrong. Please try again.', actionLabel: 'Try again', onAction: noop },
} satisfies Meta<typeof ScreenState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  decorators: [(Story) => <View style={frame}><Story /></View>],
};

export const Variants: Story = {
  render: () => (
    <Stack width={360}>
      <Block label="Error with retry (Orders list)"><View style={frame}><ScreenState title={'Couldn’t load your orders'} body="Something went wrong. Please try again." actionLabel="Try again" onAction={noop} /></View></Block>
      <Block label="Empty with a picture (No orders yet)"><View style={frame}><ScreenState image={images.screenstate.appOrders} title="No orders yet" body="Shop via Cards.xtra and your orders will show up here." /></View></Block>
      <Block label="No results with an action (filters)"><View style={frame}><ScreenState title="No matching results" body="Try adjusting your filters." actionLabel="Clear filters" onAction={noop} /></View></Block>
      <Block label="Empty with a way forward (Offers)"><View style={frame}><ScreenState title="No offers here yet" body="New stores are added often. Pull down to refresh, or find a card that earns you cashback." actionLabel="Explore cards" onAction={noop} /></View></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: there is no offline state yet. A paused query shows the empty layout (risk R6), so Orders says "No orders yet" while the phone is offline. Product decides the copy and the action.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="Title only (Earnings, Pending filter)"><View style={frame}><ScreenState title="No pending earnings" /></View></Block>
      <Block label="Retrying: the action label changes, the app keeps the button"><View style={frame}><ScreenState title={'Couldn’t load your transactions'} body="Something went wrong. Please try again." actionLabel={'Retrying…'} onAction={noop} /></View></Block>
      <Block label="Action label without onAction (button hidden)"><View style={frame}><ScreenState title="You're all caught up" body="Offers and updates about your cashback will show up here." actionLabel="Not shown" /></View></Block>
      <Block label="Long title and body"><View style={frame}><ScreenState image={images.screenstate.tracking} title="We could not find any cashback that is still being tracked for this store" body="Orders can take up to 48 hours to appear after you shop. Come back later or raise a missing cashback request if it has been longer than that." actionLabel="Raise a request" onAction={noop} /></View></Block>
      <Block label="Illustrations: tracking, confirmation">
        <View style={{ flexDirection: 'row', gap: spacing[8], ...frame }}>
          <ScreenState style={{ flex: 1 }} image={images.screenstate.tracking} title="Tracking" />
          <ScreenState style={{ flex: 1 }} image={images.screenstate.confirmation} title="Confirmed" />
        </View>
      </Block>
    </Stack>
  ),
};
