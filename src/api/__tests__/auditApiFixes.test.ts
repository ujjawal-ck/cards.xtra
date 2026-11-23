/**
 * API audit fixes D4, D7, D13: claims-queue paging, the store page upsell,
 * ticket-upload limits and the 422 field-map message. Fixture shapes are copied
 * from the CashKaro mini-app doc.
 */
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://bff.test';

const mockCk = jest.fn();
jest.mock('../cashkaro', () => ({ ck: (...args: unknown[]) => mockCk(...args) }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mc = require('../missingCashback');
import { mapOfferStore, mapCategoryOffers, upsellTimerValue } from '../offersMapper';
import { messageFromBody, ApiError } from '../http/errors';

const claim = (id: number) => ({ type: 'missingcashback', id: String(id), attributes: { order_id: `O${id}`, status: 'Pending' } });
const pageOf = (ids: number[], next: string | null, total?: number) => ({
  data: ids.map(claim),
  meta: { total_records: total ?? ids.length, pending: 3 },
  links: { next },
});
const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i);
const pageArg = (i: number) => (mockCk.mock.calls[i][1] as any).query['page[number]'];

beforeEach(() => mockCk.mockReset());

describe('D4: claims queue paging', () => {
  it('finds an item that is on page 2', async () => {
    mockCk
      .mockResolvedValueOnce(pageOf(range(1, 50), 'https://x/queue?page[number]=2', 60))
      .mockResolvedValueOnce(pageOf(range(51, 10), null, 60));
    const item = await mc.getQueueItem('tok', '55');
    expect(item?.id).toBe('55');
    expect(mockCk).toHaveBeenCalledTimes(2);
    expect(pageArg(1)).toBe(2);
  });

  it('checks Resolved after Pending, and returns null when it is in neither', async () => {
    mockCk.mockResolvedValue(pageOf([1, 2], null));
    expect(await mc.getQueueItem('tok', '999')).toBeNull();
    expect(mockCk).toHaveBeenCalledTimes(2);
    expect((mockCk.mock.calls[0][1] as any).query['filter[status]']).toBe('Pending');
    expect((mockCk.mock.calls[1][1] as any).query['filter[status]']).toBe('Resolved');
  });

  it('stops at the page cap even when links.next keeps coming', async () => {
    mockCk.mockImplementation(async () => pageOf(range(1, 50), 'https://x/next', 9999));
    expect(await mc.getQueueItem('tok', 'none')).toBeNull();
    // 10 pages for Pending + 10 for Resolved.
    expect(mockCk).toHaveBeenCalledTimes(mc.QUEUE_MAX_PAGES * 2);
  });

  it('getQueueAll joins pages, keeps first-page meta, and caps at 10 pages', async () => {
    mockCk.mockImplementation(async (_p: string, o: any) =>
      pageOf(range((o.query['page[number]'] - 1) * 50 + 1, 50), 'https://x/next', 9999),
    );
    const all = await mc.getQueueAll('tok', 'Pending');
    expect(mockCk).toHaveBeenCalledTimes(10);
    expect(all.data).toHaveLength(500);
    expect(all.meta.pending).toBe(3);
  });

  it('without links, meta.total_records decides; an empty page stops', async () => {
    mockCk
      .mockResolvedValueOnce({ data: range(1, 50).map(claim), meta: { total_records: 70 } })
      .mockResolvedValueOnce({ data: range(51, 20).map(claim), meta: { total_records: 70 } });
    expect((await mc.getQueueAll('tok', 'Pending')).data).toHaveLength(70);
    expect(mockCk).toHaveBeenCalledTimes(2);

    mockCk.mockReset();
    mockCk.mockResolvedValueOnce({ data: [], meta: { total_records: 5 } });
    expect((await mc.getQueueAll('tok', 'Pending')).data).toEqual([]);
    expect(mockCk).toHaveBeenCalledTimes(1);
  });
});

describe('D7: store page upsell', () => {
  const store = (attributes: object) => mapOfferStore({ data: { id: '1', attributes: { name: 'Shop', ...attributes } } })!;

  it('reads attributes.upsell on the store endpoint', () => {
    const s = store({
      upsell: {
        cashback_upsell_button_text: 'Flat Rs 50 extra',
        cashback_expiry_date: '2027-12-30T10:30:00Z',
        primary_cashback_amount: '10',
      },
    });
    expect(s.isUpsell).toBe(true);
    expect(s.upsellText).toBe('Flat Rs 50 extra');
    expect(s.upsellExpiry).toBe('2027-12-30T10:30:00Z');
  });

  it('no upsell block and no top-level text means no upsell card', () => {
    expect(store({}).isUpsell).toBe(false);
  });

  it('keeps the top-level read for list-row attributes', () => {
    const s = store({ cashback_upsell_button_text: 'Row text' });
    expect(s.upsellText).toBe('Row text');
  });

  it('list mapping is unchanged', () => {
    expect(() => mapCategoryOffers({ data: [] })).not.toThrow();
  });

  it('formats the countdown as dd:hh:mm, and ignores a past or bad date', () => {
    const now = Date.parse('2027-12-28T08:00:00Z');
    expect(upsellTimerValue('2027-12-30T10:30:00Z', now)).toBe('02:02:30');
    expect(upsellTimerValue('2027-12-01T00:00:00Z', now)).toBeUndefined();
    expect(upsellTimerValue('nope', now)).toBeUndefined();
    expect(upsellTimerValue(undefined, now)).toBeUndefined();
  });
});

describe('D13: ticket upload limits and 422 message', () => {
  const f = (type: string, size = 1000, name = 'a') => ({ type, size, name });

  it('accepts up to 3 files of the allowed types under 2 MB', () => {
    expect(mc.checkInvoiceFiles(0, [f('image/jpeg'), f('image/png'), f('image/gif')])).toBeNull();
    expect(mc.checkInvoiceFiles(2, [f('application/pdf', mc.INVOICE_MAX_BYTES)])).toBeNull();
  });

  it('PDF: accepts 1.5 MB, refuses 3 MB, and counts toward the 3-file limit', () => {
    const MB = 1024 * 1024;
    expect(mc.checkInvoiceFiles(0, [f('application/pdf', 1.5 * MB, 'bill.pdf')])).toBeNull();
    expect(mc.checkInvoiceFiles(0, [f('application/pdf', 3 * MB, 'bill.pdf')])).toMatch(/2 MB/);
    expect(mc.checkInvoiceFiles(2, [f('application/pdf', MB, 'a.pdf'), f('image/png')])).toMatch(/up to 3/);
    expect(mc.checkInvoiceFiles(3, [f('application/pdf', MB, 'a.pdf')])).toMatch(/up to 3/);
  });

  it('refuses a fourth file', () => {
    expect(mc.checkInvoiceFiles(3, [f('image/jpeg')])).toMatch(/up to 3/);
    expect(mc.checkInvoiceFiles(0, [1, 2, 3, 4].map(() => f('image/jpeg')))).toMatch(/up to 3/);
  });

  it('refuses a file over 2 MB', () => {
    expect(mc.checkInvoiceFiles(0, [f('image/jpeg', mc.INVOICE_MAX_BYTES + 1)])).toMatch(/2 MB/);
  });

  it('refuses HEIC and BMP, by type or by extension', () => {
    expect(mc.checkInvoiceFiles(0, [f('image/heic')])).toMatch(/JPG, PNG, GIF or PDF/);
    expect(mc.checkInvoiceFiles(0, [f('image/bmp')])).toMatch(/JPG, PNG, GIF or PDF/);
    expect(mc.checkInvoiceFiles(0, [{ name: 'x.bmp' }])).toMatch(/JPG, PNG, GIF or PDF/);
    expect(mc.checkInvoiceFiles(0, [{ name: 'x.JPG' }])).toBeNull();
  });

  it('turns the 422 field map into a readable message', () => {
    const body = { ticket_attachment: ['The ticket attachment must not have more than 3 files'] };
    expect(messageFromBody(body, 422)).toBe('The ticket attachment must not have more than 3 files.');
    const err = new ApiError(messageFromBody(body, 422), 422, body);
    expect(err.message).toContain('more than 3 files');
  });

  it('joins several fields, and leaves JSON:API and other statuses alone', () => {
    expect(messageFromBody({ transaction_id: ['Required.'], 'ticket_attachment.2': ['Too big.'] }, 422)).toBe(
      'Required. Too big.',
    );
    expect(messageFromBody({ errors: [{ detail: 'Bad' }] }, 422)).toBe('Bad');
    expect(messageFromBody({ ticket_attachment: ['x'] }, 400)).toBe('Request failed (400)');
    expect(messageFromBody({}, 422)).toBe('Request failed (422)');
  });
});
