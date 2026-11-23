/**
 * D6 / TC-44: a click-out takes the CashKaro user id saved at login
 * (`ck_user_id`) first, and falls back to /users/profile only when none is
 * saved. A failed profile call no longer blocks attribution when the id is
 * saved. No React renderer is installed (node test env), so a small hooks
 * stand-in calls useClickOut as a plain function.
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (init: any) => [typeof init === 'function' ? init() : init, () => undefined],
  useRef: (init: any) => ({ current: init }),
  useCallback: (fn: any) => fn,
}));
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn(async () => undefined) },
  Platform: { OS: 'android', Version: 34, select: (o: any) => o.android ?? o.default },
}));
jest.mock('../../organisms/EarnLoginSheet', () => ({ EarnLoginSheet: () => null }));
let mockStatus = 'authenticated';
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ status: mockStatus }) }));
const mockOpenLogin = jest.fn();
jest.mock('../../auth/LoginSheetProvider', () => ({ useLoginSheet: () => ({ open: mockOpenLogin }) }));
const mockProfileQ: { data?: { id?: string | number }; refetch: jest.Mock } = { refetch: jest.fn() };
jest.mock('../../query/useProfile', () => ({ useProfile: () => mockProfileQ, fetchProfile: jest.fn() }));
jest.mock('../../query/queryClient', () => ({ queryClient: { fetchQuery: jest.fn() } }));
jest.mock('../../auth/tokenStore', () => ({ loadUserId: jest.fn() }));
jest.mock('../savedProfile', () => ({ addAppliedCard: jest.fn() }));
jest.mock('../openUrl', () => ({
  ...jest.requireActual('../openUrl'),
  openUrl: jest.fn(async () => true),
  showOpenLinkError: jest.fn(),
}));

const { useClickOut } = require('../useClickOut') as typeof import('../useClickOut');
const { loadUserId } = require('../../auth/tokenStore') as { loadUserId: jest.Mock };
const { queryClient } = require('../../query/queryClient') as { queryClient: { fetchQuery: jest.Mock } };
const { openUrl } = require('../openUrl') as { openUrl: jest.Mock };
const { Alert } = require('react-native') as { Alert: { alert: jest.Mock } };
const { analytics, Events } = require('../../analytics') as typeof import('../../analytics');

const CK_URL = 'https://cktracking.example.test/visitretailer/app/1234?id=';
const tracked: { name: string; params: Record<string, unknown> }[] = [];
analytics.registerSink({ track: (name, params) => tracked.push({ name, params }) });

const flush = () => new Promise((r) => setImmediate(r));
const openedUrl = () => openUrl.mock.calls[0]?.[0] as string | undefined;
const clickOuts = () => tracked.filter((t) => t.name === Events.CLICK_OUT);

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  mockStatus = 'authenticated';
  mockProfileQ.data = undefined;
  mockProfileQ.refetch = jest.fn(async () => {
    throw new Error('profile down');
  });
  openUrl.mockImplementation(async () => true);
  tracked.length = 0;
});

describe('signed in: the saved user id comes first', () => {
  it('opens with the saved id and makes no profile call, even with the profile down', async () => {
    loadUserId.mockResolvedValue('77');
    await useClickOut().openClickOut({ kind: 'store', url: CK_URL, itemId: 1 });
    expect(mockProfileQ.refetch).not.toHaveBeenCalled();
    expect(queryClient.fetchQuery).not.toHaveBeenCalled();
    expect(openedUrl()).toBe('https://cktracking.example.test/visitretailer/app/1234?id=77');
    expect(clickOuts()).toHaveLength(1);
    expect(clickOuts()[0].params.attributed).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('with no saved id, uses the loaded profile id', async () => {
    loadUserId.mockResolvedValue(null);
    mockProfileQ.data = { id: 55 };
    await useClickOut().openClickOut({ kind: 'store', url: CK_URL });
    expect(mockProfileQ.refetch).not.toHaveBeenCalled();
    expect(openedUrl()).toContain('id=55');
  });

  it('with no saved id and no loaded profile, refetches the profile', async () => {
    loadUserId.mockRejectedValue(new Error('keystore'));
    mockProfileQ.refetch = jest.fn(async () => ({ data: { id: 66 } }));
    await useClickOut().openClickOut({ kind: 'card', url: CK_URL });
    expect(mockProfileQ.refetch).toHaveBeenCalledTimes(1);
    expect(openedUrl()).toContain('id=66');
  });

  it('with no id from anywhere, opens nothing and logs nothing', async () => {
    loadUserId.mockResolvedValue(null);
    await useClickOut().openClickOut({ kind: 'store', url: CK_URL });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalled();
    expect(clickOuts()).toHaveLength(0);
  });

  it('logs click_out only after a real open', async () => {
    loadUserId.mockResolvedValue('77');
    openUrl.mockImplementation(async () => false);
    await useClickOut().openClickOut({ kind: 'store', url: CK_URL });
    expect(openUrl).toHaveBeenCalledWith(expect.stringContaining('id=77'), { httpsOnly: true });
    expect(clickOuts()).toHaveLength(0);
  });
});

describe('"Log in to earn": the apply continues after login', () => {
  async function loginThenContinue(): Promise<void> {
    mockStatus = 'unauthenticated';
    const hook = useClickOut();
    await hook.openClickOut({ kind: 'card', url: CK_URL });
    expect(openUrl).not.toHaveBeenCalled();
    (hook.clickOutSheets as any).props.onLogin();
    const { onSuccess } = mockOpenLogin.mock.calls[0][0];
    onSuccess({ isSignup: false, name: '', accessToken: 'fresh-token' });
    for (let i = 0; i < 5; i++) await flush();
  }

  it('uses the id saved at sign-in, with no profile call', async () => {
    loadUserId.mockResolvedValue('77');
    await loginThenContinue();
    expect(queryClient.fetchQuery).not.toHaveBeenCalled();
    expect(openedUrl()).toContain('id=77');
    expect(clickOuts()).toHaveLength(1);
  });

  it('falls back to the profile with the fresh token when no id is saved', async () => {
    loadUserId.mockResolvedValue(null);
    queryClient.fetchQuery.mockResolvedValue({ id: 88 });
    await loginThenContinue();
    expect(queryClient.fetchQuery).toHaveBeenCalledTimes(1);
    expect(openedUrl()).toContain('id=88');
  });

  it('opens nothing when no id is saved and the profile fails', async () => {
    loadUserId.mockResolvedValue(null);
    queryClient.fetchQuery.mockRejectedValue(new Error('profile down'));
    await loginThenContinue();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalled();
  });
});
