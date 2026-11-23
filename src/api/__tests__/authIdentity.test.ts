/**
 * AC-24 / M11 and D6 / TC-44: the user id (`data.id`) and the segment fields
 * of /login, /signupV1 and /refreshtoken (01_auth.md), `filter[segmentid]` on
 * the offers calls (05_offers.md, openapi-mini.json example
 * "1629794856,1629794721"), and the profile row id.
 */
// Set before the module loads: env.ts reads the BFF URL at import time.
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://bff.test';
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
const ck = require('../cashkaro') as typeof import('../cashkaro');

/** The doc example body of /login (01_auth.md). */
const LOGIN_BODY = {
  data: {
    type: 'auth',
    id: 17,
    attributes: {
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      user_fullname: 'Rohan',
      username: '17',
      is_forgot_password: 0,
      segment_id: ['1629794787', '1629794721'],
      new_user_segment_expiry_time_sec: 86400,
      user_joined_at: '2021-09-21T23:55:18Z',
    },
  },
};

let bodyFor: (url: string) => unknown = () => ({});
const urls: string[] = [];

beforeEach(() => {
  urls.length = 0;
  bodyFor = () => ({});
  ck.configureSegmentSource(null);
  (globalThis as any).fetch = jest.fn(async (url: string) => {
    urls.push(String(url));
    const body = bodyFor(String(url));
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/vnd.api+json' },
      text: async () => JSON.stringify(body),
      json: async () => body,
    };
  });
});

const segmentParam = (url: string) => new URL(url).searchParams.get('filter[segmentid]');

describe('login, signup and refresh keep the user id and the segment', () => {
  it('login returns data.id as the user id and the three segment fields', async () => {
    bodyFor = () => LOGIN_BODY;
    const res = await ck.login({ mobileNumber: '9876543210', otpGuid: 'g', otp: '1234', deviceId: 'dev-1' });
    expect(res.accessToken).toBe('access-1');
    expect(res.refreshToken).toBe('refresh-1');
    expect(res.userId).toBe('17');
    expect(res.segment).toEqual({
      ids: ['1629794787', '1629794721'],
      newUserExpirySec: 86400,
      joinedAt: '2021-09-21T23:55:18Z',
    });
  });

  it('signup returns the same fields', async () => {
    bodyFor = () => ({ data: { ...LOGIN_BODY.data, id: 490554 } });
    const res = await ck.signup({
      fullname: 'A',
      email: 'a@example.test',
      password: 'p',
      mobileNumber: '9876543210',
      otpGuid: 'g',
      otp: '1234',
      deviceId: 'dev-1',
    });
    expect(res.userId).toBe('490554');
    expect(res.segment.ids).toEqual(['1629794787', '1629794721']);
  });

  it('refresh returns the fields it carries, and leaves out the ones it does not', async () => {
    bodyFor = () => ({ data: { type: 'auth', id: 17, attributes: { access_token: 'a2', segment_id: [] } } });
    const res = await ck.refreshTokens('refresh-1');
    expect(res).toEqual({ accessToken: 'a2', refreshToken: undefined, userId: '17', segment: { ids: [] } });

    bodyFor = () => ({ data: { type: 'auth', attributes: { access_token: 'a3' } } });
    const bare = await ck.refreshTokens('refresh-1');
    expect(bare.userId).toBeUndefined();
    expect(bare.segment).toEqual({});
  });
});

describe('segmentFilterValue (the new-user segment 888888888)', () => {
  const joined = '2026-11-20T00:00:00Z';
  const joinedMs = Date.parse(joined);
  const seg = { ids: ['1629794787', ck.NEW_USER_SEGMENT_ID], newUserExpirySec: 86400, joinedAt: joined };

  it('joins the ids with commas and keeps 888888888 inside its window', () => {
    expect(ck.segmentFilterValue(seg, joinedMs + 1000)).toBe('1629794787,888888888');
  });

  it('drops 888888888 once user_joined_at + new_user_segment_expiry_time_sec has passed', () => {
    expect(ck.segmentFilterValue(seg, joinedMs + 86400 * 1000)).toBe('1629794787');
    expect(ck.segmentFilterValue({ ...seg, ids: [ck.NEW_USER_SEGMENT_ID] }, joinedMs + 86400 * 1000 + 1)).toBeUndefined();
  });

  it('sends the ids as given when the window cannot be read', () => {
    expect(ck.segmentFilterValue({ ids: [ck.NEW_USER_SEGMENT_ID] }, joinedMs + 10 * 86400 * 1000)).toBe('888888888');
    expect(ck.segmentFilterValue({ ...seg, joinedAt: 'not a date' }, joinedMs + 10 * 86400 * 1000)).toBe(
      '1629794787,888888888',
    );
  });

  it('gives nothing for a guest or an empty list', () => {
    expect(ck.segmentFilterValue(null, 0)).toBeUndefined();
    expect(ck.segmentFilterValue({ ids: [] }, 0)).toBeUndefined();
  });
});

describe('filter[segmentid] on the offers calls', () => {
  const offerCalls = async () => {
    bodyFor = () => ({ data: [] });
    await ck.getCategoryOffers('miniapp/fashion');
    await ck.getOfferCategoryTree('miniapp');
    await ck.getOfferStore('flipkart');
    return urls.filter((u) => u.includes('/offers/'));
  };
  const cardRateCalls = async () => {
    urls.length = 0;
    bodyFor = () => ({ data: [] });
    await ck.getCardRateStores();
    return urls.filter((u) => u.includes('/offers/category/home-categories-exclusive'));
  };

  it('is sent on /offers/category/* and /offers/{slug} when a segment is known', async () => {
    ck.configureSegmentSource(() => ({ ids: ['1629794856', '1629794721'] }));
    const sent = await offerCalls();
    expect(sent).toHaveLength(3);
    for (const url of sent) expect(segmentParam(url)).toBe('1629794856,1629794721');
  });

  it('is NOT sent on the card-rate call, and the store call still has it (2026-11-23)', async () => {
    ck.configureSegmentSource(() => ({ ids: ['1629794856', '1629794721'] }));
    const card = await cardRateCalls();
    expect(card).toHaveLength(1);
    expect(segmentParam(card[0])).toBeNull();
    expect(card[0]).not.toContain('segmentid');
    urls.length = 0;
    bodyFor = () => ({ data: [] });
    await ck.getOfferStore('flipkart');
    expect(segmentParam(urls[0])).toBe('1629794856,1629794721');
  });

  it('never adds 888888888 itself: only the stored ids are sent', async () => {
    ck.configureSegmentSource(() => ({ ids: ['1629794856'] }));
    for (const url of await offerCalls()) {
      expect(segmentParam(url)).toBe('1629794856');
      expect(url).not.toContain(ck.NEW_USER_SEGMENT_ID);
    }
    ck.configureSegmentSource(() => null);
    for (const url of await offerCalls()) expect(url).not.toContain(ck.NEW_USER_SEGMENT_ID);
    expect(ck.segmentFilterValue({ ids: ['1'] }, 0)).toBe('1');
    expect(ck.segmentFilterValue({ ids: [] }, 0)).toBeUndefined();
  });

  it('is absent for a guest (no source, or a source that gives null)', async () => {
    for (const url of await offerCalls()) expect(segmentParam(url)).toBeNull();
    urls.length = 0;
    ck.configureSegmentSource(() => null);
    for (const url of await offerCalls()) expect(segmentParam(url)).toBeNull();
  });

  it('is absent when the user has no segment, and is not sent on /offers/categories', async () => {
    ck.configureSegmentSource(() => ({ ids: [] }));
    for (const url of await offerCalls()) expect(segmentParam(url)).toBeNull();
    ck.configureSegmentSource(() => ({ ids: ['1'] }));
    bodyFor = () => ({ data: [] });
    await ck.getOfferCategories();
    expect(segmentParam(urls[urls.length - 1])).toBeNull();
  });
});

describe('getProfile (TC-44)', () => {
  it('keeps the row id even when an attribute is named id', async () => {
    bodyFor = () => ({
      data: [{ type: 'user', id: 42, attributes: { id: 'not-the-user', fullname: 'Asha', email: 'a@example.test' } }],
    });
    const profile = await ck.getProfile('token-1');
    expect(profile.id).toBe(42);
    expect(profile.fullname).toBe('Asha');
  });
});
