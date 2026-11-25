/**
 * OffersScreen — Figma offers/landing (4881:49084).
 *
 * Composition of existing pieces — no new components:
 *   1. Status-bar buffer  — a saffron band of height = top safe-area
 *                           inset, OUTSIDE the ScrollView so it's always
 *                           visible. The sliding category strip pins
 *                           directly beneath it on scroll, so the two
 *                           read as one continuous saffron surface.
 *   2. Search row         — REUSED <SearchBar>. Scrolls away on scroll
 *                           (it's the first, non-sticky scroll child).
 *   3. <OffersCategoryStrip> — STICKY header (stickyHeaderIndices=[1]):
 *                           the saffron 15-up scrollable category strip
 *                           with the sliding white indicator. Pins to
 *                           the top (below the buffer) once the search
 *                           row scrolls past it — the search bar hides,
 *                           the category selection stays put.
 *   4. <Grid variant="brand-1x2" /> — 4 rows × 2 brand-offer tiles.
 *   5. BottomNav          — provided by TabNavigator's custom `tabBar`;
 *                           not rendered here (avoids a double tab bar).
 *
 * Scroll behaviour: ScrollView `stickyHeaderIndices={[1]}` pins child 1
 * (the category strip). Child 0 (search row) scrolls off the top first,
 * so on any upward scroll the search bar disappears and the strip locks
 * just under the status-bar buffer. The saffron background travels with
 * both the buffer and the strip, so the colour is unbroken.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, AmountSkeleton } from '../atoms';
import { SearchBar } from '../molecules';
import type { SearchResultSection } from '../molecules';
import {
  OffersCategoryStrip,
  Grid,
  StaggeredEntrance,
  SearchTopSheet,
  PromoTopSheet,
  ScreenState,
} from '../organisms';
import type { SearchTopSheetRecent } from '../organisms';
import { images } from '../assets/images';
import { useRecentSearches, type RecentSearch } from '../lib/recentSearches';
import { useBottomNavVisibility } from '../navigation/TabNavigator';
import { useFloatingNavClearance } from '../navigation/floatingNav';
import { colors, spacing, radius } from '../tokens';
import { analytics, Events } from '../analytics';

// Once-per-launch gate for the welcome promo banner. A module-level flag
// (not persisted) so it shows on the first Offers visit of a fresh app
// session and re-appears after a cold start — but not on tab re-visits
// within the same session.
let promoSeenThisSession = false;

// Height of a loading placeholder tile — matches Grid's brand card (156).
const OFFER_SKELETON_H = 156;

// Beat between landing on Offers and the promo sliding in.
const PROMO_DELAY_MS = 900;

// Forward scroll delta (px) past which the floating BottomNav hides.
const NAV_HIDE_THRESHOLD = 6;
// Reveal is far more eager: any small upward scroll (1px past noise) brings
// the nav straight back, so it never feels stuck hidden.
const NAV_REVEAL_THRESHOLD = 1;

// Default-state placeholder ticker — cycles store names to invite a tap.
const SEARCH_TICKER = ['Search for Amazon', 'Search for Flipkart', 'Search for Ajio'];

// Tile window (contract C9): the grid renders this many tiles first and adds
// this many more each time the user scrolls near the end. "More" has ~1500
// stores; rendering them all at once in the ScrollView would stall the screen.
const TILE_WINDOW = 100;

// The entrance animation plays on the first rows only (6 tiles, about one
// screen). Rows below render plain, so a refocus after a deep scroll does not
// replay hundreds of tile animations.
const ANIMATED_ROWS = 3;

// A recent Offers store also saves the CashKaro store id, so the card-store
// check can run on it as soon as the BankKaro ids load. recentSearches.ts keeps
// extra fields as they are (spread on add, JSON on save, filter on read).
type OfferRecent = RecentSearch;
import { useAllOfferStores, useCategoryOffers, useOfferCategories } from '../query/useOffers';
import { isCardStoreRecent } from '../lib/cardStores';
import { isPausedWithoutData } from '../query/paused';
import { DEFAULT_OFFER_CATEGORY_PATH } from '../data/offerCategories';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OffersBrandAmazon'>;

export function OffersScreen() {
  // Scroll padding that clears the floating tab bar (+ Android nav bar).
  const navClearance = useFloatingNavClearance();
  // Re-tapping this tab in the bottom nav scrolls back to the top.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const navigation = useNavigation<Nav>();

  // Top safe-area inset — the saffron buffer that keeps the pinned
  // category strip clear of the notch / status bar.
  const insets = useSafeAreaInsets();

  // Hide the floating BottomNav on scroll-forward, reveal on scroll-back —
  // same behaviour as Home (Offers has real scroll depth). Earnings / Profile
  // don't wire this (no meaningful scroll), so the nav stays put there.
  const { setHidden } = useBottomNavVisibility();
  const lastY = useRef(0);
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current;
    if (y <= 0) setHidden(false);
    else if (dy > NAV_HIDE_THRESHOLD) setHidden(true);
    else if (dy < -NAV_REVEAL_THRESHOLD) setHidden(false);
    lastY.current = y;
  };

  // The Offers strip — fetched live from the CashKaro "CK MINI APP" category
  // (parent "All" tab + its sub-categories). Drives the strip, the grid path,
  // the thematic accent, and the search category list.
  const catQ = useOfferCategories();
  const categories = catQ.data ?? [];

  // Which category's stores the grid shows. Driven by the sticky category
  // strip; defaults to the "All" tab (the miniapp parent — every store).
  const [selectedPath, setCategoryPath] = useState(DEFAULT_OFFER_CATEGORY_PATH);
  // The grid follows a path that exists in the loaded strip. On production
  // the default `miniapp` parent isn't configured, so the strip falls back to
  // top-level categories and the grid starts on the first of them (instead
  // of requesting `miniapp` and failing). Null until the strip has loaded.
  const categoryPath = categories.some((c) => c.path === selectedPath)
    ? selectedPath
    : categories[0]?.path ?? null;
  // The selected category LABEL (e.g. "Fashion") — threaded to the brand page
  // so its "Best cards to use here" floor can match cards to the category.
  // Undefined until a category is tapped (the default set has no clean card
  // category, so the brand page falls back to top cards).
  const [categoryLabel, setCategoryLabel] = useState<string | undefined>(undefined);
  const storesQ = useCategoryOffers(categoryPath);
  const {
    data: stores = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = storesQ;
  // ----- Tile window (C9) ------------------------------------------------------
  // Render the first 100 tiles of the category; add 100 more each time the
  // user scrolls near the end. The count belongs to one category path. A
  // category change resets it to 100 during render (no effect, so no frame of
  // the new category at the old count), also when the user comes back to a
  // category they had scrolled far into.
  // Scroll events arrive every 16 ms: grow at most once per content height,
  // so one pass near the end adds 100 tiles, not several hundred.
  const grownAt = useRef('');
  const [tileWindow, setTileWindow] = useState<{ path: string | null; count: number }>({
    path: categoryPath,
    count: TILE_WINDOW,
  });
  if (tileWindow.path !== categoryPath) {
    // Clear the guard too: back at 100 tiles, the content height can equal
    // the one of the last growth, which would block the next growth.
    grownAt.current = '';
    setTileWindow({ path: categoryPath, count: TILE_WINDOW });
  }
  const tileCount = tileWindow.path === categoryPath ? tileWindow.count : TILE_WINDOW;
  const hasMoreTiles = stores.length > tileCount;
  const growTilesNearEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hasMoreTiles) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearEnd =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - layoutMeasurement.height;
    const at = `${categoryPath}:${contentSize.height}`;
    if (!nearEnd || grownAt.current === at) return;
    grownAt.current = at;
    setTileWindow({ path: categoryPath, count: tileCount + TILE_WINDOW });
  };

  // Opened offline with nothing cached. A paused query is neither loading
  // nor an error, so the grid fell to "No offers here yet". On a cold start
  // the strip is the paused one (no category yet, so the stores query is
  // idle, not paused); after a category tap it can be the stores query.
  const offline = isPausedWithoutData(catQ) || isPausedWithoutData(storesQ);
  // Pull-to-refresh / "Try again" reload both the category strip and stores.
  const reloadOffers = () => {
    catQ.refetch();
    refetch();
  };

  // ----- Thematic top tint -------------------------------------------------
  // The saffron header subtly shifts toward the SELECTED category's prominent
  // colour, so changing category reads as a change in the page's mood. The
  // tint animates between accents; the bottom of the header still fades to
  // saffron (a static gradient overlay) so the brand colour anchors the look.
  const SAFFRON = colors.action.primary.default;
  const [activeCatIndex, setActiveCatIndex] = useState(0);
  const accent = categories[activeCatIndex]?.accent ?? SAFFRON;

  const fromColor = useSharedValue<string>(SAFFRON);
  const toColor = useSharedValue<string>(SAFFRON);
  const tintT = useSharedValue(1);
  const prevAccent = useRef<string>(SAFFRON);
  useEffect(() => {
    if (prevAccent.current === accent) return;
    fromColor.value = prevAccent.current;
    toColor.value = accent;
    tintT.value = 0;
    tintT.value = withTiming(1, {
      duration: 450,
      easing: Easing.inOut(Easing.cubic),
    });
    prevAccent.current = accent;
  }, [accent, fromColor, toColor, tintT]);
  const tintStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      tintT.value,
      [0, 1],
      [fromColor.value, toColor.value]
    ),
  }));

  // Select a category — shared by the strip's own taps and the search
  // overlay (tapping a category result jumps to that category tab). Swaps the
  // grid to that category's stores, re-themes the header, and (via the
  // strip's controlled `selectedIndex`) moves the strip highlight.
  const selectCategory = useCallback(
    (label: string, index: number) => {
      analytics.track(Events.OFFER_CATEGORY_SELECT, { category: label, index });
      setCategoryPath(categories[index]?.path ?? DEFAULT_OFFER_CATEGORY_PATH);
      setCategoryLabel(label);
      setActiveCatIndex(index);
    },
    [categories]
  );

  // ----- Welcome promo (top-sheet banner) ---------------------------------
  // Slides down once per fresh app session, a beat after Offers first opens.
  // While it's up the floating BottomNav is hidden (so it doesn't show
  // through the dim backdrop) and restored on dismiss.
  const [promoVisible, setPromoVisible] = useState(false);
  // Only once stores have loaded: the banner promises cashback "on the stores
  // you love", and it used to slide in over an empty / failed Offers page.
  const hasStores = stores.length > 0;
  useFocusEffect(
    useCallback(() => {
      if (promoSeenThisSession || !hasStores) return;
      const timer = setTimeout(() => {
        promoSeenThisSession = true;
        setHidden(true);
        setPromoVisible(true);
      }, PROMO_DELAY_MS);
      return () => clearTimeout(timer);
    }, [setHidden, hasStores])
  );

  const dismissPromo = useCallback(() => {
    setPromoVisible(false);
    setHidden(false);
  }, [setHidden]);

  // ----- Search (top-sheet overlay) ---------------------------------------
  // Same pattern as Home: tapping the bar opens the SearchTopSheet; typing
  // populates two sections — Categories (the strip's set) and Stores (the
  // loaded category's stores). Tapping a category jumps to that tab; tapping
  // a store opens its brand page.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Global store index — every category's stores, deduped, without the
  // credit-card stores (D-B). Fetched only while the search overlay is open,
  // so search spans ALL offers (not just the category currently shown in the grid).
  const {
    stores: allStores,
    isComplete: storeIndexComplete,
    loadedBySlug,
    cardStoreIds,
  } = useAllOfferStores(
    searchOpen,
    useMemo(() => categories.map((c) => c.path), [categories])
  );
  const liveStoreSlugs = useMemo(() => new Set(allStores.map((s) => s.slug)), [allStores]);
  // A recent store may show and open only when it is not a card store (D-B).
  // The card-store check runs at once, with no wait for the index: the name
  // rule, the saved store id against the BankKaro ids (when loaded), and for an
  // older recent with no saved id, a loaded category row with its slug. Once
  // every category has loaded, the store must also be in the index (this also
  // drops a store CashKaro no longer lists). Before that, a store is not hidden
  // only because its category is still loading.
  const isRecentStoreAllowed = useCallback(
    (r: OfferRecent) => {
      if (isCardStoreRecent(r, cardStoreIds, loadedBySlug)) return false;
      if (storeIndexComplete && (!r.id || !liveStoreSlugs.has(r.id))) return false;
      return true;
    },
    [cardStoreIds, loadedBySlug, storeIndexComplete, liveStoreSlugs]
  );

  const searchCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return categories
      .map((c, index) => ({ label: c.label, image: c.image, index }))
      .filter((c) => c.label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, categories]);

  const searchStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allStores.filter((s) => (s.name || '').toLowerCase().includes(q)).slice(0, 12);
  }, [allStores, searchQuery]);

  const searchSections = useMemo<SearchResultSection[]>(() => {
    const out: SearchResultSection[] = [];
    if (searchCategories.length > 0) {
      out.push({
        header: 'Categories',
        rows: searchCategories.map((c) => ({
          logo: c.image,
          title: c.label,
          subtitle: 'View offers',
        })),
      });
    }
    if (searchStores.length > 0) {
      out.push({
        header: 'Stores',
        rows: searchStores.map((s) => ({
          logo: { uri: s.image ?? '' },
          title: s.name,
          subtitle: s.ctaLabel,
        })),
      });
    }
    return out;
  }, [searchCategories, searchStores]);

  // Empty-state quick chips — the top categories, so an empty search still
  // offers a one-tap jump to a category tab (analogous to Home's quick chips).
  const searchQuickChips = useMemo<SearchTopSheetRecent[]>(
    () => categories.slice(0, 6).map((c) => ({ label: c.label, image: c.image })),
    [categories]
  );

  // The user's recent picks on Offers (categories and stores), kept on the
  // device separately from Home's. Stores carry their slug + logo URL, since
  // the all-stores index only loads while search is open, and the CashKaro
  // store id (OfferRecent) for the card-store check.
  const recentSearchStore = useRecentSearches('offers');
  const rememberSearch = recentSearchStore.remember;
  // A category the strip no longer has is hidden (tapping it did nothing).
  // A card store, or a store the loaded index no longer has, is hidden too.
  const searchHistoryChips = useMemo<SearchTopSheetRecent[]>(() => {
    const out: SearchTopSheetRecent[] = [];
    for (const r of recentSearchStore.recent) {
      if (r.kind === 'store') {
        if (!isRecentStoreAllowed(r)) continue;
        out.push({ label: r.label, image: r.image ? { uri: r.image } : undefined });
      } else if (r.kind === 'category') {
        const cat = categories.find((c) => c.label === r.label);
        if (cat) out.push({ label: r.label, image: cat.image });
      }
    }
    return out;
  }, [recentSearchStore.recent, categories, isRecentStoreAllowed]
  );
  // Popular chips minus anything already shown under Recent searches.
  const searchPopularChips = useMemo(() => {
    const seen = new Set(searchHistoryChips.map((c) => c.label.toLowerCase()));
    return searchQuickChips.filter((c) => !seen.has(c.label.toLowerCase()));
  }, [searchQuickChips, searchHistoryChips]);

  // Result-row tap — resolve by the tapped section's header (Categories may be
  // absent, so a fixed index isn't safe). Category → jump to that tab; Store →
  // open its brand page.
  const handleSearchResultPress = useCallback(
    (_row: unknown, sectionIndex: number, rowIndex: number) => {
      const section = searchSections[sectionIndex];
      if (!section) return;
      if (section.header === 'Categories') {
        const cat = searchCategories[rowIndex];
        if (!cat) return;
        rememberSearch({ label: cat.label, kind: 'category' });
        setSearchOpen(false);
        setSearchQuery('');
        selectCategory(cat.label, cat.index);
        return;
      }
      const store = searchStores[rowIndex];
      if (!store) return;
      analytics.track(Events.SELECT_CONTENT, {
        content_type: 'store',
        item_id: store.slug,
        source: 'search',
      });
      const recent: OfferRecent = {
        label: store.name,
        kind: 'store',
        id: store.slug,
        image: store.image ?? undefined,
        storeId: store.storeId,
      };
      rememberSearch(recent);
      setSearchOpen(false);
      setSearchQuery('');
      navigation.navigate('OffersBrandAmazon', {
        slug: store.slug,
        hasCoupons: store.couponsCount > 0,
        category: categoryLabel,
      });
    },
    [
      searchSections,
      searchCategories,
      searchStores,
      navigation,
      categoryLabel,
      selectCategory,
      rememberSearch,
    ]
  );

  // Quick-chip tap — every chip is a category → jump to that tab.
  const handleSearchChipPress = useCallback(
    (chip: SearchTopSheetRecent) => {
      const index = categories.findIndex((c) => c.label === chip.label);
      setSearchOpen(false);
      setSearchQuery('');
      if (index >= 0) {
        rememberSearch({ label: categories[index].label, kind: 'category' });
        selectCategory(categories[index].label, index);
      }
    },
    [categories, selectCategory, rememberSearch]
  );

  // Recent-chip tap — a category jumps to its tab; a store reopens its brand
  // page from the saved slug.
  const handleSearchHistoryPress = useCallback(
    (chip: SearchTopSheetRecent) => {
      // By label, not index: hidden (stale) picks shift the chip positions.
      const item = recentSearchStore.recent.find((r) => r.label === chip.label);
      if (!item) return;
      if (item.kind === 'store' && item.id) {
        // Same check as the chip list: a card store never opens from recents.
        if (!isRecentStoreAllowed(item)) return;
        const live = allStores.find((s) => s.slug === item.id);
        // An older recent gains the store id when its store is loaded.
        const saved: OfferRecent =
          live?.storeId && !(item as OfferRecent).storeId ? { ...item, storeId: live.storeId } : item;
        rememberSearch(saved);
        setSearchOpen(false);
        setSearchQuery('');
        navigation.navigate('OffersBrandAmazon', {
          slug: item.id,
          hasCoupons: (live?.couponsCount ?? 0) > 0,
          category: categoryLabel,
        });
        return;
      }
      handleSearchChipPress({ label: item.label });
    },
    [
      recentSearchStore.recent,
      allStores,
      isRecentStoreAllowed,
      rememberSearch,
      navigation,
      categoryLabel,
      handleSearchChipPress,
    ]
  );

  // Map the windowed stores → Grid 'brand-1x2' items; tap opens the brand page.
  const offerItems = useMemo(
    () =>
      stores.slice(0, tileCount).map((s) => ({
        image: { uri: s.image ?? '' },
        ctaLabel: s.ctaLabel,
        onPress: () => {
          analytics.track(Events.SELECT_CONTENT, {
            content_type: 'store',
            item_id: s.slug,
            source: 'grid',
          });
          navigation.navigate('OffersBrandAmazon', {
            slug: s.slug,
            hasCoupons: s.couponsCount > 0,
            category: categoryLabel,
          });
        },
      })),
    [stores, tileCount, navigation, categoryLabel]
  );

  // Chunk into rows of 2 so each row can be its own StaggeredEntrance step —
  // the grid then cascades in row-by-row (rather than the whole block fading
  // as one). Keyed on categoryPath below so switching category replays it.
  const offerRows = useMemo(() => {
    const rows: (typeof offerItems)[] = [];
    for (let i = 0; i < offerItems.length; i += 2) rows.push(offerItems.slice(i, i + 2));
    return rows;
  }, [offerItems]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
      {/* StatusBar text light so the system icons read against the
          saffron buffer behind them. */}
      <StatusBar style="light" />

      {/* Status-bar buffer — band sized to the top safe-area inset. Tinted
          with the active category's accent (the very top of the thematic
          gradient). Sits OUTSIDE the ScrollView so it never scrolls. */}
      <Animated.View style={[{ height: insets.top }, tintStyle]} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          handleScroll(e);
          growTilesNearEnd(e);
        }}
        scrollEventThrottle={16}
        // Pin child index 1 (the category strip). Child 0 (search row)
        // scrolls off first, so the search bar hides and the strip locks
        // to the top on any upward scroll.
        stickyHeaderIndices={[1]}
        // Pull down to reload offers (the old error text promised this but
        // there was no RefreshControl).
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={reloadOffers}
            colors={[colors.action.primary.default]}
            tintColor={colors.action.primary.default}
          />
        }
        contentContainerStyle={{
          // Reserve room for the floating BottomNav so the last
          // tile row never hides beneath it.
          paddingBottom: navClearance,
        }}
      >
        {/* [0] Search row — tinted with the active category's accent (the
            whole header re-themes per category). Scrolls away on scroll. */}
        <Animated.View
          style={[
            {
              width: '100%',
              paddingVertical: spacing[16],
              paddingHorizontal: spacing[16],
            },
            tintStyle,
          ]}
        >
          {/* Default-state bar with the store-name ticker. Tapping it opens
              the SearchTopSheet overlay (same as Home) — all typing /
              results happen there, not inline. */}
          <SearchBar
            state="default"
            placeholder="Search stores & categories"
            // Only cycle store names when stores actually loaded — otherwise
            // it suggested "Search for Flipkart" on an empty Offers page.
            placeholders={stores.length > 0 ? SEARCH_TICKER : undefined}
            onFocus={() => setSearchOpen(true)}
            style={{ width: '100%' }}
          />
        </Animated.View>

        {/* [1] STICKY category strip — pins beneath the buffer. Tapping a
            category swaps the grid to that category's live stores. */}
        <OffersCategoryStrip
          categories={categories}
          tintColor={accent}
          selectedIndex={activeCatIndex}
          onOfferCategoryPress={selectCategory}
        />

        {/* [2] Tile grid — live stores for the selected category. Each ROW
            rises + fades in a beat after the previous (StaggeredEntrance, one
            step per row). Keyed on categoryPath so picking a category from the
            strip remounts and REPLAYS the cascade — new tiles always arrive
            with the delight, not a silent swap. The saffron search header +
            sticky category strip (the masthead) are intentionally excluded so
            they stay put. Kept OUTSIDE stickyHeaderIndices (child [1]) so this
            wrapper doesn't shift the sticky index. */}
        <View
          style={{
            paddingTop: spacing[24],
            paddingHorizontal: spacing[16],
            backgroundColor: colors.surface.default,
          }}
        >
          {offline ? (
            // Offline with nothing cached: the CashKaro "no internet" state,
            // in place of a false "No offers here yet". Paused queries also
            // resume on their own when the connection returns.
            <ScreenState
              title="No internet connection"
              body="Check your connection or try again."
              actionLabel="Try again"
              onAction={reloadOffers}
            />
          ) : isLoading || catQ.isLoading ? (
            // Skeleton in the shape of the 2-column store grid (was a bare
            // spinner) so the page reads as "offers loading here".
            <View style={{ gap: spacing[8] }}>
              {[0, 1, 2].map((r) => (
                <View key={r} style={{ flexDirection: 'row', gap: spacing[8] }}>
                  <AmountSkeleton width="49%" height={OFFER_SKELETON_H} style={{ borderRadius: radius.lg }} />
                  <AmountSkeleton width="49%" height={OFFER_SKELETON_H} style={{ borderRadius: radius.lg }} />
                </View>
              ))}
            </View>
          ) : isError || catQ.isError ? (
            // No illustration: the only candidate ("No cashback on this
            // brand") says the wrong thing. Copy doesn't blame the user's
            // connection — the failure is usually server-side.
            <ScreenState
              title="Couldn’t load offers"
              body="Something went wrong on our side. Please try again in a bit."
              actionLabel="Try again"
              onAction={reloadOffers}
            />
          ) : offerRows.length > 0 ? (
            <>
              <View style={{ gap: spacing[8] }}>
                <StaggeredEntrance key={categoryPath} style={{ gap: spacing[8] }}>
                  {offerRows.slice(0, ANIMATED_ROWS).map((row, ri) => (
                    <Grid key={ri} variant="brand-1x2" items={row} />
                  ))}
                </StaggeredEntrance>
                {offerRows.slice(ANIMATED_ROWS).map((row, ri) => (
                  <Grid key={ANIMATED_ROWS + ri} variant="brand-1x2" items={row} />
                ))}
              </View>
              {/* More tiles to add (the CK app's LoadMoreIndicator): the next
                  100 are added when the user scrolls near here. */}
              {hasMoreTiles ? (
                <View style={{ paddingVertical: spacing[16], alignItems: 'center' }}>
                  <ActivityIndicator color={colors.action.primary.default} />
                </View>
              ) : null}
            </>
          ) : (
            // A way forward instead of a dead end: the cards on Home are
            // live even while this category has no stores.
            <ScreenState
              title="No offers here yet"
              body="New stores are added often. Pull down to refresh, or find a card that earns you cashback."
              actionLabel="Explore cards"
              onAction={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            />
          )}
        </View>
      </ScrollView>

      {/* Search overlay — slides down when the bar is tapped. Mirrors Home:
          typing surfaces Categories + Stores; tapping a category jumps to
          that tab, tapping a store opens its brand page. */}
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
        placeholder="Search stores & categories"
        noResultsHint={
          stores.length > 0
            ? 'Try a store like Amazon or Myntra, or a category like Fashion.'
            : 'Try a category like Fashion or Travel.'
        }
        sections={searchSections}
        recentSearches={searchPopularChips}
        onRecentPress={handleSearchChipPress}
        historySearches={searchHistoryChips}
        onHistoryPress={handleSearchHistoryPress}
        onClearHistory={recentSearchStore.clear}
        onResultPress={handleSearchResultPress}
      />

      {/* Welcome promo — slides down from the top on the first Offers visit
          of a fresh session. Dismiss via the ✕, the backdrop, or a swipe
          down. Purely promotional; no navigation. */}
      <PromoTopSheet
        visible={promoVisible}
        onClose={dismissPromo}
        source={images.promos.shopAsUsual}
      />
    </View>
  );
}
