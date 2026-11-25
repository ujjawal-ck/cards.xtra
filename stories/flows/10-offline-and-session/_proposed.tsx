/**
 * Shared frame for PROPOSED states: a 390x844 page with the app Header, built
 * only from DS parts. It never imports from src/screens.
 */
import React from 'react';
import { View } from 'react-native';
import { PhoneFrame } from '../../../storybook/harness';
import { Header } from '../../../src/organisms/Header';
import { ScreenState } from '../../../src/organisms/ScreenState';
import { colors } from '../../../src/tokens';

export function ProposedPage({ title, children, footer, background }: { title: string; children: React.ReactNode; footer?: React.ReactNode; background?: string }) {
  return (
    <PhoneFrame background={background}>
      <View style={{ flex: 1, backgroundColor: background ?? colors.background.default }}>
        <Header leading="back" title={title} />
        <View style={{ flex: 1 }}>{children}</View>
        {footer}
      </View>
    </PhoneFrame>
  );
}

/** The standard offline state from ux-states.md (reuses the tool screens' copy). */
export function OfflineState() {
  return <ScreenState title="You're offline" body="Check your connection and try again." actionLabel="Try again" onAction={() => {}} />;
}
