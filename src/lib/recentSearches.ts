/**
 * Recent searches — the last few banks / cards the user picked from search,
 * kept on the device so the empty search sheet can offer them again.
 *
 * Only the picked item's label and kind are stored (a bank or card name from
 * the catalog), never free text the user typed. Stored with expo-secure-store,
 * the one key-value store already in the app; it is unavailable on web, where
 * history simply stays in memory for the session.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Home stores banks and cards; Offers stores categories and stores. */
export type RecentSearchKind = 'bank' | 'card' | 'category' | 'store';
const KINDS: readonly RecentSearchKind[] = ['bank', 'card', 'category', 'store'];

export interface RecentSearch {
  label: string;
  kind: RecentSearchKind;
  /** Catalog id needed to reopen the item (an Offers store slug). */
  id?: string;
  /** Remote logo URL, for items whose catalog is not loaded up front. */
  image?: string;
}

/** One history per screen: Home (banks/cards) and Offers (categories/stores). */
export type RecentSearchScope = 'home' | 'offers';
const storageKey = (scope: RecentSearchScope) =>
  scope === 'home' ? 'cardsxtra.recentSearches.v1' : `cardsxtra.recentSearches.${scope}.v1`;
export const MAX_RECENT_SEARCHES = 5;

const canPersist = Platform.OS !== 'web';

function parse(raw: string | null): RecentSearch[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (d): d is RecentSearch =>
          !!d &&
          typeof d.label === 'string' &&
          KINDS.includes(d.kind) &&
          (d.id === undefined || typeof d.id === 'string') &&
          (d.image === undefined || typeof d.image === 'string')
      )
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

/** Newest first, de-duplicated by label (case-insensitive), capped. */
export function addRecent(list: RecentSearch[], item: RecentSearch): RecentSearch[] {
  const key = item.label.trim().toLowerCase();
  if (!key) return list;
  return [
    { ...item, label: item.label.trim() },
    ...list.filter((r) => r.label.trim().toLowerCase() !== key),
  ].slice(0, MAX_RECENT_SEARCHES);
}

async function save(key: string, list: RecentSearch[]) {
  if (!canPersist) return;
  try {
    if (list.length === 0) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, JSON.stringify(list));
  } catch {
    // Storage failure only loses history; search itself keeps working.
  }
}

export function useRecentSearches(scope: RecentSearchScope = 'home') {
  const key = storageKey(scope);
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => {
    if (!canPersist) return;
    let cancelled = false;
    SecureStore.getItemAsync(key)
      .then((raw) => {
        if (!cancelled) setRecent(parse(raw));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  const remember = useCallback(
    (item: RecentSearch) => {
      setRecent((prev) => {
        const next = addRecent(prev, item);
        save(key, next);
        return next;
      });
    },
    [key]
  );

  const clear = useCallback(() => {
    setRecent([]);
    save(key, []);
  }, [key]);

  return { recent, remember, clear };
}
