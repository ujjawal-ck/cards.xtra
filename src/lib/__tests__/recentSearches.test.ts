import { addRecent, MAX_RECENT_SEARCHES, type RecentSearch } from '../recentSearches';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

describe('addRecent', () => {
  it('puts the newest pick first', () => {
    const list: RecentSearch[] = [{ label: 'SBI', kind: 'bank' }];
    expect(addRecent(list, { label: 'HDFC', kind: 'bank' })).toEqual([
      { label: 'HDFC', kind: 'bank' },
      { label: 'SBI', kind: 'bank' },
    ]);
  });

  it('moves a repeat to the front instead of duplicating it (case-insensitive)', () => {
    const list: RecentSearch[] = [
      { label: 'HDFC', kind: 'bank' },
      { label: 'SBI', kind: 'bank' },
    ];
    expect(addRecent(list, { label: 'sbi', kind: 'bank' })).toEqual([
      { label: 'sbi', kind: 'bank' },
      { label: 'HDFC', kind: 'bank' },
    ]);
  });

  it(`keeps at most ${MAX_RECENT_SEARCHES}`, () => {
    let list: RecentSearch[] = [];
    for (let i = 0; i < MAX_RECENT_SEARCHES + 3; i++) {
      list = addRecent(list, { label: `Card ${i}`, kind: 'card' });
    }
    expect(list).toHaveLength(MAX_RECENT_SEARCHES);
    expect(list[0].label).toBe(`Card ${MAX_RECENT_SEARCHES + 2}`);
  });

  it('ignores a blank label', () => {
    const list: RecentSearch[] = [{ label: 'SBI', kind: 'bank' }];
    expect(addRecent(list, { label: '   ', kind: 'bank' })).toBe(list);
  });
});
