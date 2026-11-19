import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EditSpendsSheet, type EditSpendsSheetHandle } from '../../../src/organisms/EditSpendsSheet';
import { ToolResultsScreen } from '../../../src/screens/tools/ToolResultsScreen';
import { ScreenHarness, SheetHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { ANSWERS, SPENDS, TapScript } from './_shared';

const meta: Meta = {
  title: 'Flows/4 Shared result/Edit spends sheet',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

export const Edit: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/organisms/EditSpendsSheet.tsx:237',
    docs: { description: { story: 'The sheet opened on its own with the typical answers: every question under its category label with a ruler and a typed amount, and the sticky "Update results" button.' } },
  },
  render: () => (
    <SheetHarness<EditSpendsSheetHandle> open={(r) => r.present()}>
      {(ref) => <EditSpendsSheet ref={ref} answers={ANSWERS} onSubmit={(a) => console.log('[storybook] spends updated', a)} />}
    </SheetHarness>
  ),
};

export const Saved: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/ToolResultsScreen.tsx:204',
    docs: { description: { story: 'The whole loop on the league table: tap the "Annual spends" pill, tap "Update results", the sheet closes and the list reloads in place with the same answers. Saving to the device does not persist on web (memory only). The script runs after mount.' } },
  },
  render: () => (
    <>
      <ScreenHarness
        name="ToolResults"
        component={ToolResultsScreen}
        params={routeParams('ToolResults', { tool: 'ultimate', spends: SPENDS, answers: ANSWERS, title: 'Your best cards' })}
        api={api.ok()}
      />
      <TapScript steps={[{ click: 'Annual spends', prefix: true }, { wait: 1200 }, { click: 'Update results' }]} startMs={1800} />
    </>
  ),
};
