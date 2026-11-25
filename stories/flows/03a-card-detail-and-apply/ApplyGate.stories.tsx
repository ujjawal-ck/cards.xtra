import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { HomeScreen } from '../../../src/screens/HomeScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { Script, clickByText } from '../01-launch-and-login/_flow';

/** Click whatever sits at (x, y): used for the sheet backdrop, which has no label. */
function tapAt(x: number, y: number) {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return;
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
  }
}

const Gate = ({ dismiss }: { dismiss?: boolean }) => (
  <>
    <ScreenHarness name="Home" component={HomeScreen} auth="guest" api={api.ok()} />
    <Script steps={[[2800, () => clickByText('Apply Now')], ...(dismiss ? ([[1500, () => tapAt(Math.round(window.innerWidth / 2), 40)]] as [number, () => void][]) : [])]} />
  </>
);

const meta: Meta = {
  title: 'Flows/3a Card detail and apply/Apply gate',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'With no saved eligibility details and the experiment variant "mandatory" (the code default, src/experiments/index.ts), the first Apply on Home opens the eligibility checker before any bank page. Variant "skippable" goes straight to the click-out. Both stories drive the real Home screen: after it loads they tap the first tile\'s "Apply Now".' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Apply tapped: the checker opens (gate "mandatory"). */
export const CheckerOpenedByApply: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:1207', docs: { description: { story: 'Open question 1 (pm-flows section 4): keep "mandatory" or ship "skippable"? Event card_apply carries gate_variant.' } } },
  render: () => <Gate />,
};

/** Checker closed without a result: the Apply is dropped (R2). */
export const DismissedDropsApply: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:1213', docs: { description: { story: 'Risk R2. The story taps the dimmed backdrop above the sheet. The checker closes and the pending Apply is set to null: no bank page, no message. The user is back on Home as if nothing happened. If the backdrop tap does not register in your browser, close the sheet by hand. Open question 3: drop the Apply (today) or continue to the bank without a verdict?' } } },
  render: () => <Gate dismiss />,
};
