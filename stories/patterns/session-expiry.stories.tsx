import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BottomSheetHeader } from '../../src/organisms/BottomSheetHeader';
import { Text } from '../../src/atoms/Text';
import { Button } from '../../src/atoms/Button';
import { colors, spacing, radius, borderWidth } from '../../src/tokens';
import { Board, Labelled, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/Session expiry',
  parameters: { layout: 'padded', docs: { description: { component: 'When the refresh token is rejected the login sheet opens by itself. Today it never says why.' } } },
};
export default meta;
type Story = StoryObj;

function Sheet({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ width: 390, backgroundColor: colors.surface.default, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], borderWidth: borderWidth.thin, borderColor: colors.border.subtle3, overflow: 'hidden' }}>
      <BottomSheetHeader showStroke={false} />
      <View style={{ paddingHorizontal: spacing[16], paddingBottom: spacing[24], gap: spacing[16] }}>
        <View style={{ alignItems: 'center', gap: spacing[4] }}>
          <Text variant="heading24SemiBold" align="center">{title}</Text>
          <Text variant="body14Regular" color={colors.text.secondary} align="center">{body}</Text>
        </View>
        <Button label="Get OTP" variant="solid" tone="second" size={52} fullWidth onPress={noop} />
      </View>
    </View>
  );
}

export const TodaySheet: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/auth/LoginSheetProvider.tsx:427', docs: { description: { story: 'The sheet for every source: the title and body are fixed (`src/auth/LoginSheetProvider.tsx:427`). A user whose session ended sees the same text as a new user. Replica, not the real sheet: the real copy drawn from the sheet parts (the real sheet needs the login provider and its OTP state). The real sheet is in Flows/1 Launch and login/Login sheet.' } } },
  render: () => <Board><Sheet title="Log in or sign up" body="Enter your mobile number. We will text you a 6-digit OTP." /></Board>,
};

export const PerReasonTitleProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 1 (Login sheet, session expired)', docs: { description: { story: 'Proposed: the same sheet with a title and body for `source: session_expired`. DS gap: the sheet has no title or body slot per source. Open question: after login, return the user to the step they were on (R17). Not designed: the cache is cleared on expiry.' } } },
  render: () => (
    <Board>
      <Labelled label="session_expired">
        <Sheet title="Please log in again" body="You were logged out to keep your account safe. Your cashback is safe." />
      </Labelled>
    </Board>
  ),
};
