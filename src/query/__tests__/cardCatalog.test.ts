/**
 * "Filter once mapped" (decision 2026-11-23) on the card catalog, the tools
 * league and the Beat my card verdict.
 *
 *   - No card matches a CashKaro row (index empty, failed, or non-card stores only) → filter off:
 *     commissionable cards only, as before, none with a displayed amount.
 *   - At least one card matches → only cards that match a CashKaro row are shown.
 *   - `all` (the input picker list) is never narrowed.
 *   - The user's own card keeps its verdict even with no CashKaro rate.
 */
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  NavigationContext: require('react').createContext(undefined),
}));

import { buildCardCatalog } from '../useCards';
import { buildCardRateIndex, leagueForDisplay } from '../../api/cardRates';
import type { BkCard } from '../../api/cardMapper';
import { beatMyCard, buildLeague, filterLeague, DEFAULT_LEAGUE_FILTERS } from '../../lib/cardTools';
import type { CardSavings } from '../../lib/cardTools';

const bk = (id: number, alias: string, ckStoreId?: string, over: Partial<BkCard> = {}): BkCard => ({
  id,
  name: `${alias} Credit Card`,
  card_alias: alias,
  status: true,
  commission: '1400',
  bk_commission: '1800',
  joining_fee_text: '0',
  annual_fee_text: '0',
  ...(ckStoreId ? { ck_store_id: ckStoreId } : {}),
  ...over,
});

const store = (id: string, name: string, amount: string) => ({
  id,
  attributes: { name, cashback: { payment_type: 'currency', amount } },
});

const list: BkCard[] = [
  bk(1, 'mapped', '100'),
  bk(2, 'unmapped', '200'),
  bk(3, 'twin', '300'), // staging twin: matched by name only
  bk(4, 'mine', '400'), // the user's own card, not on CashKaro
  bk(5, 'inactive', '100', { status: false }),
  bk(6, 'nocomm', '600', { commission: '0', bk_commission: '0' }), // CashKaro earns nothing today
];

describe('buildCardCatalog', () => {
  it('filter off (index empty): commissionable cards only, none with a displayed amount', () => {
    const c = buildCardCatalog(list, {}, buildCardRateIndex([]));
    expect(c.filterOn).toBe(false);
    expect(c.shown.map((x) => x.id)).toEqual(['1', '2', '3', '4']);
    expect(c.all.map((x) => x.id)).toEqual(['1', '2', '3', '4', '6']);
    for (const card of c.shown) {
      expect(card.cashbackValue).toBe('');
      expect(card.cashback).toBe('Rewards');
      expect(card.crossSell?.reward).toBe(0); // displayed reward: CashKaro only
      expect(card.crossSell?.internalReward).toBe(1400); // internal: the commission, as before
    }
  });

  it('filter stays off when the index holds only non-card stores', () => {
    const idx = buildCardRateIndex([
      { id: '16919', attributes: { name: 'Nykaa Fashion', cashback: { payment_type: 'percent', amount: '5' } } },
    ]);
    const c = buildCardCatalog(list, {}, idx);
    expect(c.filterOn).toBe(false);
    expect(c.shown.map((x) => x.id)).toEqual(['1', '2', '3', '4']);
  });

  it('filter on: only matched cards are shown (by id or name); the picker list keeps all', () => {
    const idx = buildCardRateIndex([
      store('100', 'Mapped Store', '1200'),
      store('9300', 'twin Credit Card CG May', '900'),
    ]);
    const c = buildCardCatalog(list, {}, idx);
    expect(c.filterOn).toBe(true);
    expect(c.shown.map((x) => x.id)).toEqual(['1', '3']);
    expect(c.all.map((x) => x.id)).toEqual(['1', '2', '3', '4', '6']);
    expect(c.shown[0].cashbackValue).toBe('₹1,200');
    expect(c.shown[1].cashbackValue).toBe('₹900');
  });
});

const sv = (alias: string, netYearly: number): CardSavings => ({
  alias,
  name: alias,
  discontinued: false,
  inviteOnly: false,
  lifetimeFree: false,
  monthlySavings: 0,
  yearlySavings: netYearly,
  extraBenefits: 0,
  joiningFee: 0,
  annualFee: 0,
  loungeValue: 0,
  feeWaiverSpend: 0,
  feeWaived: false,
  annualFeeCounted: 0,
  netYearly,
  lines: [],
});

describe('tools league and Beat my card with the filter on', () => {
  const idx = buildCardRateIndex([store('100', 'Mapped Store', '1200')]);
  const catalog = buildCardCatalog(list, {}, idx);
  const shownOn = { ids: new Set(catalog.shown.map((c) => c.id)), filterOn: true };
  // Rank order: the unmapped card and a card not in the app top the calculate list.
  const ranked = [sv('unmapped', 9000), sv('not-in-app', 8000), sv('mapped', 5000), sv('mine', 3000)];
  // The league joins EVERY active card (the picker stays unfiltered).
  const league = buildLeague(ranked, catalog.all);

  it('the league itself is not narrowed: the picker still finds every card', () => {
    expect(league.map((r) => r.savings.alias)).toEqual(['unmapped', 'not-in-app', 'mapped', 'mine']);
    expect(league.find((r) => r.savings.alias === 'mine')?.card?.id).toBe('4');
  });

  it('league table: only CashKaro-matched cards, plus the highlighted own card', () => {
    const shown = leagueForDisplay(league, shownOn, 'mine');
    expect(shown.map((r) => r.savings.alias)).toEqual(['mapped', 'mine']);
  });

  it("beat result: the opponent is a shown card, and the user's unmapped card keeps its verdict", () => {
    const filtered = filterLeague(leagueForDisplay(league, shownOn, 'mine'), DEFAULT_LEAGUE_FILTERS);
    const mineRow = league.find((r) => r.savings.alias === 'mine');
    expect(mineRow).toBeDefined(); // never the "card not in the list" state
    const result = beatMyCard(
      filtered.map((r) => r.savings),
      'mine',
      league.map((r) => r.savings),
    );
    expect(result).not.toBeNull();
    expect(result?.mine.alias).toBe('mine');
    expect(result?.best.alias).toBe('mapped');
    expect(result?.verdict).toBe('best_wins');
  });

  it('beat result with the filter off: every card competes, as before', () => {
    const off = buildCardCatalog(list, {}, buildCardRateIndex([]));
    const offLeague = buildLeague(ranked, off.all);
    const shownOff = { ids: new Set(off.shown.map((c) => c.id)), filterOn: false };
    const filtered = filterLeague(leagueForDisplay(offLeague, shownOff, 'mine'), DEFAULT_LEAGUE_FILTERS);
    const result = beatMyCard(filtered.map((r) => r.savings), 'mine', offLeague.map((r) => r.savings));
    expect(result?.best.alias).toBe('unmapped');
  });

  it('the own card keeps its verdict even when it is the only card left', () => {
    const none = leagueForDisplay(league, { ids: new Set<string>(), filterOn: true }, 'mine');
    expect(none.map((r) => r.savings.alias)).toEqual(['mine']);
    // No opponent: beatMyCard returns null, the screen shows its "no card matches" state, not "not found".
    expect(beatMyCard(none.map((r) => r.savings), 'mine', league.map((r) => r.savings))).toBeNull();
  });
});
