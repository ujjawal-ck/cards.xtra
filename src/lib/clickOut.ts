/**
 * clickOut.ts — builds the outbound link for a card "Apply Now" or a store
 * "Shop & Earn" so the click can be traced to the CashKaro user.
 *
 * Two link shapes reach the app:
 *   • CashKaro tracker — `https://<ck tracking host>/visitretailer/app/<id>?id=`
 *     (store `cashback_url`; card `cardTrackingUrl` once a host is set). The
 *     `id=` slot is the CashKaro user id; CashKaro records the exit click
 *     against it (which also feeds Missing Cashback).
 *   • Partner tracker (BankKaro `network_url`, e.g. track.techtrack.in) with
 *     `{user_id}` / `{click_id}` placeholders meant to be filled by us. They
 *     used to be stripped, so card clicks carried no user and no click id.
 *
 * Pure functions only (no React / RN) so the behaviour is easy to check.
 */
import { withTrackingUser } from './openUrl';

export type ClickOutLinkType = 'ck' | 'partner';

export interface BuiltClickOut {
  url: string;
  linkType: ClickOutLinkType;
  /** True when the link now identifies the user (who gets the cashback). */
  attributed: boolean;
}

const CK_TRACKER = /\/visitretailer\//i;
const PLACEHOLDER = /\{([^}]*)\}/g;

export function clickOutLinkType(url: string): ClickOutLinkType {
  return CK_TRACKER.test(url) ? 'ck' : 'partner';
}

/**
 * A per-click reference: base-36 time + random part, ~16 chars, URL-safe.
 * Sent as the partner `{click_id}` and logged with the click-out event so the
 * two can be reconciled later.
 */
export function newClickId(now: number = Date.now(), rand: () => number = Math.random): string {
  const r = Math.floor(rand() * 36 ** 8).toString(36).padStart(8, '0');
  return `cx${now.toString(36)}${r}`;
}

/**
 * Fill the link for this click.
 * - CashKaro link: put the user id in `id=` (unchanged behaviour).
 * - Partner link: `{user_id}` → user id, `{click_id}` → click id, any other
 *   placeholder → empty. No `id=` is appended (partners ignore it).
 * Without a user id (a guest who chose to continue) the link still opens,
 * just unattributed.
 */
export function buildClickOutUrl(
  rawUrl: string,
  opts: { userId?: string | null; clickId: string }
): BuiltClickOut {
  const url = rawUrl.trim();
  const userId = opts.userId ? String(opts.userId) : '';
  const linkType = clickOutLinkType(url);

  if (linkType === 'ck') {
    return {
      url: userId ? withTrackingUser(url, userId) : url,
      linkType,
      attributed: !!userId,
    };
  }

  let hadUserSlot = false;
  const filled = url.replace(PLACEHOLDER, (_m, name: string) => {
    const key = name.trim().toLowerCase();
    if (key === 'user_id') {
      hadUserSlot = true;
      return encodeURIComponent(userId);
    }
    if (key === 'click_id') return encodeURIComponent(opts.clickId);
    return '';
  });
  return { url: filled, linkType, attributed: !!userId && hadUserSlot };
}
