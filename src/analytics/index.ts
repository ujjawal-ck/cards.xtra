/**
 * analytics — public entry point.
 *
 * Usage anywhere in the app:
 *   import { analytics, Events } from '../analytics';
 *   analytics.track(Events.CARD_APPLY, { item_id: card.id, item_name: card.name });
 *
 * To switch GA on later, see README.md in this folder — it's a one-file change
 * (add a sink), no screen edits.
 */
export { analytics, Events } from './analytics';
export type { AnalyticsSink } from './analytics';
export type { EventName, EventParams, ParamValue } from './events';
