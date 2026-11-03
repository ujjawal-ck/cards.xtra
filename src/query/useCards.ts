/**
 * useCards — Home card list from BankKaro CardGenius.
 *
 * Fetches the full catalog once (TanStack Query caches it per queryClient
 * defaults), filters to active cards (`status: true` — ~159 of 184), and
 * maps each to the app's CardModel via the shared mapper. The Home screen
 * consumes the mapped list directly.
 */
import { useQuery } from '@tanstack/react-query';
import { getCards, initBundle } from '../api/bankkaro';
import { getCardRateStores } from '../api/cashkaro';
import {
  mapBkCardToCardModel,
  buildBankDirectory,
  type BkCard,
} from '../api/cardMapper';
import { buildCardRateIndex, resolveCkRate } from '../api/cardRates';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import type { CardModel } from '../molecules';

export const cardsQueryKey = ['bk', 'cards'] as const;

export function useCards() {
  const query = useQuery<CardModel[]>({
    queryKey: cardsQueryKey,
    queryFn: async () => {
      // Cards + the bank directory + the CashKaro card-store rates, in parallel.
      // The directory (bank names + logos) comes from the init-bundle; the rates
      // come from CashKaro (the displayed reward is CashKaro's, not BankKaro's
      // commission — see cardRates.ts). Each side fails soft: a missing
      // directory falls back to static names, missing rates fall back to the
      // BankKaro commission — the card list still loads either way.
      const [cardsRes, initRes, rateStores] = await Promise.all([
        getCards(),
        initBundle().catch(() => null),
        getCardRateStores().catch(() => [] as any[]),
      ]);
      const bankDir = buildBankDirectory(initRes);
      const rateIndex = buildCardRateIndex(rateStores);
      const list: BkCard[] = Array.isArray(cardsRes?.data) ? cardsRes.data : [];
      return list
        .filter((c) => c?.status === true)
        .map((c) =>
          mapBkCardToCardModel(
            c,
            bankDir,
            resolveCkRate(c.ck_store_id, c.name, rateIndex),
          ),
        )
        // Commissionable cards only: keep a card only when it has a reward to
        // show — a CashKaro rate or a BankKaro commission. Cards with neither
        // (e.g. Axis Miles and More: commission "0", no CashKaro store) would
        // render a blank "Rewards" tile, so they're dropped here. NOTE: we
        // filter on the resolved reward, NOT BankKaro's `commissionable` flag —
        // that flag is false on 33 cards that do carry a real reward.
        .filter((card) => !!card.cashbackValue);
    },
  });
  // Refresh the catalog when Home regains focus. The list stays on screen
  // during the background refetch, so there's no flash.
  useRefetchOnFocus(query);
  return query;
}
