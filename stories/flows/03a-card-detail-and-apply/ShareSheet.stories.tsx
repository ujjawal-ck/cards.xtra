import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ShareSheet, type ShareSheetRef } from '../../../src/organisms/ShareSheet';
import { SheetHarness } from '../../../storybook/harness';
import { REGALIA } from './_data';

const meta: Meta = {
  title: 'Flows/3a Card detail and apply/Share sheet',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false }, description: { component: 'The share glyph on the card detail masthead opens it: a preview of the card and a row of share tiles. Every tile opens the OS share sheet; in Storybook a share logs a "click-out share" line and nothing opens. It is an RN Modal, so on web it can sit outside the 390 px frame.' } } },
};
export default meta;
type Story = StoryObj;

/** Preview and tiles. */
export const Tiles: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/ShareSheet.tsx:397' },
  render: () => (
    <SheetHarness<ShareSheetRef>>
      {(ref) => <ShareSheet ref={ref} cardImage={REGALIA.cardImage} cardName={REGALIA.name} cardSubtitle="Rewards on every spend" cashbackValue={`${REGALIA.cashbackValue} Rewards`} onShare={() => {}} />}
    </SheetHarness>
  ),
};
