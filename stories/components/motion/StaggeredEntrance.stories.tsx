import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StaggeredEntrance } from '../../../src/organisms/StaggeredEntrance';
import { Text, Button } from '../../../src/atoms';
import { ComponentHarness } from '../../../storybook/harness';
import { Block, Stack, inr } from '../carousels/_chrome';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import { colors, spacing, radius, borderWidth } from '../../../src/tokens';

type Args = React.ComponentProps<typeof StaggeredEntrance>;

const Row = ({ title, amount }: { title: string; amount: number }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: spacing[16], borderRadius: radius.lg, borderWidth: borderWidth.thin, borderColor: colors.border.default, backgroundColor: colors.surface.default }}>
    <Text variant="body14Medium" color={colors.text.primary}>{title}</Text>
    <Text variant="body14SemiBold" color={colors.text.primary}>{inr(amount)}</Text>
  </View>
);

const sections = (n: number) =>
  Array.from({ length: n }, (_, i) => <Row key={i} title={SAMPLE_CARDS[i % SAMPLE_CARDS.length].name} amount={[0, 2500, 1200, 1000000, 999][i % 5]} />);

/** The component reads useIsFocused, so it needs a navigator: ComponentHarness provides one. */
function Demo(props: Omit<Args, 'children'> & { count?: number }) {
  const { count = 5, ...rest } = props;
  // A key bump remounts the cascade so "Replay" works where focus events do not fire.
  const [run, setRun] = useState(0);
  return (
    <View style={{ width: 360, gap: spacing[12] }}>
      <Button label="Replay" variant="outline" tone="main" size={44} onPress={() => setRun((r) => r + 1)} />
      <View style={{ height: 420 }}>
        <ComponentHarness key={run}>
          <StaggeredEntrance {...rest} style={[{ gap: spacing[8], padding: spacing[8] }, rest.style]}>{sections(count)}</StaggeredEntrance>
        </ComponentHarness>
      </View>
    </View>
  );
}

const meta = {
  title: 'Components/Motion/StaggeredEntrance',
  component: StaggeredEntrance,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/StaggeredEntrance.tsx',
    docs: { description: { component: 'Wraps a screen’s blocks so each one fades and rises a beat after the previous; replays when the tab regains focus.' } },
  },
  argTypes: {
    step: { control: { type: 'number', min: 0, max: 300 }, description: 'ms between the start of one item and the next. Default 65.' },
    rise: { control: { type: 'number', min: 0, max: 48 }, description: 'px each item travels up. Default 16.' },
    duration: { control: { type: 'number', min: 100, max: 1200 }, description: 'ms for each item. Default 380.' },
    fade: { control: 'boolean', description: 'Turn off for stack screens, where a fade would show the page below.' },
    fill: { control: 'boolean', description: 'flex 1 for a single full-screen child.' },
    replayOnFocus: { control: 'boolean' },
    enabled: { control: 'boolean', description: 'false renders the children with no animation.' },
    children: { control: false },
    style: { control: false },
  },
  args: { step: 65, rise: 16, duration: 380, fade: true, fill: false, replayOnFocus: true, enabled: true, children: null },
} satisfies Meta<typeof StaggeredEntrance>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  parameters: { docs: { description: { story: 'Component limit on web: the cascade runs on iOS only (Platform.OS is "ios"). In a browser Platform.OS is "web", so the blocks appear at once with no motion; the layout, gap and fill still apply. To see the motion, run the app on an iOS simulator.' } } },
  render: (args) => <Demo {...args} />,
};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'The three uses in the app. Tab screens (Earnings, Offers, Profile) cascade their sections. Stack screens wrap the whole screen as one child with fade off and fill on, so it rises after the native slide.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="Tab screen: five sections, default timing"><Demo count={5} /></Block>
      <Block label="Stack screen: fade off, fill on, one child"><Demo count={1} fade={false} fill rise={14} duration={340} /></Block>
      <Block label="Slow and tall: step 150, rise 32"><Demo count={4} step={150} rise={32} /></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'More than eight children: the delay stops growing after the eighth, so a long column does not wait seconds. The enabled=false row never animates on any platform.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="enabled false (no animation)"><Demo count={3} enabled={false} /></Block>
      <Block label="Many children (12): delay capped at 8 steps"><Demo count={12} /></Block>
    </Stack>
  ),
};
