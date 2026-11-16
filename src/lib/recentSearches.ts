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

export type RecentSearchKind = 'bank' | 'card';

export interface RecentSearch {
  label: string;
  kind: RecentSearchKind;
}

const STORAGE_KEY = 'cardsxtra.recentSearches.v1';
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
          (d.kind === 'bank' || d.kind === 'card')
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
    { label: item.label.trim(), kind: item.kind },
    ...list.filter((r) => r.label.trim().toLowerCase() !== key),
  ].slice(0, MAX_RECENT_SEARCHES);
}

async function save(list: RecentSearch[]) {
  if (!canPersist) return;
  try {
    if (list.length === 0) await SecureStore.deleteItemAsync(STORAGE_KEY);
    else await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage failure only loses history; search itself keeps working.
  }
}

export function useRecentSearches() {
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => {
    if (!canPersist) return;
    let cancelled = false;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled) setRecent(parse(raw));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const remember = useCallback((item: RecentSearch) => {
    setRecent((prev) => {
      const next = addRecent(prev, item);
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    save([]);
  }, []);

  return { recent, remember, clear };
}
