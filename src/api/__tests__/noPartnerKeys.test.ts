/**
 * The app holds no partner credential (decision 2026-11-17). Every call goes to
 * the BFF: guest CashKaro calls carry no Authorization, and no call carries an
 * x-api-key or a BankKaro partner-token. The BFF adds those.
 */
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://bff.test';

const calls: { url: string; headers: Record<string, string> }[] = [];

beforeEach(() => {
  calls.length = 0;
  (globalThis as any).fetch = jest.fn(async (url: string, init: any = {}) => {
    const headers: Record<string, string> = {};
    const h = init.headers ?? {};
    if (typeof h.forEach === 'function') h.forEach((v: string, k: string) => (headers[k.toLowerCase()] = v));
    else for (const k of Object.keys(h)) headers[k.toLowerCase()] = String(h[k]);
    calls.push({ url: String(url), headers });
    const body = { data: { id: 'guid-1', attributes: { otp_expire_sec: 120 } } };
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/vnd.api+json' },
      text: async () => JSON.stringify(body),
      json: async () => body,
    };
  });
});

const load = () => {
  let mods: any;
  jest.isolateModules(() => {
    mods = { ck: require('../cashkaro'), bk: require('../bankkaro') };
  });
  return mods;
};

test('guest CashKaro call goes to the BFF with no key and no Authorization', async () => {
  const { ck } = load();
  await ck.loginOtp('9876543210');
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toMatch(/^https:\/\/bff\.test\/ck\/loginotp\?/);
  expect(calls[0].headers['x-api-key']).toBeUndefined();
  expect(calls[0].headers.authorization).toBeUndefined();
});

test('BankKaro call goes to the BFF with no partner token', async () => {
  const { bk } = load();
  await bk.getCards();
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe('https://bff.test/bk/cardgenius/cards');
  expect(calls[0].headers['partner-token']).toBeUndefined();
  expect(calls[0].headers['x-api-key']).toBeUndefined();
});

test('signup does not send ip_address (the BFF sets it) and makes no third-party IP lookup', async () => {
  const { ck } = load();
  let sent: any = null;
  (globalThis as any).fetch.mockImplementationOnce(async (url: string, init: any) => {
    calls.push({ url: String(url), headers: {} });
    sent = JSON.parse(init.body);
    const body = { data: { id: '1', attributes: { access_token: 'a', refresh_token: 'r' } } };
    return { ok: true, status: 201, headers: { get: () => 'application/json' }, text: async () => JSON.stringify(body), json: async () => body };
  });
  await ck
    .signup({ fullname: 'A', email: 'a@b.co', password: '', mobileNumber: '9876543210', otpGuid: 'g', otp: '123456', deviceId: 'd' })
    .catch(() => undefined);
  expect(sent?.data?.attributes?.mobile_number).toBe(9876543210);
  expect(sent.data.attributes).not.toHaveProperty('ip_address');
  expect(calls.every((c) => c.url.startsWith('https://bff.test/'))).toBe(true);
});
