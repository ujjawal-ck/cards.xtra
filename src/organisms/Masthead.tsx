/**
 * Masthead — organism
 *
 * Per-screen hero block. A `variant` prop selects the layout; only the
 * 'profile' variant ships in this revision (others land per their own
 * specs).
 *
 * 'profile' variant — Figma node 4743:24196
 * ----------------------------------------------------------------------
 * Container — 360 × 242, vertical, gap spacing[10], padTop 80,
 *             padHorizontal 16, padBottom 0.
 * Card     — 328 × 162, vertical, gap spacing[4], padTop 48,
 *             padHorizontal 16, padBottom 12, radius.xl (16),
 *             image-fill backdrop, elevation.light.xs
 *             (#000 @ 6%, y1, blur 2).
 *
 *   • name        — heading22Bold,    text.primary    (#262626)
 *   • contact     — body12Regular,    text.secondary  (#5c5c5c)
 *   • Edit button — Button(variant='solid', tone='second', size=36,
 *                   icon='leading', iconName='edit-filled', label='Edit Profile').
 *                   Sits with marginTop spacing[12] above it.
 *
 * Avatar — absolutely positioned to overlap the top of the card.
 *   outer ring 76×76, radius.full, bg surface.sunken (#f5f7f9)
 *   inner circ 64×64, radius.full, bg action.primary.default (#ff6d1d)
 *                     with elevation.brand.md (#ff6d1d @ 16%, y4, blur 16).
 *   Initial   heading28Bold, text.inverse (white).
 *   Optional `avatarImage` replaces the initial when supplied.
 *
 * Backdrop picked from src/assets/images/backgrounds:
 *   images.backgrounds.medium → bg-medium.png (neutral mid-tone — works
 *   behind dark text and the cobalt button without competing).
 *
 * Hex → token:
 *   #262626  → colors.text.primary
 *   #5c5c5c  → colors.text.secondary
 *   #0741ef  → colors.action.accent.default (via Button tone='second')
 *   #ff6d1d  → colors.action.primary.default
 *   #f5f7f9  → colors.surface.sunken
 *   white    → colors.text.inverse
 *   shadows  → elevation.light.xs (card) + elevation.brand.md (avatar)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ImageBackground,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  Button,
  Icon,
  StatusBadge,
  AmountSkeleton,
  RollingAmount,
} from '../atoms';
import type { StatusBadgeStatus } from '../atoms';
import { BrandLogo, SearchBar, Tooltip } from '../molecules';
import { HomeHeader } from './HomeHeader';
import { images } from '../assets/images';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  avatarSize,
  mediaSize,
  sizing,
  elevation,
  typography,
} from '../tokens';

// ----------------------------------------------------------------------------
// Variant + props
// ----------------------------------------------------------------------------
export type MastheadVariant =
  | 'profile'
  | 'earnings'
  | 'payment'
  | 'cashback-status'
  | 'home'
  | 'offers';

export interface MastheadProps {
  variant: MastheadVariant;

  // 'profile' content
  name?: string;
  contact?: string;
  avatarInitial?: string;
  avatarImage?: ImageSourcePropType;
  onEditProfile?: () => void;

  // 'earnings' content
  totalEarnings?: string;
  subtitle?: string;
  cashbackValue?: string;
  rewardsValue?: string;
  onInfoPress?: () => void;
  onCashbackPress?: () => void;
  onRewardsPress?: () => void;
  /** 'earnings' — while true, the total + stat-card values show a
   *  pulsing skeleton instead of text (amounts still loading). */
  loading?: boolean;
  /** 'earnings' — change this to replay the total's slot-machine roll
   *  (e.g. bumped on every Earnings-tab focus). */
  rollToken?: number | string;

  // 'payment' content
  amount?: string;
  // (re-uses `subtitle` for the small line under the amount)
  // (re-uses `onInfoPress` for the top-right info icon tap)

  // 'cashback-status' content
  // (re-uses `amount` for the big headline value)
  brandLogo?: ImageSourcePropType;
  statusLabel?: string;
  expectedText?: string;
  tone?: StatusBadgeStatus;

  // 'home' content
  /** Background slot — any React node (image, video, animation). Falls
   *  back to <ImageBackground source={images.backgrounds.home}> when
   *  undefined, so the masthead always has a backdrop. */
  background?: React.ReactNode;
  notificationCount?: number;
  /** SearchBar placeholder — default "Search by card name". */
  placeholder?: string;
  /** Optional rotating placeholders. When supplied (length ≥ 2) the
   *  default-state SearchBar animates between them (slide-up + fade)
   *  instead of rendering the static `placeholder`. */
  placeholders?: string[];
  /** Fired when the user taps the SearchBar (default state) — open the
   *  SearchTopSheet from the caller. */
  onSearchPress?: () => void;
  onMessagePress?: () => void;
  onBellPress?: () => void;
  /** 'home' — tap handler for the get-help (headset) icon beside the bell. */
  onHelpPress?: () => void;
  /** 'offers' — tap handler for one of the five category circles. */
  onOfferCategoryPress?: (label: string, index: number) => void;

  style?: StyleProp<ViewStyle>;
}

// ----------------------------------------------------------------------------
// Layout constants — component-spec; not in spacing scale.
// ----------------------------------------------------------------------------
const CONTAINER_W = sizing.containerMobile; // 360
const CONTAINER_H = 242;
const CARD_W = CONTAINER_W - spacing[16] * 2; // 328
const CARD_H = 162;
const AVATAR_OUTER = 76;

// Avatar absolute position inside the container:
//   - vertical: avatar should overlap the top of the card, nudged 10 px
//     further down than the geometric "half-overlap" position. Lands at
//     top = 42 (was 32) so the ring sits a touch deeper into the card.
//   - horizontal: centred over the card → left = (360 - 76) / 2 = 142.
const AVATAR_TOP = 42;
const AVATAR_LEFT = (CONTAINER_W - AVATAR_OUTER) / 2;

// ----------------------------------------------------------------------------
// Main switch — keeps the door open for future variants.
// ----------------------------------------------------------------------------
export function Masthead(props: MastheadProps) {
  switch (props.variant) {
    case 'profile':
      return <ProfileMasthead {...props} />;
    case 'earnings':
      return <EarningsMasthead {...props} />;
    case 'payment':
      return <PaymentMasthead {...props} />;
    case 'cashback-status':
      return <CashbackStatusMasthead {...props} />;
    case 'home':
      return <HomeMasthead {...props} />;
    case 'offers':
      return <OffersMasthead {...props} />;
  }
}

// ----------------------------------------------------------------------------
// Avatar — 76 ring + 64 saffron circle (or image)
// ----------------------------------------------------------------------------
function ProfileAvatar({
  initial,
  image,
}: {
  initial: string;
  image?: ImageSourcePropType;
}) {
  return (
    // Outer absolute row spans the full masthead width and centres
    // its child avatar via alignItems — works on any screen width.
    // Previously this used `left: AVATAR_LEFT` (a fixed (360 − 76)/2
    // = 142) which only centred on a 360-wide canvas.
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: AVATAR_TOP,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: AVATAR_OUTER,
          height: AVATAR_OUTER,
          borderRadius: radius.full,
          backgroundColor: colors.surface.sunken,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
      <View
        style={[
          {
            width: avatarSize[64],
            height: avatarSize[64],
            borderRadius: radius.full,
            backgroundColor: colors.action.primary.default,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          elevation.brand.md,
        ]}
      >
        {image ? (
          <Image
            source={image}
            style={{
              width: avatarSize[64],
              height: avatarSize[64],
              borderRadius: radius.full,
            }}
            resizeMode="cover"
          />
        ) : (
          <Text variant="heading28Bold" color={colors.text.inverse}>
            {initial}
          </Text>
        )}
      </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Profile variant
// ----------------------------------------------------------------------------
function ProfileMasthead({
  name = 'Manikandan',
  contact = 'maan@gmail.com · 8324',
  avatarInitial = 'M',
  avatarImage,
  onEditProfile,
  style,
}: MastheadProps) {
  return (
    <View
      style={[
        {
          // Fluid width — was a fixed 360 (CONTAINER_W) which left
          // whitespace on iPhones wider than 360 and didn't centre on
          // the screen. '100%' lets the masthead fill its parent
          // (the screen) edge-to-edge while the 16-px paddingHorizontal
          // below produces the spec'd 16-px gutter on each side of
          // the inner card.
          width: '100%',
          // minHeight (not height): with larger OS text the card grows
          // instead of pushing the Edit Profile button out of it.
          minHeight: CONTAINER_H,
          paddingTop: spacing[80],
          paddingHorizontal: spacing[16],
          paddingBottom: 0,
          gap: spacing[10],
        },
        style,
      ]}
    >
      {/* Card — fluid too, stretches to fill the padded inner area
          (= parent width − 16-pad × 2). */}
      <View
        style={[
          {
            width: '100%',
            minHeight: CARD_H,
            borderRadius: radius.xl,
            // overflow stays visible so the elevation shadow can paint
            // outside the card bounds. The ImageBackground itself
            // already rounds its image to radius.xl via `imageStyle`,
            // so clipping isn't needed on the wrapper.
            backgroundColor: colors.surface.default,
          },
          elevation.light.xs,
        ]}
      >
        <ImageBackground
          source={images.backgrounds.medium}
          resizeMode="cover"
          style={{
            flex: 1,
            paddingTop: spacing[48],
            paddingHorizontal: spacing[16],
            paddingBottom: spacing[12],
            gap: spacing[4],
            alignItems: 'center',
          }}
          imageStyle={{ borderRadius: radius.xl }}
        >
          <Text variant="heading22Bold" color={colors.text.primary}>
            {name}
          </Text>
          <Text
            variant="body12Regular"
            color={colors.text.secondary}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {contact}
          </Text>
          <View
            style={{
              marginTop: spacing[12],
              flexDirection: 'row',
            }}
          >
            <Button
              label="Edit Profile"
              variant="solid"
              tone="second"
              size={36}
              icon="leading"
              iconName="edit-filled"
              onPress={onEditProfile}
            />
          </View>
        </ImageBackground>
      </View>

      {/* Avatar — overlaps the top of the card */}
      <ProfileAvatar initial={avatarInitial} image={avatarImage} />
    </View>
  );
}

// ----------------------------------------------------------------------------
// 'earnings' variant — Figma node 4743:24142
// ----------------------------------------------------------------------------
//
// Container 360 × 202, vertical, gap spacing[10], padH spacing[16]
// Card 328 × 202 (fills container vertically), padTop 16 / padH 16 /
//      padBottom 24, gap spacing[4], radius.xl, elevation.light.xs,
//      image-fill bg images.backgrounds.darkblue (dark hero backdrop).
// Children:
//   1. InfoCircleGlyph — 18px, colors.text.inverse
//   2. Earnings block (vertical, gap spacing[16]):
//      - Headline display36ExtraBold (text.inverse)
//      - Subtext  body12Regular     (text.inverse)
//      - Stat row (horizontal, gap spacing[12]) — 2× <StatCard>
//        StatCard: 132 × 64, radius.lg (12), borderWidth.hairline (0.5),
//                  border.accent (#4670f6), transparent bg, padding 12,
//                  vertical gap 4. Label body12Regular + value+chevron
//                  row (body14SemiBold + 16px ChevronRight glyph).
// ----------------------------------------------------------------------------

const EARN_CARD_W = CARD_W; // 328
const EARN_CARD_H = 202;
// Stat cards now flex to fill the row (even gutters) — only the height is fixed.
const STAT_H = 64;

// Info-circle glyph — 18-px outline + i-bar. No info SVG ships in
// src/assets/icons, so it's drawn inline. Stroke colour tracks the
// caller's `color` so it tints with the surrounding text.
function InfoCircleGlyph({
  size = 18,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Circle
        cx={9}
        cy={9}
        r={7.5}
        stroke={color}
        strokeWidth={borderWidth.thick}
      />
      <Path
        d="M9 8v5"
        stroke={color}
        strokeWidth={borderWidth.heavy}
        strokeLinecap="round"
      />
      <Circle cx={9} cy={5.5} r={1} fill={color} />
    </Svg>
  );
}

// Chevron-right glyph — 16-px caret. There's no chevron-right SVG in
// src/assets/icons, so it's drawn inline.
function ChevronRightGlyph({ color }: { color: string }) {
  const s = iconSize[16];
  return (
    <Svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <Path
        d="M6 4l4 4-4 4"
        stroke={color}
        strokeWidth={borderWidth.heavy}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EarningsStatCard({
  label,
  value,
  loading = false,
  onPress,
}: {
  label: string;
  value: string;
  loading?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      style={({ pressed }) => ({
        // Fill an equal share of the row so the two cards span the masthead
        // with even gutters (16 px from the card edges via the masthead
        // padding, 12 px between) instead of a fixed 132-wide centred pair.
        flex: 1,
        height: STAT_H,
        borderRadius: radius.lg,
        borderWidth: borderWidth.hairline,
        borderColor: colors.border.accent,
        backgroundColor: 'transparent',
        padding: spacing[12],
        gap: spacing[4],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text variant="body12Regular" color={colors.text.inverse}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {loading ? (
          // body14SemiBold line ≈ 20px; light bar over the dark card.
          <AmountSkeleton width={56} height={16} tone="onDark" />
        ) : (
          <Text variant="body14SemiBold" color={colors.text.inverse}>
            {value}
          </Text>
        )}
        <ChevronRightGlyph color={colors.text.inverse} />
      </View>
    </Pressable>
  );
}

function EarningsMasthead({
  totalEarnings = '₹1,500',
  subtitle = 'Your All Time Earnings',
  cashbackValue = '₹1500.0',
  rewardsValue = '₹0',
  loading = false,
  rollToken,
  onInfoPress,
  onCashbackPress,
  onRewardsPress,
  style,
}: MastheadProps) {
  // Tapping the info circle toggles a tooltip explaining the total-earnings
  // figure (Figma 5820:27081).
  const [tooltipVisible, setTooltipVisible] = useState(false);
  // The tooltip had no way to close except re-tapping the small icon. It now
  // closes on tap and on its own after a few seconds.
  useEffect(() => {
    if (!tooltipVisible) return;
    const t = setTimeout(() => setTooltipVisible(false), EARNINGS_TOOLTIP_MS);
    return () => clearTimeout(t);
  }, [tooltipVisible]);

  return (
    <View
      style={[
        {
          // Fluid width — was a fixed 360 (CONTAINER_W) which conflicted
          // with screen-level horizontal padding (the masthead would
          // overflow inside a 32-px-padded ScrollView on a 360-wide
          // canvas) and left whitespace on iPhones wider than 360.
          width: '100%',
          height: EARN_CARD_H,
          paddingHorizontal: spacing[16],
          gap: spacing[10],
        },
        style,
      ]}
    >
      <View
        style={[
          {
            // Inner card stretches to fill the padded inner area
            // (= parent width − 16-pad × 2). Was a fixed 328.
            width: '100%',
            height: EARN_CARD_H,
            borderRadius: radius.xl,
            backgroundColor: colors.surface.default,
          },
          elevation.light.xs,
        ]}
      >
        <ImageBackground
          source={images.backgrounds.darkblue}
          resizeMode="cover"
          style={{
            flex: 1,
            paddingTop: spacing[16],
            paddingHorizontal: spacing[16],
            paddingBottom: spacing[24],
            gap: spacing[4],
          }}
          imageStyle={{ borderRadius: radius.xl }}
        >
          {/* 1. Info circle — right-aligned (16px from right via the
              ImageBackground's paddingHorizontal). Tapping toggles the
              total-earnings tooltip (Figma 5820:27081), which hangs below
              the icon with its caret pointing up at it. */}
          <View style={{ alignSelf: 'flex-end', zIndex: 10 }}>
            <Pressable
              onPress={() => {
                setTooltipVisible((v) => !v);
                onInfoPress?.();
              }}
              hitSlop={spacing[8]}
              accessibilityRole="button"
              accessibilityLabel="Earnings info"
            >
              <InfoCircleGlyph color={colors.text.inverse} />
            </Pressable>

            {tooltipVisible ? (
              <Pressable
                onPress={() => setTooltipVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close earnings info"
                style={{
                  position: 'absolute',
                  // Just below the 18-px icon; the caret points up at it.
                  top: 18 + spacing[4],
                  right: 0,
                  zIndex: 20,
                }}
              >
                <Tooltip
                  theme="dark"
                  position="bottom"
                  size="sm"
                  arrowAlign="end"
                  // Figma 5820:27081 tooltip is 247 wide (220 left one
                  // letter of the subtitle peeking out beside it).
                  maxWidth={EARNINGS_TOOLTIP_W}
                  title="This is the total Earnings accumulated from the beginning until now."
                  style={{ alignSelf: 'flex-end' }}
                />
              </Pressable>
            ) : null}
          </View>

          {/* 2. Earnings block — content centred to the card */}
          <View style={{ gap: spacing[16], alignItems: 'center' }}>
            <View style={{ gap: spacing[4], alignItems: 'center' }}>
              {loading ? (
                // display36ExtraBold line ≈ 48px; a wide light bar stands
                // in for the headline total. marginVertical centres it in
                // the taller text box so the block doesn't jump on load.
                <AmountSkeleton
                  width={148}
                  height={36}
                  tone="onDark"
                  style={{ marginVertical: spacing[6] }}
                />
              ) : (
                // Slot-machine reveal — each digit reel spins and settles
                // on the real All Time Earnings figure once it has loaded.
                <RollingAmount
                  value={totalEarnings}
                  variant="display36ExtraBold"
                  color={colors.text.inverse}
                  playToken={rollToken}
                />
              )}
              <Text
                variant="body12Regular"
                color={colors.text.inverse}
                align="center"
              >
                {subtitle}
              </Text>
            </View>

            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                gap: spacing[12],
              }}
            >
              <EarningsStatCard
                label="Cashback"
                value={cashbackValue}
                loading={loading}
                onPress={onCashbackPress}
              />
              <EarningsStatCard
                label="Rewards"
                value={rewardsValue}
                loading={loading}
                onPress={onRewardsPress}
              />
            </View>
          </View>
        </ImageBackground>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 'payment' variant — Figma node 3236:10672
// ----------------------------------------------------------------------------
//
// Container 360 × 120, vertical, gap spacing[10], padH spacing[16],
//           items start (default), height hugs content.
// Card 328 × 120 (fills container width), padTop 0 / padH 16 /
//      padBottom 12, gap spacing[4], radius.xl, image-fill bg
//      images.backgrounds.small (light payment backdrop),
//      elevation.light.xs. justifyContent CENTER + alignItems CENTER
//      so all content sits on the card's vertical + horizontal middle.
// Children:
//   1. Info row — width 100%, justifyContent flex-end, alignItems
//      center. Holds the info-circle glyph (18) tinted text.primary,
//      pinned to the right.
//   2. Headline display36Bold, text.primary, textAlign center.
//   3. Subtext  body12Regular, text.secondary, textAlign center.
// Text is DARK (text.primary / text.secondary), unlike the white
// earnings variant.
// ----------------------------------------------------------------------------

const PAY_CARD_H = 120;

function PaymentMasthead({
  amount = '₹1,500',
  subtitle = 'Cashback Available For Payment',
  onInfoPress,
  style,
}: MastheadProps) {
  return (
    <View
      style={[
        {
          // Fluid width — was a fixed 360 (CONTAINER_W) which left
          // whitespace on iPhones wider than 360 and didn't centre
          // inside a screen wrapper. '100%' lets the masthead fill
          // its parent edge-to-edge while the 16-px paddingHorizontal
          // below produces the spec'd 16-px gutter on each side of
          // the inner card.
          width: '100%',
          paddingHorizontal: spacing[16],
          gap: spacing[10],
        },
        style,
      ]}
    >
      <View
        style={[
          {
            // Inner card stretches to fill the padded inner area
            // (= parent width − 16-pad × 2). Was a fixed 328.
            width: '100%',
            height: PAY_CARD_H,
            borderRadius: radius.xl,
            backgroundColor: colors.surface.default,
          },
          elevation.light.xs,
        ]}
      >
        <ImageBackground
          source={images.backgrounds.small}
          resizeMode="cover"
          style={{
            flex: 1,
            paddingTop: 0,
            paddingHorizontal: spacing[16],
            paddingBottom: spacing[12],
            gap: spacing[4],
            justifyContent: 'center',
            alignItems: 'center',
          }}
          imageStyle={{ borderRadius: radius.xl }}
        >
          {/* 1. Info-circle row — pinned right. Only rendered when a tap
              handler is supplied; the withdraw flow passes none, so the
              non-functional "i" is dropped there. */}
          {onInfoPress ? (
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <Pressable
                onPress={onInfoPress}
                hitSlop={spacing[8]}
                accessibilityRole="button"
                accessibilityLabel="Payment info"
              >
                <InfoCircleGlyph color={colors.text.primary} />
              </Pressable>
            </View>
          ) : null}

          {/* 2. Headline */}
          <Text
            variant="display36Bold"
            color={colors.text.primary}
            align="center"
          >
            {amount}
          </Text>

          {/* 3. Subtext */}
          <Text
            variant="body12Regular"
            color={colors.text.secondary}
            align="center"
          >
            {subtitle}
          </Text>
        </ImageBackground>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 'cashback-status' variant — Figma node 3983:42533 (+ instance 3919:39696)
// ----------------------------------------------------------------------------
//
// FIGMA RECONCILE (2026-06-03, live read of P7UcoZYBnfyefmJIA8wcM7):
//   ✅ CONFIRMED  layout: outer 360×240 white; inner fills, vertical,
//                 gap spacing[14], padY spacing[24], alignItems CENTER.
//   ✅ CONFIRMED  pending bg wash = Amber/50 #fff8e1 (= warning.subtle).
//                 get_variable_defs returned {"Amber/50":"#fff8e1"}.
//   ✅ CONFIRMED  amount default "₹1900.9"; sub-copy "Expected by
//                 October 15, 2025"; badge "Cashback Pending"; brand
//                 logo default = Amazon (component default; the live
//                 instance just overrides it to TATA 1mg).
//   ✏️ FIXED      per-status bg washes. Figma ONLY ships the Pending
//                 masthead frame — there are NO cancelled/confirmed/
//                 paid masthead states in the design, so the washes are
//                 derived to match each state's CashbackStatus BADGE
//                 tone family. Realigned paid (was success/fern → now
//                 info/cobalt) and delayed (was warning/amber → now
//                 cashback/saffron) to their badge colours.
//   🚩 FLAG       requested (violet) + expired (slate) have no matching
//                 feedback.subtle token → fall back to amber wash.
//
// Content group (vertical, gap spacing[24] — closest to Figma's 26),
// alignItems center):
//   • <BrandLogo source={brandLogo} />   ← REUSED molecule
//   • Amount + status (vertical, gap spacing[8], alignItems center):
//       headline display32SemiBold, text.primary, align center
//       <StatusBadge status size='default' rounded={false} />
//                                                  ← REUSED atom
//
// Footer text body14SemiBold, text.primary, align center.
// ----------------------------------------------------------------------------

const CASHBACK_STATUS_H = 240;

// Background wash per status (the inner block tint). Figma only ships the
// PENDING masthead frame (node 3983:42533 → amber/50 #fff8e1); the other
// states have no masthead background in the design. The per-status washes
// below are therefore derived to match each state's CashbackStatus BADGE
// tone family (Figma badge variants in node 3983:42533, mirrored 1:1 by
// colors.status[*]), so the wash and badge always read as the same colour:
//   pending  → amber  → warning.subtle (Amber/50  #fff8e1)  [Figma-confirmed]
//   delayed  → saffron→ cashback.subtle (Saffron/50)        [badge = saffron/200]
//   cancelled→ ruby   → error.subtle   (Ruby/50   #fef1f1)  [badge = ruby/100]
//   confirmed→ fern   → success.subtle (Fern/50   #edfbf8)  [badge = fern/100]
//   paid     → cobalt → info.subtle    (Cobalt/50)          [badge = cobalt/100]
// requested (violet) + expired (slate) have no matching feedback.subtle
// token and aren't used by orders/detail → default to the amber wash. FLAG.
const CASHBACK_STATUS_BG: Record<StatusBadgeStatus, string> = {
  pending: colors.feedback.warning.subtle,
  delayed: colors.cashback.subtle,
  cancelled: colors.feedback.error.subtle,
  confirmed: colors.feedback.success.subtle,
  paid: colors.feedback.info.subtle,
  requested: colors.feedback.warning.subtle,
  expired: colors.feedback.warning.subtle,
};

function CashbackStatusMasthead({
  amount = '₹1900.9',
  brandLogo = images.stores.amazon2,
  statusLabel,
  expectedText = 'Expected by October 15, 2025',
  tone = 'pending',
  style,
}: MastheadProps) {
  const status = tone ?? 'pending';
  return (
    <View
      style={[
        {
          // FILL the available width — was a fixed 360 (CONTAINER_W), which
          // on wider devices (iPhone 13+ are 375–430pt) rendered narrow and
          // left-aligned, leaving a gap on the right. '100%' matches the
          // other variants and the order-summary rows below it.
          width: '100%',
          height: CASHBACK_STATUS_H,
          backgroundColor: colors.surface.default,
        },
        style,
      ]}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: CASHBACK_STATUS_BG[status],
          paddingVertical: spacing[24],
          gap: spacing[14],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Content group — BrandLogo + (amount + status) */}
        <View style={{ gap: spacing[24], alignItems: 'center' }}>
          <BrandLogo source={brandLogo} accessibilityLabel="Partner logo" />

          <View style={{ gap: spacing[8], alignItems: 'center' }}>
            <Text
              variant="display32SemiBold"
              color={colors.text.primary}
              align="center"
            >
              {amount}
            </Text>
            <StatusBadge
              status={status}
              size="default"
              rounded={false}
              label={statusLabel}
            />
          </View>
        </View>

        {/* Footer */}
        <Text
          variant="body14SemiBold"
          color={colors.text.primary}
          align="center"
        >
          {expectedText}
        </Text>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 'home' variant — Figma node 2835:194722
// ----------------------------------------------------------------------------
//
// 360 × 408 hero masthead for the Home page. The background fills the
// entire container behind everything; on top sits a vertical column
// of two REUSED components:
//
//   - <HomeHeader scrolled={false} ... />   ← organism (this file's sibling)
//                                              white logo + white icons.
//   - <SearchBar state="default" ... />     ← molecule
//                                              tappable, fires `onSearchPress`
//                                              so the caller can open the
//                                              SearchTopSheet (no typing here).
//
// The background is a slot: pass any React node via `background`. When
// undefined, the masthead falls back to <ImageBackground source=
// images.backgrounds.home> so it always has a backdrop. Caller can
// drop an animation, video, or anything in its place later.
// ----------------------------------------------------------------------------

const HOME_MASTHEAD_H = 408;
// Earnings info tooltip width — Figma 5820:27081 (component spec).
const EARNINGS_TOOLTIP_W = 247;
// Auto-dismiss delay for the earnings info tooltip.
const EARNINGS_TOOLTIP_MS = 4000;

function HomeMasthead({
  background,
  notificationCount = 1,
  placeholder = 'Search by card name',
  // Default ticker on the Home masthead — cycles between card-name and
  // bank-name framing so the SearchBar nudges users toward both lookup
  // paths. Caller can override with their own list.
  placeholders = ['Search by card name', 'Search by bank name'],
  onSearchPress,
  onMessagePress,
  onBellPress,
  onHelpPress,
  style,
}: MastheadProps) {
  // Safe-area top inset — used as paddingTop on the content layer so
  // the HomeHeader sits below the iOS notch / Android status bar.
  // The background extends UP into this buffer (Figma left headroom
  // in the backdrop for this), so the status bar reads as part of the
  // hero image. Container height grows by the inset so the existing
  // 408 area below the buffer keeps its proportions.
  const insets = useSafeAreaInsets();

  const backgroundNode =
    background ?? (
      <ImageBackground
        source={images.backgrounds.home}
        resizeMode="cover"
        style={{ flex: 1 }}
      />
    );

  return (
    <View
      style={[
        {
          // FILL the available width — was a fixed 360 (CONTAINER_W),
          // which left whitespace on the right on any device wider than
          // 360 (iPhone 13+ are 375–430). '100%' lets the masthead
          // stretch edge-to-edge in HomeScreen's ScrollView.
          width: '100%',
          height: HOME_MASTHEAD_H + insets.top,
          overflow: 'hidden',
          // Bottom corners curve back into the screen — matches the
          // SearchTopSheet's bottom corner radius for visual consistency
          // across the two top-of-screen surfaces. radius['2xl'] is the
          // closest token to your 20-px request.
          borderBottomLeftRadius: radius['2xl'],
          borderBottomRightRadius: radius['2xl'],
        },
        style,
      ]}
    >
      {/* Background slot — fills the entire container (incl. the
          safe-area buffer) behind everything */}
      <View style={StyleSheetAbsoluteFill}>{backgroundNode}</View>

      {/* Content stack — the masthead itself is edge-to-edge (no
          horizontal padding). HomeHeader carries its own padH (16)
          internally. The SearchBar is pinned to the BOTTOM with
          spacing[20] gap from the masthead's bottom edge and its
          own 16-px horizontal gutter so it lands 328 wide. */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          justifyContent: 'space-between',
        }}
      >
        <HomeHeader
          scrolled={false}
          notificationCount={notificationCount}
          onMessagePress={onMessagePress}
          onBellPress={onBellPress}
          onHelpPress={onHelpPress}
        />
        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingBottom: spacing[20],
          }}
        >
          <SearchBar
            state="default"
            placeholder={placeholder}
            placeholders={placeholders}
            onFocus={onSearchPress}
          />
        </View>
      </View>
    </View>
  );
}

// Inline absolute-fill — keeps the import surface narrow. Same as
// StyleSheet.absoluteFillObject but typed for our local style arrays.
const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// ----------------------------------------------------------------------------
// 'offers' variant — Figma node 4881:49296
// ----------------------------------------------------------------------------
//
// Saffron-bg hero used at the top of the Offers screen. Two stacks:
//   1. Search row — REUSES the existing SearchBar (state='default',
//      placeholder='Search'). Tapping fires onSearchPress so the
//      caller can open the same SearchTopSheet the home masthead does.
//   2. Category strip — 112-tall row of 5 circular category items
//      pulled from images.categories.*, with a 4-px white base bar
//      and a placeholder slot for the 102×104 decorative graphic
//      (the asset isn't in src/assets/images yet — flagged below).
//
// Per-position label styling (per spec):
//   item 1  "New on CashKaro"    caption10SemiBold colors.text.primary
//   items 2-5                    caption10Medium   colors.text.inverse
//                                circle bg colors.surface.default
//
// Token mapping is exhaustive — no inline hex, all values via tokens.
// ----------------------------------------------------------------------------

const OFFER_STRIP_H = 112;
// White indicator capsule — 102 wide × 104 tall, rendered via the
// registered `category-selector-bg` SVG. Anchored to the strip's
// bottom (bleeds into the 4-px base bar) and slid horizontally via
// reanimated's withTiming as the active category changes.
const OFFER_DECO_W = 102;
const OFFER_DECO_H = 104;
const OFFER_DECO_TOP = 5;
const OFFER_CATEGORY_W = 64;
const OFFER_CATEGORY_CIRCLE = mediaSize[56]; // 56
const OFFER_BASE_BAR_H = 4;
const OFFER_ROW_TOP_OFFSET = 7;
// Label width — the 64-px item plus 4 px into each 12-px gap (72). At 56
// (the circle's width) single words like "Electronics" split mid-word
// ("Electroni / cs") and the second line fell onto the white body below,
// white on white. Neighbouring labels still keep a 4-px gap.
const OFFER_LABEL_SAFE_W = OFFER_CATEGORY_W + spacing[8]; // 72
// Slide duration for the indicator + smooth in/out cubic easing.
const OFFER_INDICATOR_ANIM_MS = 300;
// Row top inset — pushes the items down so the circle + label stack
// sits vertically centred WITHIN the indicator's visible footprint.
// The indicator (height 104) is bottom-anchored, so it occupies the
// strip from y=8 → y=112. Items ~88 tall → top padding 16 centres
// them at y=60 (= indicator centre). Tokenised via spacing[16].
const OFFER_ROW_TOP_INSET = spacing[16];

interface OfferCategoryEntry {
  label: string;
  image: ImageSourcePropType;
  /** Prominent colour of the category (decorative, per-category content —
   *  not a design token). Drives the subtle thematic tint at the top of the
   *  Offers screen when this category is selected. Category 0 uses saffron so
   *  the default state shows no shift. */
  accent: string;
}

// All 15 entries from images.categories so the strip scrolls
// horizontally and the user can explore the full set. Override via
// the future `offerCategories` prop if a screen wants a custom slice.
// Exported so the Offers search overlay can list categories as search
// results (tapping one jumps to that category tab — same index space).
export const OFFER_CATEGORIES: OfferCategoryEntry[] = [
  { label: 'New on CashKaro',   image: images.categories.newOnCashkaro,     accent: '#ff6d1d' },
  { label: 'Fashion',           image: images.categories.fashion,           accent: '#e05a86' },
  { label: 'Food & Grocery',    image: images.categories.foodAndGrocery,    accent: '#46a85a' },
  { label: 'Health & Wellness', image: images.categories.healthAndWellness, accent: '#2ba39a' },
  { label: 'Flights & Travel',  image: images.categories.flightsAndTravel,  accent: '#3f8de0' },
  { label: 'Electronics',       image: images.categories.electronics,       accent: '#5b6be0' },
  { label: 'Home & Kitchen',    image: images.categories.homeAndKitchen,    accent: '#d9883f' },
  { label: 'Beauty & Grooming', image: images.categories.beautyAndGrooming, accent: '#bd5ad9' },
  { label: 'Pharmacy',          image: images.categories.pharmacy,          accent: '#1f9e78' },
  { label: 'Departmental',      image: images.categories.departmental,      accent: '#ec7a3f' },
  { label: 'Mobile',            image: images.categories.mobile,            accent: '#3aa9cf' },
  { label: 'Hosting',           image: images.categories.hosting,           accent: '#7a5ae0' },
  { label: 'Education',         image: images.categories.education,         accent: '#357fdf' },
  { label: 'Banking',           image: images.categories.banking,           accent: '#315fa8' },
  { label: 'Loans',             image: images.categories.loans,             accent: '#4caf6a' },
];

/** Per-category prominent colours — for the Offers screen's thematic top
 *  tint. Index matches the category index from onOfferCategoryPress. */
export const OFFER_CATEGORY_ACCENTS: string[] = OFFER_CATEGORIES.map(
  (c) => c.accent
);

function OffersMasthead({
  onSearchPress,
  onOfferCategoryPress,
  placeholder = 'Search',
  style,
}: MastheadProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: colors.action.primary.default,
          paddingTop: spacing[40],
          alignItems: 'flex-start',
        },
        style,
      ]}
    >
      {/* Search row — REUSES SearchBar; layoutSizingHorizontal=FILL
          per Figma. The SearchBar fills the row's content width
          (parent_width − 32 from the 16-px paddingHorizontal). */}
      <View
        style={{
          width: '100%',
          paddingVertical: spacing[16],
          paddingHorizontal: spacing[16],
        }}
      >
        <SearchBar
          state="default"
          placeholder={placeholder}
          onFocus={onSearchPress}
          style={{ width: '100%' }}
        />
      </View>

      {/* Category strip — extracted so the Offers screen can reuse it
          as a sticky header (search bar scrolls away, strip pins to the
          top). Here it simply sits beneath the search row. */}
      <OffersCategoryStrip onOfferCategoryPress={onOfferCategoryPress} />
    </View>
  );
}

// ----------------------------------------------------------------------------
// OffersCategoryStrip — the saffron 5-up scrollable category strip with
// the sliding white indicator. Extracted from OffersMasthead so it can
// be reused on its own as a sticky scroll header in OffersScreen (the
// search bar scrolls off, this strip pins to the top). Owns its own
// active-category state + indicator animation.
// ----------------------------------------------------------------------------
export interface OffersCategoryStripProps {
  /** The category entries to render. Defaults to the static OFFER_CATEGORIES
   *  set; the Offers screen passes the live miniapp categories instead. */
  categories?: OfferCategoryEntry[];
  /** Tap handler for a category circle — (label, index). */
  onOfferCategoryPress?: (label: string, index: number) => void;
  /** Controlled active index. When provided (and changed externally — e.g.
   *  a category picked from the search overlay), the strip syncs its
   *  selection, slides the indicator, and scrolls that category into view.
   *  Omit for uncontrolled use (the strip tracks taps on its own). */
  selectedIndex?: number;
  /** Background tint — the selected category's accent. Animates between
   *  values so the strip re-themes with the rest of the header. Defaults to
   *  saffron (the brand base) when omitted. */
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function OffersCategoryStrip({
  categories = OFFER_CATEGORIES,
  onOfferCategoryPress,
  selectedIndex,
  tintColor,
  style,
}: OffersCategoryStripProps) {
  // Active-category state — drives both the white indicator's x-offset
  // and the per-item label colour/weight. Default active = item 0
  // ("New on CashKaro") per spec.
  const [activeIndex, setActiveIndex] = React.useState(0);
  // Strip height grows with the OS font size so a 2-line label always ends
  // on the orange strip: at 130 % the second line ran ~4 px onto the white
  // body below, where unselected (white) labels disappeared. 112 at 1×.
  const { fontScale } = useWindowDimensions();
  const stripH =
    OFFER_STRIP_H +
    Math.ceil(Math.max(0, fontScale - 1) * 2 * typography.caption10Medium.lineHeight);

  // Horizontal scroll ref — on selecting a category we advance the strip so
  // the categories to its right come into view (it doesn't scroll on its own).
  const scrollRef = React.useRef<ScrollView>(null);

  // Background tint — animates toward the selected category's accent so the
  // strip re-themes in sync with the header above it (saffron when omitted).
  const tintTarget = tintColor ?? colors.action.primary.default;
  const bgFrom = useSharedValue<string>(tintTarget);
  const bgTo = useSharedValue<string>(tintTarget);
  const bgT = useSharedValue(1);
  const prevTint = React.useRef<string>(tintTarget);
  React.useEffect(() => {
    if (prevTint.current === tintTarget) return;
    bgFrom.value = prevTint.current;
    bgTo.value = tintTarget;
    bgT.value = 0;
    bgT.value = withTiming(1, {
      duration: 450,
      easing: Easing.inOut(Easing.cubic),
    });
    prevTint.current = tintTarget;
  }, [tintTarget, bgFrom, bgTo, bgT]);
  const bgAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgT.value,
      [0, 1],
      [bgFrom.value, bgTo.value]
    ),
  }));

  // x-offset for the indicator centred on the active category item.
  //   row padding-left = spacing[16] (16)
  //   item width        = OFFER_CATEGORY_W (64)
  //   gap between items = spacing[12] (12)
  //   active item's left edge in strip:  16 + i * (64 + 12)
  //   active item's centre x:            16 + i * 76 + 32
  //   indicator left (centred on item):  centre − OFFER_DECO_W / 2
  //   + INDICATOR_X_NUDGE: tuning offset because the SVG capsule's
  //   visual centre sits right of its bounding-box centre (the flared
  //   head leans right within the 102-wide viewBox), so a strict
  //   centre-of-box calc reads as "patch shifted right of the tile".
  //   Pulling left by spacing[10] re-aligns the indicator's perceived
  //   centre with the tile's centre.
  const itemStride = OFFER_CATEGORY_W + spacing[12];

  // Controlled selection — sync an externally-chosen category (e.g. tapped in
  // the search overlay) into the strip: move the highlight + slide it into
  // view. Guarded so a value that already matches (the strip's own tap fed
  // back through the prop) is a no-op.
  React.useEffect(() => {
    if (selectedIndex == null || selectedIndex === activeIndex) return;
    setActiveIndex(selectedIndex);
    scrollRef.current?.scrollTo({
      x: Math.max(0, (selectedIndex - 1) * itemStride),
      animated: true,
    });
  }, [selectedIndex, activeIndex, itemStride]);

  const INDICATOR_X_NUDGE = -spacing[10];
  const computeIndicatorLeft = (index: number) =>
    spacing[16] +
    index * itemStride +
    OFFER_CATEGORY_W / 2 -
    OFFER_DECO_W / 2 +
    INDICATOR_X_NUDGE;
  const indicatorLeft = computeIndicatorLeft(activeIndex);

  // Reanimated shared value drives the indicator's `left`. Spring-ish
  // ease-in-out cubic feels smooth without overshoot. First mount
  // skips the tween (initialised at the right place) so the indicator
  // doesn't animate from x:0 on the first paint.
  const indicatorX = useSharedValue(indicatorLeft);
  React.useEffect(() => {
    indicatorX.value = withTiming(indicatorLeft, {
      duration: OFFER_INDICATOR_ANIM_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [indicatorLeft, indicatorX]);
  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    left: indicatorX.value,
  }));

  return (
    // Strip is self-contained: its tinted bg travels WITH it so when it's
    // pinned as a sticky header the band reads as one continuous surface with
    // the status-bar buffer above it. The bg animates to the selected
    // category's accent (saffron by default). `overflow: hidden` clips the
    // horizontal scroll content to the strip bounds.
    <Animated.View
      style={[
        {
          width: '100%',
          height: stripH,
          overflow: 'hidden',
        },
        bgAnimStyle,
        style,
      ]}
    >
        {/* 4-px white base bar — full-width, sticky behind the scroll */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: OFFER_BASE_BAR_H,
            backgroundColor: colors.background.default,
          }}
        />

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[16] }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: spacing[12],
              alignItems: 'flex-start',
              // Force the scroll content to fill the full strip height
              // so the indicator (bottom: 0) anchors to the same bottom
              // edge as the 4-px white bar — they read as one
              // continuous shape.
              height: stripH,
              // Push items down so they're vertically centred inside
              // the indicator's footprint (was 7 px, items hugged the
              // top of the strip while the indicator sat lower, making
              // the two feel detached).
              paddingTop: OFFER_ROW_TOP_INSET,
            }}
          >
            {/* Active-category indicator — REUSED Icon atom, capsule
                SVG `category-selector-bg`. Inside the scroll content
                so it tracks the items as the user scrolls. left
                animates via reanimated (300 ms ease-in-out cubic). */}
            {/* Only when there ARE categories: with an empty list (loading
                or a failed fetch) the lone white capsule rendered as an odd
                blank shape under the search bar. */}
            {categories.length > 0 ? (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    bottom: 0,
                    width: OFFER_DECO_W,
                    height: OFFER_DECO_H,
                  },
                  indicatorAnimatedStyle,
                ]}
                pointerEvents="none"
              >
                <Icon
                  name="category-selector-bg"
                  size={OFFER_DECO_W}
                  color={colors.background.default}
                />
              </Animated.View>
            ) : null}

            {categories.map((cat, i) => (
              <OfferCategoryItem
                key={cat.label}
                entry={cat}
                selected={i === activeIndex}
                onPress={() => {
                  setActiveIndex(i);
                  // Advance the strip so the selected category leads and the
                  // categories to its right come into view. One item of lead
                  // is kept on the left for context; clamped at the start.
                  scrollRef.current?.scrollTo({
                    x: Math.max(0, (i - 1) * itemStride),
                    animated: true,
                  });
                  onOfferCategoryPress?.(cat.label, i);
                }}
              />
            ))}
          </View>
        </ScrollView>
    </Animated.View>
  );
}

function OfferCategoryItem({
  entry,
  selected,
  onPress,
}: {
  entry: OfferCategoryEntry;
  selected: boolean;
  onPress?: () => void;
}) {
  // Selected item reads against the white indicator: dark SemiBold
  // label. Unselected items sit on the saffron bg + same white
  // circle behind their image, softer Medium label in white.
  //
  // Note on the circle bg: ALL items keep the white circle, regardless
  // of selected. Previously the selected item used a transparent
  // circle (letting the indicator's white show through), but the
  // 300-ms indicator slide made the circle "blink" between white →
  // transparent → white on every selection. Keeping the circle
  // permanently white smooths the transition — the indicator simply
  // glides BEHIND the (always-white) circles without any colour
  // flicker on the circle itself.
  const labelVariant = selected ? 'caption10SemiBold' : 'caption10Medium';
  const labelColor = selected ? colors.text.primary : colors.text.inverse;
  const circleBg = colors.surface.default;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={entry.label}
      style={{
        width: OFFER_CATEGORY_W,
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[4],
      }}
    >
      <View
        style={{
          width: OFFER_CATEGORY_CIRCLE,
          height: OFFER_CATEGORY_CIRCLE,
          borderRadius: radius.full,
          backgroundColor: circleBg,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={entry.image}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </View>
      {/* Label width pinned to the circle (56). Sits inside the 64-px
          item bounds so no overflow trick is needed; both Medium and
          SemiBold weights wrap to 2 lines uniformly and truncate
          beyond. */}
      <View
        style={{
          width: OFFER_LABEL_SAFE_W,
          marginHorizontal: (OFFER_CATEGORY_W - OFFER_LABEL_SAFE_W) / 2,
          alignItems: 'center',
        }}
      >
        <Text
          variant={labelVariant}
          color={labelColor}
          align="center"
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {entry.label}
        </Text>
      </View>
    </Pressable>
  );
}

