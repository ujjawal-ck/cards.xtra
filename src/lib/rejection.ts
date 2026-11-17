/**
 * rejection — pure logic for the "we think you will not get this card" flow:
 * the reason line(s) on the rejection sheet, and the three alternatives the user
 * CAN get. No React, no I/O, and no `../tokens` import (jest cannot load it).
 *
 * The eligibility API answers yes / no only. So a reason is stated only when the
 * data supports it (the card's income bar against the income the user typed);
 * otherwise one honest catch-all line. Nothing here guesses a reason.
 *
 * `employment` is a valid kind in the type, but `rejectionReason` never returns it
 * yet: the catalogue row has an `employment_type` field (knowledge/great-cards-api.md
 * G25) but no value has been sampled, so its meaning is unknown.
 *
 * Alternatives reuse the cross-sell engine's gate, similarity and fee bands
 * (src/lib/crossSell.ts); the engine itself is not changed in behaviour.
 */
import { CONFIG, bandIdx, cost, idf, isLtf, passesEarningGate, profile, sim, topShared } from './crossSell';
import type { CrossSellCard } from './crossSell';
import { shortCardName } from './crossSellPresent';

// ---------- reason ----------

export type RejectionReasonKind = 'income' | 'employment' | 'other';

export interface RejectionReason {
  kind: RejectionReasonKind;
  lines: string[];
  highlightField?: 'income' | 'occupation';
}

export interface RejectionDetails {
  /** Monthly in-hand income the user typed, in rupees. */
  incomeMonthly: number;
  selfEmployed: boolean;
}

export const OTHER_REASON_LINE = 'This card is not available for your pincode or profile right now.';

/** Lakh amount without trailing zeros: 12, 2.4. */
export function formatLakh(n: number, digits = 1): string {
  return String(parseFloat(n.toFixed(digits)));
}

/** The card's income bar (lakh per year) for the user's employment type; 0 = unknown. */
function incomeBar(card: CrossSellCard, selfEmployed: boolean): number {
  const self = card.incomeSelfEmpLpa ?? 0;
  const bar = selfEmployed && self > 0 ? self : card.incomeLpa;
  return Number.isFinite(bar) && bar > 0 ? bar : 0;
}

export function rejectionReason(card: CrossSellCard, details: RejectionDetails | null): RejectionReason {
  if (details && Number.isFinite(details.incomeMonthly) && details.incomeMonthly > 0) {
    const bar = incomeBar(card, details.selfEmployed);
    const yearly = (details.incomeMonthly * 12) / 100000;
    if (bar > 0 && yearly < bar) {
      // Two amounts that round to the same text would read as a contradiction: add precision.
      let digits = 1;
      while (digits < 3 && formatLakh(bar, digits) === formatLakh(yearly, digits)) digits += 1;
      return {
        kind: 'income',
        lines: [
          `This card needs about ₹${formatLakh(bar, digits)}L a year.`,
          `You entered ₹${formatLakh(yearly, digits)}L a year.`,
        ],
        highlightField: 'income',
      };
    }
  }
  return { kind: 'other', lines: [OTHER_REASON_LINE] };
}

// ---------- similarity ----------

/** 0..1: the share of the tapped card's (rarity-weighted) tags that `c` also has. Same measure as the engine. */
export function similarityTo(src: CrossSellCard, catalogue: CrossSellCard[]): (c: CrossSellCard) => number {
  const p = profile(src, [], idf(catalogue));
  return (c) => sim(p, c);
}

// ---------- tags ----------

export type RejectionTone = 'info' | 'brand' | 'success' | 'purple' | 'gray';

/**
 * Tag for a card in a plain list of cards the user can get. First rule that applies:
 * same bank, shares the tapped card's rarest tag, income reason, else generic.
 * "Rarest" needs the catalogue (the engine's idf); without it that rule is skipped.
 * The income line is the fallback, not the lead: a rule on top would give every card the same tag.
 */
export function contextTag(
  src: CrossSellCard,
  c: CrossSellCard,
  reason?: RejectionReason,
  catalogue?: CrossSellCard[],
): { text: string; tone: RejectionTone } {
  if (src.bank && c.bank === src.bank) return { text: `Also from ${c.bank}`, tone: 'gray' };
  if (catalogue) {
    const rarest = topShared(src, c, idf(catalogue));
    if (rarest) return { text: `Also has ${rarest}`, tone: 'info' };
  }
  if (reason?.kind === 'income') return { text: 'Fits your income', tone: 'success' };
  return { text: 'You can get this', tone: 'success' };
}

// ---------- picks ----------

export type RejectionSlot = 'closest' | 'topRewards' | 'lifetimeFree';

export interface RejectionPick {
  card: CrossSellCard;
  slot: RejectionSlot;
  tag: string;
  tone: RejectionTone;
}

export interface RejectionResult {
  picks: RejectionPick[];
  /**
   * Eligible, non-invite cards with a crossSell model, except the tapped one (no earning gate).
   * Not shown: the "See all" number comes from `countEligible` (src/lib/eligibleList.ts).
   */
  eligibleCount: number;
}

const MAX_PICKS = 3;

export function getRejectionPicks(
  src: CrossSellCard,
  catalogue: CrossSellCard[],
  eligible: Set<string>,
  opts: { viewed?: string[]; reason?: RejectionReason } = {},
): RejectionResult {
  const S = similarityTo(src, catalogue);
  const viewed = new Set(opts.viewed ?? []);

  const eligibleCards = catalogue.filter(
    (c) => c.id !== src.id && c.alias !== src.alias && !c.inviteOnly && eligible.has(c.alias),
  );
  const gated = eligibleCards.filter((c) => passesEarningGate(c) && !viewed.has(c.alias));
  const niche = gated.filter((c) => S(c) >= CONFIG.nicheMin);
  // Too few close cards: rank everything the user can get by similarity instead.
  const pool = niche.length >= MAX_PICKS ? niche : gated;

  const srcBand = bandIdx(src);
  const bucket = (c: CrossSellCard) => Math.round(S(c) * 10);
  // Softer guard: "closest" never sits more than one fee band above the rejected card,
  // unless no card in the pool is inside that range.
  const nearBand = pool.filter((c) => bandIdx(c) <= srcBand + 1);
  const closestPool = nearBand.length > 0 ? nearBand : pool;
  const byClosest = [...closestPool].sort(
    (a, b) =>
      bucket(b) - bucket(a) ||
      Math.abs(bandIdx(a) - srcBand) - Math.abs(bandIdx(b) - srcBand) ||
      b.reward - a.reward ||
      a.priority - b.priority,
  );
  const rewardSort = (a: CrossSellCard, b: CrossSellCard) =>
    b.reward - a.reward || S(b) - S(a) || a.priority - b.priority;
  // A one-time reward must not sell a card that costs far more every year: same fee or lower
  // (the engine's "More rewards" rule). Lifetime free source: cost 0, so only lifetime free cards.
  const feeCap = cost(src) * CONFIG.feeTolerance;
  const byReward = pool.filter((c) => cost(c) <= feeCap).sort(rewardSort);
  // Nothing under the cap: relax once, to at most one fee band above the rejected card.
  const byRewardRelaxed = pool.filter((c) => bandIdx(c) <= srcBand + 1).sort(rewardSort);
  const lifetimeFree = byClosest.filter(isLtf);

  const usedIds = new Set<string>();
  const usedBanks = new Set<string>();
  const take = (list: CrossSellCard[]): CrossSellCard | undefined => {
    const c = list.find((x) => !usedIds.has(x.id) && !usedBanks.has(x.bank));
    if (c) {
      usedIds.add(c.id);
      usedBanks.add(c.bank);
    }
    return c;
  };

  const closestTag = `Closest to ${shortCardName(src.name)}`;
  const picks: RejectionPick[] = [];
  const add = (card: CrossSellCard | undefined, slot: RejectionSlot, tag: string, tone: RejectionTone) => {
    if (card) picks.push({ card, slot, tag, tone });
  };

  add(take(byClosest), 'closest', closestTag, 'info');
  const top = take(byReward) ?? take(byRewardRelaxed);
  // Still none: the next closest card takes the slot, as a "closest" pick.
  if (top) add(top, 'topRewards', 'Highest Rewards', 'brand');
  else add(take(byClosest), 'closest', closestTag, 'info');
  const free = take(lifetimeFree);
  if (free) add(free, 'lifetimeFree', 'Lifetime free', 'success');
  // No lifetime free card left: the next closest card takes the third place.
  else add(take(byClosest), 'closest', closestTag, 'info');

  return { picks, eligibleCount: eligibleCards.length };
}
