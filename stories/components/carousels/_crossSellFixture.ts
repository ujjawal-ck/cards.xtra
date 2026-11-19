/**
 * Fixture for the CrossSellRail stories. The result comes from the real engine
 * (src/lib/crossSell.ts) run over a small catalogue, so the lenses, deltas and
 * band text are the ones the app would show. Fees and rewards are invented samples.
 */
import { images } from '../../../src/assets/images';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import type { CardModel } from '../../../src/molecules';
import { getCrossSellV2 } from '../../../src/lib/crossSell';
import type { CrossSellCard, CrossSellResult } from '../../../src/lib/crossSell';

const base = SAMPLE_CARDS[0];
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

interface Spec {
  id: string; name: string; bank: string; image: CardModel['cardImage'];
  tags: string[]; fee: number; reward: number; earn: number; income: number;
  rewardType: 'cashback' | 'rewards'; invite?: boolean;
}

const specs: Spec[] = [
  { id: 'hdfc-regalia-gold', name: 'HDFC Bank Regalia Gold Credit Card', bank: 'HDFC Bank', image: images.cards.hdfcRegaliaGold, tags: ['Travel', 'Airport Lounge', 'Shopping', 'Dining'], fee: 2500, reward: 2500, earn: 4000, income: 12, rewardType: 'rewards' },
  { id: 'icici-coral', name: 'ICICI Bank Coral Credit Card', bank: 'ICICI Bank', image: images.cards.iciciCoral, tags: ['Travel', 'Airport Lounge', 'Dining'], fee: 500, reward: 1000, earn: 1800, income: 6, rewardType: 'rewards' },
  { id: 'sbi-simplyclick', name: 'SBI SimplyCLICK Credit Card', bank: 'SBI Card', image: images.cards.sbiSimplyclick, tags: ['Shopping', 'Dining', 'Online Food Ordering'], fee: 499, reward: 800, earn: 1200, income: 4, rewardType: 'cashback' },
  { id: 'axis-flipkart', name: 'Axis Bank Flipkart Credit Card', bank: 'Axis Bank', image: images.cards.axisFlipkart, tags: ['Shopping', 'Dining', 'Travel'], fee: 500, reward: 1500, earn: 2000, income: 4, rewardType: 'cashback' },
  { id: 'hsbc-travel-one', name: 'HSBC TravelOne Credit Card', bank: 'HSBC', image: images.cards.hsbcTravelOne, tags: ['Travel', 'Airport Lounge', 'Shopping'], fee: 4999, reward: 3200, earn: 4500, income: 18, rewardType: 'rewards' },
  { id: 'federal-scapia', name: 'Federal Bank Scapia Credit Card', bank: 'Federal Bank', image: images.cards.federalScapia, tags: ['Travel', 'Airport Lounge', 'Shopping'], fee: 0, reward: 600, earn: 900, income: 3, rewardType: 'rewards' },
  { id: 'tata-neu', name: 'Tata Neu Plus Credit Card', bank: 'Tata Neu', image: images.cards.tataNuePlus, tags: ['Shopping', 'Dining', 'Travel'], fee: 499, reward: 1800, earn: 2400, income: 4, rewardType: 'cashback' },
];

const toEngine = (s: Spec): CrossSellCard => ({
  id: s.id, alias: s.id, name: s.name, bank: s.bank, rewardType: s.rewardType, tags: s.tags,
  joiningFee: s.fee, annualFee: s.fee, inviteOnly: !!s.invite, reward: s.reward, earn: s.earn,
  incomeLpa: s.income, crif: 0, priority: 10,
});

export const catalogue: CrossSellCard[] = specs.map(toEngine);

const toModel = (s: Spec, c: CrossSellCard): CardModel => ({
  ...base,
  id: s.id, name: s.name, shortName: s.bank, cardImage: s.image,
  cashback: `Upto ${inr(s.reward)} Cashback`, cashbackValue: inr(s.reward), rewardPrefix: 'Upto',
  feeType: s.fee === 0 ? 'lifetime-free' : 'with-fees',
  tags: s.tags.slice(0, 3),
  joiningFee: s.fee === 0 ? 'Free' : inr(s.fee), annualFee: s.fee === 0 ? 'Free' : inr(s.fee),
  crossSell: c,
});

export const cards: CardModel[] = specs.map((s, i) => toModel(s, catalogue[i]));
export const cardsById = new Map(cards.map((c) => [c.id, c]));
export const sourceCard = cards[0];

/** Eligibility not known: the dashed "Check what I can get" chip shows. */
export const resultUnknown: CrossSellResult = getCrossSellV2(catalogue[0], catalogue, {});
/** The user can get every card except the source: the source is ineligible. */
export const resultIneligible: CrossSellResult = getCrossSellV2(
  catalogue[0], catalogue, { eligible: new Set(catalogue.slice(1).map((c) => c.alias)) },
);
/** The user can get all cards. */
export const resultEligible: CrossSellResult = getCrossSellV2(
  catalogue[0], catalogue, { eligible: new Set(catalogue.map((c) => c.alias)) },
);
/** Two cards viewed: the sub-line says "Picked from the 3 cards you viewed". */
export const resultProfile: CrossSellResult = getCrossSellV2(
  catalogue[0], catalogue, { viewed: ['axis-flipkart', 'sbi-simplyclick'] },
);
/** An engine result with only the top lens, one pick (used for the "1 item" state). */
export const resultOnePick: CrossSellResult = {
  ...resultUnknown,
  lenses: [{ ...resultUnknown.lenses[0], picks: resultUnknown.lenses[0].picks.slice(0, 1) }],
};
