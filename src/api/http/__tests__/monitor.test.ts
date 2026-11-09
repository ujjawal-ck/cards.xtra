import { createHttpMonitor, endpointGroup } from '../monitor';
import { ApiError } from '../errors';
import { redact } from '../../../lib/redact';
import type { HttpEvent } from '../client';

const ev = (over: Partial<HttpEvent>): HttpEvent => ({
  requestId: '0123456789abcdef',
  method: 'GET',
  endpoint: 'GET ckminapps.com/v1/users/orders',
  status: 200,
  durationMs: 120,
  attempt: 1,
  ...over,
});

describe('endpointGroup', () => {
  it.each([
    ['GET ckminapps.com/v1/users/orders/98765', 'users/orders/:id'],
    ['GET ckminapps.com/v1/offers/flipkart', 'offers/:slug'],
    ['GET ckminapps.com/v1/offers/category/ck-white-labels', 'offers/category/:slug'],
    ['GET ckapistaging.lmssecure.com/v1/users/missingcashback/exitclickdates/412', 'users/missingcashback/exitclickdates/:id'],
    ['POST platform.bankkaro.com/partner/cardgenius/cards', 'cardgenius/cards'],
    ['GET platform.bankkaro.com/partner/cardgenius/cards/hdfc-millennia', 'cardgenius/cards/:alias'],
    ['GET ckminapps.com/v1/token', 'token'],
  ])('%s → %s', (input, out) => expect(endpointGroup(input)).toBe(out));
});

describe('http monitor', () => {
  function setup() {
    const sinks = { log: jest.fn(), breadcrumb: jest.fn(), trackApiError: jest.fn(), recordError: jest.fn() };
    return { sinks, observe: createHttpMonitor(sinks) };
  }

  it('logs successes without reporting errors', () => {
    const { sinks, observe } = setup();
    observe(ev({}));
    expect(sinks.log.mock.calls[0][0]).toBe('[api] GET users/orders 200 120ms #01234567');
    expect(sinks.trackApiError).not.toHaveBeenCalled();
  });

  it('ignores a failed attempt that will be retried, reports the final one', () => {
    const { sinks, observe } = setup();
    const err = new ApiError('Bad gateway', 502, undefined, { kind: 'http' });
    observe(ev({ status: 502, error: err, willRetry: true }));
    expect(sinks.trackApiError).not.toHaveBeenCalled();
    observe(ev({ status: 502, error: err, attempt: 3 }));
    expect(sinks.trackApiError).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint_group: 'users/orders', status: 502, error_kind: 'http', attempt: 3 }),
    );
    expect(sinks.recordError).toHaveBeenCalledTimes(1);
  });

  it('counts 4xx in GA4 but does not raise a Crashlytics non-fatal', () => {
    const { sinks, observe } = setup();
    const err = new ApiError('Invalid OTP', 422, { errors: [{ code: '7002', detail: 'Invalid OTP' }] });
    observe(ev({ method: 'POST', endpoint: 'POST ckminapps.com/v1/login', status: 422, error: err }));
    expect(sinks.trackApiError).toHaveBeenCalledWith(expect.objectContaining({ error_code: '7002', endpoint_group: 'login' }));
    expect(sinks.recordError).not.toHaveBeenCalled();
  });

  it('stays silent when the user navigated away (aborted)', () => {
    const { sinks, observe } = setup();
    observe(ev({ status: 0, error: new ApiError('aborted', 0, undefined, { kind: 'aborted' }) }));
    expect(sinks.trackApiError).not.toHaveBeenCalled();
  });

  it('never puts an id or slug from the URL into the reported group', () => {
    const { sinks, observe } = setup();
    observe(ev({ endpoint: 'GET ckminapps.com/v1/users/orders/4455667788', status: 0, error: new ApiError('x', 0, undefined, { kind: 'timeout' }) }));
    expect(JSON.stringify(sinks.trackApiError.mock.calls)).not.toContain('4455667788');
  });
});

describe('redact', () => {
  it('scrubs tokens, mobiles, emails and OTPs', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc_DEF-123';
    const out = redact(
      `Bearer ${jwt} sent to +91 9876543210 or 9876543210, mail a.b@x.com {"otp": 123456} otp=654321 api_key=secretvalue`,
    );
    expect(out).not.toMatch(/eyJ|9876543210|a\.b@x\.com|123456|654321|secretvalue/);
  });

  it('leaves already-masked numbers and ordinary text alone', () => {
    expect(redact('OTP sent to 98XXXX5510, order 12345 for ₹250')).toBe('OTP sent to 98XXXX5510, order 12345 for ₹250');
  });
});
