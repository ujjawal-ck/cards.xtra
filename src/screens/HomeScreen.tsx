/**
 * HomeScreen — masthead hero + scrollable card list.
 *
 * Layout (single vertical ScrollView):
 *   1. <Masthead variant="home" /> — edge-to-edge hero with HomeHeader
 *      (white logo + icons + notification bell) and the SearchBar pinned
 *      to the bottom. Tapping the bar opens the SearchTopSheet.
 *   2. FilterRow
 *   3. Top picks — first 2 CardTiles
 *   4. "Find the best card by category" — horizontal CategoryCircles
 *   5. Remaining CardTiles
 *
 * Tapping a CardTile opens CardDetailSheet (gorhom bottom-sheet modal,
 * snaps [58%, 96%], scroll-to-expand) with the tapped card's data.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import {
  BottomSheetModal as GorhomBottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type {
  BottomSheetModal,
  BottomSheetBackdropProps,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useIsFocused, useScrollToTop } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

import { Text, Chip, Switch, Icon } from '../atoms';
import { HeroVideo } from '../molecules';
import type { CardModel, SearchResultSection } from '../molecules';
import {
  BottomSheetHeader,
  CardDetailSheet,
  ShareSheet,
  type ShareSheetRef,
  HowItWorksSheet,
  type HowItWorksSheetRef,
  CardTile,
  CategoryTiles,
  FilterTransitionOverlay,
  HomeSkeleton,
  CardListSkeleton,
  EligibilityCheckerSheet,
  incomeBand,
  pincodePrefix,
  EligibleSheet,
  FilterMenu,
  Footer,
  FooterButtons,
  HomeHeader,
  IneligibleSheet,
  Masthead,
  MaybeSheet,
  SearchTopSheet,
  resolveCardOutcome,
  markCardImagesDecoded,
} from '../organisms';
import type {
  FilterCategoryId,
  EligibilityOutcome,
  SearchTopSheetRecent,
} from '../organisms';
import { NeverMissCashbackNudge } from '../organisms/NeverMissCashbackNudge';
import {
  colors,
  primitives,
  spacing,
  radius,
  borderWidth,
  elevation,
  opacity,
  iconSize,
} from '../tokens';
import { images } from '../assets/images';
import { useCards } from '../query/useCards';
import { selectTileBenefits } from '../api/cardMapper';
import { useClickOut } from '../lib/useClickOut';
import { getEligibilityGateVariant } from '../experiments';
import { analytics, Events } from '../analytics';
import { classifyCardEligibility, type EligibilityBucket } from '../api/eligibility';
import { haptics, play } from '../lib/haptics';
import { Image as ExpoImage } from 'expo-image';
import {
  CATEGORY_OPTIONS,
  NETWORK_OPTIONS,
  applyFilters,
  hasActiveFilters,
  EMPTY_FILTERS,
  type AppliedFilters,
} from '../data/filterOptions';
import { useBottomNavVisibility } from '../navigation/TabNavigator';
import { useFloatingNavClearance } from '../navigation/floatingNav';

// Scroll Y at which the frosted scrolled HomeHeader fully appears.
// Roughly the masthead height (≈ 408) — pick a value past the
// masthead so the frosted bar fades in once the masthead is out of
// view. Tunable.
const FROSTED_HEADER_FADE_IN = 220;
const FROSTED_HEADER_FADE_FULL = 280;
// Minimum forward scroll delta (per frame) before the BottomNav hides —
// protects against tiny rubber-band noise hiding it accidentally.
const NAV_HIDE_THRESHOLD = 6;
// Reveal is far more eager: any small upward scroll brings the nav back
// straight away (1px past noise), so it never feels stuck hidden.
const NAV_REVEAL_THRESHOLD = 1;

// ----------------------------------------------------------------------------
// Eligibility grouping — frontend classification (Figma 5972:28691)
// ----------------------------------------------------------------------------
// Eligible / Maybe / Ineligible comes from the shared classifyCardEligibility
// in api/eligibility.ts (the same verdict the card sheet and Apply flow use).

// Section separator — a label with a hairline rule filling the row to the
// right (Figma). Used for the eligibility group headers (Eligible / Maybe /
// Ineligible) and, when a bank filter is active, the "Top picks for you"
// header so the filtered list reads as a divided section.
function SectionRule({ label }: { label: string }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}
    >
      <Text variant="body14SemiBold" color={colors.text.secondary}>
        {label}
      </Text>
      <View
        style={{
          flex: 1,
          height: borderWidth.thin,
          backgroundColor: colors.border.default,
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// FilterBarSkeleton — a brief shimmer shown IN the filter chip row while the
// filters reset (the "clear" transition). Two chip-shaped blocks that pulse,
// matching the skeleton language used on first load — so clearing reads as
// "the filter values are reloading" rather than just blinking out.
// ---------------------------------------------------------------------------
function FilterBarSkeleton() {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 350, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 350, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [shimmer]);
  const pulse = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [opacity[16], opacity[40]]),
  }));
  const Block = ({ width }: { width: number }) => (
    <Animated.View
      style={[
        {
          height: 32,
          width,
          borderRadius: radius.sm,
          backgroundColor: primitives.slate[300],
        },
        pulse,
      ]}
    />
  );
  return (
    <View style={{ flexDirection: 'row', gap: spacing[8] }}>
      <Block width={96} />
      <Block width={80} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// StaggerCard — wraps a single card so it can fade + rise into place with a
// per-position delay. Used for the "apply a filter" transition: while a stagger
// is armed (`active`), each card that mounts plays the entrance, cascading down
// the visible list. When not armed the card is simply shown (no animation), so
// scrolling and first paint stay instant. Delay is capped so far-down cards
// don't wait seconds.
// ---------------------------------------------------------------------------
const STAGGER_STEP_MS = 55;
const STAGGER_MAX_STEPS = 7;

function StaggerCard({
  index,
  active,
  children,
}: {
  index: number;
  active: boolean;
  children: React.ReactNode;
}) {
  // Start hidden only when an apply is in flight at mount time; otherwise the
  // card is visible immediately.
  const progress = useSharedValue(active ? 0 : 1);
  useEffect(() => {
    if (!active) return;
    progress.value = withDelay(
      Math.min(index, STAGGER_MAX_STEPS) * STAGGER_STEP_MS,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    // Run once on mount — `active` is read at mount to decide whether this
    // card belongs to a just-applied filter batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [14, 0],
          Extrapolation.CLAMP
        ),
      },
    ] as unknown as { translateY: number }[],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// Placeholder rows fed to the list body while a category fetch is in flight, so
// the list keeps a realistic height (the footer stays put) and each row renders
// a single card skeleton instead of a real CardTile.
const CATEGORY_SKELETON_ROWS = Array.from({ length: 4 }, (_, i) => ({
  skeleton: true as const,
  id: `__cat-sk-${i}`,
}));

export function HomeScreen() {
  // Scroll padding that clears the floating tab bar (+ Android nav bar).
  const navClearance = useFloatingNavClearance();
  const [eligibilityOn, setEligibilityOn] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live card catalog from BankKaro (mapped to CardModel). While the
  // request is in flight the skeleton stays up; on failure an inline
  // retry block replaces the lists.
  const { data: cards = [], isLoading, isError, refetch } = useCards();
  // The logged-in user id fills the empty `id=` slot on the CashKaro tracker so
  // the apply click is attributed to this user (same as the offers flow).
  // Card "Apply Now" click-outs: login-to-earn for guests, user + click id
  // on the link, CLICK_OUT logged (src/lib/useClickOut.tsx).
  const { openClickOut, clickOutSheets } = useClickOut();

  // Warm expo-image's cache with every card image the moment the catalog
  // loads. The Home CardTiles use RN <Image> (a separate cache), so without
  // this the CardDetailSheet's expo-image would re-fetch each card on open /
  // swipe. Prefetching here makes the detail sheet + pager swipes instant.
  useEffect(() => {
    const urls = cards
      .map((c) =>
        c.cardImage && typeof c.cardImage === 'object' && 'uri' in c.cardImage
          ? (c.cardImage.uri as string | undefined)
          : undefined
      )
      .filter((u): u is string => !!u);
    if (urls.length) {
      // Once the bytes are cached, tell CardArt these images are ready so the
      // detail sheet's first open/swipe paints them instantly instead of
      // flashing the slate skeleton + fade-in (the "flicker").
      ExpoImage.prefetch(urls, 'memory-disk').then((ok) => {
        if (ok) markCardImagesDecoded(urls);
      });
    }
  }, [cards]);

  // ----- Entrance animation (first mount only) -------------------
  // Skeleton overlay fades out as the real content fades in + rises.
  // Total perceived duration ~750 ms (600 ms skeleton + 150 ms cross-
  // fade) — long enough to register as "loading" without being slow.
  const [showSkeleton, setShowSkeleton] = useState(true);
  const contentProgress = useSharedValue(0);
  const skeletonOpacity = useSharedValue(1);

  useEffect(() => {
    contentProgress.value = withDelay(
      350,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    );
    skeletonOpacity.value = withDelay(
      500,
      withTiming(
        0,
        { duration: 350, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setShowSkeleton)(false);
        }
      )
    );
  }, [contentProgress, skeletonOpacity]);

  const contentEntranceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      contentProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateY: interpolate(
          contentProgress.value,
          [0, 1],
          [12, 0],
          Extrapolation.CLAMP
        ),
      },
    ] as unknown as { translateY: number }[],
  }));

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  // Card list ref — used to snap the list back to the top when a bank
  // filter is applied from search (so the filtered cards read as "new
  // results" rather than resuming mid-scroll).
  const listRef = useRef<FlatList<any>>(null);
  // Re-tapping this tab in the bottom nav scrolls back to the top.
  useScrollToTop(listRef);
  const sheetRef = useRef<BottomSheetModal>(null);
  // ShareSheet — screen-centred RN <Modal> (not a bottom sheet)
  // stacked on top of CardDetailSheet when the Share glyph on the
  // masthead header is tapped. Both modals are mounted at the screen
  // level and presented independently — gorhom's modal stays alive
  // underneath while the RN Modal fades in over it.
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const howItWorksRef = useRef<HowItWorksSheetRef>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedCard, setSelectedCard] = useState<CardModel | null>(null);
  // Latest selected card for callbacks that must not re-create on change.
  const selectedCardRef = useRef<CardModel | null>(null);
  selectedCardRef.current = selectedCard;
  // Screen Y of the last card tap → the Android card detail zooms from this
  // point (see CardDetailScreenAndroid). Undefined → mid-screen fallback.
  const [cardOriginY, setCardOriginY] = useState<number | undefined>(undefined);
  // True while the user is on the All Card Benefits page after leaving the
  // card-detail sheet. The sheet's gorhom portal closes when that root-stack
  // page covers Home, so we re-present it (for the SAME card) when Home
  // regains focus — both "back" actions land on the card, not Home.
  const reopenCardSheetRef = useRef(false);
  // Snap index the card-detail sheet opens at: 0 = partial (75%), 1 = full
  // screen. Returning from All Card Benefits restores the expanded page.
  const [cardSheetIndex, setCardSheetIndex] = useState(0);
  // Bumped to (re)present the sheet AFTER cardSheetIndex has committed to the
  // render: present() reads the index prop, so deferring the call to an effect
  // makes the sheet open directly at the requested snap (no partial→full hop)
  // and sidesteps the setState-vs-imperative-call race.
  const [cardSheetPresentSeq, setCardSheetPresentSeq] = useState(0);
  const openCardSheet = useCallback((card: CardModel | null, idx: number) => {
    if (card) {
      setSelectedCard(card);
      // Card detail sheet opened — GA4 view_item. (Re-presents on return from
      // the benefits page pass null, so they don't double-count.)
      analytics.track(Events.VIEW_ITEM, {
        item_id: card.id,
        item_name: card.name,
        item_brand: card.filterMeta?.bankName,
        snap: idx === 1 ? 'full' : 'partial',
      });
    }
    setCardSheetIndex(idx);
    setCardSheetPresentSeq((s) => s + 1);
  }, []);
  useEffect(() => {
    if (cardSheetPresentSeq > 0) sheetRef.current?.present();
  }, [cardSheetPresentSeq]);
  // The card whose Apply Now is awaiting eligibility details — once the
  // checker submits, we route to its result sheet. null = no pending apply
  // (e.g. the checker was opened by the toggle, not by Apply Now).
  const [applyPendingCard, setApplyPendingCard] = useState<CardModel | null>(null);
  // Card ids that have already had their eligibility result sheet shown once.
  // After the first reveal, tapping "Apply Now" again for the same card skips
  // the sheet and goes straight out to the bank's apply page.
  const shownEligibilityResultRef = useRef<Set<string>>(new Set());

  // Eligibility flow — three gorhom sheets, same wiring pattern used in
  // FoundationCheck's Section 39:
  //   1. user toggles Eligibility ON  → present checker
  //   2. user fills form, taps Check  → checker button shows loading,
  //      onCheck fires with parsed income
  //   3. income ≥ ₹50k → EligibleSheet (with confetti) | < 50k → MaybeSheet
  const eligibilityCheckerRef = useRef<BottomSheetModal>(null);
  // True between a committed check and the ensuing dismiss — lets the
  // checker's onDismiss tell "completed" from "closed without entering".
  const eligibilityCommittedRef = useRef(false);
  const eligibleSheetRef = useRef<BottomSheetModal>(null);
  const maybeSheetRef = useRef<BottomSheetModal>(null);
  const ineligibleSheetRef = useRef<BottomSheetModal>(null);
  const eligibilitySnapPoints = useMemo(() => ['90%'], []);
  // Which flavour the green sheet shows:
  //   'card'  → card-detail Apply path: single hero card + its reward + Apply.
  //   'cards' → Home toggle path: fanned STACK + "eligible for N cards" +
  //             "Great, Show Cards" (dismiss → the list is already filtered).
  const [eligibleSheetMode, setEligibleSheetMode] =
    useState<'card' | 'cards'>('card');

  // Present the matching colored result sheet — driven by the card-detail
  // checker when the user runs it with NO pre-filled details (Path B).
  const presentResultSheet = useCallback((outcome: EligibilityOutcome) => {
    // This path always celebrates a single card (card-detail Apply flow).
    setEligibleSheetMode('card');
    analytics.track(Events.ELIGIBILITY_RESULT, {
      item_id: selectedCardRef.current?.id,
      outcome,
      gate_variant: getEligibilityGateVariant(),
    });
    // Outcome haptic — celebrate eligible, soft-warn maybe, error ineligible.
    if (outcome === 'eligible') {
      play('success');
      eligibleSheetRef.current?.present();
    } else if (outcome === 'ineligible') {
      play('error');
      ineligibleSheetRef.current?.present();
    } else {
      play('warning');
      maybeSheetRef.current?.present();
    }
  }, []);

  // Filters bottom-sheet — opens when the "Filters" chip is tapped.
  // Structure: sticky BottomSheetHeader, sticky left rail (inside
  // FilterMenu), scrollable right panel, sticky FooterButtons (via
  // gorhom's footerComponent). Locked to a single 70% snap with
  // dynamic sizing OFF (gorhom v5 defaults it on, which made the
  // sheet shrink to fit the shorter Annual Fee / Card Network / Banks
  // panels) — same height for all 4 rails, no scroll-to-grow.
  const filtersSheetRef = useRef<BottomSheetModal>(null);
  const filtersSnapPoints = useMemo(() => ['70%'], []);
  const [filterCategory, setFilterCategory] =
    useState<FilterCategoryId>('category');
  // Multi-select per rail. Tap to add, re-tap to remove. All default
  // []. The strip in the footer reads "0 filters selected" on first
  // open and grows with each tap across any of the 4 rails.
  const [filterTileIndices, setFilterTileIndices] = useState<number[]>([]);
  const [annualFeeIndices, setAnnualFeeIndices] = useState<number[]>([]);
  const [cardNetworkIndices, setCardNetworkIndices] = useState<number[]>([]);
  const [bankIndices, setBankIndices] = useState<number[]>([]);
  // Shared toggle factory — every rail uses the same add/remove logic.
  const makeToggle = useCallback(
    (setter: React.Dispatch<React.SetStateAction<number[]>>) =>
      (index: number) => {
        setter((prev) =>
          prev.includes(index)
            ? prev.filter((i) => i !== index)
            : [...prev, index]
        );
      },
    []
  );
  const toggleFilterTile = useMemo(
    () => makeToggle(setFilterTileIndices),
    [makeToggle]
  );
  const toggleAnnualFee = useMemo(
    () => makeToggle(setAnnualFeeIndices),
    [makeToggle]
  );
  const toggleCardNetwork = useMemo(
    () => makeToggle(setCardNetworkIndices),
    [makeToggle]
  );
  const toggleBank = useMemo(
    () => makeToggle(setBankIndices),
    [makeToggle]
  );
  // Live total across all 4 rails — drives the StripAlert count.
  const filtersSelectedCount =
    filterTileIndices.length +
    annualFeeIndices.length +
    cardNetworkIndices.length +
    bankIndices.length;

  // Bank rail options — derived from the loaded cards so the list always
  // matches what's actually filterable. Sorted alphabetically.
  const bankOptions = useMemo(() => {
    const names = new Set<string>();
    cards.forEach((c) => {
      if (c.filterMeta?.bankName) names.add(c.filterMeta.bankName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  // Applied (committed) filters — the draft rail indices above only take
  // effect on "Apply Filter". The visible list is the loaded catalog run
  // through these. Carousel taps / Clear update this directly.
  const [appliedFilters, setAppliedFilters] =
    useState<AppliedFilters>(EMPTY_FILTERS);

  // "Apply Filter" white-screen transition (FilterTransitionOverlay). The
  // selection computed on apply is parked here until the white screen covers
  // Home; `filterOverlayVisible` drives the overlay's show/hide lifecycle.
  const [filterOverlayVisible, setFilterOverlayVisible] = useState(false);
  const pendingFiltersRef = useRef<AppliedFilters | null>(null);
  // An optional state change parked to run once the overlay fully covers Home
  // (e.g. flipping the eligibility toggle), so the list never flashes its old
  // contents before the reveal.
  const pendingOverlayActionRef = useRef<(() => void) | null>(null);

  // ── Filter transitions ───────────────────────────────────────────────
  // Lightweight, no-toast feedback that acknowledges a filter change, mapped
  // to the two kinds of change:
  //   • APPLY  → re-animate just the CARD section: each visible card fades +
  //              rises in with a staggered delay (StaggerCard below), so the
  //              filtered results read as freshly loaded — the rest of the
  //              page is untouched.
  //   • CLEAR  → flash a shimmer in the filter chip row itself while the chip
  //              values reset — reads as "filters resetting".
  // Both are purely cosmetic; the state changes happen synchronously.
  const FILTER_RELOAD_MS = 450;
  const [filterBarReloading, setFilterBarReloading] = useState(false);
  const filterBarReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Bank-select refresh — picking a bank from search replays the full-screen
  // skeleton for ~1 s, then reveals that bank's offerings. Reads as "fetching
  // this bank's cards" rather than the list silently re-filtering in place.
  const BANK_REFRESH_MS = 1000;
  const [bankRefreshing, setBankRefreshing] = useState(false);
  const bankRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Category-tile refresh — selecting (or deselecting) a tile from the "Find
  // the best card by category" carousel brackets the carousel with card
  // skeletons for ~900 ms while the new selection's cards "load", then reveals
  // them. The carousel itself stays put (with its selected tile highlighted).
  const CATEGORY_FETCH_MS = 900;
  const [categoryFetching, setCategoryFetching] = useState(false);
  const categoryFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // APPLY → arm the card stagger. While `cardStaggerActive` is true, any card
  // that (re)mounts plays its entrance animation; the window is short so a
  // later scroll-in doesn't re-trigger it. Used by every "add/refine" path.
  const [cardStaggerActive, setCardStaggerActive] = useState(false);
  const cardStaggerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerCardStagger = useCallback(() => {
    if (cardStaggerTimer.current) clearTimeout(cardStaggerTimer.current);
    setCardStaggerActive(true);
    cardStaggerTimer.current = setTimeout(
      () => setCardStaggerActive(false),
      FILTER_RELOAD_MS
    );
  }, []);

  // Category-tile fetch — show the bracketing skeletons for ~900 ms, then clear
  // them AND arm the stagger in the same tick so the revealed cards (data flips
  // from [] back to the list) cascade in rather than popping.
  const triggerCategoryFetch = useCallback(() => {
    if (categoryFetchTimer.current) clearTimeout(categoryFetchTimer.current);
    setCategoryFetching(true);
    categoryFetchTimer.current = setTimeout(() => {
      setCategoryFetching(false);
      triggerCardStagger();
    }, CATEGORY_FETCH_MS);
  }, [triggerCardStagger]);

  // Re-cascade the card list every time Home regains focus (a tab switch or a
  // pop back to Home). The tab screen stays mounted, so a plain re-focus would
  // otherwise show the list instantly with no motion. Bumping `homeReloadKey`
  // (the FlatList `key`) remounts the rows, and arming the stagger makes those
  // fresh mounts play their entrance — reusing the same StaggerCard the filter
  // transitions use. The masthead lives in ListHeaderComponent (outside the
  // StaggerCard cascade), so it never animates. iOS only — Android keeps the
  // list static on re-focus. Skips the very first focus (the mount entrance
  // already covers it).
  const isFocused = useIsFocused();
  const [homeReloadKey, setHomeReloadKey] = useState(0);
  const homeFirstFocus = useRef(true);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (homeFirstFocus.current) {
      homeFirstFocus.current = false;
      return;
    }
    if (isFocused) {
      setHomeReloadKey((k) => k + 1);
      triggerCardStagger();
    }
  }, [isFocused, triggerCardStagger]);

  // CLEAR flash — shimmer in the filter chip row while it empties. Used by
  // every "remove/clear a filter" path.
  const flashFilterBarReload = useCallback(() => {
    if (filterBarReloadTimer.current) clearTimeout(filterBarReloadTimer.current);
    setFilterBarReloading(true);
    filterBarReloadTimer.current = setTimeout(
      () => setFilterBarReloading(false),
      FILTER_RELOAD_MS
    );
  }, []);

  // Clear any pending timers on unmount.
  useEffect(
    () => () => {
      if (cardStaggerTimer.current) clearTimeout(cardStaggerTimer.current);
      if (filterBarReloadTimer.current)
        clearTimeout(filterBarReloadTimer.current);
      if (bankRefreshTimer.current) clearTimeout(bankRefreshTimer.current);
      if (categoryFetchTimer.current) clearTimeout(categoryFetchTimer.current);
    },
    []
  );

  // "Apply Filter" → run the white-screen transition (FilterTransitionOverlay)
  // so the change clearly registers. The computed selection is parked in a ref
  // and only committed once the white screen has fully covered Home (its
  // onCovered), so the list never flashes its old contents. No card stagger on
  // this path — the white-out → reveal IS the transition.
  const commitFilters = useCallback(() => {
    pendingFiltersRef.current = {
      categoryTagIds: filterTileIndices
        .map((i) => CATEGORY_OPTIONS[i]?.tagId)
        .filter((n): n is number => n != null),
      bankNames: bankIndices.map((i) => bankOptions[i]).filter(Boolean),
      networks: cardNetworkIndices
        .map((i) => NETWORK_OPTIONS[i])
        .filter(Boolean),
      // Annual-fee rail order matches ANNUAL_FEE_BUCKETS, so indices map 1:1.
      feeBucketIndices: annualFeeIndices,
    };
    analytics.track(Events.FILTER_APPLY, {
      category_count: filterTileIndices.length,
      bank_count: bankIndices.length,
      network_count: cardNetworkIndices.length,
      fee_count: annualFeeIndices.length,
    });
    filtersSheetRef.current?.dismiss();
    setFilterOverlayVisible(true);
  }, [filterTileIndices, bankIndices, cardNetworkIndices, annualFeeIndices, bankOptions]);

  // White screen fully covers Home → commit the parked filters + snap to the
  // top, all behind the overlay so the reveal shows fresh results from the top.
  const handleFilterOverlayCovered = useCallback(() => {
    if (pendingFiltersRef.current) {
      setAppliedFilters(pendingFiltersRef.current);
      pendingFiltersRef.current = null;
    }
    if (pendingOverlayActionRef.current) {
      pendingOverlayActionRef.current();
      pendingOverlayActionRef.current = null;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  // White screen has faded back out → reset the trigger for the next apply.
  const handleFilterOverlayHidden = useCallback(() => {
    setFilterOverlayVisible(false);
  }, []);

  // "Great, Show Cards" on the eligible-set sheet. The list is already filtered
  // to the eligible cards behind the sheet, so we dismiss it and then replay the
  // same cat + skeleton transition the Apply-Filter path uses, so the result
  // reads as the page refreshing into the eligible cards. No pending filters are
  // parked (eligibility was committed on check), so onCovered just snaps to top.
  const handleEligibleShowCards = useCallback(() => {
    eligibleSheetRef.current?.dismiss();
    // Let the sheet slide away first, then run the full-screen transition.
    setTimeout(() => setFilterOverlayVisible(true), 320);
  }, []);

  const clearFilters = useCallback(() => {
    analytics.track(Events.FILTER_CLEAR, { scope: 'all' });
    setFilterTileIndices([]);
    setAnnualFeeIndices([]);
    setCardNetworkIndices([]);
    setBankIndices([]);
    setAppliedFilters(EMPTY_FILTERS);
    // Also drop the eligibility filter + toggle.
    setEligibleAliases(null);
    setEligibilityOn(false);
    flashFilterBarReload();
  }, [flashFilterBarReload]);

  // Eligibility filter — the toggle runs the eligibility checker, which
  // returns the card_aliases the user qualifies for. `eligibleAliases`
  // null = toggle off (no eligibility filter). `eligibilityDetails` is
  // retained so the card-detail checker can prefill the same values.
  const [eligibilityDetails, setEligibilityDetails] = useState<{
    pincode: string;
    income: string;
    incomeType: 'salaried' | 'self-employed';
  } | null>(null);
  const [eligibleAliases, setEligibleAliases] = useState<string[] | null>(null);

  // Commit an eligibility result (from either checker) → store details for
  // prefill + the eligible set, and switch the toggle on.
  const applyEligibility = useCallback(
    (o: {
      pincode: string;
      income: string;
      incomeType: 'salaried' | 'self-employed';
      eligibleCardAliases: string[];
    }) => {
      setEligibilityDetails({ pincode: o.pincode, income: o.income, incomeType: o.incomeType });
      setEligibleAliases(o.eligibleCardAliases);
      setEligibilityOn(true);
      // Details (re)entered — outcomes may have changed, so let each card show
      // its result sheet once more before reverting to direct redirect.
      shownEligibilityResultRef.current.clear();
      // Eligibility checked — log outcome size, income type, the ₹10k income
      // band, and the 3-digit pincode region. Bucketed/coarsened so it's a
      // usable analytics dimension without sending raw income or a full PIN.
      analytics.track(Events.ELIGIBILITY_CHECK, {
        eligible_count: o.eligibleCardAliases.length,
        income_type: o.incomeType,
        income_band: incomeBand(o.income),
        pincode_prefix: pincodePrefix(o.pincode),
      });
    },
    []
  );

  const handleEligibilityToggle = useCallback(
    (next: boolean) => {
      analytics.track(Events.ELIGIBILITY_TOGGLE, { enabled: next });
      // Toggle path is not an Apply — clear any stale pending-apply so the
      // checker (if it opens) just filters rather than popping a result sheet.
      setApplyPendingCard(null);
      // Turning ON for the first time (no eligible-set yet, or after a Clear):
      // flip the toggle and open the checker. The checker → EligibleSheet →
      // "Great, Show Cards" path runs its own cat + skeleton transition, so no
      // overlay here.
      if (next && eligibleAliases == null) {
        setEligibilityOn(true);
        eligibilityCheckerRef.current?.present();
        return;
      }
      // Otherwise the list is about to change between filtered and unfiltered
      // (turning OFF, or re-enabling a remembered eligible-set). Replay the
      // cat + skeleton transition and commit the toggle once the overlay covers
      // Home, so the list never flashes its old contents before the reveal.
      // Turning OFF keeps the details + eligible-set so they're remembered
      // (edit / clear via the pencil).
      pendingOverlayActionRef.current = () => setEligibilityOn(next);
      setFilterOverlayVisible(true);
    },
    [eligibleAliases]
  );

  // Pencil / "Edit" next to the toggle → reopen the checker prefilled so the
  // user can change (or clear) their saved details.
  const handleEligibilityEdit = useCallback(() => {
    eligibilityCheckerRef.current?.present();
  }, []);

  // "Clear" inside the checker → wipe saved details + filter + toggle, then
  // close. Returns the flow to its blank state (e.g. to test the card-detail
  // entry path where no details exist yet).
  const handleEligibilityClear = useCallback(() => {
    setEligibilityDetails(null);
    setEligibleAliases(null);
    setEligibilityOn(false);
    shownEligibilityResultRef.current.clear();
    eligibilityCheckerRef.current?.dismiss();
  }, []);

  // Category carousel tap → filter Home to that single category (and sync
  // the sheet's Category rail so it reflects the active selection).
  // Currently-selected carousel tile — the sole applied category (a single
  // categoryTagId, set by a carousel tap). Drives the saffron stroke + tick.
  const selectedCategoryId = useMemo(() => {
    const ids = appliedFilters.categoryTagIds;
    return ids.length === 1 ? String(ids[0]) : null;
  }, [appliedFilters.categoryTagIds]);

  const handleCategoryFilter = useCallback(
    (id: string) => {
      const idx = CATEGORY_OPTIONS.findIndex((o) => String(o.tagId) === id);
      if (idx < 0) return;
      // Re-tapping the active tile deselects it → back to the full list.
      const isDeselect = selectedCategoryId === id;
      analytics.track(Events.CATEGORY_FILTER, {
        category: CATEGORY_OPTIONS[idx]?.label,
        selected: !isDeselect,
        source: 'carousel',
      });
      setAnnualFeeIndices([]);
      setCardNetworkIndices([]);
      setBankIndices([]);
      if (isDeselect) {
        setFilterTileIndices([]);
        setAppliedFilters(EMPTY_FILTERS);
      } else {
        setFilterTileIndices([idx]);
        setAppliedFilters({
          ...EMPTY_FILTERS,
          categoryTagIds: [CATEGORY_OPTIONS[idx].tagId],
        });
      }
      // Bracket the carousel with card skeletons while the new selection
      // "loads"; the fetch's completion arms the stagger so the revealed cards
      // cascade in.
      triggerCategoryFetch();
    },
    [selectedCategoryId, triggerCategoryFetch]
  );

  // Search → tap a bank: filter the Home list to that bank's cards (card
  // names don't contain the full bank name, so re-searching by name would
  // come up empty — apply the bank filter instead) and sync the filter rail.
  const handleBankFilter = useCallback(
    (bankName: string) => {
      const idx = bankOptions.indexOf(bankName);
      setFilterTileIndices([]);
      setAnnualFeeIndices([]);
      setCardNetworkIndices([]);
      setBankIndices(idx >= 0 ? [idx] : []);
      setAppliedFilters({ ...EMPTY_FILTERS, bankNames: [bankName] });
      // Snap the list to the top so the bank's cards show from the start
      // (the search modal is closing over Home, so do it un-animated —
      // the user lands at the top once the modal slides away).
      requestAnimationFrame(() =>
        listRef.current?.scrollToOffset({ offset: 0, animated: false })
      );
      // Show the skeleton over the (already-filtered) list for ~1 s, then
      // drop it and cascade the revised offerings in.
      setBankRefreshing(true);
      if (bankRefreshTimer.current) clearTimeout(bankRefreshTimer.current);
      bankRefreshTimer.current = setTimeout(() => {
        setBankRefreshing(false);
        triggerCardStagger();
      }, BANK_REFRESH_MS);
    },
    [bankOptions, triggerCardStagger]
  );

  // "Clear" on the active-bank banner — drops only the bank dimension,
  // leaving any other applied filters (category / network / fee) intact.
  const clearBankFilter = useCallback(() => {
    setBankIndices([]);
    setAppliedFilters((prev) => ({ ...prev, bankNames: [] }));
    flashFilterBarReload();
  }, [flashFilterBarReload]);
  const renderEligibilityBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const insets = useSafeAreaInsets();

  // Filters sheet sticky footer. Uses the FooterButtons organism with
  // strip='caption' so the StripAlert above the action row shows a
  // live count of currently-selected filters. BottomSheetFooter pins
  // the whole bar to the bottom of the sheet (above the safe area)
  // so it never scrolls with the right-panel content.
  const renderFiltersFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <FooterButtons
          buttons="dual"
          // 44 per Figma 1791:4029 (52 left no room for "Apply Filter").
          size={44}
          shadow="on"
          strip="caption"
          // Saffron strip per Figma 1791:4029 (was the cobalt info tone).
          stripTone="brand"
          stripText={`${filtersSelectedCount} filter${filtersSelectedCount === 1 ? '' : 's'} selected`}
          color="second"
          primaryLabel="Apply Filter"
          secondaryLabel="Clear"
          onPrimary={commitFilters}
          onSecondary={clearFilters}
          // Lift Clear / Apply Filter above the Android navigation bar
          // (edge-to-edge) — they were drawn underneath it.
          style={{ paddingBottom: insets.bottom }}
        />
      </BottomSheetFooter>
    ),
    [filtersSelectedCount, commitFilters, clearFilters, insets.bottom]
  );

  // Scroll-driven UI state. scrollY drives the frosted HomeHeader's
  // fade-in via reanimated; the lastY ref + setHidden drive the
  // floating BottomNav hide/reveal via the shared TabNavigator context.
  const { setHidden } = useBottomNavVisibility();
  const scrollY = useSharedValue(0);
  const lastY = useRef(0);
  // The frosted scrolled HomeHeader is an absolute top overlay that fades in
  // on scroll. While it's invisible (page at the top) it must NOT capture
  // touches — otherwise its right-pinned Eligibility toggle sits on top of the
  // masthead's bell/message icons and steals taps. Gate interactivity on
  // whether the header has begun to reveal.
  const [frostedInteractive, setFrostedInteractive] = useState(false);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollY.value = y;

    const shouldInteract = y >= FROSTED_HEADER_FADE_IN;
    if (shouldInteract !== frostedInteractive) {
      setFrostedInteractive(shouldInteract);
    }

    // BottomNav hide/reveal — compare against the previous frame.
    const dy = y - lastY.current;
    if (y <= 0) {
      // Always reveal at the very top of the scroll.
      setHidden(false);
    } else if (dy > NAV_HIDE_THRESHOLD) {
      // Scrolling forward (content moves up) → hide the nav.
      setHidden(true);
    } else if (dy < -NAV_REVEAL_THRESHOLD) {
      // Scrolling backward (content moves down) → reveal the nav, even on
      // a tiny upward movement.
      setHidden(false);
    }
    lastY.current = y;
  };

  // Frosted scrolled HomeHeader — opacity + translateY interpolated
  // off scrollY. Slides down + fades in once scroll passes the
  // masthead. Fully opaque at full reveal (Figma 1929:32667): the 0.90 cap
  // let card text ghost through behind the status-bar icons and the chips.
  const frostedAnimStyle = useAnimatedStyle(() => {
    const op = interpolate(
      scrollY.value,
      [FROSTED_HEADER_FADE_IN, FROSTED_HEADER_FADE_FULL],
      [0, opacity[100]],
      Extrapolation.CLAMP
    );
    const ty = interpolate(
      scrollY.value,
      [FROSTED_HEADER_FADE_IN, FROSTED_HEADER_FADE_FULL],
      [-spacing[24], 0],
      Extrapolation.CLAMP
    );
    return { opacity: op, transform: [{ translateY: ty }] };
  });

  const handleCardPress = (
    card: CardModel,
    e?: { nativeEvent: { pageY: number } }
  ) => {
    // Remember WHERE on screen the card was tapped — the Android detail screen
    // zooms open from / collapses back into this Y so it feels like it comes
    // out of the card. (iOS ignores it.)
    const y = e?.nativeEvent?.pageY;
    if (typeof y === 'number') setCardOriginY(y);
    // Tapping a card opens the detail sheet — a light tap acknowledges it.
    haptics.impact('light');
    // GA4 select_item — the tile tap that precedes the view_item below.
    analytics.track(Events.SELECT_ITEM, {
      item_id: card.id,
      item_name: card.name,
      item_brand: card.filterMeta?.bankName,
      item_list_name: 'home_cards',
    });
    // Normal taps open the partial (75%) stage.
    openCardSheet(card, 0);
  };

  // "View all benefits" leaves the sheet for the All Card Benefits page.
  // Remember the open card + flag so we can restore the sheet on return.
  const handleViewAllBenefits = useCallback(
    (card: CardModel) => {
      analytics.track(Events.CARD_VIEW_ALL_BENEFITS, {
        item_id: card.id,
        item_name: card.name,
      });
      reopenCardSheetRef.current = true;
      sheetRef.current?.dismiss();
      navigation.navigate('AllCardBenefits', {
        alias: card.filterMeta?.cardAlias,
        cardName: card.name,
      });
    },
    [navigation]
  );

  // Both "back" actions on the All Card Benefits page (top arrow + footer
  // CTA) pop back to Home; re-present the card-detail sheet for the card the
  // user was viewing — at the FULL-SCREEN stage (index 1), since benefits is
  // reached from the expanded page — so they return to it, not the Home list.
  useFocusEffect(
    useCallback(() => {
      if (reopenCardSheetRef.current && selectedCard) {
        reopenCardSheetRef.current = false;
        openCardSheet(null, 1);
      }
    }, [selectedCard, openCardSheet])
  );

  // "Apply Now" (Home tile + the detail sheet's sticky CTA) routes through
  // the eligibility result sheet "according to case":
  //   - no details yet  → open the checker; once submitted, show the result
  //                        sheet for this card (applyPendingCard remembers it).
  //   - details present → resolve THIS card's outcome (eligible / maybe /
  //                        ineligible) and open the matching colored sheet.
  // The sheet's "Continue to Apply" / "Apply Now" then opens the bank page.
  const handleApply = (card: CardModel) => {
    // "Apply Now" tapped (from tile or detail sheet). The actual outbound to
    // the bank fires later in handleResultApply (redirect: true) — or directly
    // here on a repeat apply for a card whose result was already shown once.
    // A/B: 'mandatory' (control) asks for eligibility before the first
    // apply; 'skippable' (Figma) lets Apply go straight to the bank when no
    // details exist. Frozen per session; see src/experiments.
    const gateVariant = getEligibilityGateVariant();
    analytics.track(Events.CARD_APPLY, {
      item_id: card.id,
      item_name: card.name,
      item_brand: card.filterMeta?.bankName,
      eligibility_known: !!eligibilityDetails,
      income_type: eligibilityDetails?.incomeType,
      income_band: eligibilityDetails ? incomeBand(eligibilityDetails.income) : undefined,
      pincode_prefix: eligibilityDetails ? pincodePrefix(eligibilityDetails.pincode) : undefined,
      gate_variant: gateVariant,
    });
    setSelectedCard(card);
    if (!eligibilityDetails) {
      if (gateVariant === 'skippable') {
        applyOutbound(card);
        return;
      }
      setApplyPendingCard(card);
      eligibilityCheckerRef.current?.present();
      return;
    }
    const income = Number(eligibilityDetails.income.replace(/[^0-9]/g, ''));
    const outcome = resolveCardOutcome(
      card,
      eligibleAliases,
      income
    );
    // The eligibility result sheet is a one-time reveal per card. Once the
    // user has seen their eligible / maybe result for this card, a subsequent
    // "Apply Now" skips the sheet and goes straight to the bank's apply page.
    // Ineligible always re-shows the sheet (there's nothing to redirect to).
    if (
      outcome !== 'ineligible' &&
      shownEligibilityResultRef.current.has(card.id)
    ) {
      applyOutbound(card);
      return;
    }
    if (outcome !== 'ineligible') {
      shownEligibilityResultRef.current.add(card.id);
    }
    presentResultSheet(outcome);
  };

  // One card tile (used in both Top picks and More to explore). Fees show
  // the GST-inclusive amount with a tap-to-reveal "(base + GST)" breakdown,
  // matching the card detail sheet.
  const renderTile = (card: CardModel) => (
    <Pressable
      key={card.id}
      onPress={(e) => handleCardPress(card, e)}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, view details`}
    >
      <CardTile
        type="full"
        cardImage={card.cardImage}
        cardName={card.name}
        cashbackText={card.cashbackValue}
        inviteOnly={card.inviteOnly}
        tags={card.tags}
        // Category-aware: when categories are applied, the tile's 2 headline
        // points become the ones matching the selected category(ies) — one per
        // category, round-robin — instead of the card's default top 2.
        benefits={selectTileBenefits(card.tileBenefits, appliedFilters.categoryTagIds)}
        feeType={card.feeType}
        feeProps={{
          joiningFee: card.detail?.fee.joining.amount ?? card.joiningFee,
          annualFee: card.detail?.fee.annual.amount ?? card.annualFee,
          joiningSub: card.detail?.fee.joining.sub || undefined,
          annualSub: card.detail?.fee.annual.sub || undefined,
        }}
        onApply={() => handleApply(card)}
      />
    </Pressable>
  );

  // Banks in catalog rank order (the order cards load on Home), de-duped.
  // `image` is the bank's real logo (from the init-bundle bank_data) when the
  // API returned one, falling back to the top card's art for any bank without
  // a logo. `subtitle` is still the top card's cashback as a stand-in (no
  // per-bank cashback ships yet). Used for the search quick-chips and the
  // typed-state "Banks" section.
  const rankedBanks = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; image: CardModel['cardImage']; subtitle: string }[] = [];
    for (const c of cards) {
      const name = c.filterMeta?.bankName;
      if (name && !seen.has(name)) {
        seen.add(name);
        const logo = c.filterMeta?.bankLogo;
        out.push({
          name,
          image: logo ? { uri: logo } : c.cardImage,
          subtitle: c.cashback,
        });
      }
    }
    return out;
  }, [cards]);

  // Quick chips for the empty search state (Figma 1985:36934): top 3 banks +
  // the top-ranked card, in Home rank order. Bank chips re-search that bank;
  // the card chip opens that card.
  const searchQuickChips = useMemo<SearchTopSheetRecent[]>(() => {
    const bankChips = rankedBanks
      .slice(0, 3)
      .map((b): SearchTopSheetRecent => ({
        label: b.name,
        leadingIcon: 'feat-bank-outline',
      }));
    const topCard = cards[0];
    // wallet-outline stands in for a card glyph — the only literal card icon
    // (nav-cards-outline) is baked white and wouldn't show on the chip.
    return topCard
      ? [...bankChips, { label: topCard.name, leadingIcon: 'wallet-outline' }]
      : bankChips;
  }, [rankedBanks, cards]);

  // Search — matches the loaded catalog by card name (Cards section) and by
  // bank name (Banks section). Both feed the SearchTopSheet, bifurcated per
  // Figma 1985:36947.
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return cards.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 12);
  }, [cards, searchQuery]);

  const searchBanks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return rankedBanks.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 4);
  }, [rankedBanks, searchQuery]);

  const searchSections = useMemo<SearchResultSection[]>(() => {
    const out: SearchResultSection[] = [];
    if (searchBanks.length > 0) {
      out.push({
        header: 'Banks',
        rows: searchBanks.map((b) => ({
          logo: b.image,
          title: b.name,
          subtitle: b.subtitle,
        })),
      });
    }
    if (searchResults.length > 0) {
      out.push({
        header: 'Cards',
        rows: searchResults.map((c) => ({
          logo: c.cardImage,
          title: c.name,
          subtitle: c.cashback,
        })),
      });
    }
    return out;
  }, [searchBanks, searchResults]);

  // Quick-chip tap: a chip whose label matches a card → open that card;
  // otherwise it's a bank → close search and filter Home to that bank.
  // (Bank names never equal a card name, so the match is an unambiguous
  // discriminator.)
  const handleSearchChipPress = useCallback(
    (chip: SearchTopSheetRecent) => {
      analytics.track(Events.SEARCH, { search_term: chip.label, result_type: 'chip' });
      setSearchOpen(false);
      setSearchQuery('');
      const card = cards.find((c) => c.name === chip.label);
      if (card) {
        setTimeout(() => handleCardPress(card), 220);
      } else {
        handleBankFilter(chip.label);
      }
    },
    [cards, handleBankFilter]
  );

  // Result-row tap: resolve by the tapped section's header (Banks may be
  // absent, so a fixed index isn't safe). Bank → drill into that bank's
  // cards via search; Card → open its detail.
  const handleSearchResultPress = useCallback(
    (_row: unknown, sectionIndex: number, rowIndex: number) => {
      const section = searchSections[sectionIndex];
      if (!section) return;
      if (section.header === 'Banks') {
        const bank = searchBanks[rowIndex];
        if (!bank) return;
        // GA4 search — the chosen result's label is a brand/product name (not PII).
        analytics.track(Events.SEARCH, { search_term: bank.name, result_type: 'bank' });
        setSearchOpen(false);
        setSearchQuery('');
        handleBankFilter(bank.name);
        return;
      }
      const card = searchResults[rowIndex];
      if (!card) return;
      analytics.track(Events.SEARCH, { search_term: card.name, result_type: 'card' });
      setSearchOpen(false);
      setSearchQuery('');
      // Let the search modal animate out before presenting the sheet.
      setTimeout(() => handleCardPress(card), 220);
    },
    [searchSections, searchBanks, searchResults, handleBankFilter]
  );

  // Visible list = loaded catalog run through the applied filters, then
  // (if the eligibility toggle is on) restricted to eligible cards.
  const eligibilityFilterActive = eligibilityOn && eligibleAliases != null;
  const visibleCards = useMemo(() => {
    let list = applyFilters(cards, appliedFilters);
    // Eligibility filter applies only while the toggle is ON — turning it
    // off hides the filter but keeps the details (remembered for next time).
    if (eligibilityFilterActive && eligibleAliases) {
      const set = new Set(eligibleAliases);
      list = list.filter(
        (c) => c.filterMeta?.cardAlias && set.has(c.filterMeta.cardAlias)
      );
    }
    return list;
  }, [cards, appliedFilters, eligibilityFilterActive, eligibleAliases]);
  const anyFilterActive =
    hasActiveFilters(appliedFilters) || eligibilityFilterActive;

  // Per-chip counts driving the FilterRow chips' selected-with-count state.
  // A non-zero count flips that chip into the Chip `tab` default treatment
  // (pale-cobalt fill + cobalt label + count badge) — the "Default Selected
  // with Count" reference. Category counts the selected categories; Filters
  // counts the other rails (bank / network / fee) so the two badges never
  // double-count. (Make Filters a total by adding categoryFilterCount.)
  const categoryFilterCount = appliedFilters.categoryTagIds.length;
  const otherFilterCount =
    appliedFilters.bankNames.length +
    appliedFilters.networks.length +
    appliedFilters.feeBucketIndices.length;

  // Active-bank banner — shown when a bank filter is applied (almost always
  // via a search bank tap, which sets exactly this dimension). Surfaces WHICH
  // bank is filtering + a card count so the silently-filtered list reads as
  // intentional, with a one-tap Clear.
  const activeBankNames = appliedFilters.bankNames;
  const bankCardCount = useMemo(
    () =>
      activeBankNames.length
        ? cards.filter(
            (c) =>
              c.filterMeta?.bankName &&
              activeBankNames.includes(c.filterMeta.bankName)
          ).length
        : 0,
    [cards, activeBankNames]
  );
  // Top picks = first 2; "More to explore" = every remaining card. The
  // list is virtualized (FlatList below) so all ~159 tiles render smoothly
  // without mounting at once.
  const firstCards = visibleCards.slice(0, 2);
  const restCards = visibleCards.slice(2);

  // Eligibility grouping (Figma 5972:28691). When the eligibility toggle is
  // on AND a check has run, the list switches from the top-picks/carousel
  // layout to ALL filtered cards grouped into Eligible / Maybe / Ineligible
  // sections (each a header row + its cards). Built as a flat array so the
  // existing FlatList can render headers and cards inline.
  type GroupedRow =
    | { kind: 'header'; key: EligibilityBucket; label: string }
    | { kind: 'card'; card: CardModel };
  const groupedRows = useMemo<GroupedRow[] | null>(() => {
    if (!eligibilityFilterActive || !eligibleAliases) return null;
    const monthlyIncome = Number(
      (eligibilityDetails?.income ?? '').replace(/[^0-9]/g, '')
    );
    // ALL filtered cards (NOT the eligibility-filtered visibleCards) — the
    // grouped view shows every card under its bucket, not just eligible ones.
    const filtered = applyFilters(cards, appliedFilters);
    const buckets: Record<EligibilityBucket, CardModel[]> = {
      eligible: [],
      maybe: [],
      ineligible: [],
    };
    for (const c of filtered) {
      buckets[classifyCardEligibility(c, eligibleAliases, monthlyIncome)].push(c);
    }
    const labels: Record<EligibilityBucket, string> = {
      eligible: 'Eligible Cards',
      maybe: 'Maybe Eligible Cards',
      ineligible: 'Ineligible Cards',
    };
    const rows: GroupedRow[] = [];
    (['eligible', 'maybe', 'ineligible'] as EligibilityBucket[]).forEach((k) => {
      const arr = buckets[k];
      if (arr.length === 0) return;
      rows.push({ kind: 'header', key: k, label: `${labels[k]} ${arr.length}` });
      arr.forEach((card) => rows.push({ kind: 'card', card }));
    });
    return rows;
  }, [eligibilityFilterActive, eligibleAliases, eligibilityDetails, cards, appliedFilters]);

  // Data + empties: in grouped mode the list renders groupedRows; otherwise
  // the usual restCards (top picks live in the header). "No results" keys off
  // whichever list is actually showing.
  const grouped = groupedRows != null;
  const listData: Array<CardModel | GroupedRow> = grouped ? groupedRows! : restCards;
  const noResults =
    anyFilterActive &&
    (grouped ? groupedRows!.length === 0 : visibleCards.length === 0);

  // Cards the CardDetailSheet pager swipes through. In grouped mode it must be
  // EVERY shown card (eligible + maybe + ineligible, in grouped order) so
  // tapping a maybe/ineligible tile opens that card — not just the eligible
  // subset (visibleCards). Default mode keeps visibleCards.
  const pagerCards = useMemo<CardModel[]>(
    () =>
      grouped
        ? groupedRows!
            .filter((r): r is { kind: 'card'; card: CardModel } => r.kind === 'card')
            .map((r) => r.card)
        : visibleCards,
    [grouped, groupedRows, visibleCards]
  );

  // ----- Eligibility result-sheet content (Path B) ------------------
  // Detail-row values for the result mastheads (pincode · income · type),
  // derived from the details the user submitted.
  const eligibilityDisplay = useMemo(() => {
    if (!eligibilityDetails) return undefined;
    const n = Number(eligibilityDetails.income.replace(/[^0-9]/g, ''));
    const amount = !n
      ? undefined
      : n >= 100000
        ? `₹${parseFloat((n / 100000).toFixed(1))}L`
        : n >= 1000
          ? `₹${Math.round(n / 1000)}K`
          : `₹${n}`;
    return {
      pincode: eligibilityDetails.pincode || undefined,
      amount,
      occupation:
        eligibilityDetails.incomeType === 'self-employed'
          ? 'Self-employed'
          : 'Salaried',
    };
  }, [eligibilityDetails]);

  // Cards for the maybe / ineligible result-sheet carousels — the eligible
  // set when known, else the loaded catalog. Mapped to CardCarouselItem.
  const resultCarouselCards = useMemo(() => {
    const src = eligibleAliases ? visibleCards : cards;
    return src.slice(0, 8).map((c) => ({
      id: c.id,
      cardImage: c.cardImage,
      cardName: c.name,
      cashbackText: c.cashbackValue,
      tags: c.tags,
      benefits: c.tileBenefits,
    }));
  }, [eligibleAliases, visibleCards, cards]);
  const exploreCount = eligibleAliases ? visibleCards.length : cards.length;
  // The card the green EligibleSheet celebrates. From the card-detail flow
  // it's the open card; from the Home checker (no open card) it's the top
  // eligible card so the sheet still has a card to show + apply to.
  const resultHeroCard = selectedCard ?? visibleCards[0] ?? cards[0] ?? null;

  // Eligible-set cards (catalog ∩ eligible aliases) — drives the Home
  // toggle's "eligible for N cards" green sheet: the headline count + the
  // fanned card stack. Count comes from the actual filterable matches so it
  // agrees with the list the "Show Cards" CTA reveals.
  const eligibleStackCards = useMemo(() => {
    if (!eligibleAliases) return [];
    const set = new Set(eligibleAliases);
    return cards.filter(
      (c) => c.filterMeta?.cardAlias && set.has(c.filterMeta.cardAlias)
    );
  }, [eligibleAliases, cards]);
  const eligibleStackImages = useMemo(
    () => eligibleStackCards.map((c) => c.cardImage).filter(Boolean),
    [eligibleStackCards]
  );
  const eligibleStackCount = eligibleStackCards.length;

  // Dismiss whichever result sheet is open.
  const dismissResultSheets = useCallback(() => {
    eligibleSheetRef.current?.dismiss();
    maybeSheetRef.current?.dismiss();
    ineligibleSheetRef.current?.dismiss();
  }, []);
  // The real outbound click to the bank's apply page — the conversion. Shared
  // by the result-sheet CTA and the skip-the-sheet repeat-apply path.
  const applyOutbound = useCallback(
    (card: CardModel) => {
      shownEligibilityResultRef.current.add(card.id);
      analytics.track(Events.CARD_APPLY, {
        item_id: card.id,
        item_name: card.name,
        item_brand: card.filterMeta?.bankName,
        eligibility_known: !!eligibilityDetails,
        income_type: eligibilityDetails?.incomeType,
        income_band: eligibilityDetails ? incomeBand(eligibilityDetails.income) : undefined,
        pincode_prefix: eligibilityDetails ? pincodePrefix(eligibilityDetails.pincode) : undefined,
        redirect: true,
        gate_variant: getEligibilityGateVariant(),
      });
      openClickOut({ kind: 'card', url: card.applyUrl, itemId: card.id, itemName: card.name });
    },
    [eligibilityDetails, openClickOut]
  );
  // "Continue to Apply" / "Apply Now" on a result sheet → close it + open the
  // card's apply page (details exist by now, so handleApply proceeds).
  const handleResultApply = useCallback(() => {
    dismissResultSheets();
    if (resultHeroCard) applyOutbound(resultHeroCard);
  }, [dismissResultSheets, resultHeroCard, applyOutbound]);
  // "Edit" on a result sheet → close it + reopen the eligibility checker.
  const handleResultEdit = useCallback(() => {
    dismissResultSheets();
    eligibilityCheckerRef.current?.present();
  }, [dismissResultSheets]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      {/* Light icons over the dark-blue masthead; dark once the light
          frosted header has faded in on scroll. */}
      <StatusBar style={frostedInteractive ? 'dark' : 'light'} />
      {/* Real content — wrapped in an entrance Animated.View that
          fades + rises into place after the skeleton starts dissolving. */}
      <Animated.View style={[{ flex: 1 }, contentEntranceStyle]}>
      <FlatList
        // Bumped on every Home re-focus to remount the rows so they replay
        // their staggered entrance (see homeReloadKey effect above).
        key={homeReloadKey}
        ref={listRef}
        // During a category fetch the real rows are swapped for skeleton
        // placeholders, keeping the list height stable so the footer doesn't
        // jump up under the carousel.
        data={categoryFetching ? (CATEGORY_SKELETON_ROWS as any) : listData}
        keyExtractor={(item) =>
          'kind' in item
            ? item.kind === 'header'
              ? `h-${item.key}`
              : item.card.id
            : item.id
        }
        renderItem={({ item, index }) => {
          // Category-fetch skeleton placeholder row.
          if ('skeleton' in item) {
            return (
              <View style={{ marginTop: spacing[16] }}>
                <CardListSkeleton count={1} />
              </View>
            );
          }
          // Grouped mode: rows are section headers or card wrappers.
          if ('kind' in item) {
            if (item.kind === 'header') {
              return (
                <View
                  style={{
                    paddingHorizontal: spacing[16],
                    marginTop: spacing[24],
                  }}
                >
                  <SectionRule label={item.label} />
                </View>
              );
            }
            return (
              <StaggerCard index={index} active={cardStaggerActive}>
                <View style={{ paddingHorizontal: spacing[16], marginTop: spacing[16] }}>
                  {renderTile(item.card)}
                </View>
              </StaggerCard>
            );
          }
          // Default mode: a plain card row.
          return (
            <StaggerCard index={index} active={cardStaggerActive}>
              <View style={{ paddingHorizontal: spacing[16], marginTop: spacing[16] }}>
                {renderTile(item)}
              </View>
            </StaggerCard>
          );
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        removeClippedSubviews
        contentContainerStyle={{
          // Reserve space for the floating tab pill.
          paddingBottom: navClearance,
        }}
        ListFooterComponent={
          // Bottom Footer — REUSED Footer organism, theme='dark' (the
          // light-background variant: dark text on the white background).
          <View style={{ marginTop: spacing[32] }}>
            <Footer
              theme="dark"
              headline={'Found the\nright card?'}
              subtext="Apply now and earn cashback."
            />
          </View>
        }
        ListHeaderComponent={
          <>
        {/* 1. Masthead — edge-to-edge, owns its own safe-area top
            buffer, SearchBar pinned to the bottom (taps open the
            SearchTopSheet). */}
        <Masthead
          variant="home"
          // No unread badge: there's no notifications feed yet (it was a
          // hard-coded "1" that never cleared).
          notificationCount={0}
          background={
            <HeroVideo source={require('../assets/videos/home-hero.mp4')} />
          }
          onSearchPress={() => setSearchOpen(true)}
          onMessagePress={() => undefined}
          onBellPress={() => {
            analytics.track(Events.NOTIFICATION_OPEN, { source: 'home' });
            navigation.navigate('Notifications');
          }}
          onHelpPress={() => navigation.navigate('GetHelp')}
        />

        {/* Post-order nudge — only shows on Android once the user has tracked
            an order and hasn't enabled/dismissed it. Self-gating; no-op otherwise. */}
        <NeverMissCashbackNudge />

        {/* 2. FilterRow */}
        {/* 2. FilterBar — Figma 1929:31117. Composes REUSED atoms only:
            • Chip × 2 ("Category", "Filters") — defaultsize for the
              filter section. Trailing chevron-down / filter-sliders
              icons are spec'd at 16-px outline but no chevron-down or
              filter SVG ships in src/assets/icons (FilterRow's earlier
              implementation flagged the same gap). Trailing icons
              omitted — drop the SVGs in + register in Icon.tsx and
              I'll wire `trailingIcon='chevron-down'` / `'filter'` in
              one line.
            • Right "Eligibility" toggle chip — built inline as a
              Pressable + Switch (atom, sm) + Text, mirroring the Chip
              atom's shell tokens (white bg, hairline border, radius.sm,
              padX 12, padY 8). The existing Chip type='toggle' variant
              ships with a trailing edit button which doesn't fit this
              spec, so the toggle row is composed from atoms here. */}
        {/* Horizontal scroll row: at large OS font sizes the chips no longer
            fit and Eligibility ran off the right edge. When they fit,
            flexGrow + space-between keeps Eligibility pinned right. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing[16], flexGrow: 0 }}
          contentContainerStyle={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing[8],
            paddingHorizontal: spacing[16],
          }}
        >
          {/* Left — filter section. During a "clear" the chips are briefly
              replaced by a shimmer skeleton so the reset reads as the values
              reloading (see flashFilterBarReload). */}
          {filterBarReloading ? (
            <FilterBarSkeleton />
          ) : (
          <View style={{ flexDirection: 'row', gap: spacing[8] }}>
            {/* Both chips open the same Filters bottom sheet. When a
                chip's dimension has an active selection, passing `count`
                flips it into the "Default Selected with Count" look
                (pale-cobalt fill + cobalt label + count badge beside the
                label) at the SAME size as the plain chip. No selection →
                the white default chip. */}
            <Chip
              label="Category"
              count={categoryFilterCount > 0 ? categoryFilterCount : undefined}
              trailingIcon="chevron-down"
              // Halve the trailing padding (12 → 6) so the chip is tighter
              // after its icon, freeing room for the eligibility chip group.
              style={{ paddingRight: spacing[6] }}
              onPress={() => {
                // Always land on the Category rail (the rail is sticky —
                // a previous visit to Banks/etc. would otherwise persist).
                setFilterCategory('category');
                filtersSheetRef.current?.present();
              }}
            />
            <Chip
              label="Filters"
              count={otherFilterCount > 0 ? otherFilterCount : undefined}
              // Filter glyph matches the Orders list Filter control: outline
              // by default, filled when any filter is applied (Figma
              // Icons/Action/Filter) — NOT the sliders glyph.
              leadingIcon={otherFilterCount > 0 ? 'filter-filled' : 'filter-outline'}
              onPress={() => filtersSheetRef.current?.present()}
            />
          </View>
          )}

          {/* Right — Eligibility toggle chip. Tapping flips the
              switch AND, when turning ON, presents the
              EligibilityCheckerSheet so the user can submit details.
              Routing back to EligibleSheet / MaybeSheet happens in
              the checker's onCheck callback (below at the screen
              root). */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: eligibilityDetails ? 0 : spacing[8] }}>
            <Pressable
              onPress={() => handleEligibilityToggle(!eligibilityOn)}
              accessibilityRole="switch"
              accessibilityState={{ checked: eligibilityOn }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[8],
                paddingHorizontal: spacing[12],
                paddingVertical: spacing[8],
                // When the pencil box is attached the two read as one unit:
                // square off the chip's right edge so they butt together.
                borderTopLeftRadius: radius.sm,
                borderBottomLeftRadius: radius.sm,
                borderTopRightRadius: eligibilityDetails ? 0 : radius.sm,
                borderBottomRightRadius: eligibilityDetails ? 0 : radius.sm,
                borderWidth: borderWidth.thin,
                // Drop the shared edge's border so a single hairline divides
                // the two halves rather than a doubled-up 2px line.
                borderRightWidth: eligibilityDetails ? 0 : borderWidth.thin,
                borderColor: colors.border.default,
                backgroundColor: colors.surface.default,
              }}
            >
              <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Switch value={eligibilityOn} size="sm" />
              </View>
              <Text variant="body12Regular" color={colors.text.primary}>
                Eligibility
              </Text>
            </Pressable>

            {/* Edit pencil — only once details are saved. Reopens the checker
                prefilled so the user can change or clear them. */}
            {eligibilityDetails ? (
              <Pressable
                onPress={handleEligibilityEdit}
                accessibilityRole="button"
                accessibilityLabel="Edit eligibility details"
                hitSlop={spacing[8]}
                style={{
                  paddingVertical: spacing[8],
                  // Halve the left/right padding (8 → 4) to tighten the box.
                  paddingHorizontal: spacing[4],
                  // Square off the pencil box's left edge so it butts flush
                  // against the chip and the pair reads as one unit.
                  borderTopRightRadius: radius.sm,
                  borderBottomRightRadius: radius.sm,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderWidth: borderWidth.thin,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.default,
                }}
              >
                <Icon name="edit-outline" size={iconSize[16]} color={colors.action.accent.default} />
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        {/* Active-bank banner — appears when a bank filter is on (a search
            bank tap lands here). Names the bank + count so the filtered
            list reads as intentional; "Clear" drops just the bank. */}
        {activeBankNames.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing[12],
              paddingHorizontal: spacing[16],
              // Doubled gap to the filter pills above (was spacing[12]) so
              // the active-bank banner sits clearly apart from them.
              marginTop: spacing[24],
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[8],
                flexShrink: 1,
              }}
            >
              {/* Icon + bank name + count each scaled up ~20% from the
                  original (iconSize16→20, body14→17, body12→14). */}
              <Icon
                name="feat-bank-outline"
                size={iconSize[20]}
                color={colors.icon.brand}
              />
              <Text
                variant="body17SemiBold"
                color={colors.text.primary}
                numberOfLines={1}
              >
                {activeBankNames.length > 1
                  ? `${activeBankNames[0]} +${activeBankNames.length - 1}`
                  : activeBankNames[0]}
              </Text>
              <Text variant="body14Regular" color={colors.text.secondary}>
                {`· ${bankCardCount} ${bankCardCount === 1 ? 'card' : 'cards'}`}
              </Text>
            </View>
            <Pressable
              onPress={clearBankFilter}
              hitSlop={spacing[8]}
              accessibilityRole="button"
              accessibilityLabel="Clear bank filter"
            >
              <Text variant="body14Medium" color={colors.action.accent.default}>
                Clear
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Error state — replaces the card lists when the catalog
            request fails. Static sections (carousel) still render. */}
        {isError ? (
          <View
            style={{
              paddingHorizontal: spacing[16],
              marginTop: spacing[32],
              alignItems: 'center',
              gap: spacing[8],
            }}
          >
            <Text variant="body16SemiBold" color={colors.text.primary}>
              Couldn’t load cards
            </Text>
            <Text
              variant="body12Regular"
              color={colors.text.secondary}
              align="center"
            >
              Check your connection and try again.
            </Text>
            <Pressable
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading cards"
              style={{
                marginTop: spacing[8],
                paddingHorizontal: spacing[16],
                paddingVertical: spacing[8],
                borderRadius: radius.sm,
                backgroundColor: colors.action.primary.default,
              }}
            >
              <Text variant="body14SemiBold" color={colors.text.inverse}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* No-results state — only when filters are active and nothing
            matched. Offers a one-tap Clear to restore the full list. */}
        {noResults ? (
          <View
            style={{
              paddingHorizontal: spacing[16],
              marginTop: spacing[32],
              alignItems: 'center',
              gap: spacing[8],
            }}
          >
            <Text variant="body16SemiBold" color={colors.text.primary}>
              No cards match your filters
            </Text>
            <Text
              variant="body12Regular"
              color={colors.text.secondary}
              align="center"
            >
              Try removing a filter or two.
            </Text>
            <Pressable
              onPress={clearFilters}
              accessibilityRole="button"
              accessibilityLabel="Clear filters"
              style={{
                marginTop: spacing[8],
                paddingHorizontal: spacing[16],
                paddingVertical: spacing[8],
                borderRadius: radius.sm,
                backgroundColor: colors.action.primary.default,
              }}
            >
              <Text variant="body14SemiBold" color={colors.text.inverse}>
                Clear filters
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Sections 3–5 (Top picks / category carousel / "More to explore")
            are the DEFAULT layout. In grouped eligibility mode they're
            replaced by the Eligible / Maybe / Ineligible sections rendered
            in the FlatList body, so skip them here. */}
        {!grouped ? (
          <>
            {/* 3. Top picks — above the carousel. While a category fetch is in
                flight, this whole section becomes bare skeleton rows (no
                heading) so the loading state reads cleanly; the lower rows
                render as skeleton items in the list body below. */}
            {categoryFetching ? (
              <View style={{ marginTop: spacing[24] }}>
                <CardListSkeleton count={2} />
              </View>
            ) : firstCards.length > 0 ? (
              <View
                style={{
                  paddingHorizontal: spacing[16],
                  marginTop: spacing[24],
                  gap: spacing[12],
                }}
              >
                {/* With a bank filter on, the header uses the section-rule
                    separator treatment (label + line on the right) — like the
                    eligibility group headers — instead of the plain heading. */}
                {activeBankNames.length > 0 ? (
                  <SectionRule label="Top picks for you" />
                ) : (
                  <Text variant="heading18SemiBold" color={colors.text.primary}>
                    Top picks for you
                  </Text>
                )}
                <View style={{ gap: spacing[16] }}>
                  {firstCards.map((card, i) => (
                    <StaggerCard
                      key={card.id}
                      index={i}
                      active={cardStaggerActive}
                    >
                      {renderTile(card)}
                    </StaggerCard>
                  ))}
                </View>
              </View>
            ) : null}

            {/* 4. Category carousel — CategoryTiles organism (saffron section
                + horizontal scrolling image tiles) */}
            <CategoryTiles
              title="Find the best card by category"
              categories={CATEGORY_OPTIONS.map((o) => ({
                id: String(o.tagId),
                label: o.label,
                image: images.filters[o.imageKey],
              }))}
              onCategoryPress={handleCategoryFilter}
              selectedId={selectedCategoryId}
              style={{ marginTop: spacing[32] }}
            />

            {/* 5. "More to explore" heading — the cards render as the
                FlatList's virtualized data rows below this header. Hidden
                during a category fetch (the body shows skeleton rows). */}
            {!categoryFetching && restCards.length > 0 ? (
              <View
                style={{
                  paddingHorizontal: spacing[16],
                  marginTop: spacing[32],
                }}
              >
                <Text variant="heading18SemiBold" color={colors.text.primary}>
                  More to explore
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

          </>
        }
      />

      {/* Frosted scrolled HomeHeader — pinned to the very top of the
          screen, the wrapper's bg extends INTO the status-bar area.
          Two tweaks per spec:
            • paddingTop is the full `insets.top`, and the header's own
              top padding is trimmed to 8 to keep the bar compact. It was
              `insets.top - 48` (clamped at 0), which put the logo under
              the status-bar icons on Android, where insets.top is ~37.
            • wrapper bg switched from `colors.surface.default` (white)
              to `colors.background.lavender` (cobalt-50 #ebf0ff) so
              the status-bar buffer reads continuous with the frosted
              pale-blue HomeHeader below it. */}
      <Animated.View
        pointerEvents={frostedInteractive ? 'box-none' : 'none'}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top,
            backgroundColor: colors.background.lavender,
          },
          elevation.light.xs,
          frostedAnimStyle,
        ]}
      >
        <HomeHeader
          scrolled
          style={{ paddingTop: spacing[8] }}
          // No unread badge: there's no notifications feed yet (it was a
          // hard-coded "1" that never cleared).
          notificationCount={0}
          filtersCategoryLabel="Category"
          categoryCount={categoryFilterCount}
          filtersCount={otherFilterCount}
          eligibilityOn={eligibilityOn}
          eligibilityChecked={!!eligibilityDetails}
          onCategoryPress={() => filtersSheetRef.current?.present()}
          onFiltersPress={() => filtersSheetRef.current?.present()}
          onEligibilityToggle={() => handleEligibilityToggle(!eligibilityOn)}
          onEligibilityEdit={handleEligibilityEdit}
          onSearchPress={() => setSearchOpen(true)}
          onMessagePress={() => undefined}
          onBellPress={() => {
            analytics.track(Events.NOTIFICATION_OPEN, { source: 'home' });
            navigation.navigate('Notifications');
          }}
        />
      </Animated.View>

      {/* Guest "Log in to earn cashback" sheet for Apply Now. */}
      {clickOutSheets}

      <CardDetailSheet
        ref={sheetRef}
        card={selectedCard}
        index={cardSheetIndex}
        originY={cardOriginY}
        // Blinkit-style pager: swipe through the list the user was browsing,
        // opening on the tapped card. onActiveCardChange keeps selectedCard
        // (and so Apply / Share / eligibility) in sync as they swipe.
        cards={pagerCards}
        initialCardId={selectedCard?.id}
        onActiveCardChange={(card) => {
          // Swiping to another card in the sheet is a new card view.
          if (card && card.id !== selectedCardRef.current?.id) {
            analytics.track(Events.VIEW_ITEM, {
              item_id: card.id,
              item_name: card.name,
              item_brand: card.filterMeta?.bankName,
              source: 'swipe',
            });
          }
          setSelectedCard(card);
        }}
        // Recommend from the SAME list the pager swipes through, so tapping a
        // recommended card always resolves to a page in the pager (clean jump).
        recommended={pagerCards}
        eligibilityDefaults={eligibilityDetails ?? undefined}
        eligibleAliases={eligibleAliases}
        onEligibilityChecked={applyEligibility}
        onShowResultSheet={presentResultSheet}
        onApply={handleApply}
        onRecommendedPress={(card) => {
          analytics.track(Events.VIEW_ITEM, {
            item_id: card.id,
            item_name: card.name,
            item_brand: card.filterMeta?.bankName,
            source: 'recommended',
          });
          setSelectedCard(card);
        }}
        // "Learn how it works?" → slide the HowItWorksSheet up over the
        // (still-mounted) card detail. Hide the BottomNav for the duration
        // so it can't peek above the RN Modal scrim, mirroring the share flow.
        onLearnHow={() => {
          setHidden(true);
          howItWorksRef.current?.present();
        }}
        onViewAllBenefits={handleViewAllBenefits}
        // "Edit" on the card-detail eligibility strip → present the same
        // checker the toggle/pencil use, prefilled from saved details. It
        // stacks over the (still-mounted) card detail; on re-check the
        // bubbled-up details refresh the card's inline result + strip.
        onEditEligibility={() => eligibilityCheckerRef.current?.present()}
        onSharePress={() => {
          // Close the underlying bottom sheet, then bring up the
          // ShareSheet. Triggered in parallel — gorhom's dismiss
          // animation runs while the share modal pops in over the
          // dimming backdrop, so the transition reads as a clean
          // hand-off rather than a stack.
          //
          // Force the BottomNav hidden for the duration of the share
          // modal so it doesn't peek above the RN Modal's scrim on
          // platforms / nav setups where the tab bar sits in a
          // separate z-layer from the Modal.
          setHidden(true);
          sheetRef.current?.dismiss();
          shareSheetRef.current?.present();
        }}
      />

      {/* ShareSheet — SIBLING modal to CardDetailSheet. Opens on top
          when the Share glyph on the card detail's header is tapped.
          We dismiss the card detail so the share modal owns the
          screen, and on the share modal's close we re-present the
          card detail so the share flow feels like a momentary
          detour rather than a hard exit. */}
      <ShareSheet
        ref={shareSheetRef}
        cardImage={selectedCard?.cardImage}
        cardName={selectedCard?.name}
        cardSubtitle={
          selectedCard?.tags?.length
            ? `Great for ${selectedCard.tags.join(' & ')}`
            : undefined
        }
        cashbackValue={
          selectedCard?.cashbackValue
            ? `${selectedCard.cashbackValue} Cashback`
            : undefined
        }
        onDismiss={() => {
          // Restore BottomNav visibility (the scroll handler will take
          // back over from here as the user scrolls).
          setHidden(false);
          // Bring the card detail sheet back if a card is still selected
          // (the user hasn't navigated away in the meantime) — at the same
          // stage they shared from.
          if (selectedCard) openCardSheet(null, cardSheetIndex);
        }}
      />

      {/* HowItWorksSheet — SIBLING modal to CardDetailSheet. Slides up
          over the (still-mounted) card detail when "Learn how it works?"
          is tapped; closing returns to the card detail underneath. */}
      <HowItWorksSheet
        ref={howItWorksRef}
        cardImage={selectedCard?.cardImage}
        rewardValue={selectedCard?.cashbackValue}
        onDismiss={() => setHidden(false)}
      />

      {/* SearchTopSheet — slides down when the Masthead's SearchBar is
          tapped. Live: typing filters the loaded catalog by card name;
          tapping a result opens that card's detail sheet. */}
      <SearchTopSheet
        visible={searchOpen}
        variant="suggestions"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        onClose={() => {
          setSearchOpen(false);
          setSearchQuery('');
        }}
        placeholder="Search by card name"
        sections={searchSections}
        recentSearches={searchQuickChips}
        onRecentPress={handleSearchChipPress}
        onResultPress={handleSearchResultPress}
      />

      {/* Filters sheet — opens via the Filters chip in the FilterBar.
          Three pinned regions + one scrollable:
            • BottomSheetHeader (drag handle + "Filters" + stroke) —
              STICKY top, doesn't scroll.
            • FilterMenu left rail (Category / Annual Fee / Card
              Network / Banks) — STICKY (handled inside FilterMenu).
            • FilterMenu right panel — SCROLLABLE (handled inside
              FilterMenu via BottomSheetScrollView).
            • FooterButtons (Clear + Apply Filter + live count strip)
              — STICKY bottom via gorhom footerComponent.
          The modal's direct child is a plain flex:1 View — no outer
          ScrollView, so the header never scrolls. */}
      <GorhomBottomSheetModal
        ref={filtersSheetRef}
        snapPoints={filtersSnapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderEligibilityBackdrop}
        footerComponent={renderFiltersFooter}
        handleComponent={() => null}
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <View style={{ flex: 1 }}>
          <BottomSheetHeader title="Filters" showStroke />
          <FilterMenu
            activeCategory={filterCategory}
            onCategoryChange={setFilterCategory}
            selectedTileIndices={filterTileIndices}
            onToggleTile={toggleFilterTile}
            selectedAnnualFee={annualFeeIndices}
            onToggleAnnualFee={toggleAnnualFee}
            selectedCardNetwork={cardNetworkIndices}
            onToggleCardNetwork={toggleCardNetwork}
            selectedBanks={bankIndices}
            onToggleBanks={toggleBank}
            bankOptions={bankOptions}
          />
        </View>
      </GorhomBottomSheetModal>

      {/* Eligibility checker — presented when the Eligibility toggle is
          switched ON. On Check, it filters the Home list to the cards the
          user is eligible for (by card_alias). Prefilled from any details
          entered earlier (this screen or the card-detail checker). */}
      <EligibilityCheckerSheet
        ref={eligibilityCheckerRef}
        defaultPincode={eligibilityDetails?.pincode ?? ''}
        defaultIncome={eligibilityDetails?.income ?? ''}
        defaultIncomeType={eligibilityDetails?.incomeType ?? 'salaried'}
        threshold={50000}
        routeResultExternally
        onClear={handleEligibilityClear}
        onDismiss={() => {
          // Closed WITHOUT completing a check → undo the toggle (unless prior
          // details exist, i.e. this was an edit), and drop any pending apply.
          if (!eligibilityCommittedRef.current && !eligibilityDetails) {
            setEligibilityOn(false);
          }
          eligibilityCommittedRef.current = false;
          setApplyPendingCard(null);
        }}
        onCheck={(result) => {
          eligibilityCommittedRef.current = true;
          // Store the details (prefill + Apply Now gating) and filter the
          // Home list to the eligible cards, then close.
          applyEligibility({
            pincode: result.pincode,
            income: result.incomeRaw,
            incomeType: result.incomeType,
            eligibleCardAliases: result.eligibleCardAliases,
          });
          eligibilityCheckerRef.current?.dismiss();
          // If this checker was opened by an "Apply Now" (not the toggle),
          // route to that card's result sheet "according to case".
          if (applyPendingCard) {
            const card = applyPendingCard;
            setApplyPendingCard(null);
            const outcome = resolveCardOutcome(
              card,
              result.eligibleCardAliases,
              result.incomeValue
            );
            // First reveal for this card — mark it so the next "Apply Now"
            // skips the sheet and redirects straight to the bank.
            if (outcome !== 'ineligible') {
              shownEligibilityResultRef.current.add(card.id);
            }
            setTimeout(() => presentResultSheet(outcome), 280);
          } else if (result.eligibleCount > 0) {
            // Toggle path + eligible → celebrate the whole eligible SET with
            // the multi-card green sheet (stack + "eligible for N cards" +
            // "Great, Show Cards"). The list is already filtered, so the CTA
            // just dismisses to reveal it. Not eligible → silently filter
            // (current behaviour); only the green case is in scope here.
            setEligibleSheetMode('cards');
            play('success');
            setTimeout(() => eligibleSheetRef.current?.present(), 280);
          }
        }}
      />

      {/* EligibleSheet — wrapped in gorhom BottomSheetModal (the
          EligibleSheet organism itself is a plain View, gorhom is
          mounted here). */}
      <GorhomBottomSheetModal
        ref={eligibleSheetRef}
        snapPoints={eligibilitySnapPoints}
        enablePanDownToClose
        backdropComponent={renderEligibilityBackdrop}
        handleComponent={() => null}
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          {eligibleSheetMode === 'cards' ? (
            // Home toggle path — whole eligible SET: fanned stack, count
            // headline, "Great, Show Cards" (dismiss → filtered list shows).
            <EligibleSheet
              showConfetti
              hideReward
              cardImages={eligibleStackImages}
              message={`Congrats!\nYou're eligible for ${eligibleStackCount} ${
                eligibleStackCount === 1 ? 'card' : 'cards'
              }`}
              ctaLabel="Great, Show Cards"
              pincode={eligibilityDisplay?.pincode}
              amount={eligibilityDisplay?.amount}
              occupation={eligibilityDisplay?.occupation}
              onApply={handleEligibleShowCards}
              onEditPress={handleResultEdit}
            />
          ) : (
            // Card-detail Apply path — single hero card + its reward + Apply.
            <EligibleSheet
              showConfetti
              cardImage={resultHeroCard?.cardImage}
              rewardHeadline={
                resultHeroCard?.cashbackValue
                  ? `${resultHeroCard.cashbackValue} Rewards`
                  : undefined
              }
              pincode={eligibilityDisplay?.pincode}
              amount={eligibilityDisplay?.amount}
              occupation={eligibilityDisplay?.occupation}
              onApply={handleResultApply}
              onEditPress={handleResultEdit}
            />
          )}
        </BottomSheetScrollView>
      </GorhomBottomSheetModal>

      {/* MaybeSheet — same gorhom wrapping. */}
      <GorhomBottomSheetModal
        ref={maybeSheetRef}
        snapPoints={eligibilitySnapPoints}
        enablePanDownToClose
        backdropComponent={renderEligibilityBackdrop}
        handleComponent={() => null}
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <MaybeSheet
            cards={resultCarouselCards}
            exploreLead={`Explore ${exploreCount} Card${exploreCount === 1 ? '' : 's'}`}
            pincode={eligibilityDisplay?.pincode}
            amount={eligibilityDisplay?.amount}
            occupation={eligibilityDisplay?.occupation}
            onContinue={handleResultApply}
            onEditPress={handleResultEdit}
          />
        </BottomSheetScrollView>
      </GorhomBottomSheetModal>

      {/* IneligibleSheet — red variant; same gorhom wrapping. Opened from
          the card-detail checker (Path B) when the user is not eligible. */}
      <GorhomBottomSheetModal
        ref={ineligibleSheetRef}
        snapPoints={eligibilitySnapPoints}
        enablePanDownToClose
        backdropComponent={renderEligibilityBackdrop}
        handleComponent={() => null}
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <IneligibleSheet
            cards={resultCarouselCards}
            exploreLead={`Explore ${exploreCount} Card${exploreCount === 1 ? '' : 's'}`}
            pincode={eligibilityDisplay?.pincode}
            amount={eligibilityDisplay?.amount}
            occupation={eligibilityDisplay?.occupation}
            onContinue={handleResultApply}
            onEditPress={handleResultEdit}
          />
        </BottomSheetScrollView>
      </GorhomBottomSheetModal>
      </Animated.View>

      {/* Skeleton overlay — fades out as the real content fades in.
          Unmounts after the fade completes so it stops occluding
          touches and doesn't sit in the tree once we're past load. */}
      {showSkeleton || isLoading || bankRefreshing ? (
        <Animated.View
          // During a bank refresh the overlay must swallow touches so the
          // list underneath can't be interacted with mid-reload.
          pointerEvents={bankRefreshing ? 'auto' : 'none'}
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            // While the catalog is still loading OR a bank refresh is in
            // flight, hold the skeleton fully opaque (the timed fade-out only
            // plays for the first-mount entrance).
            isLoading || bankRefreshing ? { opacity: 1 } : skeletonStyle,
          ]}
        >
          <HomeSkeleton />
        </Animated.View>
      ) : null}

      {/* "Apply Filter" white-screen transition — fades in over Home, commits
          the filters once covered, plays the redirect animation ~2 s, then
          fades out to reveal the freshly filtered results. */}
      <FilterTransitionOverlay
        visible={filterOverlayVisible}
        onCovered={handleFilterOverlayCovered}
        onHidden={handleFilterOverlayHidden}
      />
    </View>
  );
}
