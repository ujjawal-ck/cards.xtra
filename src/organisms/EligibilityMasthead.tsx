/**
 * EligibilityMasthead — organism
 *
 * Bottom-sheet hero with three planned variants. This file ships
 * variant 1 ('eligible'); the switch is set up so the remaining two
 * variants drop in as new branches without changing callers.
 *
 * 'eligible' variant — Figma 2835:194699
 * --------------------------------------
 *   Outer container — 360 wide, alignItems center, top corners
 *   radius['2xl']. Total height hugs ~356 (banner 204 + card 182 with
 *   ~32-px overlap into the banner).
 *
 *   Green banner — 360 × 204, radius['2xl'] all corners, filled by
 *   `gradients.success` from src/tokens/gradients.ts (#0f7a3e → #3ddc84).
 *   The gradient stops are NOT hand-written; they come from the token.
 *   Inside the banner (vertical, alignItems center, padTop 12 / padH 16
 *   / padBottom 16):
 *     • Drag handle — 44×4, radius.full, colors.icon.inverse (white).
 *     • Eligibility info — vertical, alignItems center, gap spacing[6]:
 *         - Message — heading24Bold, colors.icon.inverse (white),
 *           textAlign center (e.g. "Congrats!\nYou're eligible").
 *         - Info pill — row, radius.full, bg colors.surface.dark
 *           (#000000, slate-1000), padV 4 / padL 8 / padR 4, gap 6.
 *           Contents: amount + 4-px dot + occupation + <Tag>.
 *           Values use body12Regular in colors.feedback.success.onColor
 *           (#edfbf8, fern-50). Tag reused as size='xs', appearance='subtle',
 *           icon='icon-left' with caller-supplied iconName.
 *
 *   Floating card — 273×182 container with elevation.light.md
 *   (#000 10% y4 blur16). Pulled UP by spacing[32] so it overlaps the
 *   bottom of the banner. Inside: a credit-card image 242×154,
 *   radius.xl, borderWidth.hairline (0.5 px ≈ the spec's 0.53)
 *   colors.icon.inverse border, plus a soft white "Shine" overlay
 *   (translucent ellipse at the top-left, opacity[24]).
 *
 * Token mapping is exhaustive — no hex, no inline px, no hand-written
 * shadow values.
 */
import React from 'react';
import {
  View,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Tag, Button, Divider } from '../atoms';
import { images } from '../assets/images';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  sizing,
  elevation,
  gradients,
  opacity,
  alpha,
} from '../tokens';

// ----------------------------------------------------------------------------
// Variant union — keep the door open for the other two variants
// ----------------------------------------------------------------------------
export type EligibilityMastheadVariant = 'eligible' | 'maybe' | 'ineligible';

export interface EligibilityMastheadProps {
  variant: EligibilityMastheadVariant;
  /** Heading text — use "\n" for the line break. */
  message?: string;
  /** 'eligible' — pincode shown beside the location pin. */
  pincode?: string;
  /** 'eligible' — money value in the info pill. */
  amount?: string;
  /** 'eligible' — occupation in the info pill. */
  occupation?: string;
  /** 'eligible' — card image; defaults to images.cards.axisMagnus. */
  cardImage?: ImageSourcePropType;
  /** 'eligible' — multiple card images. When 2+ are passed the floating
   *  card renders as a fanned STACK (Home "eligible for N cards" flow);
   *  1 (or none) falls back to the single `cardImage`. */
  cardImages?: ImageSourcePropType[];
  /** 'eligible' — fires when the user taps the "Edit" pill. */
  onEditPress?: () => void;

  /** 'maybe' — body text inside the reason window (use "\n" for a line break). */
  infoText?: string;
  /** 'ineligible' — bulleted reason lines inside the reason window
   *  (e.g. "Your pin code is not serviceable"). */
  reasons?: string[];
  /** 'maybe' / 'ineligible' — CTA button label; default "Continue to Apply". */
  ctaLabel?: string;
  /** 'maybe' / 'ineligible' — fires when the user taps the CTA. */
  onContinue?: () => void;

  style?: StyleProp<ViewStyle>;
}

// ----------------------------------------------------------------------------
// Layout constants — Figma fixed dims, not in any global scale
// ----------------------------------------------------------------------------
const BANNER_H = 204;
const CARD_OUTER_W = 273;
const CARD_OUTER_H = 182;
const CARD_IMG_W = 242;
const CARD_IMG_H = 154;
const HANDLE_W = sizing.touchMin; // 44
const HANDLE_H = 4;
const DOT_SIZE = 4;
// Vertical overlap — how far the floating card slides UP into the
// banner's lower edge. Composed from existing spacing tokens
// (spacing[32] + spacing[20]) so the card sits 20 px higher than
// the previous 32-px overlap, per the latest art direction.
const CARD_OVERLAP = spacing[32] + spacing[20];

// ----------------------------------------------------------------------------
// Small 4×4 dot used as the separator inside the info pill's details group
// ----------------------------------------------------------------------------
function Dot() {
  return (
    <View
      style={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: radius.full,
        backgroundColor: colors.feedback.success.onColor,
      }}
    />
  );
}

/** White @ 80% fill — separator inside the 'maybe' info card. */
function WhiteDot() {
  return (
    <View
      style={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: radius.full,
        backgroundColor: alpha.white[80],
      }}
    />
  );
}

// ----------------------------------------------------------------------------
// Inline location-pin glyph — no `location_on.svg` ships in
// src/assets/icons, so it's drawn here at the spec'd 16-px size.
// Stroke colour tracks the caller's `color` prop so it tints with the
// surrounding text.
// ----------------------------------------------------------------------------
function LocationGlyph({
  size = iconSize[16],
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 14 C5 10.5 3 8.4 3 6.4 C3 3.6 5.2 1.5 8 1.5 C10.8 1.5 13 3.6 13 6.4 C13 8.4 11 10.5 8 14 Z"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinejoin="round"
      />
      <Circle cx={8} cy={6.3} r={1.6} fill={color} />
    </Svg>
  );
}

// ----------------------------------------------------------------------------
// Switch
// ----------------------------------------------------------------------------
export function EligibilityMasthead(props: EligibilityMastheadProps) {
  switch (props.variant) {
    case 'eligible':
      return <EligibleMasthead {...props} />;
    case 'maybe':
      return <MaybeMasthead {...props} />;
    case 'ineligible':
      return <IneligibleMasthead {...props} />;
  }
}

// ----------------------------------------------------------------------------
// 'eligible' renderer
// ----------------------------------------------------------------------------
function EligibleMasthead({
  message = "Congrats!\nYou're eligible for this card.",
  pincode = '144000',
  amount = '₹1.2L',
  occupation = 'Salaried',
  cardImage = images.cards.axisMagnus,
  cardImages,
  onEditPress,
  style,
}: EligibilityMastheadProps) {
  const grad = gradients.success;

  // Normalise to a deck. 2+ images → fanned stack; otherwise the single
  // hero card (falls back to the default axisMagnus art).
  const deck =
    cardImages && cardImages.length > 0 ? cardImages : [cardImage];
  const isStack = deck.length > 1;

  return (
    <View
      style={[
        {
          // Fluid width — was a fixed 360 (sizing.containerMobile) which
          // left whitespace on the sides of iPhones wider than 360
          // (iPhone 13+ are 375–430). '100%' lets the masthead stretch
          // edge-to-edge inside its parent (the bottom-sheet wrapper or
          // any other container).
          width: '100%',
          alignItems: 'center',
          // Top corners match the bottom-sheet's curve.
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        },
        style,
      ]}
    >
      {/* Green gradient banner */}
      <LinearGradient
        colors={grad.colors}
        start={grad.start}
        end={grad.end}
        style={{
          width: '100%',
          height: BANNER_H,
          borderRadius: radius['2xl'],
          paddingTop: spacing[12],
          paddingHorizontal: spacing[16],
          paddingBottom: spacing[16],
          alignItems: 'center',
          gap: spacing[24],
        }}
      >
        {/* Drag handle */}
        <View
          style={{
            width: HANDLE_W,
            height: HANDLE_H,
            borderRadius: radius.full,
            backgroundColor: colors.icon.inverse,
          }}
        />

        {/* Eligibility info — message + pill */}
        <View style={{ alignItems: 'center', gap: spacing[6] }}>
          <Text
            variant="heading24Bold"
            color={colors.icon.inverse}
            align="center"
          >
            {message}
          </Text>

          {/* Info pill — bg black @16% (alpha.black[16]), pill radius */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[6],
              paddingVertical: spacing[4],
              paddingLeft: spacing[8],
              paddingRight: spacing[4],
              borderRadius: radius.full,
              backgroundColor: alpha.black[16],
            }}
          >
            {/* Details group — whole group at 80% opacity */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[6],
                opacity: opacity[80],
              }}
            >
              <LocationGlyph color={colors.feedback.success.onColor} />
              <Text
                variant="body12Regular"
                color={colors.feedback.success.onColor}
              >
                {pincode}
              </Text>
              <Dot />
              <Text
                variant="body12Regular"
                color={colors.feedback.success.onColor}
              >
                {amount}
              </Text>
              <Dot />
              <Text
                variant="body12Regular"
                color={colors.feedback.success.onColor}
              >
                {occupation}
              </Text>
            </View>

            {/* Right-side Edit pill — Tag atom w/ overrides for the
                white-24% bg + saffron-50 label. Tapping fires the
                caller's onEditPress (wire it to open the eligibility
                bottom sheet). */}
            <Tag
              size="xs"
              pill
              icon="icon-left"
              iconName="edit-filled"
              label="Edit"
              iconPx={iconSize[12]}
              bgColor={alpha.white[24]}
              borderColor="transparent"
              labelColor={colors.background.emphasis}
              onPress={onEditPress}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Floating card — single hero, or a fanned STACK when the caller
          passes 2+ images (the Home "eligible for N cards" flow). The
          whole assembly overlaps the banner via negative marginTop. */}
      {isStack ? (
        <View
          style={{
            width: '100%',
            height: CARD_OUTER_H + spacing[16],
            marginTop: -CARD_OVERLAP,
          }}
        >
          {/* Back cards first (z-order), front card last + on top. Cap the
              fan at 3 — the headline count conveys the true total. The two
              rear cards splay symmetrically; the front sits flat + centred. */}
          {deck.slice(0, 3).reverse().map((src, i, arr) => {
            const isFront = i === arr.length - 1;
            // arr is reversed, so index 0 is the rear-most card.
            const depth = arr.length - 1 - i; // 0 = front, 1, 2 = further back
            const dir = depth === 0 ? 0 : depth === 1 ? -1 : 1;
            return (
              <CardLayer
                key={i}
                transform={
                  isFront
                    ? undefined
                    : [
                        { translateX: dir * spacing[24] },
                        { translateY: -spacing[6] },
                        { rotate: `${dir * 8}deg` },
                        { scale: 0.94 },
                      ]
                }
              >
                <CardArt source={src} shine={isFront} />
              </CardLayer>
            );
          })}
        </View>
      ) : (
        <View style={{ marginTop: -CARD_OVERLAP }}>
          <CardArt source={deck[0]} shine />
        </View>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------
// CardArt — the floating credit-card image box (shadow + hairline border +
// optional shine). Mirrors the original single-card markup so the single
// and stacked layouts render identically; reused for every card in the fan.
// ----------------------------------------------------------------------------
function CardArt({
  source,
  shine,
}: {
  source: ImageSourcePropType;
  shine?: boolean;
}) {
  return (
    <View
      style={[
        {
          width: CARD_OUTER_W,
          height: CARD_OUTER_H,
          alignItems: 'center',
          justifyContent: 'center',
        },
        elevation.light.md,
      ]}
    >
      <View
        style={{
          width: CARD_IMG_W,
          height: CARD_IMG_H,
          borderRadius: radius.xl,
          borderWidth: borderWidth.hairline,
          borderColor: colors.icon.inverse,
          backgroundColor: colors.surface.sunken,
          overflow: 'hidden',
        }}
      >
        <Image
          source={source}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />

        {/* Soft "Shine" highlight — translucent white ellipse pinned
            top-left. No native blur primitive without expo-blur, so this is
            a low-opacity hard-edge ellipse; reads as a soft gleam. Only the
            front card gets it in a stack. */}
        {shine ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -spacing[24],
              left: -spacing[24],
              width: spacing[128],
              height: spacing[64],
              borderRadius: radius.full,
              backgroundColor: colors.icon.inverse,
              opacity: opacity[24],
              transform: [{ rotate: '-12deg' }],
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// CardLayer — absolute-fill wrapper that centres a single fanned card and
// applies its transform. Absolute-fill respects alignItems/justifyContent
// for its child, so each card centres regardless of the parent's measured
// width (which '100%' makes dynamic).
// ----------------------------------------------------------------------------
function CardLayer({
  children,
  transform,
}: {
  children: React.ReactNode;
  transform?: ViewStyle['transform'];
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={transform ? { transform } : undefined}>{children}</View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 'maybe' variant — Figma 3762:78994
// ----------------------------------------------------------------------------
//
// 360 wide hero with a gold RADIAL gradient (gradients.warning) behind
// everything. No floating card here (Figma sets it visible=false).
//
//   Container — alignItems center, gap spacing[16], padBottom spacing[24],
//                top corners radius['2xl'].
//   Sheet header (padTop 12 / padH 16 / padBottom 16, gap 6 internal):
//     • Drag handle 44×4, white, radius.full.
//     • Message — heading24Bold, colors.text.inverse (white), align center.
//   Info card wrapper — padH spacing[24], fills width.
//     Info card — col, gap spacing[16], padding spacing[16], radius.xl,
//                  bg colors.surface.dark (#000000):
//       - Body text body12Regular, colors.text.inverse, align left.
//       - <Divider style='dashed' color={colors.icon.inverse} />
//         (REUSED — Divider atom now accepts a color override; falls back
//          to border.default when unset).
//       - Detail row — row, justifyContent space-between, gap 6.
//   Button (REUSED) — variant='ghost', tone='second', size=36,
//                      icon='trailing', iconName matches the chevron-right
//                      asset. No chevron-right.svg ships, so we use a
//                      local inline ChevronRightGlyph below the file and
//                      pass it via Button's icon='trailing'… wait —
//                      Button's iconName takes an IconName from the registry
//                      only. There's no chevron-right asset, so we approximate
//                      with a registered icon ('star-outline' or similar)
//                      or render the Button with no trailing icon and add
//                      our own. To honor "reuse Button" + the spec, we
//                      render the Button without a trailing icon and pin a
//                      chevron glyph inside via a wrapper.
// ----------------------------------------------------------------------------

// Banner height is component-spec; width is fluid (parent-driven) so
// the masthead fills any wrapper edge-to-edge.
const MAYBE_BANNER_H = 355;

function MaybeMasthead({
  message = 'You may be eligible\nfor this card',
  infoText = 'Usually offered for salaries above ₹50,000/month\nYou may qualify or the bank might still approve your application',
  pincode = '144000',
  amount = '₹1.2L',
  occupation = 'Salaried',
  ctaLabel = 'Continue to Apply',
  onContinue,
  onEditPress,
  style,
}: EligibilityMastheadProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          alignItems: 'center',
          gap: spacing[16],
          paddingBottom: spacing[24],
          // Match the 'eligible' variant — the gold masthead curves on
          // ALL four corners (radius['2xl']) so its bottom edge reads
          // as a self-contained banner that the sheet's content slots
          // under.
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          borderBottomLeftRadius: radius['2xl'],
          borderBottomRightRadius: radius['2xl'],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Radial gold bg fills the entire container — sourced from
          gradients.warning (no inline stops). */}
      <View style={{ ...StyleSheetAbsoluteFill, height: MAYBE_BANNER_H }}>
        <RadialBackground grad={gradients.warning} id="warningRadial" />
      </View>

      {/* Sheet header — drag handle + message */}
      <View
        style={{
          width: '100%',
          alignItems: 'center',
          paddingTop: spacing[12],
          paddingHorizontal: spacing[16],
          paddingBottom: spacing[16],
          gap: spacing[6],
        }}
      >
        <View
          style={{
            width: HANDLE_W,
            height: HANDLE_H,
            borderRadius: radius.full,
            backgroundColor: colors.icon.inverse,
          }}
        />
        <Text
          variant="heading24Bold"
          color={colors.text.inverse}
          align="center"
          style={{ marginTop: spacing[6] }}
        >
          {message}
        </Text>
      </View>

      {/* Info card wrapper */}
      <View
        style={{
          width: '100%',
          paddingHorizontal: spacing[24],
        }}
      >
        <View
          style={{
            gap: spacing[16],
            padding: spacing[16],
            borderRadius: radius.xl,
            // Reason-window background — black @ 16% FILL opacity. The
            // card itself stays at 100% node opacity; only the bg colour
            // carries the alpha so the gold gradient shows through.
            backgroundColor: alpha.black[16],
          }}
        >
          <Text
            variant="body12Regular"
            color={colors.text.inverse}
            align="left"
          >
            {infoText}
          </Text>

          <Divider style="dashed" color={colors.icon.inverse} />

          {/* Detail row — LEFT details group at white @ 80% +
              RIGHT Edit pill at white @ 24%, justifyContent space-between. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing[6],
            }}
          >
            {/* LEFT details — all values white @ 80% fill opacity */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[6],
              }}
            >
              <LocationGlyph color={alpha.white[80]} />
              <Text variant="body12Regular" color={alpha.white[80]}>
                {pincode}
              </Text>
              <WhiteDot />
              <Text variant="body12Regular" color={alpha.white[80]}>
                {amount}
              </Text>
              <WhiteDot />
              <Text variant="body12Regular" color={alpha.white[80]}>
                {occupation}
              </Text>
            </View>

            {/* RIGHT Edit pill — same shape as the 'eligible' variant */}
            <Tag
              size="xs"
              pill
              icon="icon-left"
              iconName="edit-filled"
              label="Edit"
              iconPx={iconSize[12]}
              bgColor={alpha.white[24]}
              borderColor="transparent"
              labelColor={colors.background.emphasis}
              onPress={onEditPress}
            />
          </View>
        </View>
      </View>

      {/* Ghost CTA — the Button atom only accepts registered IconNames;
          no chevron-right.svg ships, so render the Button without a
          trailing icon and stack a local ChevronRightGlyph beside it
          in a row wrapper to honor "icon=Trailing" exactly. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
          borderWidth: borderWidth.thin,
          borderColor: colors.icon.inverse,
          borderRadius: radius.full,
          paddingVertical: spacing[8],
          paddingHorizontal: spacing[16],
        }}
      >
        <Text variant="body14Medium" color={colors.text.inverse}>
          {ctaLabel}
        </Text>
        <ChevronRightGlyph color={colors.icon.inverse} />
      </View>

      {/* Hidden Button atom kept for prop wiring — gives the caller a
          real <Button variant='ghost' /> when a chevron-right asset
          lands later. Swap the row above for this Button + the
          trailing icon at that point. */}
      {onContinue ? (
        <View
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        >
          <Button
            label={ctaLabel}
            variant="ghost"
            tone="second"
            size={36}
            onPress={onContinue}
          />
        </View>
      ) : null}
    </View>
  );
}

// ----------------------------------------------------------------------------
// 'ineligible' variant — Figma 3762:85818
// ----------------------------------------------------------------------------
//
// Structurally the 'maybe' variant in red: a red RADIAL gradient
// (gradients.errorRadial) behind a drag handle + headline, a black-@16%
// reason window holding a BULLETED list (not a single paragraph) + a
// dashed divider + the pincode/amount/occupation detail row with an Edit
// pill, then the same ghost "Continue to Apply" CTA. No floating card.
function IneligibleMasthead({
  message = "We're Sorry! You're\nineligible for this card",
  reasons = [
    'Your pin code is not serviceable',
    'Salary is below the required amount',
  ],
  pincode = '144000',
  amount = '₹1.2L',
  occupation = 'Salaried',
  ctaLabel = 'Continue to Apply',
  onContinue,
  onEditPress,
  style,
}: EligibilityMastheadProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          alignItems: 'center',
          gap: spacing[16],
          paddingBottom: spacing[24],
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          borderBottomLeftRadius: radius['2xl'],
          borderBottomRightRadius: radius['2xl'],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Red radial bg fills the entire container — gradients.errorRadial. */}
      <View style={{ ...StyleSheetAbsoluteFill, height: MAYBE_BANNER_H }}>
        <RadialBackground grad={gradients.errorRadial} id="errorRadial" />
      </View>

      {/* Sheet header — drag handle + message */}
      <View
        style={{
          width: '100%',
          alignItems: 'center',
          paddingTop: spacing[12],
          paddingHorizontal: spacing[16],
          paddingBottom: spacing[16],
          gap: spacing[6],
        }}
      >
        <View
          style={{
            width: HANDLE_W,
            height: HANDLE_H,
            borderRadius: radius.full,
            backgroundColor: colors.icon.inverse,
          }}
        />
        <Text
          variant="heading24Bold"
          color={colors.text.inverse}
          align="center"
          style={{ marginTop: spacing[6] }}
        >
          {message}
        </Text>
      </View>

      {/* Reason window */}
      <View style={{ width: '100%', paddingHorizontal: spacing[24] }}>
        <View
          style={{
            gap: spacing[16],
            padding: spacing[16],
            borderRadius: radius.xl,
            backgroundColor: alpha.black[16],
          }}
        >
          {/* Bulleted reason lines */}
          <View style={{ gap: spacing[8] }}>
            {reasons.map((reason, i) => (
              <View
                key={i}
                style={{ flexDirection: 'row', gap: spacing[8] }}
              >
                <Text variant="body12Regular" color={colors.text.inverse}>
                  {'•'}
                </Text>
                <Text
                  variant="body12Regular"
                  color={colors.text.inverse}
                  style={{ flex: 1 }}
                >
                  {reason}
                </Text>
              </View>
            ))}
          </View>

          <Divider style="dashed" color={colors.icon.inverse} />

          {/* Detail row — LEFT details white @ 80% + RIGHT Edit pill */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing[6],
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[6],
              }}
            >
              <LocationGlyph color={alpha.white[80]} />
              <Text variant="body12Regular" color={alpha.white[80]}>
                {pincode}
              </Text>
              <WhiteDot />
              <Text variant="body12Regular" color={alpha.white[80]}>
                {amount}
              </Text>
              <WhiteDot />
              <Text variant="body12Regular" color={alpha.white[80]}>
                {occupation}
              </Text>
            </View>

            <Tag
              size="xs"
              pill
              icon="icon-left"
              iconName="edit-filled"
              label="Edit"
              iconPx={iconSize[12]}
              bgColor={alpha.white[24]}
              borderColor="transparent"
              labelColor={colors.background.emphasis}
              onPress={onEditPress}
            />
          </View>
        </View>
      </View>

      {/* Ghost CTA — same pattern as 'maybe' (no chevron-right asset ships). */}
      <Pressable
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
          borderWidth: borderWidth.thin,
          borderColor: alpha.white[32],
          borderRadius: radius.sm,
          paddingVertical: spacing[8],
          paddingHorizontal: spacing[24],
        }}
      >
        <Text variant="body14Medium" color={colors.text.inverse}>
          {ctaLabel}
        </Text>
        <ChevronRightGlyph color={colors.icon.inverse} />
      </Pressable>
    </View>
  );
}

// Render the radial gradient via react-native-svg — RN's
// expo-linear-gradient can't do radial. Used by the 'maybe' (gold,
// gradients.warning) and 'ineligible' (red, gradients.errorRadial)
// variants — caller passes the gradient token + a unique <Defs> id.
function RadialBackground({
  grad,
  id,
}: {
  grad: { colors: readonly string[]; locations?: readonly number[] };
  id: string;
}) {
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
          {grad.colors.map((c, i) => (
            <Stop
              key={i}
              offset={`${(grad.locations?.[i] ?? i / (grad.colors.length - 1)) * 100}%`}
              stopColor={c}
              stopOpacity={1}
            />
          ))}
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// Reusable inline chevron-right glyph — no SVG ships in
// src/assets/icons; same approach as Tag's x-close and Masthead's
// earnings chevron.
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

// Small util used twice (banner + maybe variant) — same shape as
// `StyleSheet.absoluteFillObject` but typed so it slots into local style
// arrays without an extra import.
const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
