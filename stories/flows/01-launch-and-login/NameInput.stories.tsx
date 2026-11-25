import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { NameInputScreen } from '../../../src/screens/NameInputScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { Script, clickByText, typeInto, type Step } from './_flow';

const SRC = 'src/screens/NameInputScreen.tsx';

const Name = ({ steps }: { steps?: Step[] }) => (
  <>
    <ScreenHarness name="NameInput" component={NameInputScreen} auth="signedIn" api={api.ok()} />
    {steps ? <Script steps={steps} /> : null}
  </>
);

/** The form fades in about 1.1 s after mount; type after that. */
const typeName: Step = [2000, () => typeInto(0, 'Test User')];

const meta: Meta = {
  title: 'Flows/1 Launch and login/Name input',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'Hidden screen: "Almost there! What should we call you?". The heading types in character by character, then a name field and "Let\'s Go!" rise in. Submitting stores the name and goes to Greeting. It is registered in the navigator (src/navigation/RootNavigator.tsx:131) but no screen navigates to it: since decision D16 the login sheet asks for the name on its OTP step ("New number, name"), so a new signup never reaches this screen. Tag: hidden. The screen has no validation error (the button is disabled until one character is typed; the field stops at 30 characters) and no saving state (the name is stored in memory and the app navigates at once), so only the empty, typed and submitted states exist.' } },
  },
};
export default meta;
type Story = StoryObj;

/** Empty: heading and field, button disabled. */
export const Empty: Story = {
  tags: ['hidden'],
  parameters: { source: `${SRC}:196`, docs: { description: { story: 'Hidden screen (D16: the name moved into the login sheet; no route links here). Wait about 2 seconds for the heading to finish typing and the form to appear. "Let\'s Go!" is disabled with no name.' } } },
  render: () => <Name />,
};

/** A name typed: the field border turns accent and the button enables. */
export const Typed: Story = {
  tags: ['hidden'],
  parameters: { source: `${SRC}:182`, docs: { description: { story: 'Hidden screen. The story types "Test User" into the field after the form appears. One character is enough to enable the button; there is no other check.' } } },
  render: () => <Name steps={[typeName]} />,
};

/** Submitted: the name is stored and the app goes to Greeting. */
export const Submitted: Story = {
  tags: ['hidden'],
  parameters: { source: `${SRC}:169`, docs: { description: { story: 'Hidden screen. The story types "Test User" and taps "Let\'s Go!". The screen saves the name, fires sign_up_name_set and navigates to Greeting with the name (harness stub page "→ Greeting").' } } },
  render: () => <Name steps={[typeName, [600, () => clickByText("Let's Go!")]]} />,
};
