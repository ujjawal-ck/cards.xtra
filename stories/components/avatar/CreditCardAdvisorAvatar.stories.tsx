import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CreditCardAdvisorAvatar } from '../../../src/organisms/CreditCardAdvisorAvatar';
import { ADVISOR_AVATAR_STATES } from '../../../src/lib/advisorAvatar/types';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Avatar/CreditCardAdvisorAvatar',
  component: CreditCardAdvisorAvatar,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/CreditCardAdvisorAvatar.tsx',
    docs: {
      description: {
        component:
          'Swipey, the card advisor mascot: a credit card with a face that shows what the advisor is doing. The screen passes the state; the avatar never decides it.',
      },
    },
  },
  argTypes: {
    state: { control: 'select', options: ADVISOR_AVATAR_STATES },
    size: { control: { type: 'range', min: 48, max: 300, step: 4 }, description: 'Square size in dp. Below 72 compact, below 140 standard, above full detail.' },
    audioLevel: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, description: 'Mouth opening while state is speaking. Absent = the mouth runs its own loop.' },
    accessibilityLabel: { control: 'text' },
    style: { control: false },
  },
  args: { state: 'idle', size: 160 },
} satisfies Meta<typeof CreditCardAdvisorAvatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ alignItems: 'center', gap: spacing[8] }}>
    {children}
    <Text variant="body12Medium" color={colors.text.secondary}>{label}</Text>
  </View>
);

export const Variants: Story = {
  parameters: { docs: { description: { story: 'One avatar per state at size 96. Motion runs through reanimated on web. Under reduce motion each state shows one still pose.' } } },
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[24], maxWidth: 520, justifyContent: 'center' }}>
      {ADVISOR_AVATAR_STATES.map((s) => (
        <Cell key={s} label={s}><CreditCardAdvisorAvatar state={s} size={96} /></Cell>
      ))}
    </View>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sizes from 48 (chat header, compact detail) to 300 (onboarding mascot, full detail with legs), and the speaking state with the mouth driven by audioLevel 0, 0.5 and 1. Open question for product: the avatar has no loading or empty state of its own; thinking is the loading look.',
      },
    },
  },
  render: () => (
    <View style={{ gap: spacing[32], alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[24], alignItems: 'flex-end', justifyContent: 'center' }}>
        {[48, 64, 96, 160, 300].map((size) => (
          <Cell key={size} label={`${size}`}><CreditCardAdvisorAvatar state="listening" size={size} /></Cell>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing[24] }}>
        {[0, 0.5, 1].map((level) => (
          <Cell key={level} label={`speaking, audioLevel ${level}`}><CreditCardAdvisorAvatar state="speaking" size={96} audioLevel={level} /></Cell>
        ))}
      </View>
    </View>
  ),
};
