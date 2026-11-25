/**
 * clearSavedSpends at a session end (DATA-03): the in-memory store and the
 * stored key are emptied, also when the first read of the stored answers is
 * still running.
 */
const mockStore = new Map<string, string>();
const mockReads: ((v: string | null) => void)[] = [];

jest.mock('expo-secure-store', () => ({
  // The read waits until the test answers it, like a slow Keystore read.
  getItemAsync: jest.fn(() => new Promise((resolve) => mockReads.push(resolve))),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));

// useSavedSpends outside a component: subscribe (starts the first read), then read the snapshot.
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useSyncExternalStore: (subscribe: (l: () => void) => () => void, getSnapshot: () => unknown) => {
    subscribe(() => undefined);
    return getSnapshot();
  },
}));

const KEY = 'cardsxtra.toolSpends.v1';
const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  jest.resetModules();
  mockStore.clear();
  mockReads.length = 0;
});

function load(): typeof import('../savedSpends') {
  return require('../savedSpends');
}

describe('clearSavedSpends', () => {
  it('empties memory and storage after the answers were read', async () => {
    mockStore.set(KEY, JSON.stringify({ fuel: 3000 }));
    const m = load();
    m.useSavedSpends();
    mockReads.shift()!(mockStore.get(KEY) ?? null);
    await flush();
    expect(m.useSavedSpends().answers).toEqual({ fuel: 3000 });
    m.clearSavedSpends();
    await flush();
    expect(m.useSavedSpends().answers).toEqual({});
    expect(mockStore.has(KEY)).toBe(false);
  });

  it('a first read that finishes after the clear does not bring the old answers back', async () => {
    mockStore.set(KEY, JSON.stringify({ fuel: 3000, rent: 20000 }));
    const m = load();
    m.useSavedSpends(); // the read starts
    const release = mockReads.shift()!;
    const oldRaw = mockStore.get(KEY) ?? null;
    m.clearSavedSpends(); // the session ends before the read returns
    await flush();
    release(oldRaw); // the read returns the old user's answers
    await flush();
    const state = m.useSavedSpends();
    expect(state.answers).toEqual({});
    expect(state.loaded).toBe(true);
    expect(mockStore.has(KEY)).toBe(false);
  });
});
