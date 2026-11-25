/**
 * D-B (2026-11-24): Offers show all stores except credit-card stores.
 * Contract C6: a store is a card store when its CashKaro id is a BankKaro
 * `ck_store_id` OR its name matches /credit\s*card/i. Ids and names are dummies.
 */
import { cardStoreIdsFrom, excludeCardStores, isCardStore, isCardStoreRecent } from '../cardStores';

const BK_RAW = {
  data: [
    { id: 1, name: 'Bank A Cashback Card', status: true, ck_store_id: 90001 },
    { id: 2, name: 'Bank B Salary Card', status: true, ck_store_id: '90002' },
    // Inactive cards still name a card store.
    { id: 3, name: 'Bank C Old Card', status: false, ck_store_id: ' 90003 ' },
    { id: 4, name: 'No store', status: true, ck_store_id: 0 },
    { id: 5, name: 'No store', status: true, ck_store_id: '0' },
    { id: 6, name: 'No store', status: true, ck_store_id: '' },
    { id: 7, name: 'No store', status: true, ck_store_id: '   ' },
    { id: 8, name: 'No store', status: true, ck_store_id: null },
    { id: 9, name: 'No store', status: true },
    // Two cards on one store: one id.
    { id: 10, name: 'Bank A Other Card', status: true, ck_store_id: 90001 },
  ],
};

describe('cardStoreIdsFrom', () => {
  it('reads every row (inactive too) as trimmed strings', () => {
    expect([...cardStoreIdsFrom(BK_RAW)].sort()).toEqual(['90001', '90002', '90003']);
  });

  it('skips 0, empty, blank, null and missing ids', () => {
    const ids = cardStoreIdsFrom(BK_RAW);
    for (const bad of ['0', '', 'null', 'undefined']) expect(ids.has(bad)).toBe(false);
    expect(ids.size).toBe(3);
  });

  it('gives an empty set for a body with no data list', () => {
    expect(cardStoreIdsFrom(undefined).size).toBe(0);
    expect(cardStoreIdsFrom(null).size).toBe(0);
    expect(cardStoreIdsFrom({ data: null }).size).toBe(0);
    expect(cardStoreIdsFrom('<html>').size).toBe(0);
  });
});

describe('isCardStore', () => {
  const ids = cardStoreIdsFrom(BK_RAW);

  it('hides an id-only match (a BankKaro store id, no "card" in the name)', () => {
    expect(isCardStore({ storeId: '90002', name: 'SalaryPay' }, ids)).toBe(true);
  });

  it('hides a name-only match (not a BankKaro store id)', () => {
    expect(isCardStore({ storeId: '80001', name: 'Bank D Novio Credit Card' }, ids)).toBe(true);
    expect(isCardStore({ storeId: '80002', name: 'BANK E CREDIT CARDS' }, ids)).toBe(true);
    expect(isCardStore({ storeId: '80003', name: 'Bank F CreditCard' }, ids)).toBe(true);
    expect(isCardStore({ name: 'Bank G credit  card' }, ids)).toBe(true);
  });

  it('keeps a shopping store from the card-rate rows (Flipkart-like) and other "card" names', () => {
    expect(isCardStore({ storeId: '80010', name: 'Flipkart' }, ids)).toBe(false);
    expect(isCardStore({ storeId: '80011', name: 'Myntra' }, ids)).toBe(false);
    expect(isCardStore({ storeId: '80012', name: 'Gift Card Shop' }, ids)).toBe(false);
    expect(isCardStore({ storeId: '80013', name: 'Debit Card Offers' }, ids)).toBe(false);
  });

  it('with an empty id set (BankKaro loading or failed) uses the name rule only', () => {
    const none = new Set<string>();
    expect(isCardStore({ storeId: '90002', name: 'SalaryPay' }, none)).toBe(false);
    expect(isCardStore({ storeId: '80001', name: 'Bank D Novio Credit Card' }, none)).toBe(true);
    expect(isCardStore({ storeId: '80010', name: 'Flipkart' }, none)).toBe(false);
  });

  it('a store with no id is judged by its name', () => {
    expect(isCardStore({ name: 'SalaryPay' }, ids)).toBe(false);
    expect(isCardStore({ name: 'Bank H Credit Card' }, ids)).toBe(true);
  });

  it('gives the same answer on repeated calls (no regex state)', () => {
    const s = { storeId: '80001', name: 'Bank D Credit Card' };
    expect([isCardStore(s, ids), isCardStore(s, ids), isCardStore(s, ids)]).toEqual([true, true, true]);
  });
});

describe('excludeCardStores', () => {
  it('drops id and name matches and keeps the order of the rest', () => {
    const ids = cardStoreIdsFrom(BK_RAW);
    const list = [
      { slug: 'flipkart', storeId: '80010', name: 'Flipkart' },
      { slug: 'salarypay', storeId: '90002', name: 'SalaryPay' },
      { slug: 'myntra', storeId: '80011', name: 'Myntra' },
      { slug: 'novio', storeId: '80001', name: 'Bank D Novio Credit Card' },
      { slug: 'ajio', storeId: '80014', name: 'AJIO' },
    ];
    expect(excludeCardStores(list, ids).map((s) => s.slug)).toEqual(['flipkart', 'myntra', 'ajio']);
    expect(excludeCardStores(list, new Set()).map((s) => s.slug)).toEqual([
      'flipkart',
      'salarypay',
      'myntra',
      'ajio',
    ]);
  });
});

describe('isCardStoreRecent (Offers recent search chips)', () => {
  const ids = cardStoreIdsFrom(BK_RAW);
  const none = new Set<string>();
  const noRows = new Map<string, { storeId?: string; name: string }>();

  it('hides a recent with a saved BankKaro store id as soon as the ids load, with no store list', () => {
    const recent = { label: 'SalaryPay', id: 'salarypay', storeId: '90002' };
    expect(isCardStoreRecent(recent, ids, noRows)).toBe(true);
    // Before the ids load: only the name rule, so it is not hidden yet.
    expect(isCardStoreRecent(recent, none, noRows)).toBe(false);
  });

  it('hides a recent by its label (name rule) with no ids and no rows', () => {
    expect(isCardStoreRecent({ label: 'Bank D Novio Credit Card', id: 'novio' }, none, noRows)).toBe(true);
  });

  it('an older recent with no saved id: hidden when a loaded row with its slug is a card store', () => {
    const recent = { label: 'SalaryPay', id: 'salarypay' };
    const rows = new Map([['salarypay', { storeId: '90002', name: 'SalaryPay' }]]);
    expect(isCardStoreRecent(recent, ids, rows)).toBe(true);
    expect(isCardStoreRecent(recent, ids, noRows)).toBe(false);
    expect(isCardStoreRecent(recent, none, rows)).toBe(false);
  });

  it('keeps a shopping store, and ignores a saved store id that is not a string', () => {
    const rows = new Map([['flipkart', { storeId: '80010', name: 'Flipkart' }]]);
    expect(isCardStoreRecent({ label: 'Flipkart', id: 'flipkart', storeId: '80010' }, ids, rows)).toBe(false);
    expect(isCardStoreRecent({ label: 'Flipkart', id: 'flipkart', storeId: 90002 }, ids, noRows)).toBe(false);
    expect(isCardStoreRecent({ label: 'Flipkart' }, ids, rows)).toBe(false);
  });
});
