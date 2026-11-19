import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text } from '../../src/atoms/Text';
import { Button } from '../../src/atoms/Button';
import { Skeleton } from '../../src/atoms/Skeleton';
import { motion, colors, spacing, radius } from '../../src/tokens';
import { Page, Group, Caption, Label } from './_shared';

const meta: Meta = {
  title: 'Foundations/Animations',
  tags: ['live'],
  parameters: { layout: 'padded', source: 'src/tokens/motion.ts', docs: { description: { component: 'Motion tokens: four durations and one easing.' } } },
};
export default meta;
type Story = StoryObj;

const TRACK = 280;
const DOT = 24;

function Lane({ name, ms, on }: { name: string; ms: number; on: boolean }) {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withTiming(on ? TRACK - DOT : 0, { duration: ms, easing: motion.easing.standard });
  }, [on, ms, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={{ gap: spacing[4] }}>
      <Label>motion.duration.{name} · {ms} ms</Label>
      <View style={{ width: TRACK, height: DOT, borderRadius: radius.full, backgroundColor: colors.background.lavender }}>
        <Animated.View style={[{ width: DOT, height: DOT, borderRadius: radius.full, backgroundColor: colors.action.primary.default }, style]} />
      </View>
    </View>
  );
}

function Demo() {
  const [on, setOn] = useState(false);
  return (
    <Page>
      <Button label={on ? 'Play back' : 'Play'} variant="outline" tone="second" size={36} onPress={() => setOn((v) => !v)} />
      <View style={{ gap: spacing[16] }}>
        {Object.entries(motion.duration).filter(([k]) => k !== 'pulse').map(([k, ms]) => <Lane key={k} name={k} ms={ms} on={on} />)}
      </View>
    </Page>
  );
}

export const Durations: Story = {
  parameters: { source: 'src/tokens/motion.ts:11', docs: { description: { story: 'Press Play. Each dot moves the same distance with `motion.easing.standard`, in the token duration. fast, base and slow are the three UI speeds.' } } },
  render: () => <Demo />,
};

export const Pulse: Story = {
  parameters: { source: 'src/tokens/motion.ts:20', docs: { description: { story: '`motion.duration.pulse` (650 ms) is one half-cycle of the loading pulse. The real Skeleton atom loops opacity between opacity[16] and opacity[40] with it.' } } },
  render: () => (
    <Page>
      <Group title={`Skeleton · pulse ${motion.duration.pulse} ms per half-cycle`}>
        <View style={{ gap: spacing[8], width: 280 }}>
          <Skeleton height={16} width="60%" />
          <Skeleton height={48} radius="lg" />
          <Skeleton height={16} width="80%" />
        </View>
      </Group>
    </Page>
  ),
};

export const Table: Story = {
  parameters: { source: 'src/tokens/motion.ts', docs: { description: { story: 'Every motion token.' } } },
  render: () => (
    <Page>
      <View style={{ gap: spacing[8] }}>
        {Object.entries(motion.duration).map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', gap: spacing[16] }}>
            <View style={{ width: 220 }}><Text variant="body14SemiBold">motion.duration.{k}</Text></View>
            <Caption>{v} ms</Caption>
          </View>
        ))}
        {Object.keys(motion.easing).map((k) => (
          <View key={k} style={{ flexDirection: 'row', gap: spacing[16] }}>
            <View style={{ width: 220 }}><Text variant="body14SemiBold">motion.easing.{k}</Text></View>
            <Caption>Easing.inOut(Easing.quad) (a reanimated function)</Caption>
          </View>
        ))}
      </View>
    </Page>
  ),
};
