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
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../atoms';
import { SearchBar } from '../molecules';
import type { SearchResultSection } from '../molecules';
import {
  OffersCategoryStrip,
  Grid,
  StaggeredEntrance,
  SearchTopSheet,
  PromoTopSheet,
} from '../organisms';
import type { SearchTopSheetRecent } from '../organisms';
import { images } from '../assets/images';
import { useBottomNavVisibility } from '../navigation/TabNavigator';
import { useFloatingNavClearance } from '../navigation/floatingNav';
import { colors, spacing } from '../tokens';
import { analytics, Events } from '../analytics';

// Once-per-launch gate for the welcome promo banner. A module-level flag
// (not persisted) so it shows on the first Offers visit of a fresh app
// session and re-appears after a cold start — but not on tab re-visits
// within the same session.
let promoSeenThisSession = false;

// Beat between landing on Offers and the promo sliding in.
const PROMO_DELAY_MS = 900;

// Forward scroll delta (px) past which the floating BottomNav hides.
const NAV_HIDE_THRESHOLD = 6;
// Reveal is far more eager: any small upward scroll (1px past noise) brings
// the nav straight back, so it never feels stuck hidden.
const NAV_REVEAL_THRESHOLD = 1;

// Default-state placeholder ticker — cycles store names to invite a tap.
const SEARCH_TICKER = ['Search for Amazon', 'Search for Flipkart', 'Search for Ajio'];
import { useAllOfferStores, useCategoryOffers, useOfferCategories } from '../query/useOffers';
import { DEFAULT_OFFER_CATEGORY_PATH } from '../data/offerCategories';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OffersBrandAmazon'>;

export function OffersScreen() {
  // Scroll padding that clears the floating tab bar (+ Android nav bar).
  const navClearance = useFloatingNavClearance();
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
  const { data: categories = [] } = useOfferCategories();

  // Which category's stores the grid shows. Driven by the sticky category
  // strip; defaults to the "All" tab (the miniapp parent — every store).
  const [categoryPath, setCategoryPath] = useState(DEFAULT_OFFER_CATEGORY_PATH);
  // The selected category LABEL (e.g. "Fashion") — threaded to the brand page
  // so its "Best cards to use here" floor can match cards to the category.
  // Undefined until a category is tapped (the default set has no clean card
  // category, so the brand page falls back to top cards).
  const [categoryLabel, setCategoryLabel] = useState<string | undefined>(undefined);
  const { data: stores = [], isLoading, isError } = useCategoryOffers(categoryPath);

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
  useFocusEffect(
    useCallback(() => {
      if (promoSeenThisSession) return;
      const timer = setTimeout(() => {
        promoSeenThisSession = true;
        setHidden(true);
        setPromoVisible(true);
      }, PROMO_DELAY_MS);
      return () => clearTimeout(timer);
    }, [setHidden])
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

  // Global store index — every category's stores, deduped. Fetched only while
  // the search overlay is open, so search spans ALL offers (not just the
  // category currently shown in the grid).
  const { stores: allStores } = useAllOfferStores(
    searchOpen,
    useMemo(() => categories.map((c) => c.path), [categories])
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
    () => categories.slice(0, 6).map((c) => ({ label: c.label })),
    [categories]
  );

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
      setSearchOpen(false);
      setSearchQuery('');
      navigation.navigate('OffersBrandAmazon', {
        slug: store.slug,
        hasCoupons: store.couponsCount > 0,
        category: categoryLabel,
      });
    },
    [searchSections, searchCategories, searchStores, navigation, categoryLabel, selectCategory]
  );

  // Quick-chip tap — every chip is a category → jump to that tab.
  const handleSearchChipPress = useCallback(
    (chip: SearchTopSheetRecent) => {
      const index = categories.findIndex((c) => c.label === chip.label);
      setSearchOpen(false);
      setSearchQuery('');
      if (index >= 0) selectCategory(categories[index].label, index);
    },
    [categories, selectCategory]
  );

  // Map stores → Grid 'brand-1x2' items; tap opens the brand page.
  const offerItems = useMemo(
    () =>
      stores.map((s) => ({
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
    [stores, navigation, categoryLabel]
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
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        // Pin child index 1 (the category strip). Child 0 (search row)
        // scrolls off first, so the search bar hides and the strip locks
        // to the top on any upward scroll.
        stickyHeaderIndices={[1]}
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
            placeholder="Search stores"
            placeholders={SEARCH_TICKER}
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
          {isLoading ? (
            <ActivityIndicator color={colors.action.primary.default} />
          ) : isError ? (
            <Text variant="body14Regular" color={colors.text.secondary} align="center">
              Couldn’t load offers. Pull to retry.
            </Text>
          ) : offerRows.length > 0 ? (
            <StaggeredEntrance key={categoryPath} style={{ gap: spacing[8] }}>
              {offerRows.map((row, ri) => (
                <Grid key={ri} variant="brand-1x2" items={row} />
              ))}
            </StaggeredEntrance>
          ) : (
            <Text variant="body14Regular" color={colors.text.secondary} align="center">
              No offers in this category yet.
            </Text>
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
        placeholder="Search categories & stores"
        sections={searchSections}
        recentSearches={searchQuickChips}
        onRecentPress={handleSearchChipPress}
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
