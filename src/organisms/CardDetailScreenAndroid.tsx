/**
 * CardDetailScreenAndroid — organism (Android-only card detail)
 *
 * Android's replacement for the iOS two-stage (75% → 100%) floating-card sheet.
 *
 * WHY THIS EXISTS
 *   On iOS the card floats half-out above a partial sheet and grows to full
 *   screen on the first upward scroll — buttery there because a native
 *   FullWindowOverlay keeps the floating card glued to the sheet. On Android
 *   that composition is unreliable (the overlay/scroll mirror drifts → desync,
 *   blank slots, black flashes) and the partial→full grow drops frames. Rather
 *   than patch a fragile port of the iOS interaction, Android opens the detail
 *   FULL SCREEN with a ZOOM (small → big) — like Blinkit / Bistro on Android.
 *
 * THE INTERACTION (Android)
 *   • Tap a card  → the page ZOOMS IN (scales up from a smaller, rounded card
 *     with gaps around it to flush full screen) as the sheet rises.
 *   • Swipe ← / → → pages between cards, each card filling the screen. A page
 *     indicator pill + a one-time peek nudge signal that cards are swipeable.
 *   • The card LEANS as you swipe (a cheap, deterministic 3D rotate driven by
 *     the pager's own scroll offset — no accelerometer, so no sensor jitter).
 *   • Drag down at the top → the page ZOOMS OUT (scales back down) as it drops,
 *     reading as the card settling back toward where it came from. Back / ✕ too.
 *
 * WHY IT'S SMOOTH BY DESIGN
 *   One UI-thread shared value drives the lean (`scrollX`) and one drives the
 *   zoom (`animatedIndex`, written by gorhom). No second source of truth, no
 *   portal teleport, no mid-swipe remounts (page structure is keyed to the
 *   SETTLED card, so it only changes at rest — never during a swipe → no
 *   flicker). Native horizontal paging does the heavy lifting.
 *
 * REUSE
 *   All content sections are the SAME components iOS uses (exported from
 *   CardDetailSheet). Android only arranges them full-screen. iOS is untouched.
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Image as RNImage,
  FlatList,
  Dimensions,
  InteractionManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  ListRenderItemInfo,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image as ExpoImage } from 'expo-image';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import type { RootStackParamList } from '../navigation/types';
import { Text, Button, CashbackBadge } from '../atoms';
import type { IconName } from '../atoms';
import type { CardModel } from '../molecules';
import { CardArt, markCardImagesDecoded } from './CardArt';
import { Grid } from './Grid';
import { BestForSpending, type BestForSpendingCategory } from './Carousels';
import { MastheadHeader } from './MastheadHeader';
import { Footer } from './Footer';
import { useCardBenefits, prefetchCardBenefits } from '../query/useCardBenefits';
import { parseIncome, type IncomeType } from './EligibilityCheckerSheet';
import {
  splitCashback,
  FeeSection,
  EligibilitySection,
  EligibilityChecker,
  FaqSection,
  RecommendedCards,
  ApplyBar,
  TAG_ID_TO_BEST_FOR,
  resolveCardOutcome,
  type CardDetailSheetProps,
  type EligibilityOutcome,
} from './CardDetailSheet';
import { images } from '../assets/images';
import { colors, spacing, radius, opacity, borderWidth, iconSize } from '../tokens';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Each page is exactly the screen wide (no peek) so cards swipe full-screen.
const PAGE_W = SCREEN_W;

// Card sits this far below the status bar at the top of the hero.
const HERO_TOP_GAP = spacing[20];
const HERO_BOTTOM_GAP = spacing[24];
const HERO_FADE_H = 120;

// Top bar (status bar + ✕ / share row) turns solid as the page scrolls past
// the hero, so scrolled content never runs under the status-bar icons or
// collides with the floating buttons. Fades in between these scroll offsets.
const TOPBAR_FADE_START = spacing[96];
const TOPBAR_FADE_END = spacing[128] + spacing[64];
// MastheadHeader's round icon buttons (its BUTTON_SIZE).
const MASTHEAD_BUTTON_SIZE = iconSize[40];

// Zoom-open / zoom-close: the whole page scales from this up to 1 as the sheet
// opens (animatedIndex −1 → 0) and shrinks back on dismiss. We also CANCEL
// gorhom's vertical slide (counter-translate by its live top-Y) so the only
// visible motion is the zoom — the page grows OUT of the tapped card and
// collapses back INTO it, instead of sliding up from / down off the bottom.
const ZOOM_MIN_SCALE = 0.62;
// Fallback zoom pivot when the caller doesn't pass the tapped card's Y.
const DEFAULT_ORIGIN_Y = SCREEN_H * 0.42;

// One-time peek nudge: how far the pager flicks to reveal the next card, and
// when (after the open zoom has settled).
const NUDGE_PEEK = SCREEN_W * 0.14;
const NUDGE_DELAY_MS = 650;
// When the nudge eases back, and when the hard reset onto the card runs.
const NUDGE_RETURN_MS = 280;
const NUDGE_SETTLE_MS = 450;
// The peek hint teaches the swipe ONCE per app session. Per-mount, it
// replayed every time the sheet re-opened (e.g. back from All Benefits),
// visibly shoving the card sideways each time.
let pagerNudgeShown = false;

// Gesture thresholds for the sheet's content pan: wait for clear VERTICAL
// intent before treating a drag as dismiss, and FAIL on horizontal movement so
// the card-pager FlatList owns left / right swipes.
const PAN_ACTIVE_OFFSET_Y: [number, number] = [-spacing[12], spacing[12]];
const PAN_FAIL_OFFSET_X: [number, number] = [-spacing[8], spacing[8]];

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList
) as unknown as typeof FlatList;

// ----------------------------------------------------------------------------
// AndroidCardHero — static full-screen hero (peach BG + card art). The card
// LEANS as the pager is swiped, driven purely by scrollX (UI thread).
// ----------------------------------------------------------------------------
function AndroidCardHero({
  card,
  scrollX,
  index,
  topInset,
  active,
}: {
  card: CardModel;
  scrollX: SharedValue<number>;
  index: number;
  topInset: number;
  active: boolean;
}) {
  // d = how far this page is from centred, in screen widths (−1 → one card
  // left, +1 → one card right, 0 → centred). Centred card is flat + full size;
  // as it slides off it rotates away and shrinks a touch.
  const heroTiltStyle = useAnimatedStyle(() => {
    const raw = (scrollX.value - PAGE_W * index) / PAGE_W;
    const d = Math.max(-1, Math.min(1, raw));
    return {
      transform: [
        { perspective: 800 },
        { rotateY: `${-d * 16}deg` },
        {
          scale: interpolate(
            Math.abs(d),
            [0, 1],
            [1, 0.9],
            Extrapolation.CLAMP
          ),
        },
        { translateX: d * spacing[12] },
      ] as unknown as { rotateY: string }[],
    };
  });

  return (
    <View
      style={{
        width: '100%',
        overflow: 'hidden',
        alignItems: 'center',
        paddingTop: topInset + HERO_TOP_GAP,
        paddingBottom: HERO_BOTTOM_GAP,
      }}
    >
      <RNImage
        source={images.backgrounds.large}
        resizeMode="cover"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: HERO_FADE_H,
        }}
      >
        <LinearGradient
          colors={[
            colors.surfaceFade.sunkenTransparent,
            colors.surfaceFade.sunken,
          ]}
          style={{ flex: 1 }}
        />
      </View>

      <Animated.View style={heroTiltStyle}>
        <CardArt card={card} tilt={active} />
      </Animated.View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// CardPageAndroid — one full-screen page.
//
// `active` is keyed to the SETTLED card (the one the pager has come to rest on),
// NOT the live-centred card. That's deliberate: the page's structure (the
// scrollable vs. the static preview) only changes at rest, so it never remounts
// mid-swipe — which is what made the card flicker. During a swipe the incoming
// neighbour shows a static hero + benefits preview (looks complete); the moment
// the pager settles it becomes the scrollable page and mounts its detail.
// ----------------------------------------------------------------------------
function CardPageAndroid({
  card,
  active,
  showDetail,
  scrollX,
  index,
  topInset,
  recommended,
  eligibilityDefaults,
  onEligibilityChecked,
  eligibilityResult,
  onLearnHow,
  onViewAllBenefits,
  onRecommendedPress,
  onScrollY,
}: {
  card: CardModel;
  active: boolean;
  /** Vertical scroll offset of this page (the pager ignores non-active
   *  pages). Always passed — gorhom's scrollable keeps the FIRST onScroll it
   *  receives, so a callback added later (on settle) never fired. */
  onScrollY?: (index: number, y: number) => void;
  /** Mount the heavy below-the-fold sections — deferred until after the open
   *  animation so the first render (and thus the open) isn't blocked by them. */
  showDetail: boolean;
  scrollX: SharedValue<number>;
  index: number;
  topInset: number;
  recommended?: CardModel[];
  eligibilityDefaults?: { pincode: string; income: string; incomeType: IncomeType };
  onEligibilityChecked?: (o: {
    pincode: string;
    income: string;
    incomeType: IncomeType;
    eligibleCardAliases: string[];
  }) => void;
  eligibilityResult?: EligibilityOutcome | null;
  onLearnHow?: (card: CardModel) => void;
  onViewAllBenefits?: (card: CardModel) => void;
  onRecommendedPress?: (card: CardModel) => void;
}) {
  const needsDetail = !(card.tileBenefits?.length);
  const detailAlias = needsDetail ? card.filterMeta?.cardAlias : undefined;
  const { data: detailCats, isPending: detailPending } =
    useCardBenefits(detailAlias);

  const benefitItems = useMemo(() => {
    const tiles = (card.tileBenefits ?? []).map((b) => ({
      icon: b.icon,
      label: b.description ? `${b.title} ${b.description}` : b.title,
    }));
    if (tiles.length) return tiles;
    const all = detailCats?.find((c) => c.key === 'all') ?? detailCats?.[0];
    return (all?.items ?? [])
      .slice(0, 6)
      .map((text) => ({ icon: 'feat-rewards-outline' as IconName, label: text }));
  }, [card.tileBenefits, detailCats]);

  const benefitsLoading =
    benefitItems.length === 0 && !!detailAlias && detailPending;

  const bestForCategories = useMemo<BestForSpendingCategory[]>(() => {
    const ids = card.filterMeta?.categoryIds ?? [];
    const seen = new Set<string>();
    const out: BestForSpendingCategory[] = [];
    for (const id of ids) {
      const cat = TAG_ID_TO_BEST_FOR[id];
      if (cat && !seen.has(cat.filterKey)) {
        seen.add(cat.filterKey);
        out.push(cat);
      }
    }
    return out;
  }, [card.filterMeta?.categoryIds]);

  const { prefix, value } = splitCashback(card.cashback);

  const hero = (
    <AndroidCardHero
      card={card}
      scrollX={scrollX}
      index={index}
      topInset={topInset}
      active={active}
    />
  );

  // Feature section + benefits grid — rendered on every page so a freshly
  // swiped card looks complete the instant it slides in.
  const featureAndBenefits = (
    <>
      <View
        style={{
          paddingHorizontal: spacing[16],
          paddingTop: spacing[32],
          paddingBottom: spacing[24],
          gap: spacing[8],
          alignItems: 'center',
        }}
      >
        <Text
          variant="heading20SemiBold"
          color={colors.text.primary}
          align="center"
          numberOfLines={2}
        >
          {card.name}
        </Text>
        <CashbackBadge
          prefix={prefix}
          value={value}
          size="lg"
          style={{ alignSelf: 'center' }}
        />
        <View style={{ alignSelf: 'center' }}>
          <Button
            label="Learn how it works?"
            variant="link"
            size={36}
            onPress={active ? () => onLearnHow?.(card) : () => undefined}
          />
        </View>
      </View>

      {benefitsLoading || benefitItems.length > 0 ? (
        <View
          style={{
            paddingHorizontal: spacing[16],
            gap: spacing[16],
            alignItems: 'center',
          }}
        >
          <Grid
            variant="features"
            items={benefitItems}
            loading={benefitsLoading}
            skeletonCount={benefitItems.length || 6}
            style={{ width: '100%' }}
          />
          {active ? (
            <Button
              label="View all benefits"
              variant="subtle"
              size={44}
              fullWidth
              onPress={() => onViewAllBenefits?.(card)}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );

  // The heavy below-the-fold sections — only on the settled (active) page, and
  // only once detail is ready (after the open animation), so the open isn't
  // janked by mounting fees / eligibility / FAQ / recommended up front.
  const detail = active && showDetail ? (
    <>
      <BestForSpending
        categories={bestForCategories.length > 0 ? bestForCategories : undefined}
        style={{ marginTop: spacing[32] }}
      />
      <View style={{ marginTop: spacing[32] }}>
        <FeeSection
          annual={card.detail?.fee.annual}
          joining={card.detail?.fee.joining}
          bulletPoints={card.detail?.fee.bullets}
        />
      </View>
      <View style={{ marginTop: spacing[32] }}>
        <EligibilitySection
          salariedRows={card.detail?.eligibilitySalaried}
          selfEmployedRows={card.detail?.eligibilitySelfEmployed}
        />
      </View>
      <View style={{ marginTop: spacing[32] }}>
        <EligibilityChecker
          defaultPincode={eligibilityDefaults?.pincode}
          defaultIncome={eligibilityDefaults?.income}
          defaultIncomeType={eligibilityDefaults?.incomeType ?? null}
          onChecked={onEligibilityChecked}
          result={eligibilityResult}
        />
      </View>
      <View
        style={{
          backgroundColor: colors.surface.default,
          paddingTop: spacing[32],
          paddingBottom: spacing[24],
        }}
      >
        <FaqSection />
        <View style={{ marginTop: spacing[32] }}>
          <RecommendedCards
            currentCardId={card.id}
            cards={recommended}
            onCardPress={onRecommendedPress}
          />
        </View>
        <View style={{ marginTop: spacing[32] }}>
          <Footer
            theme="dark"
            headline={'Found the\nright card?'}
            subtext="Apply now and earn cashback."
          />
        </View>
      </View>
    </>
  ) : null;

  // EVERY page renders the SAME container — a BottomSheetScrollView — whether
  // active or not (only `scrollEnabled` and the deferred `detail` differ). That
  // keeps the page tree structurally identical across the active⇄inactive
  // switch, so the card art is NEVER unmounted/remounted when the pager settles
  // on a new card. The earlier flash ("1-2ms blue") was that remount painting
  // the card's placeholder colour for one frame before its image drew.
  return (
    <View
      style={{
        width: PAGE_W,
        height: SCREEN_H,
        backgroundColor: colors.surface.sunken,
      }}
    >
      <BottomSheetScrollView
        scrollEnabled={active}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
          onScrollY?.(index, e.nativeEvent.contentOffset.y)
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing[128] }}
      >
        {hero}
        {featureAndBenefits}
        {detail}
      </BottomSheetScrollView>
    </View>
  );
}

// ----------------------------------------------------------------------------
// AndroidPagerBody — the full-screen horizontal pager + fixed header, page
// indicator, and Apply bar. Everything is wrapped in a single Animated.View
// that ZOOMS with the sheet (open: scales up to full; dismiss: scales down).
// ----------------------------------------------------------------------------
function AndroidPagerBody({
  cards,
  initialCardId,
  scrollX,
  animatedIndex,
  originY,
  recommended,
  eligibilityDefaults,
  onEligibilityChecked,
  eligibilityResult,
  onLearnHow,
  onViewAllBenefits,
  onSharePress,
  onRecommendedPress,
  onActiveCardChange,
  onApply,
  onEditEligibility,
  onClose,
  topInset,
  bottomInset,
}: {
  cards: CardModel[];
  initialCardId?: string;
  scrollX: SharedValue<number>;
  animatedIndex: SharedValue<number>;
  /** Screen Y the zoom pivots around (the tapped card). */
  originY: number;
  recommended?: CardModel[];
  eligibilityDefaults?: { pincode: string; income: string; incomeType: IncomeType };
  onEligibilityChecked?: (o: {
    pincode: string;
    income: string;
    incomeType: IncomeType;
    eligibleCardAliases: string[];
  }) => void;
  eligibilityResult?: EligibilityOutcome | null;
  onLearnHow?: (card: CardModel) => void;
  onViewAllBenefits?: (card: CardModel) => void;
  onSharePress?: (card: CardModel) => void;
  onRecommendedPress?: (card: CardModel) => void;
  onActiveCardChange?: (card: CardModel) => void;
  onApply?: (card: CardModel) => void;
  onEditEligibility?: () => void;
  onClose: () => void;
  topInset: number;
  bottomInset: number;
}) {
  const listRef = useRef<FlatList<CardModel>>(null);
  // Active page's vertical scroll → drives the solid top bar below.
  const pageScrollY = useSharedValue(0);
  // Settled page index, readable from the stable scroll callback below.
  const settledIndexRef = useRef(0);
  const handlePageScrollY = useCallback(
    (index: number, y: number) => {
      if (index === settledIndexRef.current) pageScrollY.value = y;
    },
    [pageScrollY]
  );
  const indexOf = useCallback(
    (id?: string) => {
      const i = id ? cards.findIndex((c) => c.id === id) : -1;
      return i >= 0 ? i : 0;
    },
    [cards]
  );
  // Page structure is keyed to the SETTLED card (updated only at momentum end),
  // so it never changes mid-swipe → no flicker.
  const [settledIndex, setSettledIndex] = useState(() => indexOf(initialCardId));
  settledIndexRef.current = settledIndex;

  // Defer the heavy detail sections until interactions (the open animation)
  // finish, so the first render is light and the open starts without a delay.
  const [detailReady, setDetailReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() =>
      setDetailReady(true)
    );
    return () => handle.cancel();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  // Re-open on a different tapped card → jump the pager to it.
  useEffect(() => {
    const i = indexOf(initialCardId);
    if (i !== settledIndex) {
      setSettledIndex(i);
      scrollX.value = PAGE_W * i;
      requestAnimationFrame(() =>
        listRef.current?.scrollToOffset({ offset: PAGE_W * i, animated: false })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCardId]);

  // Warm the neighbouring cards' benefits so a swipe lands ready.
  const queryClient = useQueryClient();
  useEffect(() => {
    for (let d = -1; d <= 2; d += 1) {
      const c = cards[settledIndex + d];
      if (c && !c.tileBenefits?.length) {
        prefetchCardBenefits(queryClient, c.filterMeta?.cardAlias);
      }
    }
  }, [settledIndex, cards, queryClient]);

  const lastReportedIndex = useRef(indexOf(initialCardId));
  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / PAGE_W);
      const clamped = Math.max(0, Math.min(cards.length - 1, i));
      // Never rest BETWEEN two cards. A programmatic scroll (the peek nudge
      // below) doesn't snap, and an off-grid pager let the next vertical drag
      // snap to the neighbour mid-scroll, painting two cards' content at once.
      if (Math.abs(x - PAGE_W * clamped) > 1) {
        listRef.current?.scrollToOffset({ offset: PAGE_W * clamped, animated: true });
      }
      setSettledIndex(clamped);
      if (clamped !== lastReportedIndex.current) {
        // New card → its page starts at the top; hide the solid top bar.
        pageScrollY.value = 0;
        lastReportedIndex.current = clamped;
        onActiveCardChange?.(cards[clamped]);
      }
    },
    [cards, onActiveCardChange]
  );


  // Initial centring — wait for the list's first real width, then jump.
  const centeredOnceRef = useRef(false);
  const handleListLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (centeredOnceRef.current || e.nativeEvent.layout.width <= 0) return;
      centeredOnceRef.current = true;
      listRef.current?.scrollToOffset({
        offset: PAGE_W * settledIndex,
        animated: false,
      });
    },
    [settledIndex]
  );

  // One-time peek NUDGE — after the open zoom settles, flick the pager a little
  // to reveal the next card, then ease back. Teaches the swipe gesture. Runs
  // once, only if the user hasn't already swiped and there's a next card.
  //
  // On a real device the animated scroll BACK could be cut short, leaving the
  // pager parked ~50px into the next card (title clipped on the left, next
  // card peeking on the right). So: cancel the nudge the moment the user
  // drags, and after it finishes hard-reset the pager exactly onto the card.
  const nudgedRef = useRef(false);
  const userDraggedRef = useRef(false);
  const nudgeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearNudge = useCallback(() => {
    nudgeTimers.current.forEach(clearTimeout);
    nudgeTimers.current = [];
  }, []);
  useEffect(() => {
    if (nudgedRef.current || pagerNudgeShown) return;
    if (cards.length <= 1) return;
    const initial = indexOf(initialCardId);
    if (initial >= cards.length - 1 && initial > 0) return; // last card, no next
    const base = PAGE_W * initial;
    const peekDir = initial < cards.length - 1 ? 1 : -1;
    const later = (ms: number, fn: () => void) =>
      nudgeTimers.current.push(
        setTimeout(() => {
          if (!userDraggedRef.current) fn();
        }, ms)
      );
    later(NUDGE_DELAY_MS, () => {
      nudgedRef.current = true;
      pagerNudgeShown = true;
      listRef.current?.scrollToOffset({
        offset: base + NUDGE_PEEK * peekDir,
        animated: true,
      });
    });
    later(NUDGE_DELAY_MS + NUDGE_RETURN_MS, () =>
      listRef.current?.scrollToOffset({ offset: base, animated: true })
    );
    // Safety net: guarantee we end exactly on the card.
    later(NUDGE_DELAY_MS + NUDGE_RETURN_MS + NUDGE_SETTLE_MS, () => {
      listRef.current?.scrollToOffset({ offset: base, animated: false });
      scrollX.value = base;
    });
    return clearNudge;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    // The user took over — stop any pending nudge so it can't fight the drag.
    userDraggedRef.current = true;
    nudgedRef.current = true;
    pagerNudgeShown = true; // they've found the swipe — no hint needed
    clearNudge();
  }, [clearNudge]);

  // Tapping a recommended card → jump to it without an animated slide.
  const handleRecommendedPress = useCallback(
    (next: CardModel) => {
      const i = cards.findIndex((c) => c.id === next.id);
      if (i < 0) {
        onActiveCardChange?.(next);
        return;
      }
      setSettledIndex(i);
      onActiveCardChange?.(cards[i]);
      requestAnimationFrame(() =>
        listRef.current?.scrollToOffset({ offset: PAGE_W * i, animated: false })
      );
    },
    [cards, onActiveCardChange]
  );

  const activeCard = cards[settledIndex] ?? cards[0];

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CardModel>) => (
      <CardPageAndroid
        card={item}
        active={index === settledIndex}
        showDetail={detailReady}
        scrollX={scrollX}
        index={index}
        topInset={topInset}
        recommended={recommended}
        eligibilityDefaults={eligibilityDefaults}
        onEligibilityChecked={onEligibilityChecked}
        eligibilityResult={index === settledIndex ? eligibilityResult : null}
        onLearnHow={onLearnHow}
        onViewAllBenefits={onViewAllBenefits}
        onRecommendedPress={
          onRecommendedPress ? handleRecommendedPress : undefined
        }
        onScrollY={handlePageScrollY}
      />
    ),
    [
      settledIndex,
      detailReady,
      scrollX,
      topInset,
      recommended,
      eligibilityDefaults,
      onEligibilityChecked,
      eligibilityResult,
      onLearnHow,
      onViewAllBenefits,
      onRecommendedPress,
      handleRecommendedPress,
      handlePageScrollY,
    ]
  );

  // Zoom: scale the whole page up from ZOOM_MIN_SCALE → 1 as the sheet opens
  // (animatedIndex −1 → 0) and back down on dismiss, pivoting around the tapped
  // card (transformOrigin below) so it grows OUT of / collapses INTO the card's
  // position rather than from screen-centre. The sheet still rises (gorhom owns
  // that), but a snappy open spring + the origin zoom make "expand from the
  // card" the dominant read. Corners square off at full screen; the gap around
  // the scaled page reveals the dimmed backdrop.
  const topBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pageScrollY.value,
      [TOPBAR_FADE_START, TOPBAR_FADE_END],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const zoomStyle = useAnimatedStyle(() => {
    const s = interpolate(
      animatedIndex.value,
      [-1, 0],
      [ZOOM_MIN_SCALE, 1],
      Extrapolation.CLAMP
    );
    const r = interpolate(
      animatedIndex.value,
      [-1, 0],
      [radius['2xl'], 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale: s }] as unknown as { scale: number }[],
      borderTopLeftRadius: r,
      borderTopRightRadius: r,
      borderBottomLeftRadius: r,
      borderBottomRightRadius: r,
    };
  });

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          overflow: 'hidden',
          backgroundColor: colors.surface.sunken,
          // Pivot the zoom around the tapped card's screen position.
          transformOrigin: [PAGE_W / 2, originY, 0],
        },
        zoomStyle,
      ]}
    >
      <AnimatedFlatList
        ref={listRef}
        onLayout={handleListLayout}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        data={cards}
        extraData={`${settledIndex}:${detailReady}`}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Native one-card snap: disableIntervalMomentum stops on the NEXT card
        // (in the drag direction) regardless of fling speed — so a hard fling
        // still advances exactly one card — and the native snap always
        // completes to a card, so it never halts mid-swipe (the "stop in
        // between then jump" the custom decel=0 snap caused). 'normal'
        // deceleration keeps the settle gentle.
        snapToInterval={PAGE_W}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="normal"
        getItemLayout={(_, i) => ({
          length: PAGE_W,
          offset: PAGE_W * i,
          index: i,
        })}
        initialScrollIndex={settledIndex}
        onScrollToIndexFailed={({ index }) =>
          requestAnimationFrame(() =>
            listRef.current?.scrollToOffset({
              offset: PAGE_W * index,
              animated: false,
            })
          )
        }
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollBeginDrag={handleScrollBeginDrag}
        // Wider window so neighbours mount (and their card art decodes) well
        // before they slide into view — kills the dark placeholder flash that
        // showed when a freshly-mounted card painted its bg before its image.
        // Mount only the active page on first paint so the open animation
        // starts immediately; neighbours fill in right after.
        windowSize={5}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        removeClippedSubviews={false}
      />

      {/* Dark status-bar icons while the detail is open: the page (peach hero,
          then the solid top bar) is light, but Home underneath asks for
          light icons for its blue masthead. Unmounts with the sheet. */}
      <StatusBar style="dark" />

      {/* Solid top bar behind the status bar + close / share row. Invisible
          over the hero, fades in once the page scrolls past it. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: topInset + spacing[12] * 2 + MASTHEAD_BUTTON_SIZE,
            backgroundColor: colors.surface.sunken,
            borderBottomWidth: borderWidth.thin,
            borderBottomColor: colors.border.subtle,
            zIndex: opacity[100],
          },
          topBarStyle,
        ]}
      />

      {/* Fixed header — close / share. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: topInset + spacing[12],
          left: 0,
          right: 0,
          zIndex: opacity[100],
        }}
      >
        <MastheadHeader
          iconType="solid"
          // Chevron-down "collapse" per Figma 3914:43753 (was ✕).
          leading="collapse"
          trailingGlyph="share"
          onLeadingPress={onClose}
          onTrailingPress={() => onSharePress?.(activeCard)}
        />
      </View>

      {/* Fixed Apply bar — one global CTA bound to the settled card. No
          animatedIndex → its safe-area padding stays the full bottom inset. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <ApplyBar
          onApply={onApply ? () => onApply(activeCard) : undefined}
          eligibilityResult={eligibilityResult}
          onEditEligibility={onEditEligibility}
          bottomInset={bottomInset}
        />
      </View>
    </Animated.View>
  );
}

// ----------------------------------------------------------------------------
// CardDetailScreenAndroid — the BottomSheetModal wrapper. Single '100%' snap =
// opens full screen directly. Same forwardRef contract as the iOS sheet.
// ----------------------------------------------------------------------------
export const CardDetailScreenAndroid = forwardRef<
  BottomSheetModal,
  CardDetailSheetProps
>(
  (
    {
      card,
      cards,
      initialCardId,
      originY,
      onActiveCardChange,
      recommended,
      eligibilityDefaults,
      eligibleAliases,
      onEligibilityChecked,
      onShowResultSheet,
      onApply,
      onRecommendedPress,
      onLearnHow,
      onViewAllBenefits,
      onSharePress,
      onEditEligibility,
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const snapPoints = useMemo(() => ['100%'], []);

    // A slow, deliberate open (near critically damped) so the grow-from-card —
    // the gaps on the sides/top and the expand to full screen — is clearly
    // visible rather than snapping open. overshootClamping = no bounce past full.
    const sheetAnimationConfigs = useBottomSheetSpringConfigs({
      damping: 30,
      stiffness: 200,
      mass: 1,
      overshootClamping: true,
    });

    // Clamp the zoom pivot to a sane on-screen band (the tapped card's Y, with a
    // mid-screen fallback) so an edge tap doesn't pivot off the visible area.
    const pivotY =
      originY != null
        ? Math.max(spacing[64], Math.min(SCREEN_H - spacing[128], originY))
        : DEFAULT_ORIGIN_Y;

    const resolvedCards = useMemo(
      () => (cards && cards.length ? cards : card ? [card] : []),
      [cards, card]
    );
    const initialIdx = useMemo(() => {
      const id = initialCardId ?? card?.id;
      const i = id ? resolvedCards.findIndex((c) => c.id === id) : -1;
      return i >= 0 ? i : 0;
    }, [resolvedCards, initialCardId, card]);

    // Pager offset (drives the swipe lean) + sheet progress (drives the zoom).
    // animatedIndex MUST seed at the CLOSED rest value (−1) so the page starts
    // fully zoomed-out on the first present and zooms IN as gorhom drives it 0.
    const scrollX = useSharedValue(PAGE_W * initialIdx);
    const animatedIndex = useSharedValue(-1);
    useEffect(() => {
      scrollX.value = PAGE_W * initialIdx;
    }, [initialIdx, scrollX]);

    // Warm every pager card's image into the expo-image cache and mark it
    // decoded, so a card painted on swipe shows its image on the first frame
    // instead of flashing its placeholder colour (the "dark blue flicker").
    useEffect(() => {
      const urls: string[] = [];
      for (const c of resolvedCards) {
        const src = c.cardImage;
        if (src && typeof src === 'object' && 'uri' in src && src.uri) {
          urls.push(src.uri as string);
        }
      }
      if (urls.length) {
        ExpoImage.prefetch(urls, 'memory-disk').then((ok) => {
          if (ok) markCardImagesDecoded(urls);
        });
      }
    }, [resolvedCards]);

    const navigation =
      useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const handleViewAllBenefits = useCallback(
      (c: CardModel) => {
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
        if (onViewAllBenefits) {
          onViewAllBenefits(c);
          return;
        }
        navigation.navigate('AllCardBenefits', {
          alias: c.filterMeta?.cardAlias,
          cardName: c.name,
        });
      },
      [navigation, onViewAllBenefits, ref]
    );

    // ---- Per-card eligibility (mirrors the iOS wrapper) ----
    const [eligibilityResult, setEligibilityResult] =
      useState<EligibilityOutcome | null>(null);

    const hadDefaultsRef = useRef(false);
    useEffect(() => {
      hadDefaultsRef.current = !!eligibilityDefaults;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [card?.id]);

    useEffect(() => {
      if (eligibilityDefaults) {
        setEligibilityResult(
          resolveCardOutcome(
            card?.filterMeta?.cardAlias,
            eligibleAliases,
            parseIncome(eligibilityDefaults.income)
          )
        );
      } else {
        setEligibilityResult(null);
      }
    }, [
      card?.id,
      eligibilityDefaults,
      eligibleAliases,
      card?.filterMeta?.cardAlias,
    ]);

    const handleEligibilityChecked = useCallback(
      (o: {
        pincode: string;
        income: string;
        incomeType: IncomeType;
        eligibleCardAliases: string[];
      }) => {
        const outcome = resolveCardOutcome(
          card?.filterMeta?.cardAlias,
          o.eligibleCardAliases,
          parseIncome(o.income)
        );
        if (hadDefaultsRef.current) {
          setEligibilityResult(outcome);
        } else {
          onShowResultSheet?.(outcome);
        }
        onEligibilityChecked?.(o);
      },
      [card?.filterMeta?.cardAlias, onEligibilityChecked, onShowResultSheet]
    );

    const handleClose = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.close();
    }, [ref]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={opacity[80]}
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        animationConfigs={sheetAnimationConfigs}
        animatedIndex={animatedIndex}
        index={0}
        topInset={0}
        enableDynamicSizing={false}
        enablePanDownToClose
        activeOffsetY={PAN_ACTIVE_OFFSET_Y}
        failOffsetX={PAN_FAIL_OFFSET_X}
        backdropComponent={renderBackdrop}
        // Sheet itself is transparent so the gap around the zooming page reveals
        // the dimmed backdrop; the page paints its own surface + rounded corners.
        backgroundStyle={{ backgroundColor: 'transparent' }}
        handleComponent={() => null}
      >
        {card ? (
          <AndroidPagerBody
            cards={resolvedCards}
            initialCardId={initialCardId ?? card.id}
            scrollX={scrollX}
            animatedIndex={animatedIndex}
            originY={pivotY}
            recommended={recommended}
            eligibilityDefaults={eligibilityDefaults}
            onEligibilityChecked={handleEligibilityChecked}
            eligibilityResult={eligibilityResult}
            onLearnHow={onLearnHow}
            onViewAllBenefits={handleViewAllBenefits}
            onSharePress={onSharePress}
            onRecommendedPress={onRecommendedPress}
            onActiveCardChange={onActiveCardChange}
            onApply={onApply}
            onEditEligibility={onEditEligibility}
            onClose={handleClose}
            topInset={insets.top}
            bottomInset={insets.bottom}
          />
        ) : null}
      </BottomSheetModal>
    );
  }
);

CardDetailScreenAndroid.displayName = 'CardDetailScreenAndroid';
