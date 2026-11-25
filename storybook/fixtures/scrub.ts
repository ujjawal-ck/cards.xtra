/**
 * Deep clone + replace personal data in raw fixture JSON.
 * The JSON files in src/api/__fixtures__ are shared module objects: never
 * mutate them, always clone first.
 */
export const FAKE = {
  phone: '98XXXXXX10',
  email: 'user@example.com',
  name: 'Test User',
  upi: 'testuser@okaxis',
  account: 'XXXXXXXX1234',
  ifsc: 'TEST0000001',
  orderId: (n: number) => `CKORDER${String(n).padStart(4, '0')}`,
} as const;

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/** Replacement for a redacted or personal string, chosen by its key name. */
function fakeFor(key: string): string {
  const k = key.toLowerCase();
  if (k.includes('mobile') || k.includes('phone') || k === 'sent_to') return FAKE.phone;
  if (k.includes('email')) return FAKE.email;
  if (k.includes('upi')) return FAKE.upi;
  if (k.includes('account_number')) return FAKE.account;
  if (k.includes('ifsc')) return FAKE.ifsc;
  return FAKE.name;
}

/** Clone and replace every "<redacted>" string (and other PII keys) with fake values. */
export function scrub<T>(x: T): T {
  const walk = (v: unknown, key: string): unknown => {
    if (Array.isArray(v)) return v.map((item) => walk(item, key));
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) out[k] = walk(val, k);
      return out;
    }
    if (typeof v === 'string' && v.trim() === '<redacted>') return fakeFor(key);
    return v;
  };
  return walk(clone(x), '') as T;
}
