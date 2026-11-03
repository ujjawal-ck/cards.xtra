import { analytics } from '../analytics';

describe('analytics PII guard', () => {
  it('drops sensitive params and scrubs secrets, but keeps ids intact', () => {
    const seen: any[] = [];
    analytics.registerSink({ track: (_n, p) => seen.push(p), identify: () => undefined });
    analytics.track('api_error' as any, {
      mobile: '9876543210',
      otp: '123456',
      upi_id: 'x@upi',
      order_id: '9876543210',
      search_term: 'call me 9876543210',
      reason: 'token=eyJa.eyJb.c',
      method: 'otp',
    } as any);
    const p = seen[seen.length - 1];
    expect(p.mobile).toBeUndefined();
    expect(p.otp).toBeUndefined();
    expect(p.upi_id).toBeUndefined();
    expect(p.order_id).toBe('9876543210');
    expect(p.search_term).toBe('call me [mobile]');
    expect(p.reason).not.toContain('eyJ');
    expect(p.method).toBe('otp');
  });
});
