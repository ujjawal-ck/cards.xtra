/**
 * StoreCashbackDetails — organism (Figma 3824:101184, "Store/Cashback Details")
 *
 * The cashback summary block on a store page. Two states, controlled by
 * `bonusOffer`:
 *
 *   bonusOffer={false} → Off (node 3795:76795, 360×96) — headline +
 *                        subtitle + "View Cashback Rates" link.
 *   bonusOffer={true}  → On  (node 3824:101404, 360×284) — the same
 *                        Cashback Details block, plus a dashed-top
 *                        "Bonus Offer" promo card with a Timer and a
 *                        "+" badge straddling the dashed border.
 *
 * REUSE:
 *   - Timer atom (Error tone) for the countdown chip.
 *   - Inline SVG glyphs for the forward arrow and the "+" badge. This
 *     repo ships no forwardarrow/close SVG in src/assets/icons; the
 *     established convention (SearchBar, ListRow, StripAlert) is to draw
 *     such glyphs inline with token-bound stroke widths rather than add
 *     a new asset. Per the design, the "+" is the close (×) glyph
 *     rotated 45° — NOT a separate plus asset.
 *
 * Token map (per property):
 *   Off root              → gap spacing[20], px spacing[16]
 *   headline block        → gap spacing[4]
 *   headline row          → gap spacing[10], typography.display32Bold
 *     "Flat"              → colors.text.primary
 *     "15%"               → colors.action.primary.default
 *     "Cashback"          → colors.action.secondary.text
 *   subtitle              → typography.body12Regular, colors.text.secondary
 *   View Rates row        → gap spacing[2]; label body12Medium / text.link;
 *                           arrow glyph 12, borderWidth.iconDefault stroke
 *   On root               → gap spacing[24], no outer padding
 *   Cashback Details box   → px spacing[16], gap spacing[20]
 *   Bonus card            → bg promotional.fernBg, dashed top border
 *                           borderWidth.thin / feedback.info.border
 *                           (= Cobalt/300 #4d93e9), px spacing[16],
 *                           py spacing[24]
 *   Bonus content gap     → spacing[8]
 *   "Bonus Offer"         → typography.body16Bold, colors.text.primary
 *   bonus value           → typography.heading26Bold, action.secondary.text
 *   bonus subtitle        → typography.body12Regular, colors.text.secondary
 *   bonus sub-block gap   → spacing[2]
 *   "+" badge             → iconSize[24] circle, radius.full, bg
 *                           surface.default, borderWidth.thin /
 *                           action.secondary.default; glyph iconSize[12]
 *
 * Component-spec constants (Figma values not on a global scale, named
 * with a comment rather than inlined — mirrors BrandLogo's LOGO_W):
 *   BADGE_OFFSET (-18) — px the badge is translated up to straddle the
 *                        dashed top border.
 */
import React from 'react';
import {
  View,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../atoms';
import { Timer } from '../atoms';
import { colors, spacing, radius, borderWidth, iconSize, sizing } from '../tokens';

// The badge is translated up so it overlaps (straddles) the dashed top
// border of the bonus card. Figma component spec, not a spacing step.
const BADGE_OFFSET = -18;

// Manual strike-through bar thickness for the pre-boost rate. RN's
// textDecorationLine 'line-through' renders too faint at display sizes, so
// the strike is drawn as a solid overlay bar (heavy = 2px) for visibility.
const STRIKE_LINE_H = borderWidth.heavy; // 2

// Default copy — the Figma sample strings.
const DEFAULTS = {
  flatText: 'Flat',
  percentText: '15%',
  cashbackText: 'Cashback',
  subtitle: 'on all mcaffeine orders',
  bonusTitle: 'Bonus Offer',
  bonusValue: 'Flat ₹50 Cashback',
  bonusSubtitle: 'on order over ₹150 once per user',
  timerValue: '01:23:59',
} as const;

export interface StoreCashbackDetailsProps {
  /** On (true) adds the Bonus Offer promo card; Off (false) is summary only. */
  bonusOffer?: boolean;
  /** Headline word 1 — neutral. Default "Flat". */
  flatText?: string;
  /** Pre-boost "was" rate ("4%"), struck through before percentText. Omit
   *  (or '') when the store isn't boosted. */
  strikeText?: string;
  /** Headline word 2 — saffron percentage. Default "15%". */
  percentText?: string;
  /** Headline word 3 — cobalt. Default "Cashback". */
  cashbackText?: string;
  /** Sub-headline. Default "on all mcaffeine orders". */
  subtitle?: string;
  /** Bonus card title. Default "Bonus Offer". */
  bonusTitle?: string;
  /** Bonus card value line. Default "Flat ₹50 Cashback". */
  bonusValue?: string;
  /** Bonus card sub-line. Default "on order over ₹150 once per user".
   *  Pass null to hide it (e.g. the API carries no offer condition). */
  bonusSubtitle?: string | null;
  /** Countdown value, "dd:hh:mm" or "hh:mm". Default "01:23:59".
   *  Pass null to hide the timer (e.g. the API carries no end time). */
  timerValue?: string | null;
  /** Fired when the "View Cashback Rates" row is tapped. */
  onViewRates?: () => void;
  style?: StyleProp<ViewStyle>;
}

// ----------------------------------------------------------------------------
// Inline glyphs — no forwardarrow/close SVG ships in src/assets/icons, so
// they're drawn inline with token-bound stroke widths (same pattern as
// SearchBar's Search/Back/Close/Chevron glyphs).
// ----------------------------------------------------------------------------
function ForwardArrowGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M2 6 H9 M6 3 L9 6 L6 9"
        stroke={color}
        strokeWidth={borderWidth.iconDefault}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// The "+" is the close (×) glyph rotated 45° (see header note).
function CloseGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M3 3 L9 9 M9 3 L3 9"
        stroke={color}
        strokeWidth={borderWidth.iconDefault}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Parse "dd:hh:mm" / "hh:mm" into Timer atom props. */
function parseTimer(value: string): {
  format: 'hh:mm' | 'dd:hh:mm';
  days: number;
  hours: number;
  minutes: number;
} {
  const parts = value.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length >= 3) {
    return { format: 'dd:hh:mm', days: parts[0], hours: parts[1], minutes: parts[2] };
  }
  return { format: 'hh:mm', days: 0, hours: parts[0] ?? 0, minutes: parts[1] ?? 0 };
}

// Pre-boost "was" rate with a bold manual strike-through bar drawn over it
// (RN's textDecorationLine is too faint at display size). Grey text, dark
// strike, so it reads as a struck "was" value against the live saffron rate.
function StrikeValue({ text }: { text: string }) {
  return (
    <View style={{ justifyContent: 'center' }}>
      <Text variant="display32Bold" color={colors.text.secondary}>
        {text}
      </Text>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            height: STRIKE_LINE_H,
            borderRadius: radius.full,
            backgroundColor: colors.text.primary,
          }}
        />
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Cashback Details block — shared by both states (headline + View Rates).
// ----------------------------------------------------------------------------
function CashbackDetails({
  flatText,
  strikeText,
  percentText,
  cashbackText,
  subtitle,
  onViewRates,
}: Required<
  Pick<
    StoreCashbackDetailsProps,
    'flatText' | 'percentText' | 'cashbackText' | 'subtitle'
  >
> & { strikeText?: string; onViewRates?: () => void }) {
  return (
    <>
      {/* Headline block */}
      <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
        {strikeText ? (
          // Boosted store — two lines: "Flat 4̶%̶" above, the revised rate +
          // "Cashback" below.
          <>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[10] }}
            >
              <Text variant="display32Bold" color={colors.text.primary}>
                {flatText}
              </Text>
              <StrikeValue text={strikeText} />
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[10] }}
            >
              <Text variant="display32Bold" color={colors.action.primary.default}>
                {percentText}
              </Text>
              <Text variant="display32Bold" color={colors.action.secondary.text}>
                {cashbackText}
              </Text>
            </View>
          </>
        ) : (
          // Unboosted store — single line: "Upto 5% Cashback".
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[10] }}>
            <Text variant="display32Bold" color={colors.text.primary}>
              {flatText}
            </Text>
            <Text variant="display32Bold" color={colors.action.primary.default}>
              {percentText}
            </Text>
            <Text variant="display32Bold" color={colors.action.secondary.text}>
              {cashbackText}
            </Text>
          </View>
        )}
        <Text variant="body12Regular" color={colors.text.secondary}>
          {subtitle}
        </Text>
      </View>

      {/* "View Cashback Rates" link row — whole row is the tap target */}
      <Pressable
        onPress={onViewRates}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          width: '100%',
        }}
      >
        <Text variant="body12Medium" color={colors.text.link}>
          View Cashback Rates
        </Text>
        <ForwardArrowGlyph size={iconSize[12]} color={colors.text.link} />
      </Pressable>
    </>
  );
}

export function StoreCashbackDetails({
  bonusOffer = false,
  flatText = DEFAULTS.flatText,
  strikeText,
  percentText = DEFAULTS.percentText,
  cashbackText = DEFAULTS.cashbackText,
  subtitle = DEFAULTS.subtitle,
  bonusTitle = DEFAULTS.bonusTitle,
  bonusValue = DEFAULTS.bonusValue,
  bonusSubtitle = DEFAULTS.bonusSubtitle,
  timerValue = DEFAULTS.timerValue,
  onViewRates,
  style,
}: StoreCashbackDetailsProps) {
  const details = (
    <CashbackDetails
      flatText={flatText}
      strikeText={strikeText}
      percentText={percentText}
      cashbackText={cashbackText}
      subtitle={subtitle}
      onViewRates={onViewRates}
    />
  );

  // ---- Off state: headline + link, padded, gap 20 ------------------------
  if (!bonusOffer) {
    return (
      <View
        style={[
          {
            width: sizing.containerMobile, // 360
            alignItems: 'flex-start',
            gap: spacing[20],
            paddingHorizontal: spacing[16],
          },
          style,
        ]}
      >
        {details}
      </View>
    );
  }

  // ---- On state: details block + bonus card, gap 24, no outer padding ----
  const t = timerValue ? parseTimer(timerValue) : null;
  return (
    <View
      style={[
        { width: sizing.containerMobile, alignItems: 'flex-start', gap: spacing[24] },
        style,
      ]}
    >
      {/* Cashback Details — its own padded container */}
      <View
        style={{
          width: '100%',
          alignItems: 'flex-start',
          gap: spacing[20],
          paddingHorizontal: spacing[16],
        }}
      >
        {details}
      </View>

      {/* Bonus Offer card — dashed top border, fern bg, + badge */}
      <View
        style={{
          width: '100%',
          backgroundColor: colors.promotional.fernBg,
          borderTopWidth: borderWidth.thin,
          borderStyle: 'dashed',
          // feedback.info.border resolves to Cobalt/300 (#4d93e9) — the
          // exact value the Figma dashed border binds. Used here so the
          // component stays off raw hex and the primitives layer.
          borderColor: colors.feedback.info.border,
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[24],
        }}
      >
        <View style={{ width: '100%', gap: spacing[8], alignItems: 'flex-start' }}>
          {t ? (
            <Timer
              surface="default"
              format={t.format}
              days={t.days}
              hours={t.hours}
              minutes={t.minutes}
            />
          ) : null}
          <View style={{ width: '100%', gap: spacing[8], alignItems: 'flex-start' }}>
            <Text variant="body16Bold" color={colors.text.primary} style={{ width: '100%' }}>
              {bonusTitle}
            </Text>
            <View style={{ width: '100%', gap: spacing[2], alignItems: 'flex-start' }}>
              <Text
                variant="heading26Bold"
                color={colors.action.secondary.text}
                style={{ width: '100%' }}
              >
                {bonusValue}
              </Text>
              {bonusSubtitle ? (
                <Text
                  variant="body12Regular"
                  color={colors.text.secondary}
                  style={{ width: '100%' }}
                >
                  {bonusSubtitle}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* "+" badge — absolute, centered, straddling the dashed border */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: BADGE_OFFSET,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: iconSize[24],
              height: iconSize[24],
              borderRadius: radius.full,
              backgroundColor: colors.surface.default,
              borderWidth: borderWidth.thin,
              borderColor: colors.action.secondary.default,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* close (×) glyph rotated 45° → reads as a plus */}
            <View style={{ transform: [{ rotate: '45deg' }] }}>
              <CloseGlyph size={iconSize[12]} color={colors.text.primary} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
