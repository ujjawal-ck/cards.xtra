/**
 * Every schema must accept the real responses we've captured (staging/prod)
 * and the examples in CashKaro's API doc. If CK changes a shape, re-capture the
 * fixture: a failure here means a mapper may need updating.
 */
import * as S from '../index';
import { checkContract, setContractReporter, __resetContractReports } from '../validate';

const fx = (name: string) => require(`../../__fixtures__/${name}.json`);

const cases: Array<[string, keyof typeof S, string]> = [
  ['staging earnings', 'EarningsResponse', 'staging.earnings'],
  ['doc earnings', 'EarningsResponse', 'doc.earnings'],
  ['staging profile', 'ProfileResponse', 'staging.profile'],
  ['staging orders (empty)', 'OrdersResponse', 'staging.orders'],
  ['doc orders', 'OrdersResponse', 'doc.orders'],
  ['doc order detail', 'OrderDetailResponse', 'doc.order_detail'],
  ['staging offers by category', 'OffersByCategoryResponse', 'staging.offers_category'],
  ['staging home-exclusive offers', 'OffersByCategoryResponse', 'staging.offers_home_exclusive'],
  ['staging merchant offer', 'MerchantOfferResponse', 'staging.offer_store'],
  ['doc payment info', 'PaymentInfoResponse', 'doc.payment_info'],
  ['doc sendotp', 'SendOtpResponse', 'doc.sendotp'],
  ['doc payment request', 'PaymentRequestResponse', 'doc.payment_v1'],
  ['staging retailers (empty)', 'McRetailersResponse', 'staging.mc_retailers'],
  ['doc retailers', 'McRetailersResponse', 'doc.mc_retailers'],
  ['doc exit click dates', 'McExitDatesResponse', 'doc.mc_exit_dates'],
  ['staging claims queue (empty)', 'McQueueResponse', 'staging.mc_queue_pending'],
  ['doc claims queue', 'McQueueResponse', 'doc.mc_queue'],
];

describe('response contracts accept real responses', () => {
  it.each(cases)('%s', (_label, schema, fixture) => {
    const r = (S[schema] as any).safeParse(fx(fixture));
    if (!r.success) throw new Error(JSON.stringify(r.error.issues.slice(0, 3)));
  });
});

describe('response contracts catch drift', () => {
  it('flags a renamed attribute the mapper depends on', () => {
    const drifted = JSON.parse(JSON.stringify(fx('staging.offers_category')));
    delete drifted.data[0].attributes.unique_identifier;
    expect(S.OffersByCategoryResponse.safeParse(drifted).success).toBe(false);
  });

  it('flags data turning from an array into an object', () => {
    const drifted = { data: fx('staging.earnings').data[0] };
    expect(S.EarningsResponse.safeParse(drifted).success).toBe(false);
  });

  it('tolerates new fields', () => {
    const extra = JSON.parse(JSON.stringify(fx('staging.earnings')));
    extra.data[0].attributes.brand_new_field = { x: 1 };
    expect(S.EarningsResponse.safeParse(extra).success).toBe(true);
  });

  it('reports a violation once per endpoint, with field paths', () => {
    __resetContractReports();
    const seen: any[] = [];
    setContractReporter((v) => seen.push(v));
    checkContract('users/earnings', S.EarningsResponse, { data: [] });
    checkContract('users/earnings', S.EarningsResponse, { data: [] });
    expect(seen).toHaveLength(1);
    expect(seen[0].endpoint).toBe('users/earnings');
    expect(seen[0].issues[0]).toMatch(/^data/);
  });
});
