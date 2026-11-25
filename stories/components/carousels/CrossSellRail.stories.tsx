import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CrossSellRail } from '../../../src/organisms/CrossSellRail';
import { Block, Stack, Phone } from './_chrome';
import { spacing } from '../../../src/tokens';
import {
  sourceCard, cardsById, resultUnknown, resultIneligible, resultEligible, resultProfile, resultOnePick,
} from './_crossSellFixture';
import type { CrossSellResult } from '../../../src/lib/crossSell';

const noop = () => {};

function Rail({ result, viewedIds = [], lensKey, withViewAll = true }: { result: CrossSellResult; viewedIds?: string[]; lensKey?: string; withViewAll?: boolean }) {
  const [lens, setLens] = useState(lensKey ?? 'top');
  return (
    <View style={{ paddingHorizontal: spacing[16] }}>
      <CrossSellRail
        sourceCard={sourceCard}
        result={result}
        lensKey={lens}
        cardsById={cardsById}
        viewedIds={viewedIds}
        onCardPress={noop}
        onLensChange={setLens}
        onCheckEligibility={noop}
        onHide={noop}
        onViewAll={withViewAll ? noop : undefined}
      />
    </View>
  );
}

const meta = {
  title: 'Components/Carousels/CrossSellRail',
  component: CrossSellRail,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Phone><Story /></Phone>],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/CrossSellRail.tsx',
    docs: { description: { component: 'The "Not sure about X?" rail that opens under a Home tile after a card is closed without applying: lens chips, up to three compare cards, and a View all tile.' } },
  },
  argTypes: {
    sourceCard: { control: false }, result: { control: false }, cardsById: { control: false }, viewedIds: { control: 'object' },
    lensKey: { control: 'select', options: ['top', 'similar', 'lowerFee', 'easier'], description: 'Lens keys the engine produced for this fixture.' },
    onCardPress: { control: false }, onLensChange: { control: false }, onCheckEligibility: { control: false }, onHide: { control: false }, onViewAll: { control: false },
  },
  args: {
    sourceCard, result: resultUnknown, lensKey: 'top', cardsById, viewedIds: [],
    onCardPress: noop, onLensChange: noop, onCheckEligibility: noop, onHide: noop, onViewAll: noop,
  },
} satisfies Meta<typeof CrossSellRail>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Controls show the rail; the lens chips here only change the selected chip when the lens prop changes. */
export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'The result comes from the real engine (src/lib/crossSell.ts) over seven sample cards. Fees and rewards are invented. Chips switch lenses.' } } },
  render: () => (
    <Stack>
      <Block label="Eligibility unknown (dashed chip, Top picks)"><Rail result={resultUnknown} /></Block>
      <Block label="Eligible: lens chips without the dashed chip"><Rail result={resultEligible} /></Block>
      <Block label="Source card ineligible: headline changes, Cards you can get instead"><Rail result={resultIneligible} /></Block>
      <Block label="Built from viewed cards (sub-line names the count)"><Rail result={resultProfile} viewedIds={['axis-flipkart', 'sbi-simplyclick']} /></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: the engine hides the rail with fewer than two picks, so a one-pick rail only exists here. A pick whose card is missing from cardsById is dropped without a placeholder.' } } },
  render: () => (
    <Stack>
      <Block label="Lens: Lower fee, selected"><Rail result={resultUnknown} lensKey="lowerFee" /></Block>
      <Block label="Viewed picks (dimmed, Viewed mark)"><Rail result={resultUnknown} viewedIds={['icici-coral', 'federal-scapia']} /></Block>
      <Block label="1 pick (not reachable in the app)"><Rail result={resultOnePick} /></Block>
      <Block label="No View all tile"><Rail result={resultUnknown} withViewAll={false} /></Block>
    </Stack>
  ),
};
