/**
 * crossSell — pure engine for the Home "cross-sell on return" rail.
 *
 * Ported 1:1 from the approved prototype (prototypes/cross-sell/crossSell.js
 * helpers + crossSell2.js v2 engine). No React, no I/O: a function from
 * (tapped card, catalogue, session context) to a result the rail renders.
 *
 * App differences from the prototype (all deliberate, see the brief):
 *   - Fees arrive GST-inclusive (what the tile shows) and every amount shown is
 *     GST-inclusive. Fee BANDS use the base fee (fee / gst), as the prototype does.
 *   - `reward` is the ₹ the user is shown as Rewards; "earns revenue" = reward > 0.
 *   - Earning gate: blocked when reward <= 0, or when earn is known (> 0) and
 *     earn - reward < minNet. An unknown earn (0) is NOT blocked by the net rule.
 *   - Everything is keyed by card alias (BankKaro `card_alias`), as before.
 *
 * Lens = one reason to prefer another card. New lens = one entry in lensDefs().
 */
import { formatINR } from './money';

/** Tone keys the rail maps to `colors.tones`. */
export type CrossSellTone = 'info' | 'success' | 'brand' | 'purple' | 'gray';

export interface CrossSellCard {
  id: string; // CardModel.id
  alias: string; // BankKaro card_alias
  name: string;
  bank: string; // bank display name, or String(bank_id) when unknown
  rewardType?: 'cashback' | 'rewards';
  tags: string[]; // ALL tag names of the card (not the 3 shown on the tile)
  joiningFee: number; // ₹, as the catalogue sends it
  annualFee: number;
  inviteOnly: boolean;
  reward: number; // ₹ shown as Rewards (CashKaro rate, else commission). 0 when none or a percent.
  earn: number; // bk_commission in ₹, 0 when absent
  incomeLpa: number; // income_salaried (lakh per year), 0 when absent / "N/A"
  crif: number; // 0 when absent
  priority: number; // BankKaro priority, large number when absent
}

export interface CrossSellConfig {
  maxPicks: number;
  minPicksToShow: number; // fewer than this: do not expand
  requireRevenue: boolean;
  nicheMin: number; // minimum tag overlap to count as "same category"
  onePerBank: boolean;
  gst: number; // fees are GST-inclusive; bands use fee / gst
  profileFrom: number; // viewed cards (incl. the tapped one) needed to build a profile
  minRewardGain: number; // ₹ more Rewards for the "More rewards" lens
  feeTolerance: number; // "More rewards" may cost up to this x the tapped card's fee
  minNet: number;
  rankBy: 'reward' | 'net';
}

export const CONFIG: CrossSellConfig = {
  maxPicks: 3,
  minPicksToShow: 2,
  requireRevenue: true,
  nicheMin: 0.3,
  onePerBank: true,
  gst: 1.18,
  profileFrom: 2,
  minRewardGain: 200,
  feeTolerance: 1.05,
  minNet: 0,
  rankBy: 'reward',
};

export interface CrossSellCtx {
  /** Aliases the user can get. null/undefined = eligibility not known. */
  eligible?: Set<string> | null;
  /** Aliases of every card the user opened this session. */
  viewed?: string[];
  /** alias -> times already shown on a rail this session. */
  shown?: Record<string, number>;
  /** Aliases the user applied to this session. */
  applied?: Set<string>;
  config?: Partial<CrossSellConfig>;
}

export type FeeBand = 'ltf' | 'entry' | 'mid' | 'premium' | 'super';

export interface CrossSellPick {
  card: CrossSellCard;
  lens: string;
  label: string;
  tone: CrossSellTone;
  /** What the user gains against the tapped card, e.g. "₹2,000 lower annual fee". */
  delta: string;
  sim: number;
  band: FeeBand;
  eligible: boolean;
  seenBefore: boolean;
  earn: number;
  paid: number;
  net: number;
}

export interface CrossSellLens {
  key: string;
  label: string;
  tone: CrossSellTone;
  picks: CrossSellPick[];
}

export interface CrossSellResult {
  show: boolean;
  state: 'unknown' | 'eligible' | 'ineligible';
  headline: string;
  sub: string;
  lenses: CrossSellLens[];
  askEligibility: boolean;
  profileCards: number;
  sourceBand: FeeBand;
}

// ---------- helpers (fee bands, IDF) ----------
const BANDS: FeeBand[] = ['ltf', 'entry', 'mid', 'premium', 'super'];
const BAND_CAPS = { entry: 1000, mid: 3000, premium: 6000 };

export function isLtf(c: CrossSellCard): boolean {
  return c.joiningFee === 0 && c.annualFee === 0;
}
export function band(c: CrossSellCard): FeeBand {
  if (isLtf(c)) return 'ltf';
  const f = Math.max(c.joiningFee, c.annualFee) / CONFIG.gst;
  if (f <= BAND_CAPS.entry) return 'entry';
  if (f <= BAND_CAPS.mid) return 'mid';
  if (f <= BAND_CAPS.premium) return 'premium';
  return 'super';
}
export function bandIdx(c: CrossSellCard): number {
  return BANDS.indexOf(band(c));
}

// IDF weights so rare tags (Fuel, UPI) count more than common ones (Travel, Shopping).
const idfCache = new WeakMap<CrossSellCard[], Record<string, number>>();
function idf(catalogue: CrossSellCard[]): Record<string, number> {
  const hit = idfCache.get(catalogue);
  if (hit) return hit;
  const freq: Record<string, number> = {};
  const n = catalogue.length;
  catalogue.forEach((c) => c.tags.forEach((t) => (freq[t] = (freq[t] || 0) + 1)));
  const w: Record<string, number> = {};
  Object.keys(freq).forEach((t) => (w[t] = Math.log(n / freq[t])));
  idfCache.set(catalogue, w);
  return w;
}

// ---------- money ----------
function cost(c: CrossSellCard): number {
  return Math.max(c.joiningFee, c.annualFee);
}
const earnOf = (c: CrossSellCard): number => c.earn;
const paidOf = (c: CrossSellCard): number => c.reward;
const netOf = (c: CrossSellCard): number => earnOf(c) - paidOf(c);
const lpa = (n: number): string => '₹' + n + 'L';
export function inr(n: number): string {
  return formatINR(Math.round(n));
}
const short = (n: string): string => n.replace(/\s+Credit Card$/i, '').replace(/\s+Card$/i, '');

// ---------- similarity ----------
type Profile = Record<string, number>;

// Similarity reference: the tapped card's tags. After 2+ viewed cards, the tags of
// every viewed card count too (the tapped card counts double).
function profile(src: CrossSellCard, viewedCards: CrossSellCard[], w: Record<string, number>): Profile {
  const p: Profile = {};
  const add = (c: CrossSellCard, k: number) => c.tags.forEach((t) => (p[t] = (p[t] || 0) + k * (w[t] || 0)));
  add(src, 2);
  viewedCards.forEach((c) => {
    if (c.id !== src.id) add(c, 1);
  });
  return p;
}
function sim(p: Profile, c: CrossSellCard): number {
  let total = 0;
  let shared = 0;
  Object.keys(p).forEach((t) => {
    total += p[t];
    if (c.tags.indexOf(t) !== -1) shared += p[t];
  });
  return total ? shared / total : 0;
}
function topShared(src: CrossSellCard, c: CrossSellCard, w: Record<string, number>): string | undefined {
  return src.tags
    .filter((t) => c.tags.indexOf(t) !== -1)
    .sort((a, b) => (w[b] || 0) - (w[a] || 0))[0];
}

// ---------- lenses ----------
interface LensDef {
  key: string;
  label: string;
  tone: CrossSellTone;
  applies: boolean;
  filter: (c: CrossSellCard) => boolean;
  sort: (a: CrossSellCard, b: CrossSellCard) => number;
  delta: (c: CrossSellCard) => string;
}

// Lens = when it applies, which cards pass, how they rank, and the delta line.
function lensDefs(
  src: CrossSellCard,
  S: (c: CrossSellCard) => number,
  w: Record<string, number>,
  cfg: CrossSellConfig,
  srcIneligible: boolean,
  eligKnown: boolean,
): LensDef[] {
  const sb = bandIdx(src);
  const rs = src.reward;
  const ltf = isLtf(src);
  const bucket = (c: CrossSellCard) => Math.round(S(c) * 10);
  // Business tie-break: among equally relevant cards, the one that nets more goes first.
  // cfg.rankBy: 'reward' = the card that pays the user more (default), 'net' = the card that nets us more.
  const biz = (a: CrossSellCard, b: CrossSellCard) => {
    const n = netOf(b) - netOf(a);
    const r = b.reward - a.reward;
    return (cfg.rankBy === 'net' ? n || r : r || n) || a.priority - b.priority;
  };
  return [
    {
      key: 'similar',
      label: 'Similar',
      tone: 'info',
      applies: true,
      filter: (c) => Math.abs(bandIdx(c) - sb) <= 1,
      // Closest category first. Then: a lifetime free card prefers lifetime free; any other
      // card prefers its own reward type (cashback with cashback), then the nearest fee band.
      sort: (a, b) => {
        const type = Number(b.rewardType === src.rewardType) - Number(a.rewardType === src.rewardType);
        const bandGap = Math.abs(bandIdx(a) - sb) - Math.abs(bandIdx(b) - sb);
        return bucket(b) - bucket(a) || (ltf ? bandGap || type : type || bandGap) || biz(a, b);
      },
      delta: (c) => {
        const t = topShared(src, c, w);
        if (c.rewardType === 'cashback' && src.rewardType === 'cashback') {
          return 'Cashback card' + (t ? ' for ' + t : '');
        }
        return t ? 'Also for ' + t : 'Similar benefits';
      },
    },
    {
      key: 'lowerFee',
      label: 'Lower fee',
      tone: 'success',
      applies: !ltf,
      filter: (c) => cost(c) < cost(src) && bandIdx(c) >= sb - 2,
      // One band down first: a real saving on a card that still compares.
      sort: (a, b) =>
        bucket(b) - bucket(a) ||
        Math.abs(bandIdx(a) - (sb - 1)) - Math.abs(bandIdx(b) - (sb - 1)) ||
        biz(a, b),
      delta: (c) => {
        if (isLtf(c)) {
          return src.annualFee > 0 ? 'Lifetime free, ' + inr(src.annualFee) + ' less a year' : 'Lifetime free';
        }
        const d = src.annualFee - c.annualFee;
        return d > 0 ? inr(d) + ' lower annual fee' : inr(src.joiningFee - c.joiningFee) + ' lower joining fee';
      },
    },
    {
      key: 'moreRewards',
      label: 'More rewards',
      tone: 'brand',
      applies: true,
      // Only cards that cost the same or less: more Rewards with no extra fee.
      filter: (c) => c.reward >= rs + cfg.minRewardGain && cost(c) <= cost(src) * cfg.feeTolerance,
      sort: (a, b) => b.reward - a.reward || S(b) - S(a) || biz(a, b),
      delta: (c) => {
        const fee = isLtf(c)
          ? ltf
            ? 'also lifetime free'
            : 'lifetime free'
          : cost(c) < cost(src) * 0.95
            ? 'lower fee'
            : 'same fee';
        return inr(c.reward - rs) + ' more Rewards, ' + fee;
      },
    },
    {
      key: 'upgrade',
      label: 'More benefits',
      tone: 'purple',
      applies: sb <= 1,
      filter: (c) => bandIdx(c) === sb + 1,
      sort: (a, b) => bucket(b) - bucket(a) || biz(a, b),
      delta: (c) => {
        const extra = c.tags.filter((t) => src.tags.indexOf(t) === -1).slice(0, 2);
        return extra.length ? 'Adds ' + extra.join(', ') : 'More benefits, ' + inr(c.annualFee) + ' a year';
      },
    },
    // Eligibility not checked yet: cards with a lower income bar than the tapped card.
    {
      key: 'easier',
      label: 'Easier to get',
      tone: 'success',
      applies: !eligKnown && src.incomeLpa > 0,
      filter: (c) =>
        c.incomeLpa > 0 &&
        c.incomeLpa < src.incomeLpa &&
        !(c.crif > src.crif) &&
        bandIdx(c) >= sb - 2 &&
        bandIdx(c) <= sb, // never a costlier fee band
      sort: (a, b) => bucket(b) - bucket(a) || bandIdx(b) - bandIdx(a) || biz(a, b),
      delta: (c) => 'Needs ' + lpa(c.incomeLpa) + ' income a year, not ' + lpa(src.incomeLpa),
    },
    // Tapped card failed the eligibility check: closest cards the user can get, nearest fee band first.
    {
      key: 'eligible',
      label: 'You can get',
      tone: 'success',
      applies: srcIneligible,
      filter: () => true,
      sort: (a, b) => bucket(b) - bucket(a) || bandIdx(b) - bandIdx(a) || biz(a, b),
      delta: (c) => {
        const t = topShared(src, c, w);
        return "You're eligible" + (t ? ', also for ' + t : '');
      },
    },
  ];
}

// ---------- engine ----------
export function getCrossSellV2(
  src: CrossSellCard,
  catalogue: CrossSellCard[],
  ctx: CrossSellCtx = {},
): CrossSellResult {
  const cfg: CrossSellConfig = { ...CONFIG, ...(ctx.config || {}) };
  const w = idf(catalogue);
  const byAlias: Record<string, CrossSellCard> = {};
  catalogue.forEach((c) => (byAlias[c.alias] = c));
  const viewed = (ctx.viewed || []).filter((a) => a !== src.alias && byAlias[a]);
  const useProfile = viewed.length + 1 >= cfg.profileFrom && viewed.length > 0;
  const p = profile(src, useProfile ? viewed.map((a) => byAlias[a]) : [], w);
  const S = (c: CrossSellCard) => sim(p, c);
  const shown = ctx.shown || {};
  const elig = ctx.eligible || null;
  const srcIneligible = !!elig && !elig.has(src.alias);

  const pool = catalogue.filter((c) => {
    if (c.id === src.id || c.inviteOnly) return false;
    // Earning gate: the user gets Rewards on it (so a payout exists) and, when the
    // earn is known, the net is not negative. Unknown earn (0) is not blocked.
    if (cfg.requireRevenue && (c.reward <= 0 || (c.earn > 0 && netOf(c) < cfg.minNet))) return false;
    if (viewed.indexOf(c.alias) !== -1) return false;
    if (ctx.applied && ctx.applied.has(c.alias)) return false;
    if (elig && !elig.has(c.alias)) return false;
    return S(c) >= cfg.nicheMin;
  });

  // Rank one lens: fresh cards first, then the lens order; one card per bank.
  // `banks` is mutated with the banks of the cards it returns (callers pass a copy to keep it).
  function rank(def: LensDef, excludeIds: Record<string, 1>, banks: Record<string, 1>): CrossSellCard[] {
    const list = pool
      .filter((c) => !excludeIds[c.id] && def.filter(c))
      .sort((a, b) => Number(!!shown[a.alias]) - Number(!!shown[b.alias]) || def.sort(a, b));
    const out: CrossSellCard[] = [];
    for (let i = 0; i < list.length && out.length < cfg.maxPicks; i++) {
      if (cfg.onePerBank && banks[list[i].bank]) continue;
      banks[list[i].bank] = 1;
      out.push(list[i]);
    }
    return out;
  }
  const row = (def: LensDef, c: CrossSellCard): CrossSellPick => ({
    card: c,
    lens: def.key,
    label: def.label,
    tone: def.tone,
    delta: def.delta(c),
    sim: Math.round(S(c) * 100) / 100,
    band: band(c),
    eligible: !!elig,
    seenBefore: !!shown[c.alias],
    earn: earnOf(c),
    paid: paidOf(c),
    net: netOf(c),
  });

  const defs = lensDefs(src, S, w, cfg, srcIneligible, !!elig).filter((d) => d.applies);
  let lenses: CrossSellLens[] = defs
    .map((d) => ({ key: d.key, label: d.label, tone: d.tone, picks: rank(d, {}, {}).map((c) => row(d, c)) }))
    .filter((l) => l.picks.length >= cfg.minPicksToShow);

  // "Top picks": the best card of each lens. Order follows the tapped card:
  // a lifetime free card leads with similar (lifetime free first), then more rewards, then one band up.
  const order = srcIneligible
    ? ['eligible', 'eligible', 'eligible']
    : isLtf(src)
      ? ['similar', 'moreRewards', 'upgrade']
      : ['similar', 'lowerFee', 'moreRewards', 'upgrade'];
  const usedIds: Record<string, 1> = {};
  const usedBanks: Record<string, 1> = {};
  const top: CrossSellPick[] = [];
  order.concat(['similar', 'similar']).forEach((k) => {
    if (top.length >= cfg.maxPicks) return;
    const d = defs.filter((x) => x.key === k)[0];
    if (!d) return;
    // Rank against a COPY of the banks: only the chosen card's bank is kept.
    const c = rank(d, usedIds, { ...usedBanks })[0];
    if (!c) return;
    usedIds[c.id] = 1;
    usedBanks[c.bank] = 1;
    top.push(row(d, c));
  });
  if (srcIneligible) lenses = lenses.filter((l) => l.key !== 'eligible');
  lenses.unshift({ key: 'top', label: 'Top picks', tone: 'gray', picks: top });

  const n = viewed.length + 1;
  return {
    show: top.length >= cfg.minPicksToShow,
    state: srcIneligible ? 'ineligible' : elig ? 'eligible' : 'unknown',
    headline: srcIneligible ? 'You may not get ' + short(src.name) : 'Not sure about ' + short(src.name) + '?',
    sub: srcIneligible
      ? 'Cards you can get instead'
      : useProfile
        ? 'Picked from the ' + n + ' cards you viewed'
        : 'Compare it with these',
    askEligibility: !elig,
    profileCards: n,
    sourceBand: band(src),
    lenses,
  };
}
