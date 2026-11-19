/** Fixture data shared by the sheet stories. No personal data. */
import { SAMPLE_CARDS } from '../../../src/data/cards';
import type { CardModel } from '../../../src/molecules';
import type { CrossSellCard } from '../../../src/lib/crossSell';
import type { RejectionPick } from '../../../src/lib/rejection';
import { buildLeague, mapCalculateResponse, rankByNetValue } from '../../../src/lib/cardTools';
import calc from '../../../src/api/__fixtures__/uat.calculate_league_trimmed.json';
import waiver from '../../../src/api/__fixtures__/uat.calculate_waiver_lounge_trimmed.json';

export const CARDS = SAMPLE_CARDS;

/** Carousel items for MaybeSheet, from the sample cards. */
export const CAROUSEL_CARDS = SAMPLE_CARDS.slice(0, 4).map((c) => ({
  id: c.id,
  cardImage: c.cardImage,
  cardName: c.name,
  cashbackText: c.cashbackValue ?? '',
  tags: c.tags,
  benefits: c.tileBenefits?.slice(0, 3),
}));

const num = (s?: string) => Number((s ?? '0').replace(/[^\d]/g, '')) || 0;
const xs = (c: CardModel, bank: string, o: Partial<CrossSellCard> = {}): CrossSellCard => ({
  id: c.id, alias: c.id, name: c.name, bank, tags: c.tags ?? [], joiningFee: num(c.joiningFee), annualFee: num(c.annualFee),
  inviteOnly: false, reward: num(c.cashbackValue), earn: 0, incomeLpa: 6, crif: 0, priority: 1, ...o,
});

/** The card the user was turned down for (income too low), with its cross-sell model. */
export const REJECTED_CARD: CardModel = { ...SAMPLE_CARDS[0], crossSell: xs(SAMPLE_CARDS[0], 'HDFC Bank', { incomeLpa: 12, annualFee: 2500, joiningFee: 2500 }) };
const [, swiggy, sbi, coral] = SAMPLE_CARDS;
const withCross = [swiggy, sbi, coral].map((c, i) => ({ ...c, crossSell: xs(c, ['HDFC Bank', 'SBI Card', 'ICICI Bank'][i], { incomeLpa: 4 + i }) }));
export const REJECTION_CARDS_BY_ID = new Map(withCross.map((c) => [c.id, c]));
const slots = ['closest', 'topRewards', 'lifetimeFree'] as const;
const tags = ['Also from HDFC Bank', '₹800 more Rewards', 'Lifetime free'];
const tones = ['gray', 'brand', 'success'] as const;
export const REJECTION_PICKS: RejectionPick[] = withCross.map((c, i) => ({ card: c.crossSell!, slot: slots[i], tag: tags[i], tone: tones[i] }));

/** League rows built from the trimmed calculate response, joined to the sample cards. */
export const LEAGUE_ROWS = buildLeague(rankByNetValue(mapCalculateResponse(calc)), SAMPLE_CARDS);

/** League row for a card the app lists (has Apply and a card page). */
export const ROW_IN_APP = { ...LEAGUE_ROWS[0], card: SAMPLE_CARDS[1] };
/** League row for a card the app does not list (no Apply, no card page). */
export const ROW_NOT_IN_APP = (() => { const { card: _c, ...r } = LEAGUE_ROWS[0]; return r; })();
/** League rows from the lounge and fee-waiver response. */
export const ROW_LOUNGE_WAIVER = buildLeague(rankByNetValue(mapCalculateResponse(waiver)), SAMPLE_CARDS)[0];
