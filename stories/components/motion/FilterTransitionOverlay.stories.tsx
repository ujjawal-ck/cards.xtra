import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FilterTransitionOverlay } from '../../../src/organisms/FilterTransitionOverlay';
import { Text, Button } from '../../../src/atoms';
import { ComponentHarness } from '../../../storybook/harness';
import { Block, Stack } from '../carousels/_chrome';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import { colors, spacing, radius, borderWidth } from '../../../src/tokens';

const FRAME_H = 560;

/** A fake filtered Home list under the overlay, with a button that plays the transition. */
function Inner({ visible: initial = false, autoplay = false }: { visible?: boolean; autoplay?: boolean }) {
  const [visible, setVisible] = useState(initial || autoplay);
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => { if (!autoplay) setVisible(initial); }, [initial, autoplay]);
  const note = (s: string) => setLog((l) => [...l, s]);
  return (
    <View style={{ gap: spacing[12] }}>
      <Button label={visible ? 'Playing (about 2.4 s)' : 'Apply filter'} variant="solid" tone="main" size={44} disabled={visible} onPress={() => { setLog([]); setVisible(true); }} />
      <View style={{ width: 390, height: FRAME_H, overflow: 'hidden', borderRadius: radius.xl, borderWidth: borderWidth.thin, borderColor: colors.border.default, backgroundColor: colors.background.default }}>
        <View style={{ padding: spacing[16], gap: spacing[8] }}>
          <Text variant="heading18SemiBold" color={colors.text.primary}>Cards for Dining</Text>
          {SAMPLE_CARDS.slice(0, 4).map((c) => <Text key={c.id} variant="body14Regular" color={colors.text.secondary}>{c.name}</Text>)}
        </View>
        <FilterTransitionOverlay visible={visible} onCovered={() => note('onCovered: commit the filters now')} onHidden={() => { note('onHidden: overlay gone'); setVisible(false); }} />
      </View>
      <Text variant="body12Regular" color={colors.text.tertiary}>{log.length ? log.join('  ·  ') : 'Callbacks fire here.'}</Text>
    </View>
  );
}

/** HomeSkeleton (drawn behind the animation) calls useIsFocused, so the demo runs inside a navigator.
 *  State stays in Inner: ComponentHarness rebuilds its screen when its own children change. */
function Demo(props: { visible?: boolean; autoplay?: boolean }) {
  return <View style={{ width: 390, height: FRAME_H + 120 }}><ComponentHarness><Inner {...props} /></ComponentHarness></View>;
}

const meta = {
  title: 'Components/Motion/FilterTransitionOverlay',
  component: FilterTransitionOverlay,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/FilterTransitionOverlay.tsx',
    docs: { description: { component: 'A full-screen interstitial played when a Home filter is applied: it fades in over the page, holds about two seconds with an animation, then fades out on the new results.' } },
  },
  argTypes: {
    visible: { control: 'boolean', description: 'Flip to true to run the transition. The overlay calls onHidden when it is done.' },
    onCovered: { control: false, description: 'Fires when the white screen is fully opaque: commit the filters here.' },
    onHidden: { control: false, description: 'Fires after the fade out: set visible back to false.' },
  },
  args: { visible: false },
} satisfies Meta<typeof FilterTransitionOverlay>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  parameters: { docs: { description: { story: 'Press Apply filter, or flip the visible control to true. Web limit: the cat animation is a Rive native module and is replaced by an empty view in Storybook, so the hold shows the HomeSkeleton behind an empty centre. Expo Go shows a spinner placeholder instead; this web build does not.' } } },
  render: (args) => <Demo visible={args.visible} />,
};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Plays once on open. Behind the animation sits HomeSkeleton, so the page reads as reloading underneath. Press the button to play it again.' } } },
  render: () => (
    <Stack width={390}>
      <Block label="Plays on open, then returns to the list"><Demo autoplay /></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: while it plays the overlay blocks every tap for about 2.4 seconds (220 ms in, 2 s hold, 220 ms out). Product decides whether a fast result may shorten the hold. A second press during play is ignored by the button here; in the app a second visible flip while mounted restarts the timers.' } } },
  render: () => (
    <Stack width={390}>
      <Block label="Idle (visible false: renders nothing)"><Demo /></Block>
    </Stack>
  ),
};
