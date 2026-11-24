/**
 * Contract C8: one paging helper for the category calls. Page size 500. With
 * a known `meta.total_records`, read pages until the unique rows reach it (a
 * short page does not stop: the server may cap the page size); with no total,
 * stop on a short page. Always stop on an empty page, a page with no new row,
 * or 20 pages. Dedupe by row id; `links.next` does not decide the stop. getCategoryOffers keeps the loaded pages when a later page fails;
 * getCardRateStores throws. Rows are dummies with no amounts.
 */
// Set before the module loads: env.ts reads the BFF URL at import time.
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://bff.test';
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
const ck = require('../cashkaro') as typeof import('../cashkaro');
const { mapCategoryOffers } = require('../offersMapper') as typeof import('../offersMapper');
const http = require('../http/client') as typeof import('../http/client');
const report = require('../http/report') as typeof import('../http/report');

interface Call {
  path: string;
  page: number;
  size: number;
  segment: string | null;
}
type Reply = { status?: number; body?: unknown };

const calls: Call[] = [];
let replyFor: (call: Call) => Reply = () => ({ body: { data: [] } });
const reported: string[] = [];
const realSleep = http.__testing.sleep;

const row = (n: number) => ({
  type: 'offers',
  id: String(n),
  attributes: { name: `Store ${n}`, unique_identifier: `store-${n}` },
});
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** A server that pages `ids` (duplicates allowed) and says `total` stores; `links.next` is always set.
 *  `cap` is the server's own page size limit, applied to every page. */
function pagedServer(ids: number[], total: number | null = ids.length, cap = Infinity) {
  return (call: Call): Reply => {
    const size = Math.min(call.size, cap);
    const slice = ids.slice((call.page - 1) * size, call.page * size);
    return {
      body: {
        data: slice.map(row),
        ...(total === null ? {} : { meta: { total_records: total, page_number: call.page } }),
        links: { next: `https://ck.test/next?page[number]=${call.page + 1}` },
      },
    };
  };
}

beforeEach(() => {
  calls.length = 0;
  reported.length = 0;
  replyFor = () => ({ body: { data: [] } });
  ck.configureSegmentSource(null);
  http.__testing.sleep = async () => {};
  report.setHandledErrorReporter((_e, context) => reported.push(context));
  (globalThis as any).fetch = jest.fn(async (url: string) => {
    const u = new URL(String(url));
    const call: Call = {
      path: u.pathname,
      page: Number(u.searchParams.get('page[number]')),
      size: Number(u.searchParams.get('page[size]')),
      segment: u.searchParams.get('filter[segmentid]'),
    };
    calls.push(call);
    const { status = 200, body } = replyFor(call);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => null },
      text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
    };
  });
});

afterAll(() => {
  http.__testing.sleep = realSleep;
});

const pages = () => calls.map((c) => c.page);

describe('getCategoryOffers pages through a category (C8)', () => {
  it('merges 1573 rows over 4 pages of 500 into 1573 unique stores', async () => {
    replyFor = pagedServer(range(1, 1573));
    const res = await ck.getCategoryOffers('more-category-offers');
    expect(pages()).toEqual([1, 2, 3, 4]);
    expect(calls.every((c) => c.size === 500)).toBe(true);
    expect(calls.every((c) => c.path.endsWith('/offers/category/more-category-offers'))).toBe(true);
    expect(res.data).toHaveLength(1573);
    expect(res.meta.total_records).toBe(1573);
    const stores = mapCategoryOffers(res);
    expect(stores).toHaveLength(1573);
    expect(new Set(stores.map((s) => s.slug)).size).toBe(1573);
  });

  it('keeps a row that comes on two pages once', async () => {
    // Page 1: 1..500. Page 2: 500 again, then 501..600.
    replyFor = pagedServer([...range(1, 500), 500, ...range(501, 600)], 600);
    const res = await ck.getCategoryOffers('fashion');
    expect(pages()).toEqual([1, 2]);
    expect(res.data).toHaveLength(600);
    expect(res.data.filter((r: any) => r.id === '500')).toHaveLength(1);
  });

  it('stops at total_records on a full page (no extra empty call)', async () => {
    replyFor = pagedServer(range(1, 500));
    const res = await ck.getCategoryOffers('fashion');
    expect(pages()).toEqual([1]);
    expect(res.data).toHaveLength(500);
  });

  it('makes one call for total_records 0', async () => {
    replyFor = () => ({ body: { data: [], meta: { total_records: 0 }, links: { next: 'https://ck.test/next' } } });
    const res = await ck.getCategoryOffers('fashion');
    expect(pages()).toEqual([1]);
    expect(mapCategoryOffers(res)).toEqual([]);
  });

  it('makes one call for { data: [] } with no meta', async () => {
    replyFor = () => ({ body: { data: [] } });
    const res = await ck.getCategoryOffers('fashion');
    expect(pages()).toEqual([1]);
    expect(res.data).toEqual([]);
  });

  it('with no total, reads until a short page; links.next does not keep it going', async () => {
    replyFor = pagedServer(range(1, 730), null);
    const res = await ck.getCategoryOffers('fashion');
    expect(pages()).toEqual([1, 2]);
    expect(res.data).toHaveLength(730);
  });

  it('reads at most 20 pages', async () => {
    replyFor = (call) => ({ body: { data: range((call.page - 1) * 500 + 1, call.page * 500).map(row) } });
    const res = await ck.getCategoryOffers('fashion');
    expect(pages()).toEqual(range(1, 20));
    expect(res.data).toHaveLength(10000);
  });

  it('with a known total, a server that caps a page at 100 still reaches 1573 rows in 16 calls', async () => {
    replyFor = pagedServer(range(1, 1573), 1573, 100);
    const res = await ck.getCategoryOffers('more-category-offers');
    expect(pages()).toEqual(range(1, 16));
    expect(calls.every((c) => c.size === 500)).toBe(true);
    expect(res.data).toHaveLength(1573);
    expect(new Set(res.data.map((r: any) => r.id)).size).toBe(1573);
  });

  it('stops after 2 calls when the server ignores page[number] (page 2 adds no new row)', async () => {
    replyFor = () => ({ body: { data: range(1, 100).map(row), meta: { total_records: 1573 } } });
    const res = await ck.getCategoryOffers('more-category-offers');
    expect(pages()).toEqual([1, 2]);
    expect(res.data).toHaveLength(100);
  });

  it('with a known total, stops on an empty page before the total', async () => {
    replyFor = pagedServer(range(1, 1200), 1573);
    const res = await ck.getCategoryOffers('more-category-offers');
    expect(pages()).toEqual([1, 2, 3, 4]);
    expect(res.data).toHaveLength(1200);
  });

  it('returns the rows of page 1 when page 2 fails, and reports it (Q6)', async () => {
    const ok = pagedServer(range(1, 1573));
    replyFor = (call) => (call.page === 2 ? { status: 404, body: { errors: [{ title: 'Not found' }] } } : ok(call));
    const res = await ck.getCategoryOffers('more-category-offers');
    expect(pages()).toEqual([1, 2]);
    expect(res.data).toHaveLength(500);
    expect(mapCategoryOffers(res)).toHaveLength(500);
    expect(reported).toHaveLength(1);
  });

  it('keeps pages 1 and 2 when page 3 fails after its retries (5xx)', async () => {
    const ok = pagedServer(range(1, 1573));
    replyFor = (call) => (call.page === 3 ? { status: 503, body: {} } : ok(call));
    const res = await ck.getCategoryOffers('more-category-offers');
    expect(res.data).toHaveLength(1000);
    expect(pages().filter((p) => p === 3).length).toBeGreaterThan(1); // the transport retried
    expect(pages()).not.toContain(4);
  });

  it('keeps the loaded pages when a later page has no data list', async () => {
    const ok = pagedServer(range(1, 1573));
    replyFor = (call) => (call.page === 2 ? { body: '<html>proxy</html>' } : ok(call));
    const res = await ck.getCategoryOffers('more-category-offers');
    expect(res.data).toHaveLength(500);
  });

  it('throws when page 1 fails', async () => {
    replyFor = () => ({ status: 404, body: { errors: [{ title: 'Invalid Category' }] } });
    await expect(ck.getCategoryOffers('fashion')).rejects.toBeTruthy();
    expect(pages()).toEqual([1]);
  });

  it('returns a page 1 body with no data list as is, so the mapper still tells empty from broken', async () => {
    replyFor = () => ({ body: { meta: { total_records: 0 } } });
    expect(mapCategoryOffers(await ck.getCategoryOffers('fashion'))).toEqual([]);
    replyFor = () => ({ body: '<html>captive portal</html>' });
    const broken = await ck.getCategoryOffers('fashion');
    expect(() => mapCategoryOffers(broken)).toThrow();
  });

  it('sends filter[segmentid] on every page when a segment is known', async () => {
    ck.configureSegmentSource(() => ({ ids: ['1001', '1002'] }));
    replyFor = pagedServer(range(1, 1573));
    await ck.getCategoryOffers('more-category-offers');
    expect(calls).toHaveLength(4);
    for (const c of calls) expect(c.segment).toBe('1001,1002');
  });
});

describe('a list that ends below a known total (partialOk)', () => {
  // total 289, the server caps a page at 100: page 1 has 100 rows.
  const page1 = pagedServer(range(1, 289), 289, 100);

  it('page 2 empty: the card-rate call throws, the category call returns page 1', async () => {
    replyFor = (call) => (call.page === 1 ? page1(call) : { body: { data: [], meta: { total_records: 289 } } });
    await expect(ck.getCardRateStores()).rejects.toThrow(/100 of 289/);
    expect(pages()).toEqual([1, 2]);
    calls.length = 0;
    const res = await ck.getCategoryOffers('fashion');
    expect(pages()).toEqual([1, 2]);
    expect(res.data).toHaveLength(100);
  });

  it('page 2 repeats page 1: the card-rate call throws, the category call returns page 1', async () => {
    replyFor = (call) => page1({ ...call, page: 1 });
    await expect(ck.getCardRateStores()).rejects.toThrow(/100 of 289/);
    expect(pages()).toEqual([1, 2]);
    calls.length = 0;
    const res = await ck.getCategoryOffers('fashion');
    expect(pages()).toEqual([1, 2]);
    expect(res.data).toHaveLength(100);
  });

  it('the card-rate call returns the list when it reaches the total', async () => {
    replyFor = pagedServer(range(1, 289), 289, 100);
    expect(await ck.getCardRateStores()).toHaveLength(289);
    expect(pages()).toEqual([1, 2, 3]);
  });
});

describe('getCardRateStores pages with the same helper (C8)', () => {
  it('returns the flat rows of one short page (links.next set) with one call', async () => {
    replyFor = pagedServer(range(1, 289));
    const rows = await ck.getCardRateStores();
    expect(pages()).toEqual([1]);
    expect(calls[0].size).toBe(500);
    expect(rows).toHaveLength(289);
    expect(rows[0].id).toBe('1');
  });

  it('merges and dedupes several pages', async () => {
    replyFor = pagedServer([...range(1, 500), 1, ...range(501, 520)], 520);
    const rows = await ck.getCardRateStores();
    expect(pages()).toEqual([1, 2]);
    expect(rows).toHaveLength(520);
  });

  it('throws when page 2 fails (a partial list would hide cards)', async () => {
    const ok = pagedServer(range(1, 700));
    replyFor = (call) => (call.page === 2 ? { status: 404, body: {} } : ok(call));
    await expect(ck.getCardRateStores()).rejects.toBeTruthy();
    expect(reported).toHaveLength(0);
  });

  it('throws when page 2 has no data list', async () => {
    const ok = pagedServer(range(1, 700));
    replyFor = (call) => (call.page === 2 ? { body: '<html>proxy</html>' } : ok(call));
    await expect(ck.getCardRateStores()).rejects.toBeTruthy();
  });

  it('never sends filter[segmentid], on any page', async () => {
    ck.configureSegmentSource(() => ({ ids: ['1001'] }));
    replyFor = pagedServer(range(1, 1200));
    await ck.getCardRateStores();
    expect(calls).toHaveLength(3);
    for (const c of calls) {
      expect(c.segment).toBeNull();
      expect(c.path.endsWith('/offers/category/home-categories-exclusive')).toBe(true);
    }
  });
});
