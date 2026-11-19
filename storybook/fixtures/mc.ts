/**
 * Missing cashback (/ck/users/missingcashback/*, /ck/users/tickets/*) fixtures.
 * Shapes: src/api/missingCashback.ts (McRetailer, McExitClick, McClaim,
 * McQueueResponse) and decideSubmitOutcome in src/api/missingCashbackMapper.ts.
 */
import docRetailers from '../../src/api/__fixtures__/doc.mc_retailers.json';
import stagingRetailers from '../../src/api/__fixtures__/staging.mc_retailers.json';
import docExitDates from '../../src/api/__fixtures__/doc.mc_exit_dates.json';
import docQueue from '../../src/api/__fixtures__/doc.mc_queue.json';
import stagingQueuePending from '../../src/api/__fixtures__/staging.mc_queue_pending.json';
import type { ApiRequest } from '../harness/apiMock';
import { reply } from '../harness/apiMock';
import type { McClaimDraft } from '../../src/navigation/types';
import { FAKE, clone } from './scrub';
import { assetUri, images } from './assets';

const ASSET = 'https://asset9.ckassets.com/resources/image/stores';

/** GET /users/missingcashback/retailers. */
export const mcRetailersFixture = {
  /** doc.mc_retailers.json: Flipkart (group C2), Amazon (group ""). */
  default: clone(docRetailers),
  /** A wider list, one store per flow group (A, B1, C1, C2, D). */
  allGroups: {
    meta: { total_records: 5, page_number: '1', page_size: '100' },
    data: [
      { type: 'retailers', id: 10065834, attributes: { report_merchant_name: 'Flipkart', group: 'C2', tracking_speed: '36h', image_url: `${ASSET}/flipkart-1640149920.png` } },
      { type: 'retailers', id: 10065455, attributes: { report_merchant_name: 'Amazon', group: 'A', tracking_speed: '1h 12m', image_url: `${ASSET}/amazon-1655287768.png` } },
      { type: 'retailers', id: 10065901, attributes: { report_merchant_name: 'Ajio', group: 'B1', tracking_speed: '72h', image_url: `${ASSET}/ajio-coupons-1-1640149348.png` } },
      { type: 'retailers', id: 10065902, attributes: { report_merchant_name: 'Myntra', group: 'C1', tracking_speed: '48h', image_url: assetUri(images.brands.myntra) } },
      { type: 'retailers', id: 10065903, attributes: { report_merchant_name: 'Nykaa', group: 'D', tracking_speed: '24h', image_url: assetUri(images.brands.nykaa) } },
    ],
  },
  /** staging.mc_retailers.json: no visits → MissingCashbackOops / NoVisitsEmpty. */
  empty: clone(stagingRetailers),
};

/** GET /users/missingcashback/exitclickdates/:storeId. doc.mc_exit_dates.json (Amazon, Aug 2022; order id format meta). */
export const mcExitDatesFixture = {
  default: clone(docExitDates),
  /** Recent dates in two months, with exit ids. */
  recent: {
    data: [
      { type: 'clickdates', id: 'LCCHKR20261102000001', attributes: { exitclick_date: '2026-11-02', month: 'November' } },
      { type: 'clickdates', id: 'LCCHKR20261109000002', attributes: { exitclick_date: '2026-11-09', month: 'November' } },
      { type: 'clickdates', id: 'LCCHKR20261024000003', attributes: { exitclick_date: '2026-10-24', month: 'October' } },
    ],
    meta: clone(docExitDates.meta),
  },
  empty: { data: [], meta: {} },
};

/** A valid Amazon order id for the doc exit-dates format (fixture sample, not a real order). */
export const MC_SAMPLE_ORDER_ID = '962-1198956-0957613';

// GET /users/missingcashback/queue: the doc rows with fake order ids, split by status.
const docRows = clone(docQueue.data).map((row, i) => ({
  ...row,
  attributes: { ...row.attributes, order_id: FAKE.orderId(i + 1) },
}));

const extraRows = [
  {
    // In review, group B1: needs "new or existing user" → NewUserCheck.
    type: 'list', id: 101,
    attributes: {
      callback_id: null, ticket_id: null, cashback_id: null, store_id: 16191, exit_id: 'LCCHKR20261109000002',
      click_date: '2026-11-09', order_id: FAKE.orderId(4), order_amount: '1499.00', details: 'Additional details required',
      comments: null, status: 'Pending', report_storename: 'Ajio', imageurl: `${ASSET}/ajio-coupons-1-1640149348.png`,
      ticket_comments: null, cashbackvalue: null, ticket_status: null, groupid: 'B1', status_update: '2026-11-10T08:02:24Z',
    },
  },
  {
    // Closed and tracked: cashback_id set → "View Details" opens the order.
    type: 'list', id: 102,
    attributes: {
      callback_id: null, ticket_id: null, cashback_id: 24600003, store_id: 1999, exit_id: 'LCCHKR20261024000003',
      click_date: '2026-10-24', order_id: FAKE.orderId(5), order_amount: '2600.00', details: 'Cashback tracked',
      comments: null, status: 'Resolved', report_storename: 'Amazon', imageurl: `${ASSET}/amazon-1655287768.png`,
      ticket_comments: null, cashbackvalue: '312.00', ticket_status: null, groupid: 'A', status_update: '2026-10-26T10:00:28Z',
    },
  },
];

const allRows = [...docRows, ...extraRows];
const pendingRows = allRows.filter((r) => r.attributes.status === 'Pending');
const resolvedRows = allRows.filter((r) => r.attributes.status === 'Resolved');

function queueBody(rows: typeof allRows, status: string) {
  return {
    meta: { total_records: rows.length, page_number: 1, page_size: 50, pending: pendingRows.length, resolved: resolvedRows.length, others: 1, has_exits: 'yes' },
    links: { self: `/missingcashback/queue?filter[status]=${status}` },
    data: rows,
  };
}

export const mcQueueFixture = {
  /** filter[status]=Pending rows (In Review tab + counts). */
  pending: queueBody(pendingRows, 'Pending'),
  /** filter[status]=Resolved rows (Closed tab; row 99 has a ticket → Others tab). */
  resolved: queueBody(resolvedRows, 'Resolved'),
  /** staging.mc_queue_pending.json: no claims. */
  empty: clone(stagingQueuePending),
  /** Responder: answers by the filter[status] query, like the API. Default for api.ok(). */
  byStatus: (req: ApiRequest) =>
    req.query.get('filter[status]') === 'Resolved' ? mcQueueFixture.resolved : mcQueueFixture.pending,
  /** 404 is treated as empty by the app. */
  notFound: reply.code(404, '404', 'No records found'),
};

/**
 * POST /users/missingcashback/queue and PUT /queue/:id (McQueueResponse).
 * One body per branch of decideSubmitOutcome.
 */
export const mcSubmitFixture = {
  /** meta.cashback_id → MissingCashbackResult variant 'tracked'. */
  tracked: { data: { type: 'missingcashback', id: 103 }, meta: { message: 'Cashback tracked', cashback_id: 24600003, status: 'Resolved', cashbackvalue: '312.00', cashback_type: 'Cashback', under_tracking: 'no' } },
  /** meta.status 'Resolved' (no cashback id) → variant 'queued' "processed". */
  resolved: { data: { type: 'missingcashback', id: 104 }, meta: { message: 'Claim processed', status: 'Resolved', under_tracking: 'no' } },
  /** meta.under_tracking 'yes' → variant 'tracking'. */
  underTracking: { data: { type: 'missingcashback', id: 105 }, meta: { message: 'Under auto-tracking', status: 'Pending', under_tracking: 'yes' } },
  /** meta.status 'Pending' → B1 NewUserCheck / C1 CategorySelect / C2 InvoiceUpload (by store group), else 'queued'. Default. */
  pending: { data: { type: 'missingcashback', id: 106 }, meta: { message: 'Added to queue', status: 'Pending', under_tracking: 'no' } },
  /** 400 duplicate claim. */
  duplicate: reply.code(400, '6001', 'A claim for this order already exists.'),
};

/** POST /users/missingcashback/validate. Any 2xx is valid; an error throws (inline error in the app). */
export const mcValidateFixture = {
  valid: { data: { type: 'missingcashback', id: 1 }, meta: { message: 'Valid' } },
  invalidOrderId: reply.code(400, '6002', 'Please enter a valid order ID.'),
};

/** POST /users/tickets/:date/:storeId/:exitId (multipart). The app reads data.id || data.attributes.ticket_id. */
export const mcTicketFixture = {
  default: { data: { type: 'ticket', id: 413500, attributes: { ticket_id: 413500 } }, meta: { message: 'Ticket raised' } },
};

/** Route params for the claim flow screens. */
export const mcDraftFixture = {
  /** WhereDidYouShop → ChooseDate (Amazon, group A). */
  start: { storeId: '10065455', storeName: 'Amazon', storeLogoUri: `${ASSET}/amazon-1655287768.png`, group: 'A', trackingSpeed: '1h 12m' } satisfies McClaimDraft,
  /** ChooseDate → EnterOrderId. */
  withDate: { storeId: '10065455', storeName: 'Amazon', storeLogoUri: `${ASSET}/amazon-1655287768.png`, group: 'A', trackingSpeed: '1h 12m', exitDate: '2022-08-12', exitId: '' } satisfies McClaimDraft,
  /** EnterOrderId → EnterAmount. */
  withOrderId: { storeId: '10065455', storeName: 'Amazon', storeLogoUri: `${ASSET}/amazon-1655287768.png`, group: 'A', trackingSpeed: '1h 12m', exitDate: '2022-08-12', exitId: '', orderId: MC_SAMPLE_ORDER_ID } satisfies McClaimDraft,
  /** Queued B1 claim → NewUserCheck. */
  b1Queued: { storeId: '10065901', storeName: 'Ajio', group: 'B1', trackingSpeed: '72h', exitDate: '2026-11-09', exitId: 'LCCHKR20261109000002', orderId: FAKE.orderId(4), orderAmount: '1499', queueId: '101' } satisfies McClaimDraft,
  /** Queued C1 claim → CategorySelect. */
  c1Queued: { storeId: '10065902', storeName: 'Myntra', group: 'C1', trackingSpeed: '48h', exitDate: '2026-11-02', exitId: 'LCCHKR20261102000001', orderId: FAKE.orderId(6), orderAmount: '899', queueId: '107' } satisfies McClaimDraft,
  /** C2 claim → InvoiceUpload. */
  c2Queued: { storeId: '10065834', storeName: 'Flipkart', group: 'C2', trackingSpeed: '36h', exitDate: '2026-11-02', exitId: 'LCCHKR20261102000001', orderId: FAKE.orderId(7), orderAmount: '2199', queueId: '108' } satisfies McClaimDraft,
};
