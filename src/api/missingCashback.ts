/**
 * missingCashback.ts — CashKaro "Missing Cashback" claim flow (user token).
 *
 * Ported from the CashKaro web prototype (src/lib/api.ts) — same staging
 * backend, same JSON:API envelopes. All calls use the logged-in user's
 * access token (aws-token → "invalid signature", like orders/earnings).
 *
 * Endpoints:
 *   GET  /users/missingcashback/retailers            — stores you can claim against
 *   GET  /users/missingcashback/exitclickdates/:id   — your visit dates + order-id meta
 *   POST /users/missingcashback/validate             — validate {store, date, orderId}
 *   POST /users/missingcashback/queue                — submit the claim
 *   GET  /users/missingcashback/queue?filter[status] — claims list (tabs)
 *   PUT  /users/missingcashback/queue/:id            — add details (user_type / category)
 *   POST /users/tickets/:date/:store/:exit           — raise a ticket (+ invoice files)
 *
 * Param parity with the prototype: `device` is sent ONLY on the retailers GET
 * (the write endpoints + exitclickdates/queue GET omit it).
 */
import { CK } from '../config/env';
import { ck } from './cashkaro';
import * as Schemas from './schemas';

// ── JSON:API shapes (confirmed against the web prototype's interfaces) ───────

export interface McRetailer {
  id: string | number;
  type: string;
  attributes: {
    store_id?: string;
    store_name?: string;
    store_logo?: string;
    image_url?: string;
    report_merchant_name?: string;
    group?: string; // A | B1 | B2 | C1 | C2 | D — drives the flow
    tracking_speed?: string; // "72h", "1h 12m", "48h" …
    total_clicks?: number;
    tracked_clicks?: number;
  };
}

export interface McExitClick {
  id: string;
  type: string;
  attributes: {
    exit_id?: string; // may be absent — fall back to `id`
    exit_date?: string;
    exitclick_date?: string;
    month?: string;
  };
}

export interface McExitMeta {
  sample_orderid?: string;
  orderid_hint_message?: string;
  orderid_format?: Record<string, string>; // map of "/regex/flags" strings
  report_merchant_name?: string;
}

export interface McClaim {
  id: string;
  type: string;
  attributes: {
    cashback_id?: number;
    store_id?: number;
    exit_id?: string;
    click_date?: string;
    order_id: string;
    order_amount?: string;
    details?: string;
    comments?: string | null;
    status: string;
    user_type?: string;
    category?: string;
    report_storename?: string;
    imageurl?: string;
    store_name?: string;
    merchant_name?: string;
    image_url?: string;
    cashbackvalue?: string;
    groupid?: string;
    cashback_type?: string;
    under_tracking?: string;
    status_update?: string;
    expected_resolution_date?: string;
    missing_txn_cashback_type?: string;
    missing_txn_cashback?: string;
    ticket_id?: string | null;
    ticket_status?: string | null;
  };
}

/** POST /queue and PUT /queue/:id response. `meta` drives the submit branch. */
export interface McQueueResponse {
  data: { type: string; id: string | number };
  meta?: {
    message?: string;
    cashback_id?: number;
    status?: string; // "Pending" | "Resolved" | …
    cashbackvalue?: string;
    cashback_type?: string;
    under_tracking?: string; // "yes" | "no"
  };
}

/** A file ready for multipart upload (RN file descriptor). */
export interface McTicketFile {
  uri: string;
  name: string;
  type: string; // mime, e.g. "image/jpeg"
}

export interface McTicketData {
  transaction_id: string;
  transaction_details: string;
  total_amount_paid?: number;
  missing_txn_queue_id?: number;
  query_type?: string; // → form field "type"
  query_sub_type?: string; // → form field "sub_type"
  cashback_id?: number;
}

// ── Reads ────────────────────────────────────────────────────────────────

/** Stores the user can raise a missing-cashback claim against. */
export async function getRetailers(userToken: string, page = 1, size = 100): Promise<{ data?: McRetailer[] }> {
  return ck('/users/missingcashback/retailers', { contract: ['mc/retailers', Schemas.McRetailersResponse],
    auth: { userToken },
    query: { device: CK.device, 'page[number]': page, 'page[size]': size },
  });
}

/** Visit/click dates for a store + order-id format meta. */
export async function getExitClickDates(
  userToken: string,
  storeId: string,
): Promise<{ data?: McExitClick[]; meta?: McExitMeta }> {
  return ck(`/users/missingcashback/exitclickdates/${encodeURIComponent(storeId)}`, { contract: ['mc/exitclickdates', Schemas.McExitDatesResponse],
    auth: { userToken },
  });
}

/** Claims list for one status tab (Pending | Resolved | Rejected). */
export async function getQueue(
  userToken: string,
  status: 'Pending' | 'Resolved' | 'Rejected',
  page = 1,
  size = 50,
): Promise<{ data?: McClaim[]; meta?: { pending?: number; resolved?: number; others?: number } }> {
  return ck('/users/missingcashback/queue', { contract: ['mc/queue', Schemas.McQueueResponse],
    auth: { userToken },
    query: { 'filter[status]': status, 'page[number]': page, 'page[size]': size },
  });
}

/**
 * Find one queue item by id (used after submit to hydrate exit_id/store_id for
 * the invoice/ticket step). The API has no by-id GET, so we scan Pending then
 * Resolved — mirrors the prototype.
 */
export async function getQueueItem(userToken: string, queueId: string): Promise<McClaim | null> {
  const inList = (res: { data?: McClaim[] }) =>
    (res.data || []).find((c) => String(c.id) === String(queueId)) || null;
  // "Not in either list" returns null. A failed request throws, so the
  // caller can show a retry instead of silently losing the claim.
  const pending = await getQueue(userToken, 'Pending', 1, 50);
  const found = inList(pending);
  if (found) return found;
  const resolved = await getQueue(userToken, 'Resolved', 1, 50);
  return inList(resolved);
}

// ── Writes ───────────────────────────────────────────────────────────────

/** Validate {store, exit date, order id} before submitting. Throws on invalid. */
export async function validateClaim(
  userToken: string,
  storeId: string,
  exitClickDate: string,
  orderId: string,
): Promise<any> {
  return ck('/users/missingcashback/validate', {
    method: 'POST',
    auth: { userToken },
    body: {
      data: {
        type: 'missingcashback',
        attributes: { storeid: storeId, exitclick_date: exitClickDate, order_id: orderId },
      },
    },
  });
}

/** Submit the claim to the queue. `orderAmount` is "0" for group D. */
export async function submitQueue(
  userToken: string,
  storeId: string,
  exitClickDate: string,
  orderId: string,
  orderAmount: string,
): Promise<McQueueResponse> {
  return ck('/users/missingcashback/queue', {
    method: 'POST',
    auth: { userToken },
    body: {
      data: {
        type: 'missingcashback',
        attributes: {
          storeid: storeId,
          exitclick_date: exitClickDate,
          order_id: orderId,
          order_amount: orderAmount,
        },
      },
    },
  });
}

/** Add details to a queued claim — B1 sends user_type, C1 sends category. */
export async function updateQueue(
  userToken: string,
  queueId: string,
  details: { user_type?: string; category?: string },
): Promise<McQueueResponse> {
  const attributes: Record<string, string> = {};
  if (details.user_type) attributes.user_type = details.user_type;
  if (details.category) attributes.category = details.category;
  return ck(`/users/missingcashback/queue/${encodeURIComponent(queueId)}`, {
    method: 'PUT',
    auth: { userToken },
    body: { data: { type: 'queue', attributes } },
  });
}

/**
 * Raise a ticket with invoice attachments (C1-"Other" / C2). Sends multipart
 * form-data: text fields + each file as `ticket_attachment`, `ticket_attachment1`…
 * When `files` is empty, falls back to a JSON:API body (no attachments).
 */
export async function raiseTicket(
  userToken: string,
  exitClickDate: string,
  storeId: string,
  exitId: string,
  data: McTicketData,
  files: McTicketFile[] = [],
): Promise<any> {
  const path = `/users/tickets/${encodeURIComponent(exitClickDate)}/${encodeURIComponent(
    storeId,
  )}/${encodeURIComponent(exitId)}`;

  if (files.length > 0) {
    const fd = new FormData();
    fd.append('transaction_id', data.transaction_id);
    fd.append('transaction_details', data.transaction_details);
    if (data.total_amount_paid && data.total_amount_paid > 0) {
      fd.append('total_amount_paid', String(data.total_amount_paid));
    }
    if (data.missing_txn_queue_id) fd.append('missing_txn_queue_id', String(data.missing_txn_queue_id));
    if (data.query_type) fd.append('type', data.query_type);
    if (data.query_sub_type) fd.append('sub_type', data.query_sub_type);
    if (data.cashback_id) fd.append('cashback_id', String(data.cashback_id));
    files.forEach((f, i) => {
      const field = i === 0 ? 'ticket_attachment' : `ticket_attachment${i}`;
      // RN FormData file descriptor.
      fd.append(field, { uri: f.uri, name: f.name, type: f.type } as any);
    });
    return ck(path, { method: 'POST', auth: { userToken }, body: fd });
  }

  // No files — JSON:API body.
  const attributes: Record<string, unknown> = {
    transaction_id: data.transaction_id,
    transaction_details: data.transaction_details,
  };
  if (data.total_amount_paid && data.total_amount_paid > 0) attributes.total_amount_paid = data.total_amount_paid;
  if (data.missing_txn_queue_id) attributes.missing_txn_queue_id = data.missing_txn_queue_id;
  if (data.query_type) attributes.type = data.query_type;
  if (data.query_sub_type) attributes.sub_type = data.query_sub_type;
  if (data.cashback_id) attributes.cashback_id = data.cashback_id;
  return ck(path, {
    method: 'POST',
    auth: { userToken },
    body: { data: { type: 'ticket', attributes } },
  });
}
