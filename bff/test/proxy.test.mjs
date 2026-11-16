import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/proxy.js';
import { matchRoute, CK_ROUTES } from '../src/routes.js';

const CONFIG = {
  ckBaseUrl: 'https://ck.test/v1',
  ckApiKey: 'ck-key',
  ckAppVersion: '4.9',
  ckBasicUser: '',
  ckBasicPass: '',
  bkBaseUrl: 'https://bk.test/partner',
  bkPartnerKey: 'bk-key',
};

/** Fake upstream. `script(url, init, n)` returns {status, body} for each call. */
function fakeFetch(script) {
  const calls = [];
  const impl = async (url, init = {}) => {
    calls.push({ url, init });
    const r = script(url, init, calls.length);
    return new Response(JSON.stringify(r.body ?? {}), {
      status: r.status ?? 200,
      headers: {
        'content-type': 'application/vnd.api+json',
        'content-encoding': 'gzip',
        'set-cookie': 'x=1',
      },
    });
  };
  return { impl, calls };
}

const tokenReply = (url) =>
  url.endsWith('/v1/token')
    ? { body: { data: { attributes: { token: 'site-1' } } } }
    : url.endsWith('/partner/token')
      ? { body: { data: { jwttoken: 'bk-jwt' } } }
      : null;

const app = (script) => {
  const f = fakeFetch(script);
  return { handle: createApp({ config: CONFIG, fetchImpl: f.impl, log: () => {} }), calls: f.calls };
};

const req = (path, init = {}) => new Request(`http://bff.test/api/handler?__path=${path}`, init);

test('guest call gets the site token and the api key; the app sends neither', async () => {
  const { handle, calls } = app((url) => tokenReply(url) ?? { body: { data: [] } });
  const res = await handle(req('/ck/offers/categories&device=App'));
  assert.equal(res.status, 200);
  const up = calls.find((c) => c.url.includes('/offers/categories'));
  assert.equal(up.url, 'https://ck.test/v1/offers/categories?device=App');
  assert.equal(up.init.headers['x-api-key'], 'ck-key');
  assert.equal(up.init.headers.authorization, 'Bearer site-1');
});

test('user token is forwarded unchanged and never swapped for the site token', async () => {
  const { handle, calls } = app((url) => tokenReply(url) ?? { status: 401, body: { errors: [] } });
  const res = await handle(req('/ck/users/profile', { headers: { authorization: 'Bearer user-1' } }));
  assert.equal(res.status, 401);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers.authorization, 'Bearer user-1');
});

test('site token is re-minted once on 401', async () => {
  let mints = 0;
  const { handle, calls } = app((url, init, n) => {
    if (url.endsWith('/v1/token')) return { body: { data: { attributes: { token: `site-${++mints}` } } } };
    return init.headers.authorization === 'Bearer site-1' ? { status: 401 } : { status: 200 };
  });
  const res = await handle(req('/ck/offers/flipkart'));
  assert.equal(res.status, 200);
  assert.equal(mints, 2);
  assert.equal(calls.filter((c) => c.url.includes('/offers/flipkart')).length, 2);
});

test('signupV1 ip_address is set by the server from x-forwarded-for', async () => {
  const { handle, calls } = app((url) => tokenReply(url) ?? { status: 201 });
  const body = JSON.stringify({ data: { type: 'auth', attributes: { mobile_number: 9876543210, ip_address: '0.0.0.0' } } });
  await handle(
    req('/ck/signupV1&device=App', {
      method: 'POST',
      headers: { 'content-type': 'application/vnd.api+json', 'x-forwarded-for': '49.36.1.2, 10.0.0.1' },
      body,
    }),
  );
  const up = calls.find((c) => c.url.includes('/signupV1'));
  const sent = JSON.parse(Buffer.from(up.init.body).toString('utf8'));
  assert.equal(sent.data.attributes.ip_address, '49.36.1.2');
});

test('paths outside the allowlist get 404 and never reach upstream', async () => {
  const { handle, calls } = app(() => ({ status: 200 }));
  for (const p of ['/ck/token', '/bk/token', '/ck/users/../token', '/ck/users/%2e%2e/token', '/ck/admin', '/other']) {
    const res = await handle(req(p));
    assert.equal(res.status, 404, p);
  }
  assert.equal(calls.length, 0);
});

test('wrong method on an allowed path gets 404', async () => {
  const { handle } = app(() => ({ status: 200 }));
  const res = await handle(req('/ck/users/profile', { method: 'DELETE' }));
  assert.equal(res.status, 404);
});

test('incoming x-api-key and cookies are not forwarded; upstream encoding headers are dropped', async () => {
  const { handle, calls } = app((url) => tokenReply(url) ?? { status: 200 });
  const res = await handle(
    req('/ck/offers/categories', { headers: { 'x-api-key': 'attacker', cookie: 'a=b', host: 'evil' } }),
  );
  const up = calls.find((c) => c.url.includes('/offers/categories'));
  assert.equal(up.init.headers['x-api-key'], 'ck-key');
  assert.equal(up.init.headers.cookie, undefined);
  assert.equal(up.init.headers.host, undefined);
  assert.equal(res.headers.get('content-encoding'), null);
  assert.equal(res.headers.get('set-cookie'), null);
});

test('BankKaro calls get the partner token; the app never sends it', async () => {
  const { handle, calls } = app((url) => tokenReply(url) ?? { status: 200, body: { data: [] } });
  const res = await handle(req('/bk/cardgenius/cards'));
  assert.equal(res.status, 200);
  const up = calls.find((c) => c.url.endsWith('/cardgenius/cards'));
  assert.equal(up.init.headers['partner-token'], 'bk-jwt');
  const mint = calls.find((c) => c.url.endsWith('/partner/token'));
  assert.deepEqual(JSON.parse(mint.init.body), { 'x-api-key': 'bk-key' });
});

test('OTP routes are rate limited per mobile number', async () => {
  const { handle } = app((url) => tokenReply(url) ?? { status: 201 });
  const send = (ip) =>
    handle(
      req('/ck/loginotp', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
        body: JSON.stringify({ data: { attributes: { mobile_number: 9876543210 } } }),
      }),
    );
  for (let i = 0; i < 5; i++) assert.equal((await send(`1.1.1.${i}`)).status, 201);
  const blocked = await send('1.1.1.99');
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).errors[0].code, 'RATE_LIMITED');
});

test('a failed token mint returns 502 with a JSON:API error', async () => {
  const { handle } = app((url) => (url.endsWith('/v1/token') ? { status: 403 } : { status: 200 }));
  const res = await handle(req('/ck/offers/categories'));
  assert.equal(res.status, 502);
  assert.equal((await res.json()).errors[0].code, 'UPSTREAM_AUTH');
});

test('health reports config presence without values', async () => {
  const { handle } = app(() => ({}));
  const body = await (await handle(req('/health'))).json();
  assert.deepEqual({ ok: body.ok, ck: body.ck, bk: body.bk }, { ok: true, ck: true, bk: true });
  assert.ok(!JSON.stringify(body).includes('ck-key'));
});

test('route table covers every app call', () => {
  const appCalls = [
    ['POST', '/loginotp'], ['POST', '/login'], ['POST', '/signupotp'], ['POST', '/signupV1'],
    ['POST', '/refreshtoken'], ['POST', '/users/logout'], ['GET', '/users/earnings'],
    ['GET', '/users/orders'], ['GET', '/users/orders/123'], ['GET', '/users/profile'],
    ['GET', '/offers/categories'], ['GET', '/offers/category/home-categories-exclusive/home-kitchen-offers'],
    ['GET', '/offers/flipkart'], ['GET', '/payment/payment'], ['POST', '/users/sendotp'],
    ['POST', '/users/verify'], ['POST', '/payment/paymentV1'], ['GET', '/users/missingcashback/retailers'],
    ['GET', '/users/missingcashback/exitclickdates/42'], ['GET', '/users/missingcashback/queue'],
    ['GET', '/users/missingcashback/queue/9'], ['POST', '/users/missingcashback/validate'],
    ['POST', '/users/missingcashback/queue'], ['PUT', '/users/missingcashback/queue/9'],
    ['POST', '/users/tickets/2026-11-01/42/abc'],
  ];
  for (const [m, p] of appCalls) assert.ok(matchRoute(CK_ROUTES, m, p), `${m} ${p}`);
});
