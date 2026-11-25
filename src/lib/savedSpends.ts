/**
 * Saved spends: the user's answers to the card tool questions, kept on the
 * device so the next tool starts from them instead of from 0.
 *
 * Stores ANSWERS in question units (rupees, or lounge visits a year), never
 * the API body. Stored with expo-secure-store, like recentSearches; on web it
 * stays in memory for the session. The values are never logged or tracked.
 */
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SPEND_QUESTIONS, type SpendKey } from './cardTools';

export type SpendAnswers = Partial<Record<SpendKey, number>>;

const STORAGE_KEY = 'cardsxtra.toolSpends.v1';

const canPersist = Platform.OS !== 'web';

/** A known key's value clamped to its question's min and max, or undefined when not a finite number. */
function clean(key: string, value: unknown): number | undefined {
  const q = SPEND_QUESTIONS.find((x) => x.key === key);
  if (!q || typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(q.max, Math.max(q.min, value));
}

/** Only known keys with finite numbers, clamped. Anything else is dropped. */
function sanitize(data: unknown): SpendAnswers {
  const out: SpendAnswers = {};
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return out;
  for (const [key, value] of Object.entries(data)) {
    const v = clean(key, value);
    if (v !== undefined) out[key as SpendKey] = v;
  }
  return out;
}

/** Parse the stored string. Bad JSON or a bad shape gives {}. */
export function parseSavedSpends(raw: string | null | undefined): SpendAnswers {
  if (!raw) return {};
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** `next` over `saved`, key by key. Both are cleaned the same way as a parse. */
export function mergeAnswers(saved: SpendAnswers, next: SpendAnswers): SpendAnswers {
  return { ...sanitize(saved), ...sanitize(next) };
}

async function write(answers: SpendAnswers) {
  if (!canPersist) return;
  try {
    if (Object.keys(answers).length === 0) await SecureStore.deleteItemAsync(STORAGE_KEY);
    else await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    // A storage failure only loses the saved answers; the tools keep working.
  }
}

/**
 * One store for the whole app, not one per screen: Home, the quiz and the
 * result screens are mounted at the same time, and each must see what another
 * one saved. A per-screen copy could also write old values back.
 */
interface Snapshot {
  answers: SpendAnswers;
  /** true once the stored answers were read (at once on web). */
  loaded: boolean;
}

let snapshot: Snapshot = { answers: {}, loaded: !canPersist };
let reading = false;
/** Counts clears, so a read that started before a clear drops what it read. */
let clears = 0;
const listeners = new Set<() => void>();

function setSnapshot(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function readOnce() {
  if (snapshot.loaded || reading) return;
  reading = true;
  const at = clears;
  SecureStore.getItemAsync(STORAGE_KEY)
    // A save before the read finished wins over the stored value. After a
    // clear (session end), the stored value belongs to the previous user.
    .then((raw) => (at === clears ? mergeAnswers(parseSavedSpends(raw), snapshot.answers) : snapshot.answers))
    .catch(() => snapshot.answers)
    .then((answers) => setSnapshot({ answers, loaded: true }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  readOnce();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;

/** Merge `next` into the saved answers and store the result. */
function saveAnswers(next: SpendAnswers) {
  const merged = mergeAnswers(snapshot.answers, next);
  setSnapshot({ ...snapshot, answers: merged });
  void write(merged);
}

/** Remove the saved answers (also called on logout: the spends belong to the user who entered them). */
export function clearSavedSpends() {
  clears += 1;
  setSnapshot({ ...snapshot, answers: {} });
  void write({});
}

export function useSavedSpends(): {
  answers: SpendAnswers;
  /** true once the stored answers were read (at once on web). */
  loaded: boolean;
  /** Merge `answers` into the saved ones and store the result. */
  save: (answers: SpendAnswers) => void;
  clear: () => void;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { answers: state.answers, loaded: state.loaded, save: saveAnswers, clear: clearSavedSpends };
}
