/**
 * useCrossSellRail — session state + open/close rules for the Home cross-sell
 * rail (the "Not sure about X?" row that expands under a tile after the user
 * closes that card's detail without applying).
 *
 * HomeScreen only has to tell this hook what happened (detail opened, card seen
 * in the pager, Apply tapped, detail closed) and render <CrossSellRail> under the
 * tile whose id equals `rail.anchorId`. The ranking lives in src/lib/crossSell.ts.
 *
 * Rules (one app session = one mount of Home):
 *   - A card expands once, at most MAX_RAIL_EXPANSIONS rails per session, one rail
 *     open at a time (a new one closes the old one: 'replaced').
 *   - Never for a card the user applied to, and never when they applied to ANY
 *     card during that detail visit.
 *   - The rail anchors under, and is computed for, the card that was TAPPED. Every
 *     card seen in the detail pager counts as "viewed" for the engine.
 *   - Only when the engine returns 2+ picks and the tapped tile is on screen.
 *   - Coming back from a pick keeps the SAME rail open (the pick reads "Viewed").
 *   - The picks are frozen when the rail opens (not recomputed as cards get
 *     viewed, or the pick you just opened would vanish). They are recomputed only
 *     when the eligibility result changes.
 *   - Holdout arm of the experiment (src/experiments) never shows the rail.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation } from 'react-native';
import type { CardModel } from '../molecules';
import {
  getCrossSellV2,
  type CrossSellCard,
  type CrossSellCtx,
  type CrossSellLens,
  type CrossSellPick,
  type CrossSellResult,
} from '../lib/crossSell';
import { getCrossSellRailVariant } from '../experiments';
import { analytics, Events } from '../analytics';

export const MAX_RAIL_EXPANSIONS = 3;

export type CrossSellCollapseReason = 'hide' | 'replaced' | 'scrolled_past' | 'no_picks';

/** What the rail renders. Frozen when the rail opens (see rules above). */
export interface CrossSellRailState {
  /** Id of the TAPPED card; the rail sits under its tile. */
  anchorId: string;
  result: CrossSellResult;
  lensKey: string;
  /** Ids of every card opened this session (drives the "Viewed" dimming). */
  viewedIds: string[];
}

interface Visit {
  anchor: CardModel;
  fromRail: boolean;
  applied: boolean;
  /** Sheet is being dismissed for a detour (share / all benefits) and comes back. */
  detour: boolean;
}

interface Args {
  /** The full loaded catalogue (not just the visible cards). */
  cards: CardModel[];
  /** Home's eligibility result; null = not known. */
  eligibleAliases: string[] | null;
  /** Cards currently rendered in the Home list (a rail needs its tile on screen). */
  listedCards: CardModel[];
}

const lensOf = (result: CrossSellResult, key: string): CrossSellLens =>
  result.lenses.find((l) => l.key === key) ?? result.lenses[0];

export function useCrossSellRail({ cards, eligibleAliases, listedCards }: Args) {
  const catalogue = useMemo<CrossSellCard[]>(
    () => cards.flatMap((c) => (c.crossSell ? [c.crossSell] : [])),
    [cards]
  );
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  // Latest inputs for the stable callbacks below.
  const latest = useRef({ catalogue, cardsById, eligibleAliases, listedCards });
  latest.current = { catalogue, cardsById, eligibleAliases, listedCards };

  const session = useRef({
    expanded: new Set<string>(),
    count: 0,
    applied: new Set<string>(),
    viewedAliases: [] as string[],
    viewedIds: new Set<string>(),
    shown: {} as Record<string, number>,
  });
  const visitRef = useRef<Visit | null>(null);
  const pickTapRef = useRef<{ anchor: CardModel } | null>(null);

  const [rail, setRail] = useState<CrossSellRailState | null>(null);
  const railRef = useRef<CrossSellRailState | null>(null);
  const commit = useCallback((next: CrossSellRailState | null) => {
    railRef.current = next;
    setRail(next);
  }, []);
  // Pager list for a detail opened from a pick that the feed's pager does not hold
  // (filters on). Without it the pager would fall back to page 0 = the wrong card.
  const [detailPager, setDetailPager] = useState<CardModel[] | null>(null);

  const buildCtx = useCallback((): CrossSellCtx => {
    const s = session.current;
    const el = latest.current.eligibleAliases;
    return {
      eligible: el ? new Set(el) : null,
      viewed: s.viewedAliases.slice(),
      shown: s.shown,
      applied: s.applied,
    };
  }, []);

  // Picks already shown rank last next time.
  const markShown = useCallback((lens: CrossSellLens | undefined) => {
    lens?.picks.forEach((p) => {
      const shown = session.current.shown;
      shown[p.card.alias] = (shown[p.card.alias] || 0) + 1;
    });
  }, []);

  const closeRail = useCallback(
    (why: CrossSellCollapseReason) => {
      const open = railRef.current;
      if (!open) return;
      analytics.track(Events.CROSSSELL_COLLAPSE, { source_card: open.anchorId, why });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      commit(null);
    },
    [commit]
  );

  const noteViewed = useCallback(
    (card: CardModel) => {
      const s = session.current;
      s.viewedIds.add(card.id);
      const alias = card.crossSell?.alias;
      if (alias && s.viewedAliases.indexOf(alias) === -1) s.viewedAliases.push(alias);
      const open = railRef.current;
      if (open && open.viewedIds.indexOf(card.id) === -1) {
        commit({ ...open, viewedIds: Array.from(s.viewedIds) });
      }
    },
    [commit]
  );

  const tryExpand = useCallback(
    (anchor: CardModel) => {
      const s = session.current;
      const src = anchor.crossSell;
      if (!src) return;
      const { catalogue: cat, listedCards: listed } = latest.current;
      if (!listed.some((c) => c.id === anchor.id)) return;
      if (s.applied.has(src.alias) || s.expanded.has(anchor.id) || s.count >= MAX_RAIL_EXPANSIONS) return;
      const result = getCrossSellV2(src, cat, buildCtx());
      if (!result.show) return;
      // Read the experiment arm only for a user who would otherwise see a rail.
      const arm = getCrossSellRailVariant();
      if (arm !== 'rail') return;
      closeRail('replaced');
      s.expanded.add(anchor.id);
      s.count += 1;
      markShown(result.lenses[0]);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      commit({ anchorId: anchor.id, result, lensKey: 'top', viewedIds: Array.from(s.viewedIds) });
      analytics.track(Events.CROSSSELL_IMPRESSION, {
        source_card: anchor.id,
        state: result.state,
        lens: 'top',
        lenses: result.lenses.map((l) => l.key).join(','),
        cards_viewed: result.profileCards,
        picks: result.lenses[0].picks.length,
        arm,
      });
    },
    [buildCtx, closeRail, commit, markShown]
  );

  // A card was opened from the Home list (tile, search result) or from a rail pick.
  // Returns the VIEW_ITEM `source` to report ('crosssell' for a pick).
  const onCardOpened = useCallback(
    (card: CardModel): 'crosssell' | undefined => {
      const pick = pickTapRef.current;
      pickTapRef.current = null;
      visitRef.current = {
        anchor: pick ? pick.anchor : card,
        fromRail: !!pick,
        applied: false,
        detour: false,
      };
      noteViewed(card);
      return pick ? 'crosssell' : undefined;
    },
    [noteViewed]
  );

  // A pick on the open rail was tapped. Call right before opening the detail.
  const onPickTap = useCallback((card: CardModel, pick: CrossSellPick, slot: number) => {
    const open = railRef.current;
    if (!open) return;
    const anchor = latest.current.cardsById.get(open.anchorId);
    if (!anchor) return;
    analytics.track(Events.CROSSSELL_TAP, {
      source_card: open.anchorId,
      item_id: card.id,
      lens: pick.lens,
      slot,
      delta: pick.delta,
    });
    pickTapRef.current = { anchor };
    const inFeed = latest.current.listedCards.some((c) => c.id === card.id);
    setDetailPager(
      inFeed
        ? null
        : lensOf(open.result, open.lensKey).picks.flatMap((p) => {
            const c = latest.current.cardsById.get(p.card.id);
            return c ? [c] : [];
          })
    );
  }, []);

  // The detail pager moved to another card (swipe / recommended press).
  const onCardViewed = noteViewed;

  // Apply Now tapped (tile or detail). Marks the card and the current visit.
  const onApplied = useCallback((card: CardModel) => {
    if (card.crossSell) session.current.applied.add(card.crossSell.alias);
    if (visitRef.current) visitRef.current.applied = true;
  }, []);

  // The sheet is about to be dismissed and re-presented (share, all benefits):
  // that close is not "the user left the detail".
  const holdVisit = useCallback(() => {
    if (visitRef.current) visitRef.current.detour = true;
  }, []);

  // The detail left (or started leaving). Runs the visit's close rules once: the
  // visit is consumed, so a second call for the same close does nothing. A detour
  // (share / all benefits) is only cleared by the final dismiss, never by the
  // start-of-close call, or the final dismiss would be read as a real exit.
  const finishVisit = useCallback(
    (final: boolean) => {
      const v = visitRef.current;
      if (!v) return;
      if (v.detour) {
        if (final) v.detour = false;
        return;
      }
      visitRef.current = null;
      setDetailPager(null);
      // Back from a pick: keep the same rail. Applied: no rail.
      if (v.fromRail || v.applied) return;
      tryExpand(v.anchor);
    },
    [tryExpand]
  );
  // Fully closed (iOS: end of the sheet; Android: after the spring settles + unmount).
  const onDetailClosed = useCallback(() => finishVisit(true), [finishVisit]);
  // The close animation has just started (Android only). Opens the rail while the
  // page is still zooming back into its tile instead of after the unmount.
  const onDetailClosing = useCallback(() => finishVisit(false), [finishVisit]);

  const selectLens = useCallback(
    (lensKey: string) => {
      const open = railRef.current;
      if (!open || open.lensKey === lensKey) return;
      markShown(lensOf(open.result, lensKey));
      commit({ ...open, lensKey });
      analytics.track(Events.CROSSSELL_LENS, { source_card: open.anchorId, lens: lensKey });
    },
    [commit, markShown]
  );

  const hide = useCallback(() => closeRail('hide'), [closeRail]);

  // The rejection sheet was shown for this card: no rail for it afterwards.
  const suppress = useCallback((card: CardModel) => {
    session.current.expanded.add(card.id);
  }, []);

  // Cards the detail pager swipes through when the detail is opened for a card the
  // feed's pager does not hold (a rejection-sheet pick under a category filter).
  // Cleared when the detail closes, like a rail pick's pager.
  const showInDetail = useCallback((list: CardModel[]) => setDetailPager(list), []);

  // Eligibility result changed (checked from the rail chip, the toggle or a
  // detail): recompute the open rail. Skip the first run.
  const prevEligible = useRef(eligibleAliases);
  useEffect(() => {
    if (prevEligible.current === eligibleAliases) return;
    prevEligible.current = eligibleAliases;
    const open = railRef.current;
    const src = open ? latest.current.cardsById.get(open.anchorId)?.crossSell : undefined;
    if (!open || !src) return;
    const result = getCrossSellV2(src, latest.current.catalogue, buildCtx());
    if (!result.show) {
      closeRail('no_picks');
      return;
    }
    markShown(result.lenses[0]);
    commit({ ...open, result, lensKey: 'top' });
  }, [eligibleAliases, buildCtx, closeRail, commit, markShown]);

  /** Pager list for the detail sheet: the feed's list, unless a pick needs its own. */
  const detailCards = useCallback((base: CardModel[]) => detailPager ?? base, [detailPager]);

  return {
    rail,
    cardsById,
    onCardOpened,
    onPickTap,
    onCardViewed,
    onApplied,
    holdVisit,
    onDetailClosed,
    onDetailClosing,
    selectLens,
    hide,
    suppress,
    showInDetail,
    detailCards,
  };
}
