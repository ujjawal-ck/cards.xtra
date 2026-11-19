/**
 * L1: the invoice upload gets its own 60 s deadline and is never marked
 * idempotent (a POST is then never retried, so no duplicate ticket). Other
 * Missing Cashback calls keep the client default.
 */
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://bff.test';

const mockCk = jest.fn(async (..._args: unknown[]) => ({ data: { id: 't-1' } }));
jest.mock('../cashkaro', () => ({ ck: (...args: unknown[]) => mockCk(...args) }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mc = require('../missingCashback');

const data = { transaction_id: 'OD1', transaction_details: 'OD1' };
const file = { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' };
const optsOf = (i = 0) => mockCk.mock.calls[i][1] as Record<string, unknown>;

describe('raiseTicket deadline', () => {
  it('is 60 seconds', () => {
    expect(mc.INVOICE_UPLOAD_TIMEOUT_MS).toBe(60_000);
  });

  it('the upload (with files) passes the 60 s deadline and is not retried', async () => {
    await mc.raiseTicket('tok', '2026-11-01', '5', 'e1', data, [file]);
    expect(optsOf().method).toBe('POST');
    expect(optsOf().timeoutMs).toBe(60_000);
    expect(optsOf().idempotent).toBeUndefined();
  });

  it('a ticket with no files keeps the default deadline', async () => {
    await mc.raiseTicket('tok', '2026-11-01', '5', 'e1', data, []);
    expect(optsOf().timeoutMs).toBeUndefined();
  });

  it('other calls keep the default deadline', async () => {
    await mc.submitQueue('tok', '5', '2026-11-01', 'OD1', '100');
    await mc.validateClaim('tok', '5', '2026-11-01', 'OD1');
    expect(optsOf(0).timeoutMs).toBeUndefined();
    expect(optsOf(1).timeoutMs).toBeUndefined();
  });
});
