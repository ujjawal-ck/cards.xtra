/**
 * Cards for the card flows (3a, 3b, 3c). Not a story file.
 * They are the harness BankKaro fixture cards run through the app's own mapper, so they carry
 * filterMeta, crossSell and applyUrl like the cards Home gets. No personal data.
 */
import { BK_CARDS } from '../../../storybook/fixtures';
import { mapBkCardToCardModel } from '../../../src/api/cardMapper';
import type { CardModel } from '../../../src/molecules';

/** Active cards as CardModel, in fixture order. */
export const MODELS: CardModel[] = BK_CARDS.filter((c) => c.status).map((c) => mapBkCardToCardModel(c));
export const byAlias = (alias: string): CardModel => MODELS.find((c) => c.filterMeta?.cardAlias === alias) ?? MODELS[0];

/** A premium card with fees and an income bar: the card used for "ineligible" and "maybe". */
export const REGALIA = byAlias('hdfc-regalia-gold');
/** A mid-fee card (₹500 joining). */
export const SWIGGY = byAlias('swiggy-hdfc-bank-credit-card');
/** A card with no list benefits: its card page fetches the benefit detail. */
export const NO_TILES: CardModel = { ...SWIGGY, tileBenefits: [] };
/** A card with no apply link (R3). */
export const NO_URL: CardModel = { ...SWIGGY, applyUrl: '' };

/** Recommended row under a card page. */
export const RECOMMENDED = MODELS.filter((c) => c.id !== SWIGGY.id).slice(0, 3);
export const ALIASES = MODELS.map((c) => c.filterMeta?.cardAlias).filter((a): a is string => !!a);

/** Monthly income that gives each inline verdict on REGALIA (bar ₹1,00,000). */
export const INCOME = { eligible: '₹1,50,000', maybe: '₹90,000', ineligible: '₹30,000' } as const;

// ── Rejection data (flow 3b), built with the app's own functions ──────────────
import { getRejectionPicks, rejectionReason, OTHER_REASON_LINE } from '../../../src/lib/rejection';
import { countEligible } from '../../../src/lib/eligibleList';
import type { CrossSellCard } from '../../../src/lib/crossSell';

export const CARDS_BY_ID = new Map(MODELS.map((c) => [c.id, c]));
const CATALOGUE = MODELS.map((c) => c.crossSell).filter((c): c is CrossSellCard => !!c);
/** Aliases the user can get: every card except the rejected one. */
export const ELIGIBLE_ALIASES = ALIASES.filter((a) => a !== REGALIA.filterMeta?.cardAlias);
const reasonIncome = rejectionReason(REGALIA.crossSell as CrossSellCard, { incomeMonthly: 30000, selfEmployed: false });
export const REJECTION = {
  reasonIncome,
  reasonGeneric: { kind: 'other' as const, lines: [OTHER_REASON_LINE] },
  picks: getRejectionPicks(REGALIA.crossSell as CrossSellCard, CATALOGUE, new Set(ELIGIBLE_ALIASES), { reason: reasonIncome }).picks,
  seeAllCount: countEligible(REGALIA, MODELS, ELIGIBLE_ALIASES),
};
