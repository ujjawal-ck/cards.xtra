/**
 * CardDetailSheet — organism  (Figma card-details/full-page 3914:43655)
 * Stage 2A — sheet wrapper + top sections only:
 *   • MastheadHeader (floating circular back button over the hero)
 *   • CardDetailMasthead hero (collapsing, card art only — name +
 *     cashback live in the Feature Section below to avoid duplication)
 *   • Feature Section (h96): card name + CashbackBadge + "Learn how it
 *     works?" link Button
 *   • Additional Features: Grid `'features'` 2-col tiles (all 6
 *     benefits from CardModel.tileBenefits) + full-width "View all
 *     benefits" Button (subtle, fullWidth, size=44)
 *   • Sticky Apply Now bar via gorhom's footerComponent — flush,
 *     non-scrolling. Once the embedded eligibility checker runs, an
 *     eligibility-result strip (eligible / maybe + "Edit" link, Figma
 *     3914:38886) renders above the CTA inside the same shadowed bar.
 *
 * Sections OMITTED (Stage 2B/2C — do not stub):
 *   Fee Section, Eligibility Section, embedded Eligibility checker,
 *   Carousels, Milestone/FAQ, Recommended Cards, inline Footer.
 *
 * Snap (Blinkit / Zomato pattern):
 *   snapPoints = ['75%', '100%']. Opens at the 75% partial peek; the
 *   active card's first upward scroll snaps it to 100% full screen
 *   (wiring in CardPage.handleScroll → sheet.snapToIndex(1)); a
 *   drag-down at the top collapses it back. The content pan is scoped
 *   to vertical (activeOffsetY + failOffsetX) so the horizontal card
 *   pager keeps its left/right swipe on Android.
 *
 * Composition (existing only — no rebuilds):
 *   - <GorhomBottomSheetModal>, <BottomSheetBackdrop>,
 *     <BottomSheetFooter>, <BottomSheetScrollView>, useBottomSheet
 *     (@gorhom/bottom-sheet)
 *   - <MastheadHeader iconType='solid' leading='back'>  (organism)
 *   - <CardDetailMasthead progress={animatedIndex} card={card}>
 *     (organism — the existing collapsing hero)
 *   - <Text> (atom) — card name
 *   - <CashbackBadge> (atom) — replaces the previous custom pill
 *   - <Button variant='link' / 'subtle'> (atom) — Learn how + View all
 *   - <Grid variant='features'> (organism) — benefit tiles
 *   - <Button variant='solid' tone='main' size=52> (atom) — the sticky
 *     Apply Now CTA, in a hand-rolled shadowed bar (so the eligibility
 *     result strip can share its container); <InlineMessage> (molecule)
 *     for the in-checker result banner
 *
 * Props contract unchanged (card + onApply + onLearnHow + onViewAllBenefits)
 * so HomeScreen and existing call sites keep working untouched.
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
  Pressable,
  FlatList,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  ListRenderItemInfo,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  runOnJS,
  interpolate,
  Extrapolation,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  useBottomSheet,
  useBottomSheetModal,
  useBottomSheetModalInternal,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { Portal } from '@gorhom/portal';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import { play } from '../lib/haptics';

import {
  Text,
  Button,
  CashbackBadge,
  Divider,
  DividerVertical,
  Icon,
  Input,
  Selector,
} from '../atoms';
import { Accordion, ListRow, TabsSecondary, InlineMessage } from '../molecules';
import type { CardModel } from '../molecules';
import type { IconName } from '../atoms';
import { icons } from '../assets/icons';
import {
  parseIncome,
  formatIndianIncome,
  type IncomeType,
} from './EligibilityCheckerSheet';
import { fetchEligibility } from '../api/eligibility';
import { Grid } from './Grid';
import { CardDetailMasthead } from './CardDetailMasthead';
import { CardDetailScreenAndroid } from './CardDetailScreenAndroid';
import { CardArt, CARD_ART_W, CARD_ART_H, CROSSFADE_HI } from './CardArt';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCardBenefits,
  prefetchCardBenefits,
} from '../query/useCardBenefits';
import { MastheadHeader } from './MastheadHeader';
import { Footer } from './Footer';
import { BestForSpending, CreditCardOffer, type BestForSpendingCategory } from './Carousels';
import type { CreditCardOfferItem } from './Carousels';
import {
  colors,
  spacing,
  radius,
  opacity,
  borderWidth,
  iconSize,
  elevation,
} from '../tokens';

export interface CardDetailSheetProps {
  card: CardModel | null;
  /** The list the user was browsing — the horizontal pager swipes through
   *  these (peek carousel). Falls back to `[card]` when omitted. */
  cards?: CardModel[];
  /** Which card the pager opens on (the tapped card). Defaults to `card.id`. */
  initialCardId?: string;
  /** Snap index the sheet opens at on present(). 0 = partial (75%, default),
   *  1 = full screen. Used to restore the expanded page when returning from
   *  the All Card Benefits screen. */
  index?: number;
  /** Screen Y (px) of the tapped card tile — the open/close ZOOM grows from /
   *  collapses into this point so the detail appears to come out of the card.
   *  ANDROID only (the iOS sheet ignores it). Defaults to mid-screen. */
  originY?: number;
  /** Fired when the user swipes to a different card → the parent re-points
   *  `selectedCard` so Apply / Share / eligibility act on the active card. */
  onActiveCardChange?: (card: CardModel) => void;
  /** Other cards to show in the "Recommended Credit Cards" carousel
   *  (the current card is filtered out). Defaults to sample data. */
  recommended?: CardModel[];
  /** Prefill for the embedded eligibility checker (from Home details).
   *  Its PRESENCE also means the user already entered details on Home, so
   *  this card shows its result INLINE rather than opening a result sheet. */
  eligibilityDefaults?: { pincode: string; income: string; incomeType: IncomeType };
  /** card_aliases the user is eligible for (from Home's last check). Lets the
   *  card resolve its own inline result on open when details pre-exist. */
  eligibleAliases?: string[] | null;
  /** Fired when the embedded checker completes — caller applies the
   *  eligible card_aliases as the Home list filter. */
  onEligibilityChecked?: (o: {
    pincode: string;
    income: string;
    incomeType: IncomeType;
    eligibleCardAliases: string[];
  }) => void;
  /** Fired ONLY when the user runs the checker with NO pre-filled details
   *  (fresh entry on this page) — the caller opens the matching colored
   *  result sheet (green / amber / red). */
  onShowResultSheet?: (outcome: EligibilityOutcome) => void;
  onApply?: (card: CardModel) => void;
  /** Tapping a card in the "Recommended Credit Cards" carousel → open it. */
  onRecommendedPress?: (card: CardModel) => void;
  onLearnHow?: (card: CardModel) => void;
  onViewAllBenefits?: (card: CardModel) => void;
  /** Fires when the share glyph on the masthead header is tapped.
   *  The screen presents the sibling ShareSheet modal in response. */
  onSharePress?: (card: CardModel) => void;
  /** Fires when "Edit" on the eligibility result strip (above the Apply
   *  CTA) is tapped — the screen presents the EligibilityCheckerSheet
   *  prefilled so the user can change or clear their details. */
  onEditEligibility?: () => void;
}

// "Upto Rs2,500 Cashback" -> { prefix: "Upto", value: "Rs2,500 Cashback" }
// (CashbackBadge wants the prefix + value split.)
export function splitCashback(raw: string): { prefix?: string; value: string } {
  const LEADERS = ['Upto', 'Up to', 'Flat', 'Get'];
  for (const lead of LEADERS) {
    if (raw.startsWith(lead + ' ')) {
      return { prefix: lead, value: raw.slice(lead.length + 1) };
    }
  }
  return { value: raw };
}

// ----------------------------------------------------------------------------
// Fee Section helpers (Figma 3914:43695)
// ----------------------------------------------------------------------------
//
// Every value here used to be a Figma raw — now all five are snapped
// to the nearest existing token on the design-system scale. The
// 2-/4-px deltas vs. spec are imperceptible and keep the section
// fully bound to src/tokens.
//
//   spec 100  →  spacing[96]   ( −4 )    column width
//   spec  50  →  spacing[48]   ( −2 )    vertical divider height
//   spec  22  →  spacing[24]   ( +2 )    section padding-v
//   spec  13  →  spacing[12]   ( −1 )    section gap
//   spec 0.7  →  opacity[80]   ( +0.1 )  sub-caption opacity
const FEE_STAT_COL_W = spacing[96];
const FEE_DIVIDER_H = spacing[48];
const FEE_SECTION_PAD_V = spacing[24];
const FEE_SECTION_GAP_V = spacing[12];
const FEE_SUB_OPACITY = opacity[80];

interface FeeStatData {
  label: string;
  amount: string;
  sub: string;
}

function FeeStat({ label, amount, sub }: FeeStatData) {
  // The displayed amount is GST-inclusive; the "(₹base + GST)" breakdown
  // (`sub`) is shown directly beneath it — no tooltip, always visible.
  return (
    <View
      style={{
        width: FEE_STAT_COL_W,
        gap: spacing[4],
        alignItems: 'center',
      }}
    >
      {/* Label — node uses raw #222; normalising to text.primary (#262626).
          The 4-unit hex difference is imperceptible. */}
      <Text variant="body12Regular" color={colors.text.primary}>
        {label}
      </Text>
      {/* Figma 3914:43697: Heading/24/Semi Bold, full opacity. */}
      <Text variant="heading24SemiBold" color={colors.text.primary}>
        {amount}
      </Text>
      {sub ? (
        <Text
          variant="caption10Regular"
          color={colors.text.primary}
          align="center"
          style={{ opacity: FEE_SUB_OPACITY }}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export interface FeeSectionProps {
  annual?: FeeStatData;
  joining?: FeeStatData;
  bulletPoints?: string[];
}

const FEE_DEFAULTS: { annual: FeeStatData; joining: FeeStatData; bullets: string[] } = {
  // Neutral: shown only if a caller passes nothing (never sample prices).
  annual:  { label: 'Annual Fees',  amount: '—', sub: '' },
  joining: { label: 'Joining Fees', amount: '—', sub: '' },
  bullets: [],
};

export function FeeSection({
  annual = FEE_DEFAULTS.annual,
  joining = FEE_DEFAULTS.joining,
  bulletPoints = FEE_DEFAULTS.bullets,
}: FeeSectionProps) {
  return (
    <View
      style={{
        width: '100%',
        backgroundColor: colors.surface.default,
        alignItems: 'center',
        paddingVertical: FEE_SECTION_PAD_V,
        gap: FEE_SECTION_GAP_V,
      }}
    >
      {/* 1. Fee Details row */}
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          // Top-aligned: with a "(₹500 + GST)" line under only one amount,
          // centring pushed the other column's label ~12 px lower.
          alignItems: 'flex-start',
          paddingHorizontal: spacing[40],
        }}
      >
        {/* Joining first, then Annual — the same order as the card tile
            (the two screens used to list them in opposite orders). */}
        <FeeStat {...joining} />
        {/* 50-px vertical line between stats — REUSED DividerVertical
            'solid' variant. The atom defaults to 80; passing height=50
            sizes it to spec. */}
        <DividerVertical style="solid" height={FEE_DIVIDER_H} />
        <FeeStat {...annual} />
      </View>

      {/* 2. Price/benefits card — omitted when the card has no fee notes
          (an empty bordered box rendered otherwise). */}
      {bulletPoints.length > 0 ? (
        <View style={{ width: '100%', paddingHorizontal: spacing[16] }}>
        <View
          style={{
            backgroundColor: colors.surface.default,
            borderWidth: borderWidth.thin,
            borderColor: colors.border.default,
            borderRadius: radius.xl,
            padding: spacing[16],
            gap: spacing[8],
          }}
        >
          {bulletPoints.map((line, i) => (
            <React.Fragment key={i}>
              {/* REUSED ListRow 'bullet-point' variant — feat-dot-filled
                  cobalt dot + body14Regular text/primary. The spec
                  asked for `feat-listing-point`, but that key isn't
                  registered (Icon.tsx) — the bullet variant uses
                  `feat-dot-filled` as the closest match. Flagged. */}
              <ListRow type="bullet-point" description={line} />
              {/* REUSED horizontal Divider between rows (solid variant,
                  border.subtle3). Skipped after the last row. */}
              {i < bulletPoints.length - 1 ? <Divider style="solid" /> : null}
            </React.Fragment>
          ))}
        </View>
        </View>
      ) : null}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Eligibility Section (Figma 3914:64045)
// ----------------------------------------------------------------------------
//
// Title + segmented Salaried / Self Employed tabs + 5-row icon-caption-
// value list. Tab state lives inside the section so the parent doesn't
// have to wire it. Both tabs render the same demo data for now (mirror)
// — replace `ROWS_SELF_EMPLOYED` when real values land.
//
// Composition (existing only — no rebuilds):
//   - <Text variant='body16SemiBold'> (atom) — title
//   - <TabsSecondary>                  (molecule) — segmented pill
//   - <ListRow type='icon-caption-value'> (molecule) — 5 rows
//   - <Divider style='solid'>          (atom) — row separators

interface EligibilityRow {
  icon: IconName;
  caption: string;
  value: string;
}

// Icon mapping per row. Direct semantic matches where the registry
// has a fit (Salary→wallet, New-to-credit→sparkle, Existing-bank→bank).
// Age + CIBIL have no direct icon in src/atoms/Icon (no person /
// calendar / credit-score / rating glyph ships), so they fall back to
// the closest available semantic — flagged.
const ROWS_SALARIED: EligibilityRow[] = [
  { icon: 'clock-outline',        caption: 'Age',                            value: '21-60Y' },
  { icon: 'wallet-outline',       caption: 'Salary',                         value: '6LPA' },
  { icon: 'star-outline',         caption: 'CIBIL',                          value: '725+' },
  { icon: 'feat-sparkle-outline', caption: 'New to credit allowed',          value: 'Yes' },
  { icon: 'feat-bank-outline',    caption: 'Existing bank customer allowed', value: 'Yes' },
];
// Demo mirror — same rows for the Self Employed tab so the section
// reads end-to-end while data is sourced.
const ROWS_SELF_EMPLOYED: EligibilityRow[] = ROWS_SALARIED;

export function EligibilitySection({
  salariedRows = ROWS_SALARIED,
  selfEmployedRows = ROWS_SELF_EMPLOYED,
}: {
  salariedRows?: EligibilityRow[];
  selfEmployedRows?: EligibilityRow[];
} = {}) {
  // Tab state — index 0 = Salaried (default), 1 = Self Employed.
  const [activeTab, setActiveTab] = useState(0);
  const rows = activeTab === 0 ? salariedRows : selfEmployedRows;

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'column',
        gap: spacing[16],
        alignItems: 'flex-start',
        paddingHorizontal: spacing[16],
      }}
    >
      {/* Title — Figma node spells it "Elgibility" (typo); rendered
          correctly here per spec. */}
      <Text variant="body16SemiBold" color={colors.text.primary}>
        Eligibility
      </Text>

      {/* REUSED TabsSecondary — equal-width Salaried / Self Employed
          segments. Container, active thumb, label colours/weights all
          come from the molecule's internal tokens. */}
      <TabsSecondary
        segments={[
          { label: 'Salaried' },
          { label: 'Self-employed' },
        ]}
        activeIndex={activeTab}
        onChange={setActiveTab}
        style={{ width: '100%' }}
      />

      {/* 5-row icon-caption-value list. Each row REUSES ListRow's
          'icon-caption-value' variant (icon20 outline + caption +
          right-aligned value). Solid Divider between rows. */}
      <View style={{ width: '100%', gap: spacing[8] }}>
        {rows.map((row, i) => (
          <React.Fragment key={row.caption}>
            <ListRow
              type="icon-caption-value"
              icon={row.icon}
              caption={row.caption}
              value={row.value}
            />
            {i < rows.length - 1 ? <Divider style="solid" /> : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Eligibility Checker (Figma 3914:43713) — EMBEDDED, FLAT (no rivets)
// ----------------------------------------------------------------------------
//
// Adapted from the existing `EligibilityCheckerSheet` body composition
// (same Input × 2 + Selector × 2 + Button arrangement). The wrapper
// itself can't be reused — that organism is sheet-bound — so the form
// is rebuilt INLINE here with the same atoms. Form helpers (`parseIncome`,
// `IncomeType`) are imported from the sheet file to keep the logic in
// one place.
//
// Visual departures from spec (using nearest existing tokens):
//   • Background — spec asks for a RADIAL #0036da → #0058bc; no radial
//     cobalt gradient ships. Falling back to a FLAT cobalt fill via
//     `colors.text.link` (= #0036da, exact match to the radial CENTRE
//     stop). `gradients.primary` was considered but its second stop
//     drifts brighter (#4670f6) — worse than a flat solid for this
//     small variation. **Flagged.**
//   • White card border — spec asks cobalt @ 20%; nearest token is
//     `colors.border.subtle2` (= primitives.cobalt[100]). **Flagged.**
//   • White card radius — spec raw 14.6; `radius.lg` (= 12) is the
//     nearest token. **Flagged.**
//   • White card shadow — spec "Shadow/Neutral/LG"; nearest is
//     `elevation.light.md`. **Flagged.**
//   • Disclaimer colour — spec rgba(2,40,81,0.6) navy; nearest is
//     `colors.text.secondary`. **Flagged.** Will read low-contrast on
//     the cobalt bg by design.
//   • Riveted ticket-stub edges DROPPED per spec — container is a flat
//     cobalt rectangle, no perforations.

// Per-card eligibility outcome after the user runs the embedded checker.
//   'eligible'   → this card's alias is in the eligible set (green)
//   'maybe'      → not a confirmed match, but may still qualify (amber)
//   'ineligible' → below the bar for this card (red)
export type EligibilityOutcome = 'eligible' | 'maybe' | 'ineligible';

/**
 * Resolve THIS card's outcome.
 *   eligible   — the card's alias is in the API's eligible set, OR (no alias
 *                data) the income clears the ₹50k bar.
 *   maybe      — income clears half the bar (≥ ₹25k).
 *   ineligible — below that.
 * Mirrors the Home checker's decideVerdict, with aliasHit standing in for
 * the aggregate eligible-count.
 */
export function resolveCardOutcome(
  cardAlias: string | undefined,
  eligibleAliases: string[] | null | undefined,
  income: number
): EligibilityOutcome {
  const aliasHit = !!(cardAlias && eligibleAliases?.includes(cardAlias));
  if (aliasHit || (Number.isFinite(income) && income >= 50000)) return 'eligible';
  if (Number.isFinite(income) && income >= 25000) return 'maybe';
  return 'ineligible';
}

/**
 * EligibilityResultBanner — the result message shown at the TOP of the
 * embedded checker's white card once a check completes (Figma 3914:43019
 * eligible / 3914:43020 maybe). REUSES the InlineMessage molecule; tone
 * maps to the DS semantic tones (success = fern, warning = amber).
 */
function EligibilityResultBanner({ result }: { result: EligibilityOutcome }) {
  if (result === 'eligible') {
    return (
      <InlineMessage
        tone="success"
        icon="desc-celebrate"
        message="Congrats! You're eligible for this card!"
      />
    );
  }
  if (result === 'ineligible') {
    return (
      <InlineMessage
        tone="error"
        icon="desc-cross"
        title="We're sorry! You're ineligible for this card."
        message="Your PIN code may not be serviceable or your income is below the required amount."
      />
    );
  }
  return (
    <InlineMessage
      tone="warning"
      icon="desc-exclamation"
      title="You might qualify for this card."
      message="Usually offered for salaries above ₹50,000/month. You may qualify or the bank might still approve your application"
    />
  );
}

/**
 * EligibilityFooterStrip — compact result strip that sits ABOVE the sticky
 * "Apply Now" CTA (Figma 3914:38886). Same eligible / maybe cases as the
 * checker banner, plus an "Edit" link that clears the result so the user
 * can change their inputs. Tones come from colors.tones (DS semantic).
 */
function EligibilityFooterStrip({
  result,
  onEdit,
}: {
  result: EligibilityOutcome;
  onEdit?: () => void;
}) {
  const tone =
    result === 'eligible'
      ? colors.tones.success
      : result === 'ineligible'
        ? colors.tones.error
        : colors.tones.warning;
  const text =
    result === 'eligible'
      ? "Congrats! You're eligible for this card."
      : result === 'ineligible'
        ? "You're not eligible for this card right now."
        : 'You might qualify for this card.';
  return (
    <View
      style={{
        backgroundColor: tone.bgSubtle,
        paddingHorizontal: spacing[16],
        paddingVertical: spacing[4],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[8],
      }}
    >
      <Text
        variant="body12Medium"
        color={tone.text}
        numberOfLines={1}
        style={{ flex: 1 }}
      >
        {text}
      </Text>
      <Pressable
        onPress={onEdit}
        hitSlop={spacing[8]}
        accessibilityRole="button"
        accessibilityLabel="Edit eligibility"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
      >
        <Text variant="body12Medium" color={colors.text.link}>
          Edit
        </Text>
        <Icon name="edit-outline" size={iconSize[12]} color={colors.text.link} />
      </Pressable>
    </View>
  );
}

export interface EligibilityCheckerEmbedProps {
  /** Prefill values — passed from the Home eligibility details so the user
   *  doesn't re-enter what they already typed. Empty = blank form. */
  defaultPincode?: string;
  defaultIncome?: string;
  defaultIncomeType?: IncomeType | null;
  /** Fired with the eligibility outcome (eligible card_aliases) after the
   *  API check. The caller applies it as the Home list filter. */
  onChecked?: (o: {
    pincode: string;
    income: string;
    incomeType: IncomeType;
    eligibleCardAliases: string[];
  }) => void;
  /** Per-card outcome computed by the parent — drives the top banner. */
  result?: EligibilityOutcome | null;
}

export function EligibilityChecker({
  defaultPincode = '',
  defaultIncome = '',
  defaultIncomeType = null,
  onChecked,
  result = null,
}: EligibilityCheckerEmbedProps) {
  const [pincode, setPincode] = useState(defaultPincode);
  const [income, setIncome] = useState(formatIndianIncome(defaultIncome));
  // null on first render so neither Selector reads as "selected"; tap
  // one to set, tapping the other flips it (natural single-select).
  const [incomeType, setIncomeType] = useState<IncomeType | null>(defaultIncomeType);
  const [isChecking, setIsChecking] = useState(false);

  // Re-sync to remembered details when they change (e.g. opening another
  // card after entering details on Home) — useState only seeds once at
  // mount, so without this the form would show blank and re-ask.
  useEffect(() => {
    setPincode(defaultPincode);
    setIncome(formatIndianIncome(defaultIncome));
    setIncomeType(defaultIncomeType);
  }, [defaultPincode, defaultIncome, defaultIncomeType]);

  // Enable when all 3 fields are populated. Pincode requires 6 digits.
  const isFormValid =
    pincode.replace(/[^0-9]/g, '').length === 6 &&
    income.length > 0 &&
    incomeType !== null;

  const handleCheck = async () => {
    if (!isFormValid || incomeType === null || isChecking) return;
    setIsChecking(true);
    const incomeValue = parseIncome(income);
    try {
      const { eligibleAliases } = await fetchEligibility({
        pincode,
        incomeMonthly: incomeValue,
        selfEmployed: incomeType === 'self-employed',
      });
      onChecked?.({ pincode, income, incomeType, eligibleCardAliases: eligibleAliases });
    } catch {
      onChecked?.({ pincode, income, incomeType, eligibleCardAliases: [] });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'column',
        gap: spacing[24],
        paddingHorizontal: spacing[16],
        paddingVertical: spacing[32],
        // Flat cobalt fill (Figma action/accent/default — a background, so
        // not the text.link token it used to borrow).
        backgroundColor: colors.action.accent.default,
      }}
    >
      {/* White card */}
      <View
        style={[
          {
            width: '100%',
            backgroundColor: colors.surface.default,
            borderWidth: borderWidth.thin,
            borderColor: colors.border.subtle2,
            borderRadius: radius.lg,
            padding: spacing[16],
            gap: spacing[16],
          },
          elevation.light.md,
        ]}
      >
        {/* Result banner — appears at the top of the card once a check
            completes (eligible / maybe). The card's gap:24 spaces it from
            the form below. */}
        {result ? <EligibilityResultBanner result={result} /> : null}

        <Text variant="body14SemiBold" color={colors.text.secondary}>
          Check Your Eligibility
        </Text>

        {/* Inputs — REUSED Input atom; existing default h48 + border.default
            + radius.lg matches the spec. */}
        <View style={{ gap: spacing[16] }}>
          <Input
            label="6 Digit PIN Code"
            placeholder="Enter your pincode"
            keyboardType="number-pad"
            value={pincode}
            onChangeText={setPincode}
            maxLength={6}
          />
          <Input
            label="Monthly Income"
            placeholder="Enter your monthly income"
            leadingText="₹"
            keyboardType="number-pad"
            value={income}
            onChangeText={(t) => setIncome(formatIndianIncome(t))}
          />
        </View>

        {/* Income Type group */}
        <View style={{ gap: spacing[8] }}>
          <Text
            variant="caption10SemiBold"
            color={colors.text.tertiary}
          >
            Select Income Type
          </Text>
          {/* Single-select via local state: setting one value clears
              the other from selected state automatically. */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing[8],
              alignItems: 'center',
            }}
          >
            <Selector
              title="Salaried"
              source={icons['feat-salaried']}
              selected={incomeType === 'salaried'}
              onPress={() => setIncomeType('salaried')}
              style={{ flex: 1 }}
            />
            <Selector
              title="Self-employed"
              source={icons['feat-self-employed']}
              selected={incomeType === 'self-employed'}
              onPress={() => setIncomeType('self-employed')}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* CTA — REUSED Button. Disabled until the form is valid; the
            atom's `disabled` prop applies the spec's 32% opacity. */}
        <Button
          label="Check Eligibility"
          variant="solid"
          tone="second"
          size={44}
          fullWidth
          loading={isChecking}
          disabled={!isFormValid || isChecking}
          onPress={handleCheck}
        />

        {/* Disclaimer — inside the card, under the CTA (Figma 3914:43713):
            Caption/10/Regular, text.tertiary. */}
        <Text variant="caption10Regular" color={colors.text.tertiary} align="center">
          Don't worry! Entering this info will not affect your Credit Score and will not be shared with anyone.
        </Text>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// FAQ Section — 4 accordions, first open
// ----------------------------------------------------------------------------
//
// REUSES the existing `Accordion` molecule (one row per question).
// Single-open behaviour: `expandedIndex` tracks which accordion is
// currently open; tapping a closed row opens it and collapses the
// previous one. Tapping the open row collapses it (sets to null).

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is a credit card?',
    answer:
      'A credit card lets you borrow money from a bank up to a pre-approved limit to make purchases, with the obligation to repay the balance within the billing cycle (typically interest-free for up to 50 days).',
  },
  {
    question: 'How is my credit limit decided?',
    answer:
      'Your credit limit is set by the issuing bank based on your monthly income, employment type, credit score, repayment history, and your existing relationship with the bank.',
  },
  {
    question: 'Will applying for a card affect my credit score?',
    answer:
      'A formal credit-card application triggers a hard inquiry, which can temporarily lower your score by a few points. Eligibility checks done in-app are soft inquiries and do not affect your score.',
  },
  {
    question: 'How long does card approval take?',
    answer:
      'Most cards are approved within 5–7 working days, depending on the bank’s verification process and the documents you submit. You will get an SMS / email once the card is dispatched.',
  },
];

export function FaqSection() {
  // First accordion open by default per spec.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'column',
        gap: spacing[8],
        alignItems: 'flex-start',
      }}
    >
      {/* Title gets its own 16-px horizontal padding so it visually
          aligns with the Accordion text below. */}
      <Text
        variant="body16SemiBold"
        color={colors.text.primary}
        style={{ paddingHorizontal: spacing[16] }}
      >
        Frequently Asked Questions
      </Text>
      {/* Stack of 4 REUSED Accordions, single-open. EDGE-TO-EDGE —
          each Accordion's `state="default"` already bakes
          paddingHorizontal: spacing[16] internally, so its tap area
          spans the full sheet width and the text sits 16-px in from
          each screen edge. REUSED solid Divider between rows. */}
      <View style={{ width: '100%' }}>
        {FAQ_ITEMS.map((item, i) => (
          <React.Fragment key={item.question}>
            <Accordion
              title={item.question}
              body={item.answer}
              expanded={i === expandedIndex}
              onToggle={(next) =>
                setExpandedIndex(next ? i : null)
              }
              state="default"
            />
            {i < FAQ_ITEMS.length - 1 ? (
              // 16-px horizontal padding around the Divider so it
              // visually aligns with the Accordion's 16-px internal
              // padding (the line starts 16 in from each screen edge
              // instead of running fully edge-to-edge).
              <View style={{ paddingHorizontal: spacing[16] }}>
                <Divider style="solid" />
              </View>
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Recommended Credit Cards — REUSED CreditCardOffer carousel
// ----------------------------------------------------------------------------
//
// Pulls cards from the existing SAMPLE_CARDS dataset, filters out the
// currently-displayed card, and maps each remaining card into the
// CreditCardOfferItem shape (image + name + cashback + prefix) that
// the existing carousel expects. No new presentation code — the
// carousel itself owns the image / title / cashback layout.

export function RecommendedCards({
  currentCardId,
  cards = [],
  onCardPress,
}: {
  currentCardId: string;
  cards?: CardModel[];
  /** Tapping a recommended card → open that card's detail. */
  onCardPress?: (card: CardModel) => void;
}) {
  const items: CreditCardOfferItem[] = cards
    .filter((c) => c.id !== currentCardId)
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      image: c.cardImage,
      name: c.name,
      // Mapped cards carry "Flat ₹X Rewards" in `cashback`; show it as-is
      // (prefix split handles the leading word). Sample cards keep "Upto".
      cashback: c.cashbackValue ? `${c.cashbackValue} Rewards` : c.cashback,
      prefix: 'Flat',
    }));
  // No other real cards → no section (it used to fall back to sample cards).
  if (items.length === 0) return null;

  return (
    <View style={{ width: '100%', gap: spacing[12] }}>
      <Text
        variant="body16SemiBold"
        color={colors.text.primary}
        style={{ paddingHorizontal: spacing[16] }}
      >
        Recommended Cards
      </Text>
      {/* REUSED CreditCardOffer — image / name / CashbackBadge stack
          inside a horizontal scroller. Its own contentContainerStyle
          handles the spacing[16] edge padding internally. */}
      <CreditCardOffer
        cards={items}
        onCardPress={
          onCardPress
            ? (id) => {
                const card = cards.find((c) => c.id === id);
                if (card) onCardPress(card);
              }
            : undefined
        }
      />
    </View>
  );
}

// Card category tag id → "Best for spending on" tile (label + filter image).
// Tag ids come from the BankKaro init tag set — the same ids carried on
// card.filterMeta.categoryIds: 1 Fuel · 2 Shopping · 5 Food ordering ·
// 6 Dining · 7 Grocery · 12 Travel · 14 Utility bills. Tags with no matching
// filter image (4 Lounge, 15 UPI) are omitted; the section falls back to the
// carousel's default set when a card maps nothing.
export const TAG_ID_TO_BEST_FOR: Record<number, BestForSpendingCategory> = {
  1: { label: 'Fuel', filterKey: 'fuel' },
  2: { label: 'Shopping', filterKey: 'shopping' },
  5: { label: 'Food Order', filterKey: 'foodOrdering' },
  6: { label: 'Dining', filterKey: 'dining' },
  7: { label: 'Grocery', filterKey: 'grocery' },
  12: { label: 'Travel', filterKey: 'travel' },
  14: { label: 'Bills', filterKey: 'bills' },
};

// ----------------------------------------------------------------------------
// Horizontal card pager (Blinkit-style) — constants
// ----------------------------------------------------------------------------
// Partial snap = a peek carousel (active card centred, neighbours peeking,
// swipe to change). Only the ACTIVE page is full + scrollable (so gorhom only
// ever sees one BottomSheetScrollView); neighbours are light hero previews.
// Scrolling the active card up expands the sheet to full screen (horizontal
// locked, active card grows edge-to-edge); scrolling to the top collapses
// back to the carousel and the neighbours reappear.
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// iOS floats the card half-out via a FloatingCardRail rendered in a native
// FullWindowOverlay above the sheet — the OS keeps that overlay perfectly in
// step with the sheet, so it's butter-smooth there.
//
// ANDROID does NOT float. The Android workaround (teleport the rail into
// gorhom's portal host above the sheet, mirroring the native scroll via a
// shared value) was fundamentally fragile: the scroll mirror drifts from the
// real native offset, producing desync, the wrong card over another card's
// data, blank/"no card" slots and black flashes. So on Android the card is
// CONTAINED inside the masthead — it's just part of the same natively-scrolling
// pager as the rest of the page, so it can never desync. ANDROID_FLOAT stays
// false; set it true only to re-test the (unreliable) floating rail.
//
// FIRST-OPEN FIX (iOS rail): the lifted animatedIndex / animatedPosition shared
// values (down in the wrapper) MUST start at the sheet's CLOSED values (-1 and
// SCREEN_H), not (0, 0) — else on the first present the rail paints off at the
// screen top before gorhom drives the real values.
const IS_ANDROID = Platform.OS === 'android';
const ANDROID_FLOAT = false;
// Card contained fully inside the masthead (no half-out float). Android only,
// and only when the float experiment is OFF.
const CONTAIN_CARD = IS_ANDROID && !ANDROID_FLOAT;
// Whether the half-out floating rail renders at all (iOS always; Android when
// the experiment is on).
const SHOW_RAIL = !IS_ANDROID || ANDROID_FLOAT;
// Contained-card (Android) spacing — card sits this far below the sheet's top
// edge; the content under the card (name + everything below) sits this far
// below the card's bottom.
const CONTAIN_CARD_TOP_GAP = spacing[20];
const CONTAIN_CARD_BOTTOM_GAP = spacing[32];
// Peek-carousel geometry: each card is CARD_W wide, separated by CARD_GAP of
// empty space (the dark scrim shows through → cards read as distinct), with
// CARD_PEEK of the neighbour visible past the gap.
const CARD_PEEK = spacing[12];                 // how much of the neighbour shows
const CARD_GAP = spacing[12];                  // empty gap between cards
const CARD_SIDE = CARD_PEEK + CARD_GAP;        // contentContainer side padding
const CARD_W = SCREEN_W - CARD_SIDE * 2;       // active card width (partial snap)
const CARD_SNAP = CARD_W + CARD_GAP;           // distance between adjacent cards

// Gesture thresholds for the sheet's content pan. gorhom applies an offset
// ONLY if you pass one — with none, the pan claims drags in EVERY direction,
// so on Android it swallowed the horizontal card-pager swipe (iOS's gesture
// system let the nested FlatList through regardless — hence "fine on iOS,
// dead on Android"). activeOffsetY makes the pan wait for clear VERTICAL
// intent (sheet collapse / dismiss); failOffsetX makes it FAIL the moment the
// finger moves horizontally, handing that drag to the pager's FlatList.
const PAN_ACTIVE_OFFSET_Y: [number, number] = [-spacing[12], spacing[12]];
const PAN_FAIL_OFFSET_X: [number, number] = [-spacing[8], spacing[8]];

// Animated FlatList so its horizontal scroll offset can drive the active
// card's full-screen grow on the UI thread (see scrollX below).
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList
) as unknown as typeof FlatList;

// ----------------------------------------------------------------------------
// CardPage — one card in the pager. `active` → full, scrollable content that
// drives the sheet's expand/collapse; otherwise a light hero-only preview.
// Reads useBottomSheet() itself (it renders inside the modal) for animatedIndex
// + snapToIndex.
// ----------------------------------------------------------------------------
function CardPage({
  card,
  active,
  recommended,
  eligibilityDefaults,
  onEligibilityChecked,
  eligibilityResult,
  onLearnHow,
  onViewAllBenefits,
  onRecommendedPress,
  onApply,
  onEditEligibility,
  bottomInset = 0,
  topInset = 0,
  cardIndex,
  scrollX,
}: {
  card: CardModel;
  active: boolean;
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
  /** Apply the THIS card (already bound by the pager). */
  onApply?: () => void;
  onEditEligibility?: () => void;
  /** Safe-area bottom inset — padding under the in-card Apply bar. */
  bottomInset?: number;
  /** Safe-area top inset — pushes the contained card below the status bar at
   *  full screen (Android). */
  topInset?: number;
  /** This card's index in the pager — for the scroll-offset compensation. */
  cardIndex: number;
  /** Live horizontal scroll offset of the pager (UI-thread shared value). */
  scrollX: SharedValue<number>;
}) {
  const sheet = useBottomSheet();
  const { animatedIndex } = sheet;
  // Dismiss this card-detail modal — used when opening the full-screen
  // "All Card Benefits" page so it isn't left floating behind this sheet
  // (gorhom modals portal ABOVE the navigator, so a pushed screen renders
  // under them unless we dismiss first).
  const { dismiss } = useBottomSheetModal();

  // Detail benefits (BankKaro cards/:alias), fetched per card. The pager
  // mounts the neighbour pages, so each one's benefits prefetch the moment the
  // sheet opens — by the time you swipe, the adjacent card's data is already
  // cached (the FloatingCardRail also prefetches the next 5 explicitly).
  // Only fetch the detail when the card's list entry has no USP tiles to show
  // — cards that already carry tiles render instantly and need no request.
  const needsDetail = !(card.tileBenefits?.length);
  const detailAlias = needsDetail ? card.filterMeta?.cardAlias : undefined;
  // `isPending` (not `isLoading`): isLoading is isPending && isFetching, so it
  // dips to false for the render or two between this query being enabled and
  // the fetch actually starting — which is exactly when a freshly swiped-to
  // card becomes active. That dip dropped the benefits skeleton and flashed an
  // empty section. isPending stays true for an enabled query until data lands,
  // so the skeleton holds through the whole swipe-then-load.
  const { data: detailCats, isPending: detailPending } =
    useCardBenefits(detailAlias);

  // Tile items: prefer the list's short USP tiles (icons + crisp copy); when a
  // card's list entry carries none, fall back to the detail "What We Love"
  // benefits so the grid is never empty.
  const benefitItems = useMemo(() => {
    const tiles = (card.tileBenefits ?? []).map((b) => ({
      icon: b.icon,
      // Full continuous benefit — the bold lede + its qualifier read as one
      // sentence. Title alone is too generic here (many USPs share the same
      // "Get 5% Cashback on" lede); the description is what disambiguates them.
      label: b.description ? `${b.title} ${b.description}` : b.title,
    }));
    if (tiles.length) return tiles;
    const all = detailCats?.find((c) => c.key === 'all') ?? detailCats?.[0];
    return (all?.items ?? [])
      .slice(0, 6)
      .map((text) => ({ icon: 'feat-rewards-outline' as IconName, label: text }));
  }, [card.tileBenefits, detailCats]);

  // Skeleton while there's nothing to show AND we're still waiting on a detail
  // fetch: a card with list tiles shows instantly; a card with neither holds
  // the skeleton until its detail resolves (so swiping never reveals an empty
  // section), then settles to "no benefits". The `detailAlias` guard keeps a
  // card with no tiles and no alias from shimmering forever.
  const benefitsLoading =
    benefitItems.length === 0 && !!detailAlias && detailPending;

  // "Best for spending on" — THIS card's own categories (from its tag ids),
  // deduped. Falls back to the carousel's default set only when the card
  // carries no mappable category tags.
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

  // CardDetailMasthead used to receive `animatedIndex` directly and
  // collapse on expand. With two snap points the index now interpolates
  // 0 → 1 across the stage 1 → stage 2 transition, which made the hero
  // shrink at stage 2 (small image, lots of sunken bg above). The user
  // wants stage 2 to look IDENTICAL to the earlier single-snap state,
  // where the masthead stayed fully expanded. Pin progress to 0 with a
  // constant shared value — the masthead now reads "always expanded"
  // regardless of which snap stage the sheet sits at, while the
  // wrapper's stage-1 inset animation still uses the real animatedIndex.
  const mastheadProgress = useSharedValue(0);

  // Only the active page is scrollable, so this stays self-contained per card
  // (a fresh-swiped card always starts un-expanded).
  const expandedRef = useRef(false);
  // Scroll the content up past a small threshold → expand to full screen.
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y > spacing[8] && !expandedRef.current) {
        expandedRef.current = true;
        sheet.snapToIndex(1);
      }
    },
    [sheet]
  );
  // Collapse is handled by gorhom natively (its drag-down-at-top pan snaps
  // full screen → partial → close, smoothly, on both platforms). We just
  // re-arm the expand trigger once the sheet has settled back below stage 2.
  const armExpand = useCallback(() => {
    expandedRef.current = false;
  }, []);
  useAnimatedReaction(
    () => animatedIndex.value < 0.5,
    (collapsed, was) => {
      if (collapsed && was === false) runOnJS(armExpand)();
    }
  );

  // Heavy below-the-fold sections (Best-for carousel, fees, eligibility, the
  // checker form, FAQ, recommended carousel, footer) mount only once this card
  // has been expanded toward full screen. At the peek the active page then
  // renders just the hero + name + benefits — the same weight as a neighbour
  // preview — so a fast multi-card swipe doesn't mount all of that for every
  // card it crosses (which was the source of the "cards keep changing / jank"
  // on rapid swipes). Latched true so collapsing back doesn't unmount it.
  const [showDetail, setShowDetail] = useState(false);
  useAnimatedReaction(
    () => animatedIndex.value > 0.25,
    (expanded) => {
      if (expanded) runOnJS(setShowDetail)(true);
    }
  );

  // Pinned Apply-bar position: at the visible bottom of the card. At the
  // partial snap the visible bottom sits 0.25*SCREEN_H up from the card's
  // bottom; at full screen it's flush (bottom 0). Absolute within the card,
  // so it slides horizontally WITH the card yet stays put on vertical scroll.
  const footerPosStyle = useAnimatedStyle(() => ({
    bottom: interpolate(
      animatedIndex.value,
      [0, 1],
      [0.25 * SCREEN_H, 0],
      Extrapolation.CLAMP
    ),
  }));

  // Rounded top corners: rounded while floating (partial snap) → square at
  // full screen. Neighbour previews stay rounded (they only show at partial).
  const cornerStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius: active
      ? interpolate(animatedIndex.value, [0, 1], [radius['2xl'], 0], Extrapolation.CLAMP)
      : radius['2xl'],
    borderTopRightRadius: active
      ? interpolate(animatedIndex.value, [0, 1], [radius['2xl'], 0], Extrapolation.CLAMP)
      : radius['2xl'],
  }));

  // The page lives in a fixed CARD_W cell. The ACTIVE page grows CARD_W →
  // SCREEN_W (shifting left by the side inset) as it expands so it fills the
  // screen at full size; inactive neighbours hold CARD_W and fade out FAST
  // (gone by ~12% of the expand) so they don't linger beside the scrolling
  // active card.
  const growStyle = useAnimatedStyle(() => {
    if (!active) {
      return {
        width: CARD_W,
        opacity: interpolate(
          animatedIndex.value,
          [0, 0.12],
          [opacity[100], opacity[0]],
          Extrapolation.CLAMP
        ),
      };
    }
    // Full-screen translateX is computed from the LIVE horizontal scroll
    // offset, not a fixed -CARD_SIDE. The card's cell sits at viewport x =
    // (CARD_SIDE + CARD_SNAP*index) - scrollX; to pin its left edge to 0 at
    // full screen we translate by the negative of that. This self-corrects
    // any few-px drift the expand gesture leaves in the (now-locked) scroll
    // position — at the centered rest offset it equals exactly -CARD_SIDE.
    const cellViewportX = CARD_SIDE + CARD_SNAP * cardIndex - scrollX.value;
    return {
      width: interpolate(animatedIndex.value, [0, 1], [CARD_W, SCREEN_W], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            animatedIndex.value,
            [0, 1],
            [0, -cellViewportX],
            Extrapolation.CLAMP
          ),
        },
      ] as unknown as { translateX: number }[],
    };
  });

  // Stage-1 content lift — translates the masthead + everything below
  // it UP by spacing[32] + spacing[12] (= 44 px total) at stage 1,
  // easing back to 0 at stage 2. Lifts the credit card image (and all
  // content below) visually so more reaches the visible area at the
  // smaller snap.
  const contentLiftAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        // When the card is contained in-sheet (taller masthead) → no lift,
        // which would otherwise pull the masthead up and clip it under the
        // sheet top. With the floating rail (iOS, or Android experiment) the
        // masthead is short at partial and lifts like iOS.
        translateY: CONTAIN_CARD
          ? 0
          : interpolate(
              animatedIndex.value,
              [0, 1],
              [-(spacing[32] + spacing[12]), 0],
              Extrapolation.CLAMP
            ),
      },
    ] as unknown as { translateY: number }[],
  }));

  // ---- Inactive neighbour: light hero-only preview (no scroll, no
  // accelerometer). Provides the peek at the carousel edges. ----
  if (!active) {
    return (
      <Animated.View style={[{ height: SCREEN_H, overflow: 'hidden' }, growStyle]}>
        <Animated.View
          style={[
            { flex: 1, backgroundColor: colors.surface.sunken, overflow: 'hidden' },
            cornerStyle,
          ]}
        >
          <Animated.View style={contentLiftAnimStyle}>
            <CardDetailMasthead
              progress={mastheadProgress}
              card={card}
              cardArtScaleProgress={animatedIndex}
              artOpacityProgress={animatedIndex}
              containCard={CONTAIN_CARD}
              topInset={topInset}
              active={false}
            />
            <View
              style={{
                paddingHorizontal: spacing[16],
                // Contained card (Android): 32px from the card's bottom to the
                // name. Floated (iOS): the original tight 12px under the hero.
                paddingTop: CONTAIN_CARD ? CONTAIN_CARD_BOTTOM_GAP : spacing[12],
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
              {/* "Learn how it works?" link — rendered in the neighbour
                  preview too (matching the active page's Feature Section)
                  so it doesn't pop in when the card is promoted to active
                  after a swipe settles. Inert here (no-op press) since the
                  neighbour isn't interactive. */}
              <View style={{ alignSelf: 'center' }}>
                <Button
                  label="Learn how it works?"
                  variant="link"
                  size={36}
                  onPress={() => undefined}
                />
              </View>
            </View>

            {/* Key Benefits — rendered in the neighbour preview too (grid
                only, no action buttons) so the card the user swipes to never
                shows an empty body during the settle window before it's
                promoted to active. Skeleton holds while its detail loads;
                cards with no benefits to fetch render nothing here. */}
            {benefitsLoading || benefitItems.length > 0 ? (
              <View style={{ paddingHorizontal: spacing[16] }}>
                <Grid
                  variant="features"
                  items={benefitItems}
                  loading={benefitsLoading}
                  skeletonCount={benefitItems.length || 6}
                  style={{ width: '100%' }}
                />
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>

        {/* Pinned Apply bar (minimal — button only) so the neighbour's CTA
            slides in alongside it during the swipe. */}
        <Animated.View
          style={[{ position: 'absolute', left: 0, right: 0 }, footerPosStyle]}
        >
          <ApplyBar
            onApply={onApply}
            bottomInset={bottomInset}
            animatedIndex={animatedIndex}
            shimmer={false}
          />
        </Animated.View>
      </Animated.View>
    );
  }

  // ---- Active page: full, scrollable content. The vertical scroll drives
  // the sheet's expand/collapse; the page grows edge-to-edge at full screen.
  // Outer cell is the fixed CARD_W slot (overflow visible so the grow can
  // bleed into the peek gutters); the inner view paints the bg + rounded
  // corners and clips the scroll content. ----
  return (
    <Animated.View
      style={[{ height: SCREEN_H, overflow: 'visible', zIndex: 2 }, growStyle]}
    >
      <Animated.View
        style={[
          { flex: 1, backgroundColor: colors.surface.sunken, overflow: 'hidden' },
          cornerStyle,
        ]}
      >
      <BottomSheetScrollView
        style={{ overflow: 'hidden' }}
        contentContainerStyle={{ paddingBottom: spacing[128] }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
      >
                  {/* Stage-1 content lift wrapper — translates the
                      masthead + all sections UP at the partial snap,
                      easing to 0 at full screen. */}
                  <Animated.View style={contentLiftAnimStyle}>
      {/* Masthead — renders the peach BG (starting from the top of
          the sheet, no push-down) + card art inline. Card art scales
          from 100% (stage 1) to 50% (stage 2) via cardArtScaleProgress
          driven by the sheet's animatedIndex. */}
      <CardDetailMasthead
        progress={mastheadProgress}
        card={card}
        cardArtScaleProgress={animatedIndex}
        artOpacityProgress={animatedIndex}
        containCard={CONTAIN_CARD}
        topInset={topInset}
        active
      />

      {/* Feature Section (h96): name + cashback badge + link Button.
          alignItems centre per Figma node — title on top, badge below,
          link button centered under. Bottom padding bumped to
          spacing[24] (was spacing[12]) so the "Learn how it works?"
          link breathes from the benefits grid below it. */}
      <View
        style={{
          paddingHorizontal: spacing[16],
          // Contained card (Android): 32px from the card's bottom to the name.
          // Floated (iOS): the original tight 12px under the hero.
          paddingTop: CONTAIN_CARD ? CONTAIN_CARD_BOTTOM_GAP : spacing[12],
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
        {/* Wrapping View pulls the link to the sheet's vertical
            centerline. Button (link variant, !fullWidth) bakes
            `alignSelf: 'flex-start'` (Button.tsx:222) which would
            otherwise override the parent's `alignItems: 'center'`
            and left-align the link. The wrapper absorbs the
            alignSelf and `alignSelf: 'center'` on the wrapper does
            the centering. */}
        <View style={{ alignSelf: 'center' }}>
          <Button
            label="Learn how it works?"
            variant="link"
            size={36}
            onPress={() => onLearnHow?.(card)}
          />
        </View>
      </View>

      {/* Additional Features: REUSED Grid `'features'` (2-col benefit
          tiles, cobalt feat-* icons) + full-width "View all benefits"
          Button (subtle, size=44 → h44, fullWidth → 312 inside the
          16-px horizontal padding of a 360-wide sheet). */}
      <View
        style={{
          paddingHorizontal: spacing[16],
          gap: spacing[16],
          alignItems: 'center',
        }}
      >
        {benefitsLoading || benefitItems.length > 0 ? (
          <Grid
            variant="features"
            items={benefitItems}
            loading={benefitsLoading}
            skeletonCount={benefitItems.length || 6}
            style={{ width: '100%' }}
          />
        ) : null}
        <Button
          label="View all benefits"
          variant="subtle"
          size={44}
          fullWidth
          // Dismiss this sheet first (so the benefits page isn't left
          // behind it), then open the page. The navigate handler is provided
          // by the CardDetailSheet wrapper (which has navigation context —
          // this SheetBody renders inside gorhom's portal, outside it).
          onPress={() => {
            dismiss();
            onViewAllBenefits?.(card);
          }}
        />
      </View>

      {/* Everything below the benefits grid is deferred until this card has
          been expanded (showDetail) — see the latch above. Keeps fast swipes
          light: at the peek the active page weighs the same as a preview. */}
      {showDetail ? (
        <>
      {/* Best for spending on — REUSED BestForSpending carousel from
          Carousels. Renders EDGE-TO-EDGE (no horizontal padding wrapper)
          so the carousel's rounded white card spans the full sheet
          width. 32-px gap above (spacing[32]) separates it from the
          benefits-grid section above. */}
      <BestForSpending
        categories={bestForCategories.length > 0 ? bestForCategories : undefined}
        style={{ marginTop: spacing[32] }}
      />

      {/* Fee Section — Annual / Joining stats + price-benefits card.
          32-px gap above (spacing[32]) separates it from the
          BestForSpending carousel. */}
      <View style={{ marginTop: spacing[32] }}>
        <FeeSection
          // Fall back to the card's own fees and no notes, never to the
          // FeeSection sample values (₹1,179 / "₹1,500 cashback…").
          annual={card.detail?.fee.annual ?? { label: 'Annual Fees', amount: card.annualFee, sub: '' }}
          joining={card.detail?.fee.joining ?? { label: 'Joining Fees', amount: card.joiningFee, sub: '' }}
          bulletPoints={card.detail?.fee.bullets ?? []}
        />
      </View>

      {/* Eligibility Section — title + Salaried / Self Employed tabs +
          5-row icon-caption-value list. 32-px gap above to match the
          section-rhythm established by the rest of the sheet. */}
      <View style={{ marginTop: spacing[32] }}>
        <EligibilitySection
          salariedRows={card.detail?.eligibilitySalaried}
          selfEmployedRows={card.detail?.eligibilitySelfEmployed}
        />
      </View>

      {/* Eligibility Checker (embedded) — flat cobalt panel with the
          inline Check Your Eligibility form. 32-px gap above to match
          the section rhythm. Edge-to-edge (no horizontal pad wrapper)
          so the cobalt bg spans the full sheet width. */}
      <View style={{ marginTop: spacing[32] }}>
        <EligibilityChecker
          defaultPincode={eligibilityDefaults?.pincode}
          defaultIncome={eligibilityDefaults?.income}
          defaultIncomeType={eligibilityDefaults?.incomeType ?? null}
          onChecked={onEligibilityChecked}
          result={eligibilityResult}
        />
      </View>

      {/* WHITE ZONE — bg switches from surface.sunken (above) to
          surface.default (white) starting flush below the cobalt
          EligibilityChecker, extending to the bottom of the scroll
          content. Holds the FAQ + Recommended Cards sections.
          paddingTop:32 gives the FAQ its breathing space inside the
          white area; paddingBottom:128 keeps the last cards clear of
          the sticky FooterButtons strip. */}
      <View
        style={{
          backgroundColor: colors.surface.default,
          paddingTop: spacing[32],
          paddingBottom: spacing[24],
        }}
      >
        {/* FAQ Section — 4 REUSED Accordion rows (single-open, first
            open by default). */}
        <FaqSection />

        {/* Recommended Credit Cards — REUSED CreditCardOffer carousel
            fed from SAMPLE_CARDS minus the current card. 32-px gap
            above maintains the section rhythm. */}
        <View style={{ marginTop: spacing[32] }}>
          <RecommendedCards
            currentCardId={card.id}
            cards={recommended}
            onCardPress={onRecommendedPress}
          />
        </View>

        {/* Bottom Footer — REUSED Footer organism (same one used on
            HomeScreen at the end of the credit-cards page).
            theme='dark' = dark text on light bg (white zone). Headline
            + subtext are baked-in via the Footer atom at opacity[40]. */}
        <View style={{ marginTop: spacing[32] }}>
          <Footer
            theme="dark"
            headline={'Found the\nright card?'}
            subtext="Apply now and earn cashback."
          />
        </View>
      </View>
        </>
      ) : null}
                  </Animated.View>
        </BottomSheetScrollView>
      </Animated.View>

      {/* Pinned Apply bar — PART OF THE CARD but absolute, sitting at the
          card's visible bottom: it slides horizontally WITH the card on
          swipe, yet stays put on vertical scroll. Eligibility strip +
          shimmer on the active card. */}
      <Animated.View
        style={[{ position: 'absolute', left: 0, right: 0 }, footerPosStyle]}
      >
        <ApplyBar
          onApply={onApply}
          eligibilityResult={eligibilityResult}
          onEditEligibility={onEditEligibility}
          bottomInset={bottomInset}
          animatedIndex={animatedIndex}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ----------------------------------------------------------------------------
// SheetBody — the horizontal pager host. Renders the visible card list as a
// peek carousel of CardPages (only the active page is full + scrollable),
// locks horizontal paging once expanded to full screen, and keeps a single
// floating close/share header + the active card synced to the parent.
// ----------------------------------------------------------------------------
function SheetBody({
  cards,
  initialCardId,
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
  topInset = 0,
  bottomInset = 0,
  scrollX,
}: {
  cards: CardModel[];
  initialCardId?: string;
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
  topInset?: number;
  bottomInset?: number;
  /** Lifted to the outer component so the FloatingCardRail can mirror the
   *  pager's horizontal offset. Same shared value drives both. */
  scrollX: SharedValue<number>;
}) {
  const sheet = useBottomSheet();
  const { animatedIndex } = sheet;

  const listRef = useRef<FlatList<CardModel>>(null);
  const indexOf = useCallback(
    (id?: string) => {
      const i = id ? cards.findIndex((c) => c.id === id) : -1;
      return i >= 0 ? i : 0;
    },
    [cards]
  );
  const [activeIndex, setActiveIndex] = useState(() => indexOf(initialCardId));

  // Live horizontal scroll offset (UI thread). Drives the active card's
  // full-screen grow + the FloatingCardRail's slide. Created + seeded in the
  // outer component (so the rail can read it) and passed in as `scrollX`.
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  // Re-open for a different tapped card → jump the pager to it (centered).
  // Swipes update activeIndex first, so the guard makes those a no-op.
  useEffect(() => {
    const i = indexOf(initialCardId);
    if (i !== activeIndex) {
      setActiveIndex(i);
      // Reset the shared scroll offset SYNCHRONOUSLY here. `scrollX` is a
      // persistent shared value (lives in the outer component, survives across
      // opens), and the FloatingCardRail reads it to pick the centred card.
      // Without this, reopening on a DIFFERENT card than last viewed makes the
      // rail flash the previously-centred card's art until the async
      // scrollToOffset below lands — the "it shows last time's card image" bug.
      scrollX.value = CARD_SNAP * i;
      requestAnimationFrame(() =>
        listRef.current?.scrollToOffset({ offset: CARD_SNAP * i, animated: false })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCardId]);

  // Lock horizontal paging once expanded to full screen; re-enable when
  // collapsed back to the partial peek carousel.
  const [horizontalEnabled, setHorizontalEnabled] = useState(true);
  useAnimatedReaction(
    () => animatedIndex.value > 0.5,
    (locked, prev) => {
      if (locked !== prev) runOnJS(setHorizontalEnabled)(!locked);
    }
  );

  // Keep `activeIndex` CONTINUOUSLY in step with the centred card (off the live
  // scroll, fires once per card crossed) — NOT only on swipe-end. The active
  // page is the one that grows on expand and owns the scrollview; if its index
  // lagged the centred card (the old settle-only behaviour), a fast fling left
  // them out of sync → expanding grew the wrong card, and the post-settle catch
  // up made the card visibly flip. Tracking live keeps "what's centred" and
  // "what expands" identical at every instant.
  useAnimatedReaction(
    () => {
      const i = Math.round(scrollX.value / CARD_SNAP);
      return i < 0 ? 0 : i >= cards.length ? cards.length - 1 : i;
    },
    (i, prev) => {
      if (i !== prev) runOnJS(setActiveIndex)(i);
    }
  );

  const activeCard = cards[activeIndex] ?? cards[0];

  // Report the settled card to the parent (drives Apply/Share/eligibility
  // targeting). activeIndex itself is now driven live by the reaction above, so
  // here we only bubble up — de-duped via a ref so a fling reports just its
  // final card, not every card it passed through.
  const lastReportedIndex = useRef(indexOf(initialCardId));
  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / CARD_SNAP);
      const clamped = Math.max(0, Math.min(cards.length - 1, i));
      if (clamped !== lastReportedIndex.current) {
        lastReportedIndex.current = clamped;
        onActiveCardChange?.(cards[clamped]);
      }
    },
    [cards, onActiveCardChange]
  );

  // Initial centering. initialScrollIndex is unreliable here: inside the
  // gorhom sheet's entrance animation the FlatList first measures with width 0,
  // so the index→offset math runs against a 0-width viewport and the list is
  // left at flush-left (no left peek; a CARD_SIDE black gap on the right once
  // expanded). Instead we wait for the list's FIRST real (>0) width via
  // onLayout, then imperatively scroll to the centered offset (CARD_SNAP * i).
  const centeredOnceRef = useRef(false);
  const handleListLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (centeredOnceRef.current || e.nativeEvent.layout.width <= 0) return;
      centeredOnceRef.current = true;
      listRef.current?.scrollToOffset({
        offset: CARD_SNAP * activeIndex,
        animated: false,
      });
    },
    [activeIndex]
  );

  // Tapping a recommended card → open THAT card's full-screen page cleanly.
  // We make it active and JUMP the pager to it WITHOUT an animated slide and
  // WITHOUT collapsing: an animated slide while expanded renders two
  // full-width (grown) cards overlapping mid-transition (the bug). Staying at
  // full screen + an instant jump shows only the new card; it mounts fresh so
  // its scroll starts at the top, reading as "opened that card's page".
  const handleRecommendedPress = useCallback(
    (next: CardModel) => {
      const i = cards.findIndex((c) => c.id === next.id);
      if (i < 0) {
        onActiveCardChange?.(next);
        return;
      }
      setActiveIndex(i);
      onActiveCardChange?.(cards[i]);
      // Jump to the centered offset of card i (CARD_SNAP * i). The wide
      // windowSize keeps neighbours mounted so the target isn't blank.
      requestAnimationFrame(() =>
        listRef.current?.scrollToOffset({ offset: CARD_SNAP * i, animated: false })
      );
    },
    [cards, onActiveCardChange]
  );

  // Floating close/share header — fades in as the sheet expands.
  const mastheadHeaderAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [0, 1],
      [opacity[0], opacity[100]],
      Extrapolation.CLAMP
    ),
  }));

  // The active cell must stack ABOVE its neighbours so its full-bleed grow at
  // stage 2 covers the peek gutters instead of rendering behind the
  // (transparent) separator + next cell (which showed a dark edge strip).
  // zIndex has to live on the FlatList CELL wrapper (cross-cell stacking),
  // not the inner view — hence a custom CellRendererComponent.
  const CellRenderer = useCallback(
    ({ index, style, ...rest }: { index: number; style?: unknown }) => (
      <View
        {...rest}
        style={[
          style as never,
          { zIndex: index === activeIndex ? 2 : 1, overflow: 'visible' },
        ]}
      />
    ),
    [activeIndex]
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CardModel>) => (
      // Cell is a uniform CARD_SNAP wide (CARD_W card + CARD_GAP gap baked in
      // on the trailing side). No ItemSeparatorComponent — that was being
      // skipped at a virtualization boundary, dropping one 12px gap and
      // shifting every card past it left by CARD_GAP. The card (CARD_W) sits
      // flush-left in the cell; the CARD_GAP remainder is the visual gap.
      <View style={{ width: CARD_SNAP, height: SCREEN_H, overflow: 'visible' }}>
        <CardPage
          card={item}
          active={index === activeIndex}
          recommended={recommended}
          eligibilityDefaults={eligibilityDefaults}
          onEligibilityChecked={onEligibilityChecked}
          eligibilityResult={eligibilityResult}
          onLearnHow={onLearnHow}
          onViewAllBenefits={onViewAllBenefits}
          onRecommendedPress={onRecommendedPress ? handleRecommendedPress : undefined}
          onApply={onApply ? () => onApply(item) : undefined}
          onEditEligibility={onEditEligibility}
          bottomInset={bottomInset}
          topInset={topInset}
          cardIndex={index}
          scrollX={scrollX}
        />
      </View>
    ),
    [
      activeIndex,
      recommended,
      eligibilityDefaults,
      onEligibilityChecked,
      eligibilityResult,
      onLearnHow,
      onViewAllBenefits,
      onRecommendedPress,
      handleRecommendedPress,
      onApply,
      onEditEligibility,
      bottomInset,
      topInset,
      scrollX,
    ]
  );

  return (
    <View style={{ flex: 1 }}>
      <AnimatedFlatList
        ref={listRef}
        onLayout={handleListLayout}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        data={cards}
        extraData={activeIndex}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        CellRendererComponent={CellRenderer}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={horizontalEnabled}
        snapToInterval={CARD_SNAP}
        decelerationRate="fast"
        disableIntervalMomentum
        // Every cell is a uniform CARD_SNAP wide (gap baked in, no separators),
        // so the pitch is exactly CARD_SNAP for ALL cards — no accumulation,
        // nothing to miscount. getItemLayout reports the CENTERED scroll offset
        // (CARD_SNAP * i), CARD_SIDE less than the true content offset (the
        // contentContainer pad). That's deliberate: initialScrollIndex then
        // sets scrollX to this value, opening card i centered. snapToInterval,
        // the momentum handler, and the grow transform all agree on CARD_SNAP*i
        // as card i's rest position. The constant CARD_SIDE difference only
        // nudges visibility windowing — harmless with windowSize=5.
        getItemLayout={(_, i) => ({
          length: CARD_SNAP,
          offset: CARD_SNAP * i,
          index: i,
        })}
        initialScrollIndex={activeIndex}
        onScrollToIndexFailed={({ index }) =>
          requestAnimationFrame(() =>
            listRef.current?.scrollToOffset({ offset: CARD_SNAP * index, animated: false })
          )
        }
        contentContainerStyle={{ paddingHorizontal: CARD_SIDE }}
        onMomentumScrollEnd={handleMomentumEnd}
        // Render a wider window so the active card + its neighbours are always
        // mounted — prevents the "blank translucent sheet" when the pager
        // settles on a card virtualization hadn't rendered yet.
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        removeClippedSubviews={false}
      />

      {/* Floating close / share header — pinned over the active card,
          fades in as the sheet expands to full screen. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: 'absolute',
            top: topInset + spacing[12],
            left: 0,
            right: 0,
            zIndex: opacity[100],
          },
          mastheadHeaderAnimStyle,
        ]}
      >
        <MastheadHeader
          iconType="solid"
          // Chevron-down "collapse" per Figma 3914:43753 (was ✕).
          leading="collapse"
          trailingGlyph="share"
          onLeadingPress={() => sheet.close()}
          onTrailingPress={() => onSharePress?.(activeCard)}
        />
      </Animated.View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// ApplyBar — the Apply Now CTA (+ optional eligibility result strip + a
// continuous shimmer nudge). Pinned (absolute) at the visible bottom of each
// card by CardPage, so it stays put on vertical scroll yet SLIDES horizontally
// WITH the card when swiping the pager. `animatedIndex` animates the bottom
// safe-area padding (0 at the partial snap → bottomInset at full screen).
// ----------------------------------------------------------------------------
// Shimmer constants — the highlight band's width + animation timing.
const SHIMMER_BAND_W = 110;
const SHIMMER_SWEEP_MS = 1500;
const SHIMMER_PAUSE_MS = 1500;

export function ApplyBar({
  onApply,
  eligibilityResult,
  onEditEligibility,
  bottomInset = 0,
  animatedIndex,
  shimmer = true,
}: {
  onApply?: () => void;
  eligibilityResult?: EligibilityOutcome | null;
  onEditEligibility?: () => void;
  bottomInset?: number;
  animatedIndex?: SharedValue<number>;
  shimmer?: boolean;
}) {
  // Bottom safe-area padding grows in only as the sheet expands to full screen
  // (at the partial snap the bar sits mid-screen, no home indicator under it).
  const padStyle = useAnimatedStyle(() => {
    const extra = animatedIndex
      ? interpolate(animatedIndex.value, [0, 1], [0, bottomInset], Extrapolation.CLAMP)
      : bottomInset;
    return { paddingBottom: spacing[16] + extra };
  });

  // Continuous L→R shine on the Apply Now CTA — a soft white band
  // that sweeps across the orange button to nudge the user. Loops
  // forever with a brief pause between sweeps so it nudges without
  // feeling chaotic.
  const [btnWidth, setBtnWidth] = useState(0);
  const shimmerProgress = useSharedValue(0);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setBtnWidth(e.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    if (btnWidth <= 0 || !shimmer) return;
    // 0 → 1 sweep, then snap back to 0 (instant), then delay before
    // next sweep. Repeated infinitely.
    shimmerProgress.value = 0;
    shimmerProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: SHIMMER_SWEEP_MS,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(SHIMMER_PAUSE_MS, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
  }, [btnWidth, shimmerProgress, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shimmerProgress.value,
          [0, 1],
          [-SHIMMER_BAND_W, btnWidth + SHIMMER_BAND_W],
          Extrapolation.CLAMP
        ),
      },
    ] as unknown as { translateX: number }[],
  }));

  return (
    // One shadowed container: the optional eligibility result strip + the
    // Apply Now action row (Figma 3914:38886). The top shadow separates it
    // from the content scrolling above.
    <View style={[{ backgroundColor: colors.surface.default }, elevation.light.up]}>
      {eligibilityResult ? (
        <EligibilityFooterStrip result={eligibilityResult} onEdit={onEditEligibility} />
      ) : null}

      {/* Action row — px16 / py14 (+ animated safe-area at the bottom),
          full-width saffron CTA. onLayout drives the shimmer width. */}
      <Animated.View
        onLayout={handleLayout}
        style={[
          {
            overflow: 'hidden',
            flexDirection: 'row',
            paddingHorizontal: spacing[16],
            // Figma 3914:43756: 72-dp bar = 12 top + 44 button + 16 bottom.
            paddingTop: spacing[12],
          },
          padStyle,
        ]}
      >
          <View style={{ flex: 1 }}>
            <Button
              label="Apply Now"
              variant="solid"
              tone="main"
              size={44}
              fullWidth
              onPress={onApply}
            />
          </View>

          {/* Shimmer overlay — sweeps L→R across the button. White
              highlight on the orange CTA = visual nudge to tap.
              pointerEvents='none' keeps presses going to the Button. */}
          {shimmer && btnWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: SHIMMER_BAND_W,
                },
                shimmerStyle,
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,0.55)',
                  'rgba(255,255,255,0)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>
  );
}

// ---------------------------------------------------------------------------
// FloatingCardRail — the half-out hero (iOS only). Rendered in a native
// FullWindowOverlay ABOVE the gorhom sheet (the sheet clips its own content, so
// the card can't bleed past the top edge from inside). Pinned to the sheet's
// live top (animatedPosition)
// so the top ~40% of each card floats above the rounded edge / the bottom
// ~60% overlaps the peach masthead. Mirrors the pager: a row of cards at
// CARD_SNAP pitch, slid by the same scrollX so a swipe moves these in lockstep.
// Fades out as the sheet expands (CROSSFADE_HI) — the in-sheet masthead art
// fades in and takes over for the full-screen state.
// ---------------------------------------------------------------------------
function FloatingCardRail({
  cards,
  activeInitialIndex,
  animatedIndex,
  animatedPosition,
  scrollX,
  tiltSuppress,
  closing,
}: {
  cards: CardModel[];
  /** Index the rail opens centred on. The live centre then tracks scrollX
   *  CONTINUOUSLY below (not just on settle) so the mount window always
   *  contains whatever card is centred — even mid-fling across several cards.
   *  The earlier settle-only version left the centre running past the mounted
   *  window during a fast fling → blank slot (black) or an edge card showing
   *  the wrong data. The horizontal POSITION is still a pure scrollX worklet
   *  (untouched by these re-renders); CardArt is memoised so a window shift
   *  only mounts the newly-entered card, never re-renders the mounted ones. */
  activeInitialIndex: number;
  animatedIndex: SharedValue<number>;
  animatedPosition: SharedValue<number>;
  scrollX: SharedValue<number>;
  /** Flattens the active card's gyro while the pager is swiped (glue). */
  tiltSuppress: SharedValue<number>;
  /** 1 while the sheet is animating to dismissed → fade the rail out fast. */
  closing: SharedValue<number>;
}) {
  // Live centre index, tracked off scrollX. Fires only when the centred card
  // actually changes (once per card crossed), so a fling triggers a handful of
  // cheap window re-renders — the visible card never hitches because its slide
  // is the worklet-driven rail transform.
  const [activeIdx, setActiveIdx] = useState(activeInitialIndex);
  useAnimatedReaction(
    () => {
      const i = Math.round(scrollX.value / CARD_SNAP);
      return i < 0 ? 0 : i >= cards.length ? cards.length - 1 : i;
    },
    (i, prev) => {
      if (i !== prev) runOnJS(setActiveIdx)(i);
    }
  );

  // Warm the cache for the next 5 cards (+ the previous one): both the card
  // IMAGE and the detail BENEFITS, so swiping lands on a fully-ready card
  // instead of waiting on the network each time.
  const queryClient = useQueryClient();
  useEffect(() => {
    const urls: string[] = [];
    for (let d = -1; d <= 5; d += 1) {
      const c = cards[activeIdx + d];
      const src = c?.cardImage;
      if (src && typeof src === 'object' && 'uri' in src && src.uri) {
        urls.push(src.uri as string);
      }
      // Detail benefits — only for cards that lack list tiles (those are the
      // ones that would otherwise show an empty grid on swipe).
      if (c && !c.tileBenefits?.length) {
        prefetchCardBenefits(queryClient, c.filterMeta?.cardAlias);
      }
    }
    // 'memory-disk' must match the <Image cachePolicy> in CardArt, else the
    // prefetched bytes land in a different cache the component never reads.
    if (urls.length) ExpoImage.prefetch(urls, 'memory-disk');
  }, [activeIdx, cards, queryClient]);

  const railStyle = useAnimatedStyle(() => {
    // Base: visible at the partial peek (1), fades out as the sheet EXPANDS to
    // full screen (the in-sheet hero takes over). Solid below 0 (during the
    // open slide-up) so the card reads as a solid object rising with the sheet.
    const base = interpolate(
      animatedIndex.value,
      [0, CROSSFADE_HI],
      [1, 0],
      Extrapolation.CLAMP
    );
    // Close fade: ONLY while dismissing, multiply in a quick fade as the sheet
    // drops below the peek (animatedIndex 0 → −0.3). This stops the floating
    // card from lingering at the screen bottom on close, without altering the
    // open / expand behaviour (closeFactor is forced to 1 when not closing).
    const closeFactor =
      closing.value > 0.5
        ? interpolate(animatedIndex.value, [-0.3, 0], [0, 1], Extrapolation.CLAMP)
        : 1;
    return {
      opacity: base * closeFactor,
      transform: [
        { translateX: -scrollX.value },
        // Pin: top ~40% of the card floats above the sheet's top edge.
        { translateY: animatedPosition.value - 0.4 * CARD_ART_H },
      ] as unknown as { translateX: number }[],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        railStyle,
      ]}
    >
      {cards.map((c, i) => {
        // Window: mount the cards around the active one (3 back, 5 forward —
        // users mostly swipe forward) so they're already decoded + ready when
        // swiped to, and so a fast fling can't outrun the mounted set before
        // the continuous activeIdx tracking catches up. Beyond this they're
        // still prefetched into cache, so mounting them is fast too.
        if (i < activeIdx - 3 || i > activeIdx + 5) return null;
        return (
          <View
            key={c.id}
            style={{
              position: 'absolute',
              top: 0,
              left: (SCREEN_W - CARD_ART_W) / 2 + CARD_SNAP * i,
            }}
          >
            <CardArt
              card={c}
              tilt={i === activeIdx}
              tiltSuppress={tiltSuppress}
            />
          </View>
        );
      })}
    </Animated.View>
  );
}

const CardDetailSheetIOS = forwardRef<
  BottomSheetModal,
  CardDetailSheetProps
>(({ card, cards, initialCardId, index = 0, onActiveCardChange, recommended, eligibilityDefaults, eligibleAliases, onEligibilityChecked, onShowResultSheet, onApply, onRecommendedPress, onLearnHow, onViewAllBenefits, onSharePress, onEditEligibility }, ref) => {
  // Two-stage sheet (Blinkit / Zomato style):
  //   index 0 = STAGE 1 — 75% partial peek (floating card, scrim around it).
  //   index 1 = STAGE 2 — 100% full page (flush, top corners only).
  // The active card's first upward scroll snaps stage 1 → stage 2
  // (CardPage.handleScroll); a drag-down at the top collapses it back.
  const snapPoints = useMemo(() => ['75%', '100%'], []);
  const insets = useSafeAreaInsets();

  // Sheet transition spring — governs open / expand (75%→100%) / collapse /
  // dismiss. gorhom's default is a very stiff, near-instant spring that snaps
  // hard; this is a softer, slightly slower spring that glides between snaps.
  // overshootClamping keeps it from bouncing past full screen (a bounce reads
  // as cheap for a content page) while still feeling fluid, not abrupt.
  const sheetAnimationConfigs = useBottomSheetSpringConfigs({
    damping: 38,
    stiffness: 320,
    mass: 1,
    overshootClamping: true,
  });

  // gorhom's modal renders into its own full-screen (unclipped) portal host.
  // On Android we teleport the FloatingCardRail into that SAME host so it
  // stacks ABOVE the sheet (the iOS FullWindowOverlay path can't — it's
  // iOS-only). `true` = don't throw if somehow outside the provider.
  const modalHostName = useBottomSheetModalInternal(true)?.hostName;

  // Resolved pager data (single card → 1-item list), shared by SheetBody +
  // the FloatingCardRail so both render the same cards in the same order.
  const resolvedCards = useMemo(
    () => (cards && cards.length ? cards : card ? [card] : []),
    [cards, card]
  );
  const initialIdx = useMemo(() => {
    const id = initialCardId ?? card?.id;
    const i = id ? resolvedCards.findIndex((c) => c.id === id) : -1;
    return i >= 0 ? i : 0;
  }, [resolvedCards, initialCardId, card]);

  // Shared values lifted here so the FloatingCardRail (a sibling, portaled
  // above the sheet) can read the sheet's live position + the pager offset.
  // gorhom writes the sheet's top-Y into animatedPosition and the snap
  // progress into animatedIndex (the same SVs useBottomSheet() exposes inside).
  //
  // CRITICAL: seed these at the CLOSED rest state — animatedIndex = -1 (sheet
  // dismissed) and animatedPosition = SCREEN_H (top-Y off the bottom). Seeding
  // them at (0, 0) was the first-open bug: at rest the rail then read "peek
  // snap, top edge at y=0", so on the first present it briefly painted the
  // floating card at the screen top while the in-sheet art was still gated to
  // opacity 0 → empty peach masthead until the second open. gorhom overwrites
  // both the instant the open animation runs; the seed only governs frame 0.
  const animatedIndex = useSharedValue(-1);
  const animatedPosition = useSharedValue(SCREEN_H);
  const scrollX = useSharedValue(CARD_SNAP * initialIdx);
  // 0 = card free to gyro-tilt; 1 = flattened. DERIVED from scrollX itself
  // (not scroll-drag callbacks, which didn't fire reliably for the nested
  // horizontal FlatList): when scrollX sits ON a card's snap the card is at
  // rest → full gyro; the moment it moves OFF-snap (a swipe) it flattens so the
  // lean/parallax can't detach the card from the sheet. Same value that slides
  // the card drives the flatten, so they're perfectly correlated.
  // The old version ramped suppression over the first/last ~10% of a card's
  // travel, so the floating card still leaned (and its parallax translateX
  // detached it from the rail) at the start of a swipe, and snapped a transient
  // forward-tilt as it arrived. Instead: the moment the card leaves its rest
  // position it flattens INSTANTLY (stays glued to the rail, translating in
  // lockstep for the whole swipe); once it settles back on a snap the gyro tilt
  // eases in GENTLY (~320ms) so there's no forward-lean snap on arrival.
  const tiltSuppress = useSharedValue(0);
  useAnimatedReaction(
    () => {
      const nearest = Math.round(scrollX.value / CARD_SNAP) * CARD_SNAP;
      return Math.abs(scrollX.value - nearest) < 1.5; // settled on a card?
    },
    (settled, prev) => {
      if (settled === prev) return;
      tiltSuppress.value = settled
        ? withTiming(0, { duration: 320 }) // arrived → ease tilt back in
        : 1; // swiping → flat now, glued to the rail
    }
  );
  // 1 only while the sheet is animating to CLOSED (dismiss). Lets the rail fade
  // out quickly on close so the floating card doesn't linger at the screen
  // bottom — without touching the open/expand fade behaviour.
  const closing = useSharedValue(0);

  // Mount the rail only while the sheet is open so the floating card never
  // lingers on Home (and, on iOS, its accelerometer only runs then). Driven by
  // gorhom's JS lifecycle callbacks (onAnimate to mount at open-start, onChange
  // to unmount once fully closed) — NOT an animated reaction. The reaction read
  // the seeded animatedIndex before gorhom drove it, which on the first present
  // raced the portal mount; the callbacks fire deterministically on the real
  // transition.
  const [sheetOpen, setSheetOpen] = useState(false);

  // Expand (75%→100%) / minimise (100%→75%) haptics. Skip the initial open
  // (−1→0, the card tap already ticked) and the close (→ −1).
  const lastSheetIndex = useRef(0);
  const handleSheetChange = useCallback((i: number) => {
    const prev = lastSheetIndex.current;
    if (i > prev && i > 0) play('sheetExpand');
    else if (i >= 0 && i < prev) play('sheetCollapse');
    lastSheetIndex.current = i;
    // Unmount the floating rail once the sheet has fully closed.
    if (i === -1) setSheetOpen(false);
  }, []);

  // On the OPEN transition (fromIndex −1), snap the shared scroll offset to the
  // opening card before the FloatingCardRail mounts — `scrollX` persists across
  // opens, so this prevents the rail flashing the last-viewed card's art for a
  // frame. (Fires at animation start, ahead of the rail's sheetOpen mount.)
  const handleAnimate = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === -1) scrollX.value = CARD_SNAP * initialIdx;
      // Mount the rail the moment an OPEN animation begins (toIndex ≥ 0), so the
      // portal child is registered alongside the modal on the very first
      // present — no animated-reaction lag, no first-open empty masthead.
      if (toIndex >= 0) setSheetOpen(true);
      // Flag the dismiss transition so the rail fades out fast (see railStyle).
      closing.value = toIndex === -1 ? 1 : 0;
    },
    [scrollX, initialIdx, closing]
  );

  // Navigation must be read HERE (the wrapper renders inside HomeScreen, i.e.
  // inside the NavigationContainer) — NOT inside SheetBody, which gorhom
  // mounts in a portal outside the nav tree (would throw "Couldn't find a
  // navigation object"). The handler is passed down to SheetBody's CTA.
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleViewAllBenefits = useCallback(
    (c: CardModel) => {
      if (onViewAllBenefits) {
        onViewAllBenefits(c);
        return;
      }
      navigation.navigate('AllCardBenefits', {
        alias: c.filterMeta?.cardAlias,
        cardName: c.name,
      });
    },
    [navigation, onViewAllBenefits]
  );

  // Per-card eligibility outcome (drives the checker banner + footer strip).
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityOutcome | null>(null);

  // Whether the user already had eligibility details (from Home) when this
  // card opened. Captured at open time so a manual re-check inside the sheet
  // doesn't flip paths after the bubble-up sets the defaults. Drives the
  // inline-vs-result-sheet branch in handleEligibilityChecked.
  const hadDefaultsRef = useRef(false);
  useEffect(() => {
    hadDefaultsRef.current = !!eligibilityDefaults;
    // Capture ONLY on card change — re-running when eligibilityDefaults
    // later changes (after a fresh in-sheet check bubbles up) would wrongly
    // flip this card from the "fresh entry" path to the "pre-filled" path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  // Path A — details already entered on Home: resolve + show this card's
  // result INLINE the moment the sheet opens (no tap needed). Recomputes if
  // the Home details / eligible set change. No defaults → clear (Path B,
  // where the result opens as a sheet on Check instead).
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
  }, [card?.id, eligibilityDefaults, eligibleAliases, card?.filterMeta?.cardAlias]);

  // Wrap the caller's onEligibilityChecked: resolve THIS card's outcome, then
  // branch on whether details pre-existed —
  //   Path A (pre-filled on Home) → show the result INLINE in the section.
  //   Path B (fresh entry here)   → open the matching colored result sheet.
  // Either way, bubble the raw result up for the Home list filter + prefill.
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

  // "Edit" on the footer strip → ask the screen to present the
  // EligibilityCheckerSheet (prefilled). Once the user re-checks, the
  // bubbled-up defaults flow back in and the inline result + strip
  // recompute via the Path-A effect above — no need to clear here.
  const handleEditEligibility = useCallback(() => {
    onEditEligibility?.();
  }, [onEditEligibility]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        // Darkened — opacity[50] (0.5) → opacity[80] (0.8), next value
        // up on the DS opacity scale. Helps the floating card at stage
        // 1 read more clearly against the scrim.
        opacity={opacity[80]}
      />
    ),
    []
  );

  return (
    <>
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      onAnimate={handleAnimate}
      animationConfigs={sheetAnimationConfigs}
      animatedIndex={animatedIndex}
      animatedPosition={animatedPosition}
      index={index}
      // topInset 0 → stage 2 ('100%') is a TRUE full-screen page: the peach
      // masthead extends under the status bar with no dark scrim gap above
      // it. The floating header is offset by insets.top instead (passed to
      // SheetBody) so the close/share buttons still clear the notch.
      topInset={0}
      enableDynamicSizing={false}
      enablePanDownToClose
      // Content panning ON so gorhom natively handles collapse + dismiss via a
      // drag-down at the top (smooth, both platforms). The offsets below scope
      // that pan to VERTICAL drags only: activeOffsetY = it activates on clear
      // vertical intent; failOffsetX = it FAILS on horizontal movement, so the
      // card-pager FlatList receives left/right swipes (this is what was
      // missing — without failOffsetX the pan ate horizontal swipes on
      // Android). Expand is still driven by the active page's onScroll →
      // snapToIndex; collapse re-arms that trigger via an animatedIndex reaction.
      activeOffsetY={PAN_ACTIVE_OFFSET_Y}
      failOffsetX={PAN_FAIL_OFFSET_X}
      backdropComponent={renderBackdrop}
      // Sheet's own bg is transparent — the wrapper INSIDE paints the
      // sunken bg with rounded top corners. The wrapper also drives
      // the per-stage L/R margin via `useAnimatedStyle` (UI thread,
      // reads animatedIndex directly), so the floating-card look
      // animates smoothly without any React-state re-render glitch.
      backgroundStyle={{ backgroundColor: 'transparent' }}
      // CardDetailMasthead doesn't ship its own drag handle.
      handleComponent={() => null}
    >
      {card ? (
        <SheetBody
          cards={resolvedCards}
          initialCardId={initialCardId ?? card.id}
          scrollX={scrollX}
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
          onEditEligibility={handleEditEligibility}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      ) : null}
    </BottomSheetModal>

    {/* Half-out hero — rendered ABOVE the sheet (the sheet clips its own
        content, so the card can't bleed past the top edge from inside).
        iOS: a native FullWindowOverlay. Android: teleported into gorhom's own
        portal host via <Portal> (the FullWindowOverlay is a no-op there). Both
        render full-screen and unclipped; the rail pins itself to the sheet's
        live top via animatedPosition. */}
    {card && sheetOpen && SHOW_RAIL ? (
      IS_ANDROID ? (
        <Portal hostName={modalHostName}>
          <FloatingCardRail
            cards={resolvedCards}
            activeInitialIndex={initialIdx}
            animatedIndex={animatedIndex}
            animatedPosition={animatedPosition}
            scrollX={scrollX}
            tiltSuppress={tiltSuppress}
            closing={closing}
          />
        </Portal>
      ) : (
        <FullWindowOverlay>
          <FloatingCardRail
            cards={resolvedCards}
            activeInitialIndex={initialIdx}
            animatedIndex={animatedIndex}
            animatedPosition={animatedPosition}
            scrollX={scrollX}
            tiltSuppress={tiltSuppress}
            closing={closing}
          />
        </FullWindowOverlay>
      )
    ) : null}
    </>
  );
});

CardDetailSheetIOS.displayName = 'CardDetailSheetIOS';

// ----------------------------------------------------------------------------
// Platform dispatcher
// ----------------------------------------------------------------------------
// iOS keeps the two-stage (75% → 100%) sheet with the floating card rail above
// — it composites perfectly there. Android gets a purpose-built FULL-SCREEN
// pager instead (CardDetailScreenAndroid): tapping a card opens it full screen
// directly (no half-sheet, no grow-to-expand step — the two biggest sources of
// the Android jitter), with a swipe-driven lean and swipe-down / back to close.
// Same forwardRef contract (present()/dismiss() + props) so HomeScreen's call
// site is untouched and platform-agnostic.
export const CardDetailSheet = forwardRef<
  BottomSheetModal,
  CardDetailSheetProps
>((props, ref) =>
  IS_ANDROID ? (
    <CardDetailScreenAndroid ref={ref} {...props} />
  ) : (
    <CardDetailSheetIOS ref={ref} {...props} />
  )
);

CardDetailSheet.displayName = 'CardDetailSheet';
