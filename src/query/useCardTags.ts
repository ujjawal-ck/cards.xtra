/**
 * useCardTags — tool categories each card rewards, from the catalogue tags.
 *
 * Covers EVERY catalogue row (not only the Home cards, which useCards filters),
 * because the Beat my card picker lists cards from calculate that Home hides.
 * Keys: `alias:<card_alias>` and `id:<numeric id>`, since 3 calculate rows join
 * the catalogue on id only. Shares ONE /cardgenius/cards download with useCards
 * (rawCardsQueryKey).
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCards } from '../api/bankkaro';
import type { BkCard } from '../api/cardMapper';
import { categoriesForTags } from '../lib/beatFlow';
import type { ToolCategoryId } from '../lib/cardTools';
import { rawCardsQueryKey } from './useCards';

export function useCardTags(): {
  tagsFor: (alias: string | undefined, id: number | undefined) => ToolCategoryId[];
  isLoading: boolean;
} {
  const query = useQuery({ queryKey: rawCardsQueryKey, queryFn: getCards });
  const map = useMemo(() => {
    const out = new Map<string, ToolCategoryId[]>();
    const list: BkCard[] = Array.isArray(query.data?.data) ? query.data.data : [];
    for (const c of list) {
      const cats = categoriesForTags((c?.tags ?? []).map((t) => t?.id).filter((id): id is number => id != null));
      if (c?.card_alias) out.set(`alias:${c.card_alias}`, cats);
      if (c?.id != null) out.set(`id:${c.id}`, cats);
    }
    return out;
  }, [query.data]);
  const tagsFor = useCallback(
    (alias: string | undefined, id: number | undefined) =>
      (alias ? map.get(`alias:${alias}`) : undefined) ?? (id != null ? map.get(`id:${id}`) : undefined) ?? [],
    [map],
  );
  return { tagsFor, isLoading: query.isLoading };
}
