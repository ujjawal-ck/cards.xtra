import { httpRequest, backoffMs, base64Encode, base64Decode, basicAuthHeader, buildUrl, setHttpObserver, __testing } from '../client';
import { ApiError, parseErrorItems, hasErrorCode } from '../errors';

type FakeResponse = { status: number; body?: unknown; headers?: Record<string, string> };

function mockFetch(...responses: Array<FakeResponse | Error>) {
  const calls: Array<{ url: string; init: any }> = [];
  let i = 0;
  (globalThis as any).fetch = jest.fn(async (url: string, init: any) => {
    calls.push({ url, init });
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r instanceof Error) throw r;
    const text = r.body === undefined ? '' : typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => text,
      headers: { get: (k: string) => r.headers?.[k.toLowerCase()] ?? null },
    };
  });
  return calls;
}

beforeEach(() => {
  __testing.sleep = jest.fn(async () => undefined);
  __testing.random = () => 0.5;
  setHttpObserver(null);
});

describe('httpRequest', () => {
  it('returns parsed JSON and tags the call with an x-request-id', async () => {
    const calls = mockFetch({ status: 200, body: { data: { id: 1 } } });
    const res = await httpRequest<any>('https://api.test/v1/', '/token', { query: { device: 'App', skip: undefined } });
    expect(res).toEqual({ data: { id: 1 } });
    expect(calls[0].url).toBe('https://api.test/v1/token?device=App');
    expect(calls[0].init.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('retries a GET on 503 and network errors, then succeeds', async () => {
    const calls = mockFetch({ status: 503 }, new TypeError('Network request failed'), { status: 200, body: { ok: true } });
    await expect(httpRequest('https://api.test', '/x')).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(3);
    // Same request id across attempts, so one logical call is traceable.
    expect(calls[0].init.headers['x-request-id']).toBe(calls[2].init.headers['x-request-id']);
  });

  it('never retries a POST unless it is marked idempotent', async () => {
    const calls = mockFetch({ status: 503 }, { status: 200 });
    await expect(httpRequest('https://api.test', '/pay', { method: 'POST', body: { a: 1 } })).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(1);

    const calls2 = mockFetch({ status: 503 }, { status: 200, body: {} });
    await httpRequest('https://api.test', '/cards', { method: 'POST', body: {}, idempotent: true });
    expect(calls2).toHaveLength(2);
  });

  it('does not retry 4xx client errors', async () => {
    const calls = mockFetch({ status: 422, body: { errors: [{ code: '2010', detail: 'Mobile number not registered with us' }] } });
    const err: any = await httpRequest('https://api.test', '/loginotp').catch((e: any) => e);
    expect(calls).toHaveLength(1);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe('http');
    expect(err.status).toBe(422);
    expect(err.code).toBe('2010');
    expect(err.message).toBe('Mobile number not registered with us');
    expect(hasErrorCode(err, 2010)).toBe(true);
  });

  it('honours Retry-After on 429', async () => {
    mockFetch({ status: 429, headers: { 'retry-after': '2' } }, { status: 200, body: {} });
    await httpRequest('https://api.test', '/x');
    expect(__testing.sleep).toHaveBeenCalledWith(2000);
  });

  it('classifies a fired deadline as a timeout', async () => {
    (globalThis as any).fetch = jest.fn(
      (_url: string, init: any) =>
        new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))),
    );
    const err: any = await httpRequest('https://api.test', '/slow', { timeoutMs: 5, retries: 0 }).catch((e: any) => e);
    expect(err.kind).toBe('timeout');
    expect(err.isTransient).toBe(true);
  });

  it('stops immediately when the caller aborts', async () => {
    const controller = new AbortController();
    (globalThis as any).fetch = jest.fn(
      (_url: string, init: any) =>
        new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))),
    );
    const p = httpRequest('https://api.test', '/x', { signal: controller.signal });
    controller.abort();
    const err: any = await p.catch((e: any) => e);
    expect(err.kind).toBe('aborted');
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
  });

  it('fails fast with a config error when the base URL is missing', async () => {
    const err: any = await httpRequest('', '/x').catch((e: any) => e);
    expect(err.kind).toBe('config');
  });

  it('reports each attempt to the observer without query values', async () => {
    const events: any[] = [];
    setHttpObserver((e) => events.push(e));
    mockFetch({ status: 502 }, { status: 200, body: {} });
    await httpRequest('https://api.test/v1', '/users/orders', { query: { mobile: '9999999999' } });
    expect(events.map((e) => e.status)).toEqual([502, 200]);
    expect(events[0].endpoint).toBe('GET api.test/v1/users/orders');
    expect(JSON.stringify(events)).not.toContain('9999999999');
  });
});

describe('errors', () => {
  it('parses every JSON:API item, including object-shaped errors and meta', () => {
    const items = parseErrorItems({
      errors: [
        { code: '5003', title: 'Payment threshold not reached.', meta: { cashout_limit: 250 } },
        { status: '422', detail: ['a', 'b'], source: { pointer: '/data/attributes/otp' } },
      ],
    });
    expect(items[0].meta).toEqual({ cashout_limit: 250 });
    expect(items[1].detail).toBe('a b');
    expect(items[1].source).toBe('/data/attributes/otp');
    expect(parseErrorItems({ errors: { code: 404, title: 'HTTP_NOT_FOUND' } })[0].code).toBe('404');
  });

  it('reads gateway-style {message} bodies', () => {
    const e = new ApiError('Unauthorized', 401, { message: 'Unauthorized' });
    expect(e.isAuth).toBe(true);
    expect(e.errors).toEqual([]);
  });
});

describe('encoding helpers', () => {
  it('round-trips UTF-8 through base64 and base64url', () => {
    const s = 'user:pässwörd ₹';
    expect(base64Decode(base64Encode(s))).toBe(s);
    expect(base64Encode('ab')).toBe('YWI=');
    expect(basicAuthHeader('a', 'b')).toBe('Basic YTpi');
  });

  it('builds URLs without double slashes and appends to existing queries', () => {
    expect(buildUrl('https://x.test/v1/', '/a?b=1', { c: 2 })).toBe('https://x.test/v1/a?b=1&c=2');
  });

  it('backs off exponentially with a cap', () => {
    __testing.random = () => 1;
    expect(backoffMs(1)).toBe(400);
    expect(backoffMs(2)).toBe(800);
    expect(backoffMs(10)).toBe(4000);
  });
});
