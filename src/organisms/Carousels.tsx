/**
 * Carousels — organism (Figma set 3198:28342)
 *
 * Five named exports — each is one home-screen carousel/section.
 * Built on top of existing atoms (CashbackBadge, Indicator, Text, Icon)
 * and the image registry. All horizontal scrollers use a ScrollView so
 * any item count fits without truncation.
 *
 * Token mapping for the spec hex values:
 *   #ffffff → colors.surface.default
 *   #fff4eb → colors.background.emphasis   (Saffron-50)
 *   #d9e3ec → colors.border.default        (Slate-350)
 *   #f5f7f9 → colors.surface.sunken        (Slate-150)
 *   #262626 → colors.text.primary
 *
 * Dimensions land on spacing tokens where they exist; anything that
 * doesn't (150, 92, 108, 326, 72, 258, 166, 252) is a documented
 * file-local const — same pattern as Button/Input/OtpInput heights.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Text,
  Icon,
  CashbackBadge,
  Indicator,
  DividerVertical,
  RemoteImage,
} from '../atoms';
import type { IconName } from '../atoms';
import { CardTile } from './CardTile';
import { images } from '../assets/images';
import {
  colors,
  primitives,
  spacing,
  radius,
  borderWidth,
  iconSize,
  elevation,
} from '../tokens';

// ----------------------------------------------------------------------------
// Component-spec dimensions (not in the shared spacing scale)
// ----------------------------------------------------------------------------
const CARD_OFFER_W = 150;
const CATEGORY_TILE_W = 92;
const CATEGORY_TILE_H = 108;
const CATEGORY_IMG_W = 92;
const HOW_CARD_W = 326;
const HOW_CIRCLE = 72;
const HOW_TEXT_W = 214;
const MILESTONE_W = 258;
const MILESTONE_H = 166;
const BANNER_ASPECT = 360 / 252;
// PromoBanner status-bar band colour (used when `safeTop` reserves a strip
// above the hero). White, so the area behind the status bar reads as a clean
// white band with the carousel below it (the screen sets the status-bar
// icons dark to read against it).
const NOTCH_COLOR = colors.background.sunken; // #fcfcfd (near-white)

// ----------------------------------------------------------------------------
// 1. CreditCardOffer — horizontal scroll of card image + CashbackBadge
// ----------------------------------------------------------------------------
export interface CreditCardOfferItem {
  id: string;
  image: ImageSourcePropType;
  /** Card name shown between the image and the cashback badge. */
  name: string;
  cashback: string; // e.g. "₹1200 Cashback"
  prefix?: string; // "Upto"
}

export interface CreditCardOfferProps {
  cards: CreditCardOfferItem[];
  /** Tapping a card fires this with the card's id (e.g. open its detail). */
  onCardPress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function CreditCardOffer({
  cards,
  onCardPress,
  style,
}: CreditCardOfferProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{
        paddingHorizontal: spacing[16],
        paddingVertical: spacing[12],
        // gap was spacing[12] — bumped to spacing[24] so the
        // CashbackBadge (which can intrinsically exceed the 150-wide
        // card on longer values like "Upto ₹2,500 Cashback") has room
        // to extend into the gap without overlapping the next card.
        gap: spacing[24],
      }}
    >
      {cards.map((card) => (
        <Pressable
          key={card.id}
          onPress={onCardPress ? () => onCardPress(card.id) : undefined}
          disabled={!onCardPress}
          accessibilityRole={onCardPress ? 'button' : undefined}
          accessibilityLabel={onCardPress ? `${card.name}, view card` : undefined}
          style={{ width: CARD_OFFER_W, gap: spacing[12] }}
        >
          <View
            style={{
              width: CARD_OFFER_W,
              height: spacing[96],
              borderRadius: radius.md,
              borderWidth: borderWidth.thin,
              borderColor: colors.surface.default,
              backgroundColor: colors.surface.sunken,
              overflow: 'hidden',
            }}
          >
            <Image
              source={card.image}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
          {/* Text block: name → cashback, gap 4 internally,
              gap 12 between image and this block (from the outer View).
              Name reserves a 2-line tall box via minHeight (= body12 lh
              16 × 2 = 32 = spacing[32]) so single-line names don't push
              the badge up and break the row's visual rhythm. */}
          <View style={{ gap: spacing[4] }}>
            <Text
              variant="body12Medium"
              color={colors.text.primary}
              numberOfLines={2}
              style={{ minHeight: spacing[32] }}
            >
              {card.name}
            </Text>
            <CashbackBadge
              size="sm"
              prefix={card.prefix ?? 'Upto'}
              value={card.cashback}
            />
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ----------------------------------------------------------------------------
// 2. CategoryTiles — pale-saffron section with horizontal scroll of tiles
// ----------------------------------------------------------------------------
export interface CategoryTileItem {
  id: string;
  label: string;
  image: ImageSourcePropType;
}

export interface CategoryTilesProps {
  title: string;
  categories: CategoryTileItem[];
  /** Tapping a tile fires this with the tile's id (used to filter Home). */
  onCategoryPress?: (id: string) => void;
  /** Id of the currently-selected tile — gets a saffron stroke + corner tick. */
  selectedId?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function CategoryTiles({
  title,
  categories,
  onCategoryPress,
  selectedId,
  style,
}: CategoryTilesProps) {
  // Horizontal scroll ref — on selecting a tile we advance the strip so the
  // tiles to its right slide into view (mirrors the Offers category strip).
  const scrollRef = React.useRef<ScrollView>(null);
  const itemStride = CATEGORY_TILE_W + spacing[12];
  return (
    <View
      style={[
        {
          backgroundColor: colors.background.emphasis,
          paddingTop: spacing[12],
          paddingBottom: spacing[20],
          gap: spacing[16],
        },
        style,
      ]}
    >
      <Text
        variant="body16Bold"
        color={colors.action.primary.default}
        align="left"
        style={{ paddingHorizontal: spacing[16] }}
      >
        {title}
      </Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing[16],
          gap: spacing[12],
          // Reserve vertical room so neither the saffron drop shadow nor the
          // selected tile's corner tick is clipped by the content frame.
          paddingTop: spacing[16],
          paddingBottom: spacing[8],
        }}
      >
        {categories.map((cat, i) => {
          const selected = selectedId != null && cat.id === selectedId;
          return (
          // Shadow lives on the OUTER View (no overflow:hidden) so it
          // stays visible. The INNER View clips the image to the
          // rounded corners.
          <Pressable
            key={cat.id}
            onPress={() => {
              // Advance the strip so the tapped tile leads with one tile of
              // context on the left, revealing the tiles to its right.
              scrollRef.current?.scrollTo({
                x: Math.max(0, (i - 1) * itemStride),
                animated: true,
              });
              onCategoryPress?.(cat.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${cat.label}, filter cards`}
            style={[
              {
                width: CATEGORY_TILE_W,
                height: CATEGORY_TILE_H,
                borderRadius: radius.lg,
                backgroundColor: colors.surface.default,
              },
              elevation.brand.sm,
            ]}
          >
            <View
              style={{
                flex: 1,
                borderRadius: radius.lg,
                // Selected → saffron 2px stroke; otherwise the default hairline.
                borderWidth: selected ? borderWidth.heavy : borderWidth.iconDefault,
                borderColor: selected
                  ? colors.action.primary.default
                  : colors.border.default,
                backgroundColor: colors.surface.default,
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              <Image
                source={cat.image}
                style={{ width: CATEGORY_IMG_W, height: spacing[80] }}
                resizeMode="cover"
              />
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: spacing[4],
                }}
              >
                <Text
                  variant="body12Medium"
                  color={colors.text.primary}
                  align="center"
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </View>
            </View>
            {/* Selected tick — saffron disc with a white check, nudged to
                straddle the top-right corner. */}
            {selected ? (
              <View
                style={{
                  position: 'absolute',
                  top: -spacing[8],
                  right: -spacing[8],
                  width: spacing[24],
                  height: spacing[24],
                  borderRadius: radius.full,
                  backgroundColor: colors.action.primary.default,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: borderWidth.heavy,
                  borderColor: colors.surface.default,
                }}
              >
                <Icon
                  name="check-outline"
                  size={iconSize[12]}
                  color={colors.text.inverse}
                />
              </View>
            ) : null}
          </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 3. HowItWorks — horizontal scroll of [text + 72×72 circle with icon]
// ----------------------------------------------------------------------------
export interface HowItWorksStep {
  id: string;
  text: string;
  icon: IconName;
}

export interface HowItWorksProps {
  steps: HowItWorksStep[];
  style?: StyleProp<ViewStyle>;
}

export function HowItWorks({ steps, style }: HowItWorksProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{
        paddingHorizontal: spacing[16],
        gap: spacing[12],
        // Reserve vertical room so the neutral drop shadow isn't
        // clipped by the ScrollView's content frame.
        paddingVertical: spacing[8],
      }}
    >
      {steps.map((step) => (
        <View
          key={step.id}
          style={[
            {
              width: HOW_CARD_W,
              height: spacing[96],
              backgroundColor: colors.surface.default,
              borderColor: colors.border.default,
              borderWidth: borderWidth.thin,
              borderRadius: radius.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: spacing[12],
              paddingHorizontal: spacing[16],
              gap: spacing[8],
            },
            // Lightest card lift (Shadow/Light/XS) — matches the other
            // store-page tiles (CardTile, brand-offer cards) for a consistent,
            // subtle elevation across the page.
            elevation.light.xs,
          ]}
        >
          <Text
            variant="body12Medium"
            color={colors.text.primary}
            style={{ width: HOW_TEXT_W }}
          >
            {step.text}
          </Text>
          <View
            style={{
              width: HOW_CIRCLE,
              height: HOW_CIRCLE,
              borderRadius: radius.full,
              backgroundColor: colors.surface.sunken,
              borderWidth: borderWidth.thin,
              borderColor: colors.border.default,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={step.icon}
              size={iconSize[32]}
              color={colors.text.primary}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ----------------------------------------------------------------------------
// 4. MilestoneStat — horizontal scroll of 258×166 full-bleed image cards
// ----------------------------------------------------------------------------
export interface MilestoneStatItem {
  id: string;
  image: ImageSourcePropType;
}

export interface MilestoneStatProps {
  items: MilestoneStatItem[];
  style?: StyleProp<ViewStyle>;
}

export function MilestoneStat({ items, style }: MilestoneStatProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{
        paddingHorizontal: spacing[16],
        gap: spacing[12],
      }}
    >
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            width: MILESTONE_W,
            height: MILESTONE_H,
            borderRadius: radius.xl,
            backgroundColor: colors.surface.sunken,
            overflow: 'hidden',
          }}
        >
          <Image
            source={item.image}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      ))}
    </ScrollView>
  );
}

// ----------------------------------------------------------------------------
// 5. PromoBanner — 360×252 hero with image + bottom-gradient + Indicator
// ----------------------------------------------------------------------------
export interface PromoBannerProps {
  /** Single hero image. Use `images` for a multi-slide carousel. */
  image?: ImageSourcePropType;
  /** Multiple hero images — renders a swipeable, paging carousel and a
   *  live step Indicator. When 1 (or only `image` is passed) the Indicator
   *  is hidden, since there's nothing to page through. */
  images?: ImageSourcePropType[];
  /** Dot-count override. Defaults to the number of slides. */
  total?: number;
  /** Active dot (0-based). Ignored once the user swipes (the live scroll
   *  position drives the Indicator). Default 0. */
  active?: number;
  /** Auto-advance through the slides (multi-slide only). Pauses while the
   *  user is swiping and resumes a moment after they let go. Manual swipe
   *  always works regardless. Default false. */
  autoScroll?: boolean;
  /** Dwell time per slide before auto-advancing (ms). Default 2450 (= 70%
   *  of the original 3500 dwell). The progress Indicator's active bar fills
   *  over exactly this time so it reaches 100% as the slide advances. */
  autoScrollIntervalMs?: number;
  /** Delay before auto-advance resumes after a manual swipe (ms). Default 4000. */
  autoScrollResumeDelayMs?: number;
  /** When true, draws a dark top-anchored gradient scrim. Use when the
   *  banner bleeds up behind the device status bar (e.g. the store page
   *  with squared top corners) so light status-bar icons stay legible
   *  over any image. Default false. */
  topScrim?: boolean;
  /** Safe-area top inset (px). When > 0 the COMPLETE hero image sits below
   *  the notch, with a solid band of this height reserved above it for the
   *  status bar. Default 0. */
  safeTop?: number;
  /** Colour of the reserved status-bar band (only when safeTop > 0).
   *  Default NOTCH_COLOR (near-white). Pass colors.surface.dark for a black
   *  status-bar band with light status icons. */
  safeTopColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function PromoBanner({
  image,
  images,
  total,
  active = 0,
  autoScroll = false,
  autoScrollIntervalMs = 2450,
  autoScrollResumeDelayMs = 4000,
  topScrim = false,
  safeTop = 0,
  safeTopColor = NOTCH_COLOR,
  style,
}: PromoBannerProps) {
  // Resolve the slide list: explicit `images` wins, else the single `image`.
  const slides = (images && images.length > 0
    ? images
    : image
    ? [image]
    : []) as ImageSourcePropType[];
  const dotCount = total ?? slides.length;

  // Live paging — the carousel viewport width drives each slide's width, and
  // the scroll offset drives the active dot so the Indicator tracks swipes.
  const [viewportW, setViewportW] = useState(0);
  const [activeIndex, setActiveIndex] = useState(active);
  const isCarousel = slides.length > 1;

  // Auto-advance plumbing. activeIndexRef keeps the latest index out of the
  // interval's closure; pausedRef freezes auto-advance during manual swipes.
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(active);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (viewportW <= 0) return;
      const i = Math.round(e.nativeEvent.contentOffset.x / viewportW);
      activeIndexRef.current = i;
      setActiveIndex(i);
    },
    [viewportW]
  );

  const pauseAuto = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);
  const resumeAuto = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, autoScrollResumeDelayMs);
  }, [autoScrollResumeDelayMs]);

  useEffect(() => {
    if (!isCarousel || !autoScroll || viewportW <= 0) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const next = (activeIndexRef.current + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * viewportW, animated: true });
    }, autoScrollIntervalMs);
    return () => {
      clearInterval(id);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [isCarousel, autoScroll, viewportW, slides.length, autoScrollIntervalMs]);

  return (
    <View
      onLayout={(e) => setViewportW(e.nativeEvent.layout.width)}
      style={[
        {
          width: '100%',
          borderRadius: radius.xl,
          overflow: 'hidden',
          // With a notch inset the band above the hero is a solid colour
          // (safeTopColor); otherwise the usual neutral image fallback.
          backgroundColor: safeTop > 0 ? safeTopColor : colors.surface.sunken,
        },
        style,
      ]}
    >
      {/* Notch / status-bar band — just reserves safe-area height so the
          hero sits fully below the notch. Its colour comes from the
          container bg (safeTopColor); no image, so nothing is duplicated. */}
      {safeTop > 0 ? <View style={{ width: '100%', height: safeTop }} /> : null}

      {/* Design-ratio hero. Single image → a static cover image; multiple →
          a horizontal paging ScrollView (one full-width slide each). Each
          slide keeps the COMPLETE image (cover, not zoomed). */}
      <View style={{ width: '100%', aspectRatio: BANNER_ASPECT, overflow: 'hidden' }}>
        {isCarousel && viewportW > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            // Manual control always wins: pause auto-advance while the user
            // is dragging, resume a little after they settle.
            onScrollBeginDrag={pauseAuto}
            onScrollEndDrag={resumeAuto}
            onMomentumScrollEnd={resumeAuto}
          >
            {slides.map((slide, i) => (
              <RemoteImage
                key={i}
                source={slide}
                style={{ width: viewportW, height: '100%' }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <RemoteImage
            source={slides[0]}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Top-anchored dark scrim — for callers WITHOUT a notch inset
          (safeTop = 0). Fades from a 50%-alpha black at the very top down
          to transparent so light status-bar icons read over any image. */}
      {topScrim && safeTop === 0 ? (
        <LinearGradient
          colors={[primitives.transparentBlack[50], 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '28%',
          }}
          pointerEvents="none"
        />
      ) : null}
      {/* Indicator — only when there's more than one slide to page through.
          Story-style timed bars: the active bar fills over the slide's hold
          time (durationMs) so it completes as the carousel auto-advances.
          Full-bleed with 16px side padding; only auto-advances when
          autoScroll is on (else durationMs 0 = a static position bar). */}
      {isCarousel ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: spacing[16],
            paddingHorizontal: spacing[16],
          }}
          pointerEvents="none"
        >
          <Indicator
            variant="progress"
            total={dotCount}
            active={activeIndex}
            durationMs={autoScroll ? autoScrollIntervalMs : 0}
          />
        </View>
      ) : null}
    </View>
  );
}

// ----------------------------------------------------------------------------
// 6. CardCarousel — horizontal scroll of <CardTile type="scrollable" />
// ----------------------------------------------------------------------------
//
// Figma node 4830:47940 (Credit Card Base, Type=Scrollable, laid out in
// a carousel). Pure composition — REUSES the CardTile organism in its
// 'scrollable' state (no fee strip, no invite badge). The carousel
// itself is just the horizontal ScrollView shell + an optional header
// (title + "View all" action), matching the section-header style used
// by the other Carousels above.
//
// Tokens used:
//   gap between cards          spacing[12]
//   contentContainer padH      spacing[16]
//   header padding-h           spacing[16]
//   header row gap             spacing[12]
//   header title typography    heading18SemiBold (text.primary)
//   header link typography     body14Medium (action.accent.default = cobalt)
//   card width                 CARD_CAROUSEL_W (308 — component-spec)

// Card width — bumped in two steps as the cashback badge "Upto ₹X,XXX
// Cashback" needed more horizontal room:
//   308 (original) → 328 → 340 (current; +12, multiple of 4).
// The right column after the 132-wide image + 8-gap + 12-pad pair now
// lands at ~176 px, enough for the longest badge string to sit inside
// the card without overflowing or wrapping to a second line.
const CARD_CAROUSEL_W = 340;

export interface CardCarouselItem {
  id: string;
  cardImage: ImageSourcePropType;
  cardName: string;
  /** Value-only string, e.g. "₹1,200". The CardTile organism wraps
   *  it as "Upto X Cashback" via the CashbackBadge. */
  cashbackText: string;
  tags?: string[];
  benefits?: Array<{
    icon: IconName;
    title: string;
    description?: string;
    tagId?: number;
  }>;
}

export interface CardCarouselProps {
  cards: CardCarouselItem[];
  /** Optional section title above the scroll row. */
  title?: string;
  /** When provided, renders a "View all" link on the right of the header. */
  onViewAll?: () => void;
  onCardPress?: (card: CardCarouselItem, index: number) => void;
  /** Auto-scroll left-to-right at a slow, smooth pace. Pauses on user
   *  touch / swipe; resumes shortly after the user lets go. Default false. */
  autoScroll?: boolean;
  /** Auto-scroll speed in px/sec. Default 20 (slow + readable). Only
   *  consulted when autoScroll is true. */
  autoScrollSpeedPxPerSec?: number;
  /** Delay before resuming auto-scroll after the user touches the
   *  carousel. Default 1500 ms. Only consulted when autoScroll is true. */
  autoScrollResumeDelayMs?: number;
  style?: StyleProp<ViewStyle>;
}

export function CardCarousel({
  cards,
  title,
  onViewAll,
  onCardPress,
  autoScroll = false,
  autoScrollSpeedPxPerSec = 20,
  autoScrollResumeDelayMs = 1500,
  style,
}: CardCarouselProps) {
  const hasHeader = !!title || !!onViewAll;

  // Auto-scroll state — all kept in refs so the rAF loop doesn't
  // re-create on every render. The scroll position is driven directly
  // via scrollRef.scrollTo with `animated: false` (we drive the easing
  // ourselves via the rAF delta-time accumulator).
  const scrollRef = useRef<ScrollView>(null);
  const positionRef = useRef(0);
  const contentWidthRef = useRef(0);
  const viewportWidthRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!autoScroll) return;
    let raf = 0;
    let lastTime = 0;

    const tick = (now: number) => {
      if (lastTime === 0) lastTime = now;
      const dtSec = (now - lastTime) / 1000;
      lastTime = now;

      if (
        !pausedRef.current &&
        contentWidthRef.current > 0 &&
        viewportWidthRef.current > 0
      ) {
        const maxScroll =
          contentWidthRef.current - viewportWidthRef.current;
        if (maxScroll > 0) {
          let next = positionRef.current + autoScrollSpeedPxPerSec * dtSec;
          if (next >= maxScroll) {
            // Loop back to start. Visible snap is fine for a slow
            // carousel; for a true infinite loop we'd render the
            // cards twice and modular-jump — leave that as a follow-up.
            next = 0;
          }
          positionRef.current = next;
          scrollRef.current?.scrollTo({ x: next, animated: false });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [autoScroll, autoScrollSpeedPxPerSec]);

  const pauseAuto = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };
  const resumeAuto = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, autoScrollResumeDelayMs);
  };

  return (
    <View style={[{ gap: spacing[12] }, style]}>
      {hasHeader ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[12],
            paddingHorizontal: spacing[16],
          }}
        >
          {title ? (
            <Text
              variant="heading18SemiBold"
              color={colors.text.primary}
              style={{ flex: 1 }}
            >
              {title}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {onViewAll ? (
            <Pressable
              onPress={onViewAll}
              hitSlop={spacing[8]}
              accessibilityRole="button"
              accessibilityLabel="View all"
            >
              <Text
                variant="body14Medium"
                color={colors.action.accent.default}
              >
                View all
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Track viewport + content size so the auto-scroll loop knows
        // how far it can go before wrapping.
        onLayout={(e) => {
          viewportWidthRef.current = e.nativeEvent.layout.width;
        }}
        onContentSizeChange={(w) => {
          contentWidthRef.current = w;
        }}
        // Pause auto-scroll while the user is interacting; resume
        // after a short delay so a small accidental drag doesn't
        // permanently freeze the loop.
        onScroll={(e) => {
          // Keep positionRef in sync with manual scrolls so the next
          // auto tick continues from where the user let go.
          positionRef.current = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        onScrollBeginDrag={pauseAuto}
        onScrollEndDrag={resumeAuto}
        onMomentumScrollEnd={resumeAuto}
        contentContainerStyle={{
          paddingHorizontal: spacing[16],
          gap: spacing[12],
          // Reserve vertical room so each CardTile's drop shadow isn't
          // clipped by the ScrollView's content frame (cards were cropped
          // at the bottom on the store page's "Best cards" carousel).
          paddingVertical: spacing[8],
        }}
      >
        {cards.map((card, i) => (
          <Pressable
            key={card.id}
            onPress={
              onCardPress ? () => onCardPress(card, i) : undefined
            }
            accessibilityRole="button"
            accessibilityLabel={`${card.cardName}, view card`}
            style={{ width: CARD_CAROUSEL_W }}
          >
            <CardTile
              type="scrollable"
              cardImage={card.cardImage}
              cardName={card.cardName}
              cashbackText={card.cashbackText}
              tags={card.tags}
              benefits={card.benefits}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 7. BestForSpending — "Best for spending on" inline category filter
// (Figma Inline Category Filter, node 3914:43669)
// ----------------------------------------------------------------------------
//
// Card-shaped white container holding:
//   • subtitle row ("Best for spending on")
//   • a horizontal scroll of category items (88×88 image + label),
//     separated by REUSED fade DividerVertical between items
//   • a centered scroll Indicator at the bottom, wired live to the
//     ScrollView's onScroll
//
// Data-driven via a `categories` array of { label, filterKey }. Keys
// map directly into images.filters.* — flagged in the response if any
// don't resolve. Default array is Fuel · Shopping · Food Order ·
// Dining (the node's 5th "Dining" is a Figma duplicate and is
// intentionally not replicated).
//
// Composition (existing only — no rebuilds):
//   - <Text variant='body16SemiBold'> (atom) — subtitle
//   - <ScrollView horizontal> + <Image>      — category strip
//   - <DividerVertical style='fade' height={80}> (atom) — between items
//   - <Indicator variant='scroll' progress={0..1}> (atom) — bottom bar
//
// Token mapping for this section (every property bound):
//   container bg                colors.surface.default
//   container radius            radius.xl                (16)
//   container padV              spacing[12]
//   container gap               spacing[16]
//   subtitle padH               spacing[16]
//   subtitle typography         body16SemiBold (Outfit SemiBold 16/24)
//   subtitle colour             colors.text.primary
//   scroll contentContainer padH spacing[12]
//   scroll contentContainer gap  spacing[12]
//   image size                  BEST_FOR_IMG_SIZE (88 — component-spec)
//   label typography            body12Regular
//   label colour                colors.text.primary
//   label width                 BEST_FOR_IMG_SIZE (matches image)
//   divider style/height        'fade' / 80 (DividerVertical defaults)
//   indicator                   Indicator variant='scroll' (atom defaults)

// 88×88 image tile — not on the spacing scale (component-spec per the
// node). Reused by the label width to match.
const BEST_FOR_IMG_SIZE = 88;
// Fade divider height — matches the image side so dividers top-align
// with the 88-px image and end where the image ends.
const BEST_FOR_DIVIDER_H = 80;

export interface BestForSpendingCategory {
  label: string;
  /** Key into images.filters.* (e.g. 'fuel', 'shopping', 'foodOrdering',
   *  'dining', 'grocery', 'travel', 'bills'). */
  filterKey: keyof typeof images.filters;
}

export interface BestForSpendingProps {
  /** Subtitle above the strip. Default "Best for spending on". */
  subtitle?: string;
  /** Categories to render. Default Fuel/Shopping/Food Order/Dining
   *  — easy to extend by passing a longer array. */
  categories?: BestForSpendingCategory[];
  style?: StyleProp<ViewStyle>;
}

// All 7 categories that ship in `images.filters.*` — every available
// filter image surfaces in the carousel by default. Override per card
// by passing a shorter / re-ordered `categories` prop.
const DEFAULT_BEST_FOR_CATEGORIES: BestForSpendingCategory[] = [
  { label: 'Fuel',       filterKey: 'fuel' },
  { label: 'Shopping',   filterKey: 'shopping' },
  { label: 'Food Order', filterKey: 'foodOrdering' },
  { label: 'Dining',     filterKey: 'dining' },
  { label: 'Grocery',    filterKey: 'grocery' },
  { label: 'Travel',     filterKey: 'travel' },
  { label: 'Bills',      filterKey: 'bills' },
];

export function BestForSpending({
  subtitle = 'Best for spending on',
  categories = DEFAULT_BEST_FOR_CATEGORIES,
  style,
}: BestForSpendingProps) {
  // Scroll progress (0..1) → drives the Indicator thumb's slide.
  // Recomputed on every onScroll using the current contentOffset.x and
  // the live max-scroll (contentSize.width − layoutMeasurement.width).
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const maxScroll = contentSize.width - layoutMeasurement.width;
      if (maxScroll <= 0) {
        setScrollProgress(0);
        return;
      }
      setScrollProgress(contentOffset.x / maxScroll);
    },
    []
  );

  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: colors.surface.default,
          borderRadius: radius.xl,
          overflow: 'hidden',
          paddingVertical: spacing[12],
          gap: spacing[16],
          alignItems: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        variant="body16SemiBold"
        color={colors.text.primary}
        style={{ paddingHorizontal: spacing[16] }}
      >
        {subtitle}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: spacing[12],
          gap: spacing[12],
          alignItems: 'flex-start',
        }}
        style={{ width: '100%' }}
      >
        {categories.map((cat, i) => (
          <React.Fragment key={cat.label}>
            <View style={{ alignItems: 'flex-start' }}>
              <View
                style={{
                  width: BEST_FOR_IMG_SIZE,
                  height: BEST_FOR_IMG_SIZE,
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={images.filters[cat.filterKey]}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              <Text
                variant="body12Regular"
                color={colors.text.primary}
                align="center"
                style={{ width: BEST_FOR_IMG_SIZE }}
              >
                {cat.label}
              </Text>
            </View>
            {i < categories.length - 1 ? (
              <DividerVertical style="fade" height={BEST_FOR_DIVIDER_H} />
            ) : null}
          </React.Fragment>
        ))}
      </ScrollView>

      <View
        style={{
          width: '100%',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Indicator variant="scroll" progress={scrollProgress} />
      </View>
    </View>
  );
}
