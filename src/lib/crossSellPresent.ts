/**
 * crossSellPresent — pure text + icon logic for one pick on the cross-sell rail
 * (band text, band icon, the two comparison stats). Kept out of the component
 * so jest can test it. All amounts are GST-inclusive, like the Home tile.
 * Mirrors bandText / statsFor / iconFor in the approved prototype.
 */
import type { IconName } from '../atoms';
import { inr, isLtf } from './crossSell';
import type { CrossSellCard, CrossSellPick } from './crossSell';

export interface PickStat {
  label: string;
  /** Display string for the pick, e.g. "₹590", "Free", "Upto ₹1,600". */
  value: string;
  /** Against the tapped card: "₹2,360 less", "₹600 more" or "Same". */
  delta: string;
  direction: 'up' | 'down' | 'same';
  sentiment: 'good' | 'neutral';
}

export interface PickPresentation {
  /** Caption of the band. With `bandAmount` it follows the amount ("less a year"). */
  bandText: string;
  /** Big figure of the band, e.g. "₹1,180". */
  bandAmount?: string;
  icon: IconName;
  stats: [PickStat, PickStat];
}

/** "Axis Bank ACE Credit Card" → "Axis Bank ACE". Same as cleanName in the prototype. */
export function shortCardName(name: string): string {
  return name.replace(/\s+Credit Card$/i, '').replace(/\s+Card$/i, '');
}

/** The pick's own reward display, as on its tile. */
export interface PickRewardDisplay {
  cashbackValue: string;
  rewardPrefix?: 'Flat' | 'Upto';
  /** The card's reward label (CardModel.cashback). With no amount it is the server's
   *  CashKaro text or "Rewards"; shown then, with no Flat / Upto prefix. */
  cashback?: string;
}

/** The reward word when a card has no CashKaro amount and no server text. */
const NO_REWARD_TEXT = 'Rewards';

const TAG_ICONS: Record<string, IconName> = {
  Fuel: 'feat-fuel-outline',
  Travel: 'feat-travel-outline',
  Dining: 'feat-dining-outline',
  'Online Food Ordering': 'feat-dining-outline',
  'Airport Lounge': 'feat-lounge-outline',
  Shopping: 'feat-discount-outline',
};

/** Band caption (and amount, for the lenses that have one). */
export function bandParts(src: CrossSellCard, p: CrossSellPick): { text: string; amount?: string } {
  const c = p.card;
  switch (p.lens) {
    case 'lowerFee':
      if (isLtf(c)) return { text: 'Lifetime free' };
      if (src.annualFee - c.annualFee >= SAME_RUPEE_THRESHOLD) return { amount: inr(src.annualFee - c.annualFee), text: 'less a year' };
      if (src.joiningFee - c.joiningFee >= SAME_RUPEE_THRESHOLD) return { amount: inr(src.joiningFee - c.joiningFee), text: 'lower joining fee' };
      return { text: 'Similar fee' };
    case 'moreRewards':
      return { amount: inr(c.reward - src.reward), text: 'more Rewards' };
    case 'easier':
      return { text: 'Easier to get' };
    case 'eligible':
      return { text: 'You can get this' };
    default:
      return { text: p.delta };
  }
}

export function bandIcon(src: CrossSellCard, p: CrossSellPick): IconName {
  switch (p.lens) {
    case 'lowerFee':
      return 'feat-savings-outline';
    case 'moreRewards':
      return 'feat-rewards-outline';
    case 'upgrade':
      return 'feat-sparkle-outline';
    case 'easier':
    case 'eligible':
      return 'check-circle-outline';
    default: {
      const shared = src.tags.filter((t) => p.card.tags.indexOf(t) !== -1);
      const hit = shared.find((t) => TAG_ICONS[t]);
      return hit ? TAG_ICONS[hit] : 'feat-dot-outline';
    }
  }
}

/** Rupee amounts closer than this are the same: GST rounding makes equal fees differ by a rupee or two. */
const SAME_RUPEE_THRESHOLD = 10;

const sameAmount = (a: number, b: number) => Math.round(a) === Math.round(b);
const sameRupees = (a: number, b: number) => Math.abs(a - b) < SAME_RUPEE_THRESHOLD;

/**
 * Compare `mine` with `ref`. `lowerIsGood`: a lower number is the better one (fees,
 * income). A pick that is worse is 'neutral', never 'bad': we do not paint our own
 * suggestion red, the word "more" / "less" states it. `isSame` decides "Same";
 * rupee stats pass `sameRupees`, income (in lakhs) keeps exact equality.
 */
function compare(
  mine: number,
  ref: number,
  lowerIsGood: boolean,
  fmt: (n: number) => string,
  isSame: (a: number, b: number) => boolean = sameAmount,
): Pick<PickStat, 'delta' | 'direction' | 'sentiment'> {
  if (isSame(mine, ref)) return { delta: 'Same', direction: 'same', sentiment: 'neutral' };
  if (mine < ref) {
    return { delta: fmt(ref - mine) + ' less', direction: 'down', sentiment: lowerIsGood ? 'good' : 'neutral' };
  }
  return { delta: fmt(mine - ref) + ' more', direction: 'up', sentiment: lowerIsGood ? 'neutral' : 'good' };
}

function feeStat(src: CrossSellCard, c: CrossSellCard): PickStat {
  // Annual fee; a card with no annual fee but a joining fee compares joining fees.
  const joining = c.annualFee === 0 && c.joiningFee > 0;
  const mine = joining ? c.joiningFee : c.annualFee;
  const ref = joining ? src.joiningFee : src.annualFee;
  return {
    label: joining ? 'Joining fee' : 'Annual fee',
    value: isLtf(c) ? 'Free' : inr(mine),
    ...compare(mine, ref, true, inr, sameRupees),
  };
}

function rewardStat(src: CrossSellCard, c: CrossSellCard, d: PickRewardDisplay): PickStat {
  const value = d.cashbackValue
    ? (d.rewardPrefix === 'Upto' ? 'Upto ' : '') + d.cashbackValue
    : d.cashback?.trim() || NO_REWARD_TEXT;
  return { label: 'Rewards', value, ...compare(c.reward, src.reward, false, inr, sameRupees) };
}

function incomeStat(src: CrossSellCard, c: CrossSellCard): PickStat {
  return {
    label: 'Income needed',
    value: '₹' + c.incomeLpa + 'L a year',
    ...compare(c.incomeLpa, src.incomeLpa, true, (n) => '₹' + n + 'L'),
  };
}

/** The fee and Rewards rows of `card` against `src`, for a card that is not a lens pick (rejection sheet). */
export function feeAndRewardStats(
  src: CrossSellCard,
  card: CrossSellCard,
  reward: PickRewardDisplay,
): [PickStat, PickStat] {
  return [feeStat(src, card), rewardStat(src, card, reward)];
}

export function presentPick(
  src: CrossSellCard,
  p: CrossSellPick,
  reward: PickRewardDisplay,
): PickPresentation {
  const stats: [PickStat, PickStat] =
    p.lens === 'easier'
      ? [incomeStat(src, p.card), feeStat(src, p.card)]
      : feeAndRewardStats(src, p.card, reward);
  const band = bandParts(src, p);
  return { bandText: band.text, bandAmount: band.amount, icon: bandIcon(src, p), stats };
}
