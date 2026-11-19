import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CrossSellRail } from '../../../src/organisms/CrossSellRail';
import { CardTile } from '../../../src/organisms/CardTile';
import { PhoneFrame } from '../../../storybook/harness';
import { colors, spacing } from '../../../src/tokens';
import type { CrossSellResult } from '../../../src/lib/crossSell';
import { sourceCard, cardsById, resultUnknown, resultEligible, resultProfile, resultOnePick } from './_fixture';

const noop = () => {};

/** The tapped tile, with its rail under it as Home draws it (src/screens/HomeScreen.tsx:1255). */
function Tile({ showRail = true, result = resultUnknown, lensKey = 'top', viewedIds = [] }: { showRail?: boolean; result?: CrossSellResult; lensKey?: string; viewedIds?: string[] }) {
  const [lens, setLens] = useState(lensKey);
  const c = sourceCard;
  return (
    <PhoneFrame>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background.default }} contentContainerStyle={{ padding: spacing[16], gap: spacing[12] }}>
        <CardTile type="full" cardImage={c.cardImage} cardName={c.name} cashbackText={c.cashbackValue} rewardPrefix={c.rewardPrefix} inviteOnly={c.inviteOnly} tags={c.tags}
          benefits={c.tileBenefits.slice(0, 3)} feeType={c.feeType} feeProps={{ joiningFee: c.joiningFee, annualFee: c.annualFee }} onApply={noop} />
        {showRail ? (
          <CrossSellRail sourceCard={c} result={result} lensKey={lens} cardsById={cardsById} viewedIds={viewedIds}
            onCardPress={noop} onLensChange={setLens} onCheckEligibility={noop} onHide={noop} onViewAll={noop} />
        ) : null}
        <View style={{ height: spacing[24] }} />
      </ScrollView>
    </PhoneFrame>
  );
}

const meta: Meta = {
  title: 'Flows/3c Bounce/Cross-sell rail',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'After the user closes a card detail opened from a Home tile without applying, a rail opens under that tile: lens chips (Top picks and others), up to three compare cards, "Check what I can get" when eligibility is unknown, Hide and "View all cards". It is gated by the experiment flag crosssell_rail (default "rail"; the holdout arm logs nothing). The stories render the real rail with a result from the app\'s own engine (src/lib/crossSell.ts) over invented sample fees, under the real CardTile. They do not run the close-to-rail interaction on Home.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Lenses: Top picks, eligibility unknown (dashed "Check what I can get" chip). */
export const Lenses: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CrossSellRail.tsx:158', docs: { description: { story: 'Events crosssell_impression, crosssell_lens, crosssell_tap, crosssell_collapse, crosssell_view_all. "Check what I can get" has no event.' } } },
  render: () => <Tile />,
};

/** A different lens selected. */
export const OtherLens: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CrossSellRail.tsx:158' },
  render: () => <Tile result={resultEligible} lensKey={resultEligible.lenses[1]?.key ?? 'top'} />,
};

/** A pick already viewed: dimmed, "Viewed ·". */
export const ViewedPick: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CrossSellRail.tsx:158', docs: { description: { story: 'The sub-line says the picks come from the cards the user viewed.' } } },
  render: () => <Tile result={resultProfile} viewedIds={[resultProfile.lenses[0].picks[0]?.card.id ?? '']} />,
};

/** One pick only. */
export const OnePick: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/CrossSellRail.tsx:158' },
  render: () => <Tile result={resultOnePick} />,
};

/** Hidden: fewer than 2 picks, or the holdout arm. Nothing opens under the tile. */
export const HiddenNoRail: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/useCrossSellRail.ts:176', docs: { description: { story: 'The rail is not rendered when the engine has fewer than 2 picks, when the card was already applied to, or when the user is in the holdout arm (PRD section 8). The user sees the tile alone, as here. Open question 6: ship the default "rail" or "holdout"? Not covered: the rail can open below the visible area so it looks like nothing happened.' } } },
  render: () => <Tile showRail={false} />,
};
