/**
 * FoundationCheck — TEMPORARY verification screen.
 *
 * Mounts as the app's first route so the design foundations can be
 * eyeballed on a phone in one place:
 *   1. COLORS — every leaf of the semantic colors token, rendered as a
 *      44x44 rounded swatch + its dotted token path.
 *   2. GRADIENTS — every entry in src/tokens/gradients.ts rendered as a
 *      full-width 56h bar via expo-linear-gradient. spotlightRadial gets
 *      a label-only placeholder (LinearGradient can't do radial).
 *   3. ICONS — every SVG in src/assets/icons rendered in a 4-column grid
 *      via the Icon atom, with the filename as a caption.
 *
 * Strictly token-bound. Delete the route entry in RootNavigator (and
 * this file) once the foundations are signed off.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  Text,
  Button,
  Icon,
  Input,
  OtpInput,
  TextArea,
  CashbackBadge,
  Badge,
  Tag,
  StatusBadge,
  Chip,
  Checkbox,
  Radio,
  Switch,
  Divider,
  DividerVertical,
  Indicator,
  Timer,
  ICON_NAMES,
} from '../atoms';
import type { StatusBadgeStatus } from '../atoms';
import {
  Choice,
  TermsAndConditions,
  TabPrimary,
  TabsSecondary,
  ListRow,
  Tooltip,
  Accordion,
  Toast,
  InlineMessage,
  StripAlert,
  CardFeeStrip,
  BrandLogoGrid,
  SearchBar,
} from '../molecules';
import type { ToneName } from '../tokens';
import type { IconName } from '../atoms';
import {
  CreditCardOffer,
  CategoryTiles,
  HowItWorks,
  MilestoneStat,
  PromoBanner,
  CardCarousel,
  BottomNav,
  Header,
  HomeHeader,
  MastheadHeader,
  Footer,
  FooterButtons,
  BottomSheet,
  CardTile,
  Masthead,
  Grid,
  EligibilityMasthead,
  EligibleSheet,
  MaybeSheet,
  EligibilityCheckerSheet,
  BottomSheetHeader,
  BottomSheetBody,
  SearchTopSheet,
  StoreAboutBrand,
  StoreCashbackDetails,
  StoreOfferDetails,
  StoreBenefitDetails,
  StoreCashbackTimelines,
  StoreTermsConditions,
  StoreSimilarStore,
} from '../organisms';
import { logos } from '../assets/logos';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SearchTopSheetVariant } from '../organisms';
import {
  BottomSheetModal as GorhomBottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import type {
  BottomSheetModal,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type {
  BottomSheetTemplate,
  BottomSheetBodyProps,
  FooterButtonsProps,
} from '../organisms';
import type { BottomNavTab } from '../organisms';
import {
  colors,
  gradients,
  spacing,
  radius,
  borderWidth,
  iconSize,
  sizing,
} from '../tokens';
import { images } from '../assets/images';
import {
  AMAZON_RATE_ROWS,
  AMAZON_TC_INTRO,
  AMAZON_TC_BULLETS,
} from '../data/amazonOffers';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FoundationCheck'>;

// ----------------------------------------------------------------------------
// Color flattener — walk the semantic colors object to produce { path, value }
// pairs for every leaf string.
// ----------------------------------------------------------------------------
type ColorEntry = { path: string; value: string };

function flattenColors(
  obj: Record<string, unknown>,
  prefix = ''
): ColorEntry[] {
  const out: ColorEntry[] = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out.push({ path, value });
    } else if (value && typeof value === 'object') {
      out.push(...flattenColors(value as Record<string, unknown>, path));
    }
  }
  return out;
}

const COLOR_ENTRIES: ColorEntry[] = flattenColors(
  colors as unknown as Record<string, unknown>
);

// Amazon offer-detail bottom-sheet content lives in src/data/amazonOffers
// (shared with the OffersBrandAmazon screen).

// ----------------------------------------------------------------------------
// Section header
// ----------------------------------------------------------------------------
function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: spacing[4], marginBottom: spacing[16] }}>
      <Text variant="heading24Bold" color={colors.text.primary}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body14Regular" color={colors.text.tertiary}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Small label used inside sections (e.g. "Sizes (solid · main)")
// ----------------------------------------------------------------------------
function ButtonLabel({ text }: { text: string }) {
  return (
    <Text variant="body12SemiBold" color={colors.text.tertiary}>
      {text.toUpperCase()}
    </Text>
  );
}

// ----------------------------------------------------------------------------
// COLORS
// ----------------------------------------------------------------------------
function ColorRow({ entry }: { entry: ColorEntry }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[12],
        paddingVertical: spacing[6],
      }}
    >
      <View
        style={{
          width: spacing[40] + spacing[4], // 44
          height: spacing[40] + spacing[4],
          borderRadius: radius.md,
          backgroundColor: entry.value,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
        }}
      />
      <View style={{ flex: 1, gap: spacing[2] }}>
        <Text variant="body14Medium" color={colors.text.primary}>
          {entry.path}
        </Text>
        <Text variant="caption10Regular" color={colors.text.tertiary}>
          {entry.value}
        </Text>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// GRADIENTS
// ----------------------------------------------------------------------------
const GRADIENT_BAR_HEIGHT = 56;

type AnyGradient = Record<string, unknown> & {
  type?: string;
  colors?: readonly string[];
  locations?: readonly number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

function GradientRow({
  name,
  spec,
}: {
  name: string;
  spec: AnyGradient;
}) {
  const isRadial = spec.type === 'radial';
  const sharedShellStyle: StyleProp<ViewStyle> = {
    width: '100%',
    height: GRADIENT_BAR_HEIGHT,
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
    borderColor: colors.border.subtle3,
    overflow: 'hidden',
  };

  return (
    <View style={{ gap: spacing[6], marginBottom: spacing[12] }}>
      <Text variant="body14SemiBold" color={colors.text.primary}>
        {name}
        {isRadial ? (
          <Text variant="caption10Medium" color={colors.text.tertiary}>
            {'  · radial (LinearGradient can\'t render — label only)'}
          </Text>
        ) : null}
      </Text>

      {isRadial ? (
        <View
          style={[
            sharedShellStyle,
            {
              backgroundColor: colors.surface.sunken,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text variant="body12Regular" color={colors.text.tertiary}>
            radial: {(spec.colors ?? []).join(' → ')}
          </Text>
        </View>
      ) : (
        <View style={sharedShellStyle}>
          <LinearGradient
            colors={(spec.colors ?? []) as unknown as readonly [string, string, ...string[]]}
            locations={spec.locations as unknown as readonly [number, number, ...number[]] | undefined}
            start={spec.start}
            end={spec.end}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------
// ICONS — 4-column grid via flexBasis (with gap, RN computes widths cleanly)
// ----------------------------------------------------------------------------
const ICON_COLS = 4;
const ICON_GRID_GAP = spacing[12];

// ----------------------------------------------------------------------------
// IMAGES — per-folder grid, 3 cells per row. Cards are wider/taller (~132×84)
// since they're horizontal card-shaped art; everything else is ~96×64.
// Frame sizes are content dimensions (not theme tokens). resizeMode="contain"
// shows the whole image without crop/distort, so visually-comparing aspect
// ratios is honest.
// ----------------------------------------------------------------------------
const IMAGE_COLS = 3;
const IMAGE_CELL_GAP = spacing[12];
const CARD_IMAGE_FRAME_W = 132;
const CARD_IMAGE_FRAME_H = 84;
const STD_IMAGE_FRAME_W = 96;
const STD_IMAGE_FRAME_H = 64;

type ImageGroup = Record<string, number>; // RN require() ids

function ImageCell({
  imgKey,
  source,
  isCard,
}: {
  imgKey: string;
  source: number;
  isCard: boolean;
}) {
  const frameW = isCard ? CARD_IMAGE_FRAME_W : STD_IMAGE_FRAME_W;
  const frameH = isCard ? CARD_IMAGE_FRAME_H : STD_IMAGE_FRAME_H;
  return (
    <View
      style={{
        flexBasis: `${100 / IMAGE_COLS - 3}%`,
        flexGrow: 0,
        alignItems: 'center',
        gap: spacing[6],
        paddingVertical: spacing[8],
      }}
    >
      <View
        style={{
          width: frameW,
          height: frameH,
          maxWidth: '100%',
          borderRadius: radius.md,
          backgroundColor: colors.surface.sunken,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Image
          source={source}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
      <Text
        variant="caption10Regular"
        color={colors.text.tertiary}
        align="center"
        numberOfLines={2}
      >
        {imgKey}
      </Text>
    </View>
  );
}

function ImageGroupGrid({
  group,
  isCard,
}: {
  group: ImageGroup;
  isCard: boolean;
}) {
  const keys = Object.keys(group);
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: IMAGE_CELL_GAP,
      }}
    >
      {keys.map((k) => (
        <ImageCell key={k} imgKey={k} source={group[k]} isCard={isCard} />
      ))}
    </View>
  );
}

function IconCell({ name }: { name: (typeof ICON_NAMES)[number] }) {
  return (
    <View
      style={{
        // Width = (100% - 3 gaps) / 4 — flexBasis trick keeps it simple
        flexBasis: `${(100 - 0) / ICON_COLS - 3}%`,
        flexGrow: 0,
        alignItems: 'center',
        gap: spacing[4],
        paddingVertical: spacing[8],
      }}
    >
      <Icon name={name} size={iconSize[32]} />
      <Text
        variant="caption10Regular"
        color={colors.text.tertiary}
        align="center"
        numberOfLines={2}
      >
        {name}
      </Text>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Screen
// ----------------------------------------------------------------------------
export function FoundationCheck() {
  const navigation = useNavigation<Nav>();

  // Local state for the Inputs verification section.
  const [filledValue, setFilledValue] = useState('98945-72087');
  const [errorValue, setErrorValue] = useState('not-an-email');

  // Local state for the OtpInput verification section.
  const [otp4Default, setOtp4Default] = useState('');
  const [otp4Focused, setOtp4Focused] = useState('');
  const [otp4Filled, setOtp4Filled] = useState('1234');
  const [otp4Error, setOtp4Error] = useState('');
  const [otp6, setOtp6] = useState('');

  // Local state for the TextArea verification section.
  const [taFilled, setTaFilled] = useState(
    "Loving the cashback so far — really helpful on grocery runs and the occasional flight booking."
  );
  const [taError, setTaError] = useState('!');
  const [taMdEmpty, setTaMdEmpty] = useState('');
  const [taMdFocused, setTaMdFocused] = useState('');
  const [taSm, setTaSm] = useState('');

  // Local state for the Selection Controls verification section.
  const [cb1, setCb1] = useState(false);
  const [cb2, setCb2] = useState(true);
  const [cbSm, setCbSm] = useState(false);
  const [rd, setRd] = useState<'a' | 'b' | 'c'>('b');
  const [sw1, setSw1] = useState(false);
  const [sw2, setSw2] = useState(true);
  const [swSm, setSwSm] = useState(true);
  const [choiceRadio, setChoiceRadio] = useState<'one' | 'two'>('one');
  const [choiceCheckbox, setChoiceCheckbox] = useState(true);
  const [choiceDesc, setChoiceDesc] = useState(false);

  // Local state for the TermsAndConditions verification section.
  const [tnc1, setTnc1] = useState(false);
  const [tnc2, setTnc2] = useState(true);
  const [tnc1Line, setTnc1Line] = useState(false);
  const [tncError, setTncError] = useState(false);
  const [tncSticky, setTncSticky] = useState(false);

  // Local state for the Tabs verification section.
  const [tp3, setTp3] = useState(0);
  const [tp4, setTp4] = useState(2);
  const [ts3, setTs3] = useState(1);
  const [ts2, setTs2] = useState(0);

  // Local state for the Header verification (only the tabs example
  // needs interactive state).
  const [headerTab, setHeaderTab] = useState(0);

  // Local state for the FooterButtons T&C checkbox demo.
  const [tncUnchecked, setTncUnchecked] = useState(false);
  const [tncOn, setTncOn] = useState(true);

  // SearchTopSheet demo — variant + visibility flipped by the two
  // trigger buttons in Section 36.
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [searchSheetVariant, setSearchSheetVariant] =
    useState<SearchTopSheetVariant>('suggestions');
  const openSearchSheet = (v: SearchTopSheetVariant) => {
    setSearchSheetVariant(v);
    setSearchSheetOpen(true);
  };

  // Eligibility sheets (Section 39) — opened/dismissed via gorhom
  // BottomSheetModal refs (same pattern + animation + backdrop opacity
  // as the project's existing BottomSheet organism, used in Section 30).
  const eligibleSheetRef = useRef<BottomSheetModal>(null);
  const maybeSheetRef = useRef<BottomSheetModal>(null);
  // Eligibility CHECKER sheet — the form. On Check Now, evaluate the
  // income and route to the appropriate result sheet above. Threshold
  // is the spec'd ₹50,000/month.
  const eligibilityCheckerRef = useRef<BottomSheetModal>(null);
  // Login sheet — preview/verification before wiring into Onboarding.
  const loginSheetRef = useRef<BottomSheetModal>(null);
  // Login form state lives at the screen root so re-presenting the
  // sheet doesn't reset the typed value mid-flow. No validation gate
  // — the Get OTP CTA is always active per spec.
  const [loginPhone, setLoginPhone] = useState('');
  const loginSnapPoints = useMemo(() => ['65%'], []);
  const insets = useSafeAreaInsets();

  // Single tall snap point — sheets size to ~90% of screen so all
  // content (masthead + body + footer) is visible without a second snap.
  const eligibilitySnapPoints = useMemo(() => ['90%'], []);
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

  // Login backdrop — same scrim as the eligibility sheets, plus the
  // Cards.xtra wordmark anchored to the upper area on top of the dim
  // (pointerEvents='none' so it doesn't block tap-outside dismiss).
  const renderLoginBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => {
      const LogoLight = logos.lightBig;
      return (
        <View style={props.style} pointerEvents="box-none">
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
            pressBehavior="close"
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: insets.top + spacing[64],
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <LogoLight width={125} height={98} />
          </View>
        </View>
      );
    },
    [insets.top]
  );

  // Filters grid (Section 37) — per-tile boolean selection.
  // Shopping (index 0) starts selected to match the Figma sample.
  const [filterSelections, setFilterSelections] = useState<boolean[]>([
    true,
    false,
    false,
    false,
    false,
    false,
  ]);

  // BottomSheet demo — one shared ref, active config swapped via state
  // so every tile in the menu opens the same modal with its template.
  const sheetRef = useRef<BottomSheetModal>(null);
  const [sheetTitle, setSheetTitle] = useState('Cashback Status');
  const [sheetTemplate, setSheetTemplate] =
    useState<BottomSheetTemplate>('cashback-status');
  const [sheetBodyProps, setSheetBodyProps] = useState<
    Omit<BottomSheetBodyProps, 'template'>
  >({});
  const [sheetFooter, setSheetFooter] = useState(true);
  const [sheetFooterProps, setSheetFooterProps] = useState<
    FooterButtonsProps | undefined
  >({
    buttons: 'single',
    size: 52,
    color: 'main',
    primaryLabel: 'Withdraw to bank',
    onPrimary: () => sheetRef.current?.dismiss(),
  });

  type SheetTile = {
    label: string;
    title: string;
    template: BottomSheetTemplate;
    bodyProps?: Omit<BottomSheetBodyProps, 'template'>;
    footer?: boolean;
    footerProps?: FooterButtonsProps;
  };

  const SHEET_TILES: SheetTile[] = [
    {
      label: 'Cashback Status',
      title: 'Cashback Status',
      template: 'cashback-status',
      footer: true,
      footerProps: {
        buttons: 'single',
        size: 52,
        color: 'main',
        primaryLabel: 'Withdraw to bank',
        onPrimary: () => sheetRef.current?.dismiss(),
      },
    },
    {
      label: 'Reward Rates',
      title: 'Reward Rates',
      template: 'reward-rates',
      footer: false,
    },
    {
      label: 'Month Picker',
      title: 'Choose a month',
      template: 'month-picker',
      footer: true,
      footerProps: {
        buttons: 'single',
        size: 44,
        color: 'main',
        primaryLabel: 'Apply',
        onPrimary: () => sheetRef.current?.dismiss(),
      },
    },
    {
      label: 'Selector',
      title: 'Pick categories',
      template: 'selector',
      footer: true,
      footerProps: {
        buttons: 'dual',
        size: 44,
        color: 'mixed',
        primaryLabel: 'Save',
        secondaryLabel: 'Reset',
        onPrimary: () => sheetRef.current?.dismiss(),
        onSecondary: () => undefined,
      },
    },
    {
      label: 'Text Only',
      title: 'About cashback',
      template: 'text-only',
      bodyProps: {
        text: 'Cashback is the percentage of your eligible purchase that CashKaro returns to your wallet after the brand confirms the transaction. Typical confirmation windows are 30–90 days.',
      },
      footer: false,
    },
    {
      label: 'Image + Heading + Body',
      title: 'No cashback yet',
      template: 'image-heading-body',
      bodyProps: {
        image: images.storepage.nocashback,
        heading: 'No earnings yet',
        body: 'Start using your Cards.xtra-recommended card to see your cashback grow here.',
        note: 'Tracked usually within 48 hours of purchase.',
      },
      footer: true,
      footerProps: {
        buttons: 'single',
        size: 44,
        color: 'main',
        primaryLabel: 'Browse cards',
        onPrimary: () => sheetRef.current?.dismiss(),
      },
    },
    {
      label: 'Money Status',
      title: 'Withdrawal status',
      template: 'money-status',
      bodyProps: {
        amount: '₹2,480',
        status: 'pending',
        description: 'Your withdrawal request is being processed. Funds typically arrive within 3 business days.',
      },
      footer: false,
    },
    {
      label: 'Eligibility Checker',
      title: 'Check eligibility',
      template: 'eligibility-checker',
      footer: true,
      footerProps: {
        buttons: 'single',
        size: 44,
        color: 'main',
        primaryLabel: 'Check now',
        onPrimary: () => sheetRef.current?.dismiss(),
      },
    },
    {
      label: 'Image Only',
      title: undefined as unknown as string,
      template: 'image-only',
      bodyProps: { image: images.backgrounds.onboarding },
      footer: false,
    },
    {
      label: 'Filters (stub)',
      title: 'Filters',
      template: 'filters',
      footer: false,
    },
  ];

  const openSheet = (tile: SheetTile) => {
    setSheetTitle(tile.title);
    setSheetTemplate(tile.template);
    setSheetBodyProps(tile.bodyProps ?? {});
    setSheetFooter(tile.footer ?? false);
    setSheetFooterProps(tile.footerProps);
    // Give state a tick to apply, then present.
    requestAnimationFrame(() => sheetRef.current?.present());
  };

  // Local state for the Accordion verification section.
  const [accDefault, setAccDefault] = useState(false);
  const [accExpanded, setAccExpanded] = useState(true);
  const [accHighlight, setAccHighlight] = useState(false);
  const [accBare, setAccBare] = useState(false);
  const [accLeading, setAccLeading] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing[16],
            paddingBottom: spacing[48],
            gap: spacing[32],
          }}
          showsVerticalScrollIndicator
        >
          {/* Header + nav-out */}
          <View style={{ gap: spacing[12] }}>
            <Text variant="heading28Bold" color={colors.text.primary}>
              Foundation check
            </Text>
            <Text variant="body14Regular" color={colors.text.tertiary}>
              Visual diff of design tokens. Temporary — RootNavigator
              points here as initial route until foundations are
              signed off.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing[8], flexWrap: 'wrap' }}>
              <Button
                label="Continue to Login →"
                variant="outline"
                size={44}
                // Routes via Splash → Login: tapping plays the Lottie
                // splash first, which then replaces itself with Login
                // on onAnimationFinish (or its 7-s safety timeout).
                onPress={() => navigation.navigate('Splash')}
              />
              <Button
                label="Skip → Home"
                variant="solid"
                tone="main"
                size={44}
                // Shortcut for the design-token verification flow —
                // skips Splash + Onboarding + Login and lands on the
                // bottom-tab navigator's Home (credit cards) screen.
                onPress={() => navigation.navigate('MainTabs')}
              />
              <Button
                label="Amazon brand page →"
                variant="outline"
                size={44}
                // Opens the composed offers/brand/amazon screen for review.
                onPress={() => navigation.navigate('OffersBrandAmazon')}
              />
            </View>
          </View>

          {/* 1. COLORS */}
          <View>
            <SectionHeader
              title="1. Colors"
              subtitle={`${COLOR_ENTRIES.length} semantic tokens`}
            />
            <View>
              {COLOR_ENTRIES.map((entry) => (
                <ColorRow key={entry.path} entry={entry} />
              ))}
            </View>
          </View>

          {/* 2. GRADIENTS */}
          <View>
            <SectionHeader
              title="2. Gradients"
              subtitle={`${Object.keys(gradients).length} entries`}
            />
            <View>
              {Object.entries(gradients).map(([name, spec]) => (
                <GradientRow
                  key={name}
                  name={name}
                  spec={spec as unknown as AnyGradient}
                />
              ))}
            </View>
          </View>

          {/* 3. ICONS */}
          <View>
            <SectionHeader
              title="3. Icons"
              subtitle={`${ICON_NAMES.length} SVGs from src/assets/icons`}
            />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: ICON_GRID_GAP,
              }}
            >
              {ICON_NAMES.map((name) => (
                <IconCell key={name} name={name} />
              ))}
            </View>
          </View>

          {/* 5. BUTTONS — defined here as a tagged-block so it renders BEFORE
              the heavy IMAGES section, which is what was on screen during
              the Button rebuild. The IMAGES section follows. */}
          <View>
            <SectionHeader
              title="5. Buttons"
              subtitle="Figma component set 78:21192 — every variant, size & state"
            />
            <View style={{ gap: spacing[24] }}>
              {/* Sizes */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Sizes (solid · main)" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                    alignItems: 'center',
                  }}
                >
                  <Button label="Size 36" size={36} />
                  <Button label="Size 44" size={44} />
                  <Button label="Size 52" size={52} />
                </View>
              </View>

              {/* Variants at 44 */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Variants (size 44)" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                    alignItems: 'center',
                  }}
                >
                  <Button label="Solid · main" variant="solid" tone="main" />
                  <Button label="Solid · second" variant="solid" tone="second" />
                  <Button label="Outline" variant="outline" />
                  <Button label="Subtle" variant="subtle" />
                  <Button label="Destructive" variant="destructive" />
                </View>
                {/* Ghost needs a dark surface or it's invisible */}
                <View
                  style={{
                    padding: spacing[12],
                    borderRadius: radius.md,
                    backgroundColor: colors.surface.inverse,
                    alignItems: 'flex-start',
                  }}
                >
                  <Button label="Ghost · on dark" variant="ghost" />
                </View>
                <View style={{ alignItems: 'flex-start' }}>
                  <Button label="Link · underlined" variant="link" />
                </View>
              </View>

              {/* States */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="States" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                    alignItems: 'center',
                  }}
                >
                  <Button label="Disabled" disabled />
                  <Button label="Loading" loading />
                </View>
              </View>

              {/* Icons */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Icon options" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                    alignItems: 'center',
                  }}
                >
                  <Button
                    label="Leading icon"
                    icon="leading"
                    iconName="star-outline"
                  />
                  <Button
                    label="Trailing icon"
                    icon="trailing"
                    iconName="check-outline"
                  />
                  <Button
                    label="Notifications"
                    icon="only"
                    iconName="bell-outline"
                  />
                </View>
              </View>

              {/* Width */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Layout" />
                <Button label="Full-width button" fullWidth size={52} />
              </View>
            </View>
          </View>

          {/* 6. INPUTS — placed before the heavy IMAGES section so the
              verification surface is reachable without a long scroll. */}
          <View>
            <SectionHeader
              title="6. Inputs"
              subtitle="Figma component set 425:24469 — md h56 / sm h48, focus→selected→filled wired via onFocus/onBlur"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="md · unfilled" />
                <Input
                  label="Mobile Number"
                  placeholder="Enter 10-digit number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="md · focused (forced — tap any input to verify real focus)" />
                <Input label="Mobile Number" state="selected" />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="md · filled (has value)" />
                <Input
                  label="Mobile Number"
                  value={filledValue}
                  onChangeText={setFilledValue}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="md · error (with hint)" />
                <Input
                  label="Email"
                  value={errorValue}
                  onChangeText={setErrorValue}
                  state="error"
                  hint="Please enter a valid email address"
                  hintIcon="desc-exclamation"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="sm · unfilled" />
                <Input
                  label="OTP"
                  placeholder="4-digit code"
                  size="sm"
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>
          </View>

          {/* 7. OTP INPUT — placed before the heavy IMAGES section. */}
          <View>
            <SectionHeader
              title="7. OtpInput"
              subtitle="Figma component set 426:23735 — 65×56 slots, hidden TextInput drives left→right fill"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="4-digit · default (tap a slot to focus)" />
                <OtpInput
                  value={otp4Default}
                  onChangeText={setOtp4Default}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="4-digit · focused (forced)" />
                <OtpInput
                  value={otp4Focused}
                  onChangeText={setOtp4Focused}
                  state="focused"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="4-digit · filled + resend ready" />
                <OtpInput
                  value={otp4Filled}
                  onChangeText={setOtp4Filled}
                  resend="ready"
                  onResend={() => setOtp4Filled('')}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="4-digit · error with hint" />
                <OtpInput
                  value={otp4Error}
                  onChangeText={setOtp4Error}
                  state="error"
                  hint="Invalid OTP. Please try again."
                  hintIcon="desc-exclamation"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="6-digit · default" />
                <OtpInput
                  length={6}
                  value={otp6}
                  onChangeText={setOtp6}
                />
              </View>
            </View>
          </View>

          {/* 8. TEXTAREA — multiline sibling of Input, same state language. */}
          <View>
            <SectionHeader
              title="8. TextArea"
              subtitle="Figma component set 426:23542 — md h120 / sm h80, body14Regular both sizes"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="md · unfilled" />
                <TextArea
                  label="Tell us what you think"
                  placeholder="Share your feedback…"
                  value={taMdEmpty}
                  onChangeText={setTaMdEmpty}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="md · focused (forced — shows floating label)" />
                <TextArea
                  label="Tell us what you think"
                  value={taMdFocused}
                  onChangeText={setTaMdFocused}
                  state="selected"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="md · filled (has value)" />
                <TextArea
                  label="Tell us what you think"
                  value={taFilled}
                  onChangeText={setTaFilled}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="md · error with hint" />
                <TextArea
                  label="Tell us what you think"
                  value={taError}
                  onChangeText={setTaError}
                  state="error"
                  hint="Please share at least 10 characters"
                  hintIcon="desc-exclamation"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="sm · unfilled" />
                <TextArea
                  label="Quick note"
                  placeholder="A short reason…"
                  size="sm"
                  value={taSm}
                  onChangeText={setTaSm}
                />
              </View>
            </View>
          </View>

          {/* 9. BADGES — CashbackBadge + Badge */}
          <View>
            <SectionHeader
              title="9. Badges"
              subtitle="CashbackBadge (Figma 2509:1055) + Badge (Figma 453:24078)"
            />
            <View style={{ gap: spacing[24] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel
                  text="CashbackBadge · 2×3 (size × showPrefix)"
                />
                {(['sm', 'md', 'lg'] as const).map((s) => (
                  <View
                    key={s}
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: spacing[12],
                      alignItems: 'center',
                    }}
                  >
                    <CashbackBadge
                      prefix="Upto"
                      value="₹1200 Cashback"
                      size={s}
                      showPrefix
                    />
                    <CashbackBadge
                      prefix="Upto"
                      value="₹1200 Cashback"
                      size={s}
                      showPrefix={false}
                    />
                  </View>
                ))}
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Badge · md default" />
                <Badge label="Shopping" size="md" />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Badge · sm pill" />
                <Badge label="New" size="sm" pill />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Badge · md subtle with left icon" />
                <Badge
                  label="Airport Lounge"
                  size="md"
                  appearance="subtle"
                  icon="left"
                  iconName="feat-lounge-outline"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Badge · sm with dot" />
                <Badge label="Live" size="sm" icon="dot" />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel
                  text="Badge · md with close (desc-cross is baked red)"
                />
                <Badge
                  label="Filter: Fuel"
                  size="md"
                  pill
                  icon="close"
                  onClose={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 10. STATUS BADGE — 7 statuses × 2×2 combos (size × rounded) */}
          <View>
            <SectionHeader
              title="10. StatusBadge"
              subtitle="Figma set 3010:1106 — every status with all 4 size×rounded combos"
            />
            {(() => {
              const ALL_STATUSES: StatusBadgeStatus[] = [
                'requested',
                'pending',
                'delayed',
                'cancelled',
                'confirmed',
                'paid',
                'expired',
              ];
              return (
                <View style={{ gap: spacing[20] }}>
                  {ALL_STATUSES.map((s) => (
                    <View key={s} style={{ gap: spacing[8] }}>
                      <ButtonLabel text={s} />
                      <View style={{ gap: spacing[8] }}>
                        {/* Row 1: Default size — rounded then squared */}
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: spacing[8],
                            alignItems: 'center',
                          }}
                        >
                          <StatusBadge status={s} size="default" rounded />
                          <StatusBadge
                            status={s}
                            size="default"
                            rounded={false}
                          />
                        </View>
                        {/* Row 2: Pill size — rounded then squared */}
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: spacing[8],
                            alignItems: 'center',
                          }}
                        >
                          <StatusBadge status={s} size="pill" rounded />
                          <StatusBadge
                            status={s}
                            size="pill"
                            rounded={false}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>

          {/* 11. CHIP */}
          <View>
            <SectionHeader
              title="11. Chip"
              subtitle="Figma set 3234:2 — default / tab / toggle"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default · size 32 — default / selected / disabled (real trailing icon)" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                    alignItems: 'center',
                  }}
                >
                  {/* trailingIcon uses feat-dot-filled — there's no menu /
                      chevron icon in src/assets/icons. Swap when one is added. */}
                  <Chip
                    label="Shopping"
                    type="default"
                    state="default"
                    trailingIcon="feat-dot-filled"
                  />
                  <Chip
                    label="Shopping"
                    type="default"
                    state="selected"
                    trailingIcon="feat-dot-filled"
                  />
                  <Chip
                    label="Shopping"
                    type="default"
                    state="disabled"
                    trailingIcon="feat-dot-filled"
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default · size 20 (real feat-fuel / feat-travel leading icons)" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                    alignItems: 'center',
                  }}
                >
                  <Chip
                    label="Fuel"
                    type="default"
                    size={20}
                    leadingIcon="feat-fuel-outline"
                  />
                  <Chip
                    label="Travel"
                    type="default"
                    size={20}
                    state="selected"
                    leadingIcon="feat-travel-outline"
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="tab · default / selected (with count)" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                    alignItems: 'center',
                  }}
                >
                  <Chip label="All offers" type="tab" count={42} />
                  <Chip
                    label="All offers"
                    type="tab"
                    state="selected"
                    count={42}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="toggle — 3 columns: default / disabled / selected" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[12],
                    alignItems: 'center',
                  }}
                >
                  <Chip
                    label="Eligibility"
                    type="toggle"
                    state="default"
                    onPress={() => undefined}
                    onEditPress={() => undefined}
                  />
                  <Chip
                    label="Eligibility"
                    type="toggle"
                    state="disabled"
                  />
                  <Chip
                    label="Eligibility"
                    type="toggle"
                    state="selected"
                    onPress={() => undefined}
                    onEditPress={() => undefined}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 12. SELECTION CONTROLS */}
          <View>
            <SectionHeader
              title="12. Selection Controls"
              subtitle="Checkbox · Radio · Switch · Choice (rounded square vs perfect circle — easy to mix up!)"
            />
            <View style={{ gap: spacing[24] }}>
              {/* Checkbox row */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Checkbox · md (unchecked / checked / indeterminate / disabled)" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[16],
                    alignItems: 'center',
                  }}
                >
                  <Checkbox checked={cb1} onChange={setCb1} />
                  <Checkbox checked={cb2} onChange={setCb2} />
                  <Checkbox checked="indeterminate" />
                  <Checkbox checked={false} disabled />
                  <Checkbox checked disabled />
                </View>
                <ButtonLabel text="Checkbox · sm" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[16],
                    alignItems: 'center',
                  }}
                >
                  <Checkbox checked={cbSm} onChange={setCbSm} size="sm" />
                  <Checkbox checked size="sm" />
                  <Checkbox checked="indeterminate" size="sm" />
                  <Checkbox checked disabled size="sm" />
                </View>
              </View>

              {/* Radio row */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Radio · md (group of 3, plus disabled)" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[16],
                    alignItems: 'center',
                  }}
                >
                  <Radio selected={rd === 'a'} onChange={() => setRd('a')} />
                  <Radio selected={rd === 'b'} onChange={() => setRd('b')} />
                  <Radio selected={rd === 'c'} onChange={() => setRd('c')} />
                  <Radio selected={false} disabled />
                  <Radio selected disabled />
                </View>
                <ButtonLabel text="Radio · sm" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[16],
                    alignItems: 'center',
                  }}
                >
                  <Radio selected={false} size="sm" />
                  <Radio selected size="sm" />
                  <Radio selected disabled size="sm" />
                </View>
              </View>

              {/* Switch row */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="Switch · md (off / on / disabled)" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[16],
                    alignItems: 'center',
                  }}
                >
                  <Switch value={sw1} onValueChange={setSw1} />
                  <Switch value={sw2} onValueChange={setSw2} />
                  <Switch value={false} disabled />
                  <Switch value disabled />
                </View>
                <ButtonLabel text="Switch · sm" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[16],
                    alignItems: 'center',
                  }}
                >
                  <Switch value={swSm} onValueChange={setSwSm} size="sm" />
                  <Switch value={false} size="sm" />
                  <Switch value disabled size="sm" />
                </View>
              </View>

              {/* Choice molecule */}
              <View style={{ gap: spacing[12] }}>
                <ButtonLabel text="Choice · radio rows (tap any to select)" />
                <View style={{ gap: spacing[12] }}>
                  <Choice
                    type="radio"
                    checked={choiceRadio === 'one'}
                    label="Pay with linked card"
                    onChange={() => setChoiceRadio('one')}
                  />
                  <Choice
                    type="radio"
                    checked={choiceRadio === 'two'}
                    label="Pay with UPI"
                    onChange={() => setChoiceRadio('two')}
                  />
                </View>

                <ButtonLabel text="Choice · checkbox" />
                <Choice
                  type="checkbox"
                  checked={choiceCheckbox}
                  label="Remember this device for 30 days"
                  onChange={setChoiceCheckbox}
                />

                <ButtonLabel text="Choice · checkbox with description" />
                <Choice
                  type="checkbox"
                  checked={choiceDesc}
                  label="Promotional emails"
                  description="Get offers, partner discounts, and product updates a few times a month."
                  showDescription
                  onChange={setChoiceDesc}
                />
              </View>
            </View>
          </View>

          {/* 13. TERMS & CONDITIONS */}
          <View>
            <SectionHeader
              title="13. TermsAndConditions"
              subtitle="Figma set 3686:26901 — Checkbox + consent text with inline cobalt links"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default · multi-line · unchecked" />
                <TermsAndConditions
                  checked={tnc1}
                  onChange={setTnc1}
                  label="I agree to the Terms and Privacy Policy, and acknowledge how my data will be used to personalise card recommendations."
                  linkLabels={['Terms', 'Privacy Policy']}
                  onPressLink={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default · multi-line · checked + description" />
                <TermsAndConditions
                  checked={tnc2}
                  onChange={setTnc2}
                  label="I agree to receive marketing communications."
                  description="You can change this anytime in Profile → Notifications."
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default · 1-line (truncates)" />
                <TermsAndConditions
                  checked={tnc1Line}
                  onChange={setTnc1Line}
                  label="I agree to the Terms and Privacy Policy, and acknowledge how my data will be used to personalise card recommendations."
                  linkLabels={['Terms', 'Privacy Policy']}
                  onPressLink={() => undefined}
                  body="1-line"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="checked='none' (text-only passive consent with links)" />
                <TermsAndConditions
                  checked="none"
                  label="By continuing, you agree to our Terms and Privacy Policy."
                  linkLabels={['Terms', 'Privacy Policy']}
                  onPressLink={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="error (unchecked + red message above)" />
                <TermsAndConditions
                  checked={tncError}
                  onChange={setTncError}
                  label="I agree to the Terms and Privacy Policy."
                  linkLabels={['Terms', 'Privacy Policy']}
                  onPressLink={() => undefined}
                  state="error"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="sticky placement (white bg, top border, soft lift)" />
                <TermsAndConditions
                  checked={tncSticky}
                  onChange={setTncSticky}
                  label="I agree to the Terms and Privacy Policy."
                  linkLabels={['Terms', 'Privacy Policy']}
                  onPressLink={() => undefined}
                  placement="sticky"
                />
              </View>
            </View>
          </View>

          {/* 14. TABS — TabPrimary (pills + count) + TabsSecondary (segmented) */}
          <View>
            <SectionHeader
              title="14. Tabs"
              subtitle="TabPrimary (Figma 3232:29141) · TabsSecondary (Figma 3232:32047)"
            />
            <View style={{ gap: spacing[24] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="TabPrimary · 3 tabs (active=0, with counts)" />
                <TabPrimary
                  tabs={[
                    { label: 'All offers', count: 42 },
                    { label: 'Bills', count: 12 },
                    { label: 'Travel', count: 5 },
                  ]}
                  activeIndex={tp3}
                  onChange={setTp3}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="TabPrimary · 4 tabs (active=2)" />
                <TabPrimary
                  tabs={[
                    { label: 'Cards' },
                    { label: 'Categories' },
                    { label: 'Brands' },
                    { label: 'Stores' },
                  ]}
                  activeIndex={tp4}
                  onChange={setTp4}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="TabsSecondary · 3 segments with icons (active=1)" />
                <TabsSecondary
                  segments={[
                    { label: 'Day', icon: 'clock-outline' },
                    { label: 'Week', icon: 'feat-daily-outline' },
                    { label: 'Month', icon: 'clock-filled' },
                  ]}
                  activeIndex={ts3}
                  onChange={setTs3}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="TabsSecondary · 2 segments" />
                <TabsSecondary
                  segments={[
                    { label: 'Solid' },
                    { label: 'Outline' },
                  ]}
                  activeIndex={ts2}
                  onChange={setTs2}
                />
              </View>
            </View>
          </View>

          {/* 15. LISTROW — all 12 variants with realistic data */}
          <View>
            <SectionHeader
              title="15. ListRow"
              subtitle="Figma set 3011:266686 — 12 row variants, one component"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="number-bullet" />
                <ListRow
                  type="number-bullet"
                  number={1}
                  description="Apply for the card using the link above and complete KYC."
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="thumbnail-key-chevron" />
                <ListRow
                  type="thumbnail-key-chevron"
                  thumbnail={images.cards.hdfcRegaliaGold}
                  text="HDFC Regalia Gold Credit Card"
                  onPress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="icon-definition" />
                <ListRow
                  type="icon-definition"
                  description="Cashback is the percentage of your purchase returned to your CashKaro wallet after the transaction is confirmed by the brand."
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="icon-caption-value" />
                <ListRow
                  type="icon-caption-value"
                  icon="wallet-outline"
                  caption="Wallet balance"
                  value="₹2,480"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="bullet-point" />
                <ListRow
                  type="bullet-point"
                  description="12 complimentary domestic airport lounge visits per year."
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="icon-caption" />
                <ListRow
                  type="icon-caption"
                  icon="clock-outline"
                  caption="Last updated 3 minutes ago"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="amount-status" />
                <ListRow
                  type="amount-status"
                  value="₹1,240"
                  biline="Cashback on Amazon order #A1284"
                  status="confirmed"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="caption-value" />
                <ListRow
                  type="caption-value"
                  label="Joining Fee"
                  value="₹2,500"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="caption-cta" />
                <ListRow
                  type="caption-cta"
                  label="Recent transactions"
                  onCta={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="menu-option" />
                <ListRow
                  type="menu-option"
                  icon="wallet-outline"
                  title="Payment History"
                  onPress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="simple-bullet" />
                <ListRow
                  type="simple-bullet"
                  description="Auto-debit fuel surcharge waiver across all stations."
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="rate-description" />
                <ListRow
                  type="rate-description"
                  rate="5%"
                  description="Cashback on Amazon, Flipkart, and 100+ partner stores."
                />
              </View>
            </View>
          </View>

          {/* 16. DIVIDERS — horizontal (5 styles) + vertical (4 styles) */}
          <View>
            <SectionHeader
              title="16. Dividers"
              subtitle="Divider (3869:40338) horizontal · DividerVertical (3134:48078)"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="horizontal · solid" />
                <Divider style="solid" />
              </View>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="horizontal · dashed (pattern 4 / 8)" />
                <Divider style="dashed" />
              </View>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="horizontal · fade (transparent → solid → transparent)" />
                <Divider style="fade" />
              </View>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="horizontal · or" />
                <Divider style="or" />
              </View>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="horizontal · text-count (label + counter + fade)" />
                <Divider
                  style="text-count"
                  label="Recent transactions"
                  counter={12}
                  showCounter
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="vertical · all 4 styles (each 80h)" />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    paddingVertical: spacing[16],
                    backgroundColor: colors.surface.default,
                    borderRadius: radius.sm,
                    borderWidth: borderWidth.thin,
                    borderColor: colors.border.subtle3,
                  }}
                >
                  <View style={{ alignItems: 'center', gap: spacing[8] }}>
                    <DividerVertical style="solid" />
                    <Text
                      variant="body12Medium"
                      color={colors.text.tertiary}
                    >
                      solid
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center', gap: spacing[8] }}>
                    <DividerVertical style="fade" />
                    <Text
                      variant="body12Medium"
                      color={colors.text.tertiary}
                    >
                      fade
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center', gap: spacing[8] }}>
                    <DividerVertical style="dashed" />
                    <Text
                      variant="body12Medium"
                      color={colors.text.tertiary}
                    >
                      dashed
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center', gap: spacing[8] }}>
                    <DividerVertical style="or" />
                    <Text
                      variant="body12Medium"
                      color={colors.text.tertiary}
                    >
                      or
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 17. TOOLTIP — 4 positions, both themes, both sizes */}
          <View>
            <SectionHeader
              title="17. Tooltip"
              subtitle="Figma set 3340:1798 — bubble + 12×6 arrow (CSS border triangle)"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="dark · md · all 4 positions (title + supporting)" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[24],
                    alignItems: 'center',
                  }}
                >
                  <Tooltip
                    position="top"
                    title="Position: top"
                    supporting="Bubble sits above, arrow points down."
                  />
                  <Tooltip
                    position="bottom"
                    title="Position: bottom"
                    supporting="Bubble sits below, arrow points up."
                  />
                  <Tooltip
                    position="left"
                    title="Position: left"
                    supporting="Bubble sits left, arrow points right."
                  />
                  <Tooltip
                    position="right"
                    title="Position: right"
                    supporting="Bubble sits right, arrow points left."
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="dark · sm vs md" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[24],
                    alignItems: 'center',
                  }}
                >
                  <Tooltip
                    size="sm"
                    title="Small tooltip"
                    supporting="body12Regular supporting"
                  />
                  <Tooltip
                    size="md"
                    title="Medium tooltip"
                    supporting="body12Regular supporting"
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="dark · title-only vs title+supporting" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[24],
                    alignItems: 'center',
                  }}
                >
                  <Tooltip title="Title only" />
                  <Tooltip
                    title="Title + supporting"
                    supporting="Two stacked lines, gap spacing[4]."
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="light · with icon + supporting" />
                <Tooltip
                  theme="light"
                  position="top"
                  title="Eligibility check"
                  supporting="Tap to see how your profile matches this card."
                  icon="bell-outline"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="wrapping — same content at 3 maxWidth values" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[16],
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Narrow — title wraps onto 2 lines, supporting onto 3-4 */}
                  <View style={{ gap: spacing[4] }}>
                    <Text
                      variant="body12Medium"
                      color={colors.text.tertiary}
                    >
                      maxWidth 160
                    </Text>
                    <Tooltip
                      title="Eligibility check"
                      supporting="Tap to see how your profile matches this card based on income, credit score, and existing relationships."
                      icon="bell-outline"
                      maxWidth={160}
                    />
                  </View>

                  {/* Default — wraps onto 2-3 lines */}
                  <View style={{ gap: spacing[4] }}>
                    <Text
                      variant="body12Medium"
                      color={colors.text.tertiary}
                    >
                      maxWidth 280 (default)
                    </Text>
                    <Tooltip
                      title="Eligibility check"
                      supporting="Tap to see how your profile matches this card based on income, credit score, and existing relationships."
                      icon="bell-outline"
                    />
                  </View>

                  {/* Wider — supporting fits on a single line */}
                  <View style={{ gap: spacing[4] }}>
                    <Text
                      variant="body12Medium"
                      color={colors.text.tertiary}
                    >
                      maxWidth 360
                    </Text>
                    <Tooltip
                      title="Eligibility check"
                      supporting="Tap to see how your profile matches this card."
                      icon="bell-outline"
                      maxWidth={360}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 18. ACCORDION */}
          <View>
            <SectionHeader
              title="18. Accordion"
              subtitle="Figma set 3108:11342 — default / highlight / bare, optional leading icon"
            />
            <View style={{ gap: spacing[16] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default · collapsed (tap chevron to expand)" />
                {/* Thin border so the white-bg 'default' state is visible
                    on the white verification screen. */}
                <View
                  style={{
                    borderWidth: borderWidth.thin,
                    borderColor: colors.border.subtle3,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                  }}
                >
                  <Accordion
                    title="What is cashback?"
                    body="Cashback is the percentage of your purchase returned to your CashKaro wallet after the brand confirms the transaction."
                    expanded={accDefault}
                    onToggle={setAccDefault}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default · expanded (title + body)" />
                <View
                  style={{
                    borderWidth: borderWidth.thin,
                    borderColor: colors.border.subtle3,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                  }}
                >
                  <Accordion
                    title="When will I get my cashback?"
                    body="Most cashback is tracked within 48 hours and confirmed within 60–90 days, depending on the brand's return window."
                    expanded={accExpanded}
                    onToggle={setAccExpanded}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="highlight (pale cobalt bg)" />
                <Accordion
                  state="highlight"
                  title="How does Cards.xtra match cards to me?"
                  body="We look at your income range, credit history, and spend categories to surface cards where you'll earn the most rewards."
                  expanded={accHighlight}
                  onToggle={setAccHighlight}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="bare (transparent, no horizontal padding)" />
                <Accordion
                  state="bare"
                  title="Is my data shared with banks?"
                  body="Only the minimum required for eligibility checks, and only when you choose to apply. Read more in the Privacy Policy."
                  expanded={accBare}
                  onToggle={setAccBare}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="with leading icon" />
                <View
                  style={{
                    borderWidth: borderWidth.thin,
                    borderColor: colors.border.subtle3,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                  }}
                >
                  <Accordion
                    leadingIcon="feat-lounge-outline"
                    title="Airport lounge benefit"
                    body="12 complimentary domestic lounge visits per year via the Visa Concierge programme. Subject to availability."
                    expanded={accLeading}
                    onToggle={setAccLeading}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 19. INDICATOR */}
          <View>
            <SectionHeader
              title="19. Indicator"
              subtitle="Figma set 3134:48174 — steps (dot progress) + scroll (track + thumb)"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="steps · total=4, walking active 0 → 3" />
                <View style={{ gap: spacing[12] }}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing[12],
                      }}
                    >
                      <Text
                        variant="body12Medium"
                        color={colors.text.tertiary}
                        style={{ width: spacing[64] }}
                      >
                        active = {i}
                      </Text>
                      <Indicator variant="steps" total={4} active={i} />
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="scroll · progress 0 / 0.5 / 1" />
                <View style={{ gap: spacing[12] }}>
                  {[0, 0.5, 1].map((p) => (
                    <View
                      key={p}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing[12],
                      }}
                    >
                      <Text
                        variant="body12Medium"
                        color={colors.text.tertiary}
                        style={{ width: spacing[64] }}
                      >
                        progress = {p}
                      </Text>
                      <Indicator variant="scroll" progress={p} />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* 20. CAROUSELS */}
          <View style={{ marginHorizontal: -spacing[16] }}>
            <View style={{ paddingHorizontal: spacing[16] }}>
              <SectionHeader
                title="20. Carousels"
                subtitle="Figma set 3198:28342 — 5 home-screen sections"
              />
            </View>
            <View style={{ gap: spacing[24] }}>
              <View style={{ gap: spacing[8] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="1. CreditCardOffer" />
                </View>
                <CreditCardOffer
                  cards={[
                    {
                      id: 'hdfc-regalia',
                      image: images.cards.hdfcRegaliaGold,
                      name: 'HDFC Regalia Gold Credit Card',
                      cashback: '₹2,500 Cashback',
                    },
                    {
                      id: 'axis-magnus',
                      image: images.cards.axisMagnus,
                      name: 'Axis Miles & More Credit Card',
                      cashback: '₹1,200 Cashback',
                    },
                    {
                      id: 'icici-coral',
                      image: images.cards.iciciCoral,
                      name: 'Axis Privilege World Credit Card',
                      cashback: '₹800 Cashback',
                    },
                    {
                      id: 'sbi-cashback',
                      image: images.cards.sbiCashback,
                      name: 'SBI Cashback Credit Card',
                      cashback: '5% Cashback',
                    },
                    {
                      id: 'tata-neu',
                      image: images.cards.tataNue,
                      name: 'Tata Neu Plus HDFC Credit Card',
                      cashback: '₹1,500 Cashback',
                    },
                  ]}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="2. CategoryTiles" />
                </View>
                <CategoryTiles
                  title="Find the best card by category"
                  categories={[
                    { id: 'shopping', label: 'Shopping', image: images.filters.shopping },
                    { id: 'fuel', label: 'Fuel', image: images.filters.fuel },
                    { id: 'food-ordering', label: 'Food Ordering', image: images.filters.foodOrdering },
                    { id: 'dining', label: 'Dining', image: images.filters.dining },
                    { id: 'grocery', label: 'Grocery', image: images.filters.grocery },
                    { id: 'travel', label: 'Travel', image: images.filters.travel },
                    { id: 'bills', label: 'Bills', image: images.filters.bills },
                  ]}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="3. HowItWorks" />
                </View>
                <HowItWorks
                  steps={[
                    {
                      id: 'pick',
                      text: 'Pick a credit card that matches your spending pattern.',
                      icon: 'feat-bank-outline',
                    },
                    {
                      id: 'apply',
                      text: 'Apply through CashKaro and complete a quick KYC.',
                      icon: 'feat-discount-outline',
                    },
                    {
                      id: 'earn',
                      text: 'Use it for everyday spends and watch your cashback grow.',
                      icon: 'feat-rewards-outline',
                    },
                  ]}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="4. MilestoneStat" />
                </View>
                <MilestoneStat
                  items={[
                    { id: 'm1', image: images.backgrounds.large },
                    { id: 'm2', image: images.backgrounds.medium },
                    { id: 'm3', image: images.backgrounds.blue },
                    { id: 'm4', image: images.backgrounds.darkblue },
                  ]}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="5. PromoBanner (full-bleed)" />
                </View>
                <PromoBanner
                  image={images.backgrounds.onboarding}
                  total={4}
                  active={1}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="6. CardCarousel (CardTile type='scrollable', 308 wide)" />
                </View>
                <CardCarousel
                  title="Top picks for you"
                  onViewAll={() => undefined}
                  onCardPress={() => undefined}
                  cards={[
                    {
                      id: 'axis-magnus',
                      cardImage: images.cards.axisMagnus,
                      cardName: 'Axis Bank Magnus Credit Card',
                      cashbackText: '₹3,500',
                      tags: ['Premium', 'Travel'],
                      benefits: [
                        {
                          icon: 'feat-lounge-outline',
                          title: 'Unlimited domestic & 8 international lounge visits',
                        },
                        {
                          icon: 'feat-rewards-outline',
                          title: '25,000 EDGE reward points on activation',
                        },
                      ],
                    },
                    {
                      id: 'axis-ace',
                      cardImage: images.cards.axisFlipkart,
                      cardName: 'Axis Bank ACE Credit Card',
                      cashbackText: '₹1,500',
                      tags: ['Daily Spends', 'Bills'],
                      benefits: [
                        {
                          icon: 'feat-mobile-recharge-outline',
                          title: '5% cashback on bill payments & recharges',
                        },
                        {
                          icon: 'feat-discount-outline',
                          title: '4% cashback on Swiggy, Zomato, Ola',
                        },
                      ],
                    },
                    {
                      id: 'hdfc-regalia-gold',
                      cardImage: images.cards.hdfcRegaliaGold,
                      cardName: 'HDFC Bank Regalia Gold',
                      cashbackText: '₹2,500',
                      tags: ['Travel', 'Lounge'],
                      benefits: [
                        {
                          icon: 'feat-lounge-outline',
                          title: '12 complimentary domestic lounge visits / yr',
                        },
                        {
                          icon: 'feat-dining-outline',
                          title: 'Up to 7% off at partner restaurants',
                        },
                      ],
                    },
                    {
                      id: 'sbi-cashback',
                      cardImage: images.cards.sbiCashback,
                      cardName: 'SBI Cashback Credit Card',
                      cashbackText: '₹2,000',
                      tags: ['Online Spends', 'Daily Use'],
                      benefits: [
                        {
                          icon: 'feat-discount-outline',
                          title: '5% cashback on online spends, no merchant cap',
                        },
                        {
                          icon: 'feat-savings-outline',
                          title: '1% cashback on all offline spends',
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* 21. FEEDBACK — Toast (9 tones) + InlineMessage (titles + actions) */}
          <View>
            <SectionHeader
              title="21. Feedback"
              subtitle="Toast (2401:70388) + InlineMessage (2820:8311) on the shared tones map"
            />
            {(() => {
              // Icon picked per tone for the verification — every entry
              // uses an outline glyph whose stroke remaps to currentColor,
              // so the tint follows tones[tone].text.
              const TONE_CASES: Array<{
                tone: ToneName;
                icon: IconName;
                message: string;
              }> = [
                { tone: 'brand', icon: 'feat-sparkle-outline', message: 'Earn an extra ₹500 on your next eligible purchase.' },
                { tone: 'gray', icon: 'message-outline', message: 'No new notifications right now.' },
                { tone: 'success', icon: 'check-circle-outline', message: 'Your cashback of ₹1,240 is confirmed.' },
                { tone: 'warning', icon: 'feat-discount-outline', message: 'Offer expires in 2 days — apply now to claim.' },
                { tone: 'error', icon: 'phone-off-outline', message: 'Couldn\'t reach the bank servers. Try again shortly.' },
                { tone: 'info', icon: 'message-outline', message: 'A new card from HDFC matches your profile.' },
                { tone: 'purple', icon: 'feat-rewards-outline', message: 'You\'ve unlocked Platinum tier rewards.' },
                { tone: 'sky', icon: 'feat-celebration-outline', message: 'Your card has been activated successfully.' },
                { tone: 'rose', icon: 'star-outline', message: 'Rated 4.8★ by 12,000+ Cards.xtra users.' },
              ];

              return (
                <View style={{ gap: spacing[24] }}>
                  <View style={{ gap: spacing[8] }}>
                    <ButtonLabel text="Toast · all 9 tones" />
                    <View style={{ gap: spacing[8] }}>
                      {TONE_CASES.map((c) => (
                        <Toast
                          key={c.tone}
                          tone={c.tone}
                          icon={c.icon}
                          message={c.message}
                          onDismiss={() => undefined}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={{ gap: spacing[8] }}>
                    <ButtonLabel text="InlineMessage · with title (success / error / info / warning)" />
                    <View style={{ gap: spacing[12] }}>
                      <InlineMessage
                        tone="success"
                        icon="check-circle-outline"
                        title="Cashback confirmed"
                        message="₹1,240 from your Amazon order will land in your wallet within 24 hours."
                        onDismiss={() => undefined}
                      />
                      <InlineMessage
                        tone="error"
                        icon="phone-off-outline"
                        title="We couldn't reach your bank"
                        message="Check your connection and try again. Your card details are safe."
                        onDismiss={() => undefined}
                      />
                      <InlineMessage
                        tone="info"
                        icon="message-outline"
                        title="A better card for your spending"
                        message="HDFC Regalia Gold matches 92% of your top categories."
                        onDismiss={() => undefined}
                      />
                      <InlineMessage
                        tone="warning"
                        icon="feat-discount-outline"
                        title="Offer ending soon"
                        message="₹2,500 sign-up bonus on Axis Magnus expires in 2 days."
                        onDismiss={() => undefined}
                      />
                    </View>
                  </View>

                  <View style={{ gap: spacing[8] }}>
                    <ButtonLabel text="InlineMessage · action variants (none / single / two)" />
                    <View style={{ gap: spacing[12] }}>
                      <InlineMessage
                        tone="info"
                        icon="message-outline"
                        title="No action"
                        message="A plain message with just a dismiss control."
                        action="none"
                        onDismiss={() => undefined}
                      />
                      <InlineMessage
                        tone="success"
                        icon="check-circle-outline"
                        title="Single action"
                        message="Your application was sent. Track its status anytime."
                        action="single"
                        primaryActionLabel="View status"
                        onPrimaryAction={() => undefined}
                        onDismiss={() => undefined}
                      />
                      <InlineMessage
                        tone="warning"
                        icon="feat-discount-outline"
                        title="Two actions"
                        message="Do you want to apply the auto-claim setting to all future cashback?"
                        action="two"
                        primaryActionLabel="Apply"
                        onPrimaryAction={() => undefined}
                        secondaryActionLabel="Not now"
                        onSecondaryAction={() => undefined}
                        onDismiss={() => undefined}
                      />
                    </View>
                  </View>
                </View>
              );
            })()}
          </View>

          {/* 22. TIMER — countdown chip in error tone */}
          <View>
            <SectionHeader
              title="22. Timer"
              subtitle="Figma set 3578:20769 — error-tone chip with clock + zero-padded digits"
            />
            <View style={{ gap: spacing[16] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default surface · hh:mm (23:59)" />
                <Timer hours={23} minutes={59} />
              </View>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default surface · dd:hh:mm (01:23:59)" />
                <Timer format="dd:hh:mm" days={1} hours={23} minutes={59} />
              </View>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="transparent surface · hh:mm (07:30)" />
                <Timer surface="transparent" hours={7} minutes={30} />
              </View>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="transparent surface · dd:hh:mm (12:04:09)" />
                <Timer
                  surface="transparent"
                  format="dd:hh:mm"
                  days={12}
                  hours={4}
                  minutes={9}
                />
              </View>
            </View>
          </View>

          {/* 23. BOTTOM NAV — floating dark pill, all 4 active states.
              Each nav fills the section width; the light_source
              flourish should sit above the active tab in every row. */}
          <View>
            <SectionHeader
              title="23. BottomNav"
              subtitle="Figma 394:23561 / 3614:171539 — wired into TabNavigator; light_source recreated"
            />
            <View style={{ gap: spacing[20] }}>
              {(
                ['home', 'offers', 'earnings', 'profile'] as BottomNavTab[]
              ).map((t) => (
                <View key={t} style={{ gap: spacing[8] }}>
                  <ButtonLabel
                    text={`active = ${t} (light beam should sit above it)`}
                  />
                  <BottomNav
                    activeTab={t}
                    onTabPress={() => undefined}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* 24. HEADER — top app bar, 5 cases */}
          <View style={{ marginHorizontal: -spacing[16] }}>
            <View style={{ paddingHorizontal: spacing[16] }}>
              <SectionHeader
                title="24. Header"
                subtitle="Figma set 3451:50577 — back/close + title + optional trailing + optional tabs"
              />
            </View>
            <View style={{ gap: spacing[16] }}>
              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="default · back · 'Withdraw Cashback' (body16Medium)" />
                </View>
                <Header
                  surface="default"
                  leading="back"
                  title="Withdraw Cashback"
                  onLeadingPress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="default · close · 'Request Payment' (body14SemiBold)" />
                </View>
                <Header
                  surface="default"
                  leading="close"
                  title="Request Payment"
                  onLeadingPress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="transparent · back · 'Settings'" />
                </View>
                <Header
                  surface="transparent"
                  leading="back"
                  title="Settings"
                  onLeadingPress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="default · back · 'Notifications' · trailing bell" />
                </View>
                <Header
                  surface="default"
                  leading="back"
                  title="Notifications"
                  trailingIcon="bell-outline"
                  onLeadingPress={() => undefined}
                  onTrailingPress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="default · back · 'Earnings' + TabPrimary tabs row" />
                </View>
                <Header
                  surface="default"
                  leading="back"
                  title="Earnings"
                  onLeadingPress={() => undefined}
                  tabs={[
                    { label: 'All', count: 42 },
                    { label: 'Confirmed', count: 18 },
                    { label: 'Pending', count: 6 },
                  ]}
                  activeTab={headerTab}
                  onTabChange={setHeaderTab}
                />
              </View>
            </View>
          </View>

          {/* 25. HOME HEADER — both states */}
          <View style={{ marginHorizontal: -spacing[16] }}>
            <View style={{ paddingHorizontal: spacing[16] }}>
              <SectionHeader
                title="25. HomeHeader"
                subtitle="Figma 3037:255 — masthead row + frosted sticky variant"
              />
            </View>
            <View style={{ gap: spacing[16] }}>
              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="scrolled = false (over dark masthead — white icons)" />
                </View>
                {/* Dark backdrop so the white icons + light logo show */}
                <View
                  style={{
                    backgroundColor: colors.surface.inverse,
                    paddingVertical: spacing[8],
                  }}
                >
                  <HomeHeader
                    scrolled={false}
                    notificationCount={9}
                    onMessagePress={() => undefined}
                    onBellPress={() => undefined}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="scrolled = true (frosted pale-blue bar + filter chips)" />
                </View>
                <HomeHeader
                  scrolled
                  onSearchPress={() => undefined}
                  onCategoryPress={() => undefined}
                  onFiltersPress={() => undefined}
                  onEligibilityToggle={() => undefined}
                  onEligibilityEdit={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 26. MASTHEAD HEADER — buttons-only default + optional title */}
          <View style={{ marginHorizontal: -spacing[16] }}>
            <View style={{ paddingHorizontal: spacing[16] }}>
              <SectionHeader
                title="26. MastheadHeader"
                subtitle="Figma 3037:256 — title is OFF by default (component spec). 4 button-only variants + 1 with title."
              />
            </View>
            <View style={{ gap: spacing[16] }}>
              {/* Solid · Back — light backdrop, NO title */}
              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="solid · back — light backdrop, NO title" />
                </View>
                <View style={{ backgroundColor: colors.surface.sunken }}>
                  <MastheadHeader
                    iconType="solid"
                    leading="back"
                    trailingIcon="bell-outline"
                    onLeadingPress={() => undefined}
                    onTrailingPress={() => undefined}
                  />
                </View>
              </View>

              {/* Solid · Close — light backdrop, NO title */}
              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="solid · close — light backdrop, NO title" />
                </View>
                <View style={{ backgroundColor: colors.surface.sunken }}>
                  <MastheadHeader
                    iconType="solid"
                    leading="close"
                    trailingIcon="clipboard-search-outline"
                    onLeadingPress={() => undefined}
                    onTrailingPress={() => undefined}
                  />
                </View>
              </View>

              {/* Overlay · Back — DARK backdrop, NO title */}
              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="overlay · back — DARK backdrop, NO title" />
                </View>
                <View style={{ backgroundColor: colors.surface.inverse }}>
                  <MastheadHeader
                    iconType="overlay"
                    leading="back"
                    trailingIcon="bell-outline"
                    onLeadingPress={() => undefined}
                    onTrailingPress={() => undefined}
                  />
                </View>
              </View>

              {/* Overlay · Close — DARK backdrop, NO title */}
              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="overlay · close — DARK backdrop, NO title" />
                </View>
                <View style={{ backgroundColor: colors.surface.inverse }}>
                  <MastheadHeader
                    iconType="overlay"
                    leading="close"
                    trailingIcon="clipboard-search-outline"
                    onLeadingPress={() => undefined}
                    onTrailingPress={() => undefined}
                  />
                </View>
              </View>

              {/* Optional: pass a title — proves the prop still works */}
              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="solid · back · WITH title (optional, opt-in)" />
                </View>
                <View style={{ backgroundColor: colors.surface.sunken }}>
                  <MastheadHeader
                    iconType="solid"
                    leading="back"
                    title="Card Details"
                    trailingIcon="bell-outline"
                    onLeadingPress={() => undefined}
                    onTrailingPress={() => undefined}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 27. STRIPALERT — 9 tones (left-cta layout with icon) */}
          <View style={{ marginHorizontal: -spacing[16] }}>
            <View style={{ paddingHorizontal: spacing[16] }}>
              <SectionHeader
                title="27. StripAlert"
                subtitle="Figma 3836:49836 — same 9-tone system as Toast/InlineMessage"
              />
            </View>
            <View style={{ gap: spacing[12] }}>
              {(
                [
                  'brand',
                  'gray',
                  'success',
                  'warning',
                  'error',
                  'info',
                  'purple',
                  'sky',
                  'rose',
                ] as ToneName[]
              ).map((t) => (
                <View key={t} style={{ gap: spacing[4] }}>
                  <View style={{ paddingHorizontal: spacing[16] }}>
                    <ButtonLabel text={`tone = ${t}`} />
                  </View>
                  <StripAlert
                    tone={t}
                    layout="left-cta"
                    icon
                    text={`This is a ${t} alert strip.`}
                    ctaLabel="Link"
                    onCtaPress={() => undefined}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* 28. FOOTER — big bottom CTA block, theme dark vs light */}
          <View style={{ marginHorizontal: -spacing[16] }}>
            <View style={{ paddingHorizontal: spacing[16] }}>
              <SectionHeader
                title="28. Footer"
                subtitle="Figma 3762:74006 — display40 headline + heading20 subtext + optional CTA"
              />
            </View>
            <View style={{ gap: spacing[16] }}>
              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="theme = dark (text on light bg)" />
                </View>
                <View
                  style={{
                    backgroundColor: colors.surface.default,
                    paddingBottom: spacing[24],
                  }}
                >
                  <Footer
                    theme="dark"
                    headline="Found the right card?"
                    subtext="Apply now and earn cashback."
                    ctaLabel="Apply Now"
                    onCtaPress={() => undefined}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="theme = light (text on DARK bg)" />
                </View>
                <View
                  style={{
                    backgroundColor: colors.surface.inverse,
                    paddingBottom: spacing[24],
                  }}
                >
                  <Footer
                    theme="light"
                    headline="Ready to start saving?"
                    subtext="Join 50,000+ members already earning."
                    ctaLabel="Get Started"
                    onCtaPress={() => undefined}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 29. FOOTER BUTTONS — full coverage of buttons × color + strips */}
          <View style={{ marginHorizontal: -spacing[16] }}>
            <View style={{ paddingHorizontal: spacing[16] }}>
              <SectionHeader
                title="29. FooterButtons"
                subtitle="Figma 3707:36416 — Button (tone-aware outline) + StripAlert + TermsAndConditions (with checkbox)"
              />
            </View>
            <View style={{ gap: spacing[16] }}>
              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="single · 44 · color=main (saffron)" />
                </View>
                <FooterButtons
                  buttons="single"
                  size={44}
                  color="main"
                  primaryLabel="Apply Now"
                  onPrimary={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="single · 52 · color=main" />
                </View>
                <FooterButtons
                  buttons="single"
                  size={52}
                  color="main"
                  primaryLabel="Get Started"
                  onPrimary={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="single · 44 · color=second (cobalt)" />
                </View>
                <FooterButtons
                  buttons="single"
                  size={44}
                  color="second"
                  primaryLabel="Save Card"
                  onPrimary={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="dual · 44 · color=main (saffron outline + saffron solid)" />
                </View>
                <FooterButtons
                  buttons="dual"
                  size={44}
                  color="main"
                  primaryLabel="Apply"
                  secondaryLabel="Cancel"
                  onPrimary={() => undefined}
                  onSecondary={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="dual · 44 · color=mixed (cobalt outline + saffron solid)" />
                </View>
                <FooterButtons
                  buttons="dual"
                  size={44}
                  color="mixed"
                  primaryLabel="Apply"
                  secondaryLabel="Cancel"
                  onPrimary={() => undefined}
                  onSecondary={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="dual-outline · 44 · color=main (both saffron outline)" />
                </View>
                <FooterButtons
                  buttons="dual-outline"
                  size={44}
                  color="main"
                  primaryLabel="Skip"
                  secondaryLabel="Cancel"
                  onPrimary={() => undefined}
                  onSecondary={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="single · 44 · caption strip" />
                </View>
                <FooterButtons
                  buttons="single"
                  size={44}
                  strip="caption"
                  stripText="Limited offer — apply within 24 hours."
                  primaryLabel="Apply Now"
                  onPrimary={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="single · 44 · T&C strip · UNCHECKED" />
                </View>
                <FooterButtons
                  buttons="single"
                  size={44}
                  strip="tnc"
                  stripText="I agree to the Terms and Privacy Policy and consent to my data being used for card recommendations."
                  tncChecked={tncUnchecked}
                  onTncToggle={setTncUnchecked}
                  primaryLabel="Continue"
                  onPrimary={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[4] }}>
                <View style={{ paddingHorizontal: spacing[16] }}>
                  <ButtonLabel text="single · 44 · T&C strip · CHECKED" />
                </View>
                <FooterButtons
                  buttons="single"
                  size={44}
                  strip="tnc"
                  stripText="I agree to the Terms and Privacy Policy and consent to my data being used for card recommendations."
                  tncChecked={tncOn}
                  onTncToggle={setTncOn}
                  primaryLabel="Continue"
                  onPrimary={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 30. BOTTOM SHEET — tile menu, one tile per template */}
          <View>
            <SectionHeader
              title="30. BottomSheet"
              subtitle="Figma 3834:42043 — tap any tile to open that template via the same modal"
            />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing[8],
              }}
            >
              {SHEET_TILES.map((tile) => (
                <Pressable
                  key={tile.label}
                  onPress={() => openSheet(tile)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${tile.label} sheet`}
                  style={({ pressed }) => ({
                    paddingVertical: spacing[12],
                    paddingHorizontal: spacing[16],
                    borderRadius: radius.md,
                    borderWidth: borderWidth.thin,
                    borderColor: colors.border.default,
                    backgroundColor: colors.surface.default,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    variant="body14Medium"
                    color={colors.text.primary}
                  >
                    {tile.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 31. CARD TILE & FEE STRIP — composes Button, CashbackBadge,
              Tag, Icon and CardFeeStrip. */}
          <View>
            <SectionHeader
              title="31. CardTile & FeeStrip"
              subtitle="Figma 3762:62051 (strip) + 3762:85548 (tile) — strict token-bound, pure composition"
            />

            <View style={{ gap: spacing[24] }}>
              {/* — CardFeeStrip: all 3 types — */}
              <View style={{ gap: spacing[12] }}>
                <Text variant="body14Medium" color={colors.text.secondary}>
                  CardFeeStrip — lifetime-free
                </Text>
                <CardFeeStrip type="lifetime-free" onPress={() => undefined} />

                <Text variant="body14Medium" color={colors.text.secondary}>
                  CardFeeStrip — discontinued
                </Text>
                <CardFeeStrip type="discontinued" onPress={() => undefined} />

                <Text variant="body14Medium" color={colors.text.secondary}>
                  CardFeeStrip — with-fees
                </Text>
                <CardFeeStrip
                  type="with-fees"
                  joiningFee="₹500"
                  annualFee="₹1,000"
                  onPress={() => undefined}
                />
              </View>

              {/* — CardTile: full, one per fee-strip state — */}
              <View style={{ gap: spacing[12] }}>
                <Text variant="body14Medium" color={colors.text.secondary}>
                  CardTile — full, lifetime-free
                </Text>
                <CardTile
                  type="full"
                  cardImage={images.cards.sbiCashback}
                  cardName="SBI Cashback Credit Card"
                  cashbackText="₹2,000"
                  tags={['Online Spends', 'Daily Use']}
                  benefits={[
                    {
                      icon: 'feat-discount-outline',
                      title: '5% cashback on online spends, no merchant cap',
                    },
                    {
                      icon: 'feat-savings-outline',
                      title: '1% cashback on all offline spends',
                    },
                  ]}
                  feeType="lifetime-free"
                  onApply={() => undefined}
                />

                <Text variant="body14Medium" color={colors.text.secondary}>
                  CardTile — full, discontinued
                </Text>
                <CardTile
                  type="full"
                  cardImage={images.cards.axisMagnus}
                  cardName="Axis Bank Magnus Credit Card"
                  cashbackText="₹3,500"
                  inviteOnly
                  tags={['Premium', 'Travel', 'Lifestyle']}
                  benefits={[
                    {
                      icon: 'feat-lounge-outline',
                      title: 'Unlimited domestic & 8 international lounge visits',
                    },
                    {
                      icon: 'feat-rewards-outline',
                      title: '25,000 EDGE reward points on activation',
                    },
                  ]}
                  feeType="discontinued"
                  onApply={() => undefined}
                />

                <Text variant="body14Medium" color={colors.text.secondary}>
                  CardTile — full, with joining & annual fee
                </Text>
                <CardTile
                  type="full"
                  cardImage={images.cards.hdfcRegaliaGold}
                  cardName="HDFC Bank Regalia Gold Credit Card"
                  cashbackText="₹1,800"
                  tags={['Travel', 'Dining', 'Rewards']}
                  benefits={[
                    {
                      icon: 'feat-lounge-outline',
                      title: '12 complimentary domestic lounge visits / year',
                    },
                    {
                      icon: 'feat-dining-outline',
                      title: 'Up to 7% discount at partner restaurants',
                    },
                  ]}
                  feeType="with-fees"
                  feeProps={{ joiningFee: '₹2,500', annualFee: '₹2,500' }}
                  onApply={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 32. TAG — tone-themed pill, all axes */}
          <View>
            <SectionHeader
              title="32. Tag"
              subtitle="Figma 3636:22802 — size × pill × appearance × icon × 9 tones"
            />
            <View style={{ gap: spacing[20] }}>
              {/* (1) all 4 sizes — default appearance, brand tone */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="(1) sizes — default / brand" />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                  }}
                >
                  <Tag size="xxs" tone="brand" label="xxs" />
                  <Tag size="xs"  tone="brand" label="xs" />
                  <Tag size="sm"  tone="brand" label="sm" />
                  <Tag size="md"  tone="brand" label="md" />
                </View>
              </View>

              {/* (2) pill on vs off */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="(2) pill — false vs true" />
                <View style={{ flexDirection: 'row', gap: spacing[8] }}>
                  <Tag size="md" tone="brand" label="Squared (radius 4)" />
                  <Tag size="md" tone="brand" label="Pill (radius full)" pill />
                </View>
              </View>

              {/* (3) appearance default vs subtle vs gradient */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="(3) appearance — default / subtle / gradient (tagPills)" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
                  <Tag size="md" tone="success" label="Default"  appearance="default" />
                  <Tag size="md" tone="success" label="Subtle"   appearance="subtle" />
                  <Tag size="md" tone="info"    label="Gradient" appearance="gradient" />
                </View>
              </View>

              {/* (4) all 6 icon variants */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="(4) icon — none / dot / icon-left / icon-right / icon-only / x-close" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                  }}
                >
                  <Tag size="md" tone="info" label="None" icon="none" />
                  <Tag size="md" tone="success" label="Live" icon="dot" />
                  <Tag
                    size="md"
                    tone="warning"
                    label="Left"
                    icon="icon-left"
                    iconName="star-filled"
                  />
                  <Tag
                    size="md"
                    tone="purple"
                    label="Right"
                    icon="icon-right"
                    iconName="check-outline"
                  />
                  <Tag
                    size="md"
                    tone="gray"
                    icon="icon-only"
                    iconName="star-outline"
                    label="Star"
                  />
                  <Tag
                    size="md"
                    tone="error"
                    label="Dismiss"
                    icon="x-close"
                    onClose={() => undefined}
                  />
                </View>
              </View>

              {/* (5) all 9 tones — sm, default */}
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="(5) all 9 tones — sm / default" />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[8],
                  }}
                >
                  {(
                    [
                      'brand',
                      'gray',
                      'success',
                      'warning',
                      'error',
                      'info',
                      'purple',
                      'sky',
                      'rose',
                    ] as ToneName[]
                  ).map((t) => (
                    <Tag key={t} size="sm" tone={t} label={t} />
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* 33. MASTHEAD — 'profile' + 'earnings' variants */}
          <View>
            <SectionHeader
              title="33. Masthead"
              subtitle="Figma 4743:24196 (profile) + 4743:24142 (earnings)"
            />
            <View style={{ gap: spacing[24] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="profile (360×242) — backdrop: bg-medium.png" />
                <Masthead
                  variant="profile"
                  onEditProfile={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="earnings (360×202) — backdrop: bg-darkblue.png" />
                <Masthead
                  variant="earnings"
                  onInfoPress={() => undefined}
                  onCashbackPress={() => undefined}
                  onRewardsPress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="payment (360×120) — backdrop: bg-small.png" />
                <Masthead
                  variant="payment"
                  onInfoPress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="cashback-status (360×240) — composes BrandLogo + StatusBadge over Amber/50" />
                <Masthead
                  variant="cashback-status"
                  amount="₹1900.9"
                  brandLogo={images.stores.amazon2}
                  expectedText="Expected by October 15, 2025"
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="home (360×408) — composes HomeHeader + SearchBar over bg-home.png; tap bar to open SearchTopSheet" />
                <Masthead
                  variant="home"
                  notificationCount={9}
                  onSearchPress={() => openSearchSheet('suggestions')}
                  onMessagePress={() => undefined}
                  onBellPress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="offers — saffron hero, SearchBar 'Search' (opens SearchTopSheet), 5 category circles" />
                <Masthead
                  variant="offers"
                  onSearchPress={() => openSearchSheet('suggestions')}
                  onOfferCategoryPress={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 34. BRAND LOGO GRID — stores only */}
          <View>
            <SectionHeader
              title="34. BrandLogoGrid (Stores)"
              subtitle="Figma 3283:47650 — sources real store/partner logos from images.stores"
            />
            <View style={{ gap: spacing[8] }}>
              <ButtonLabel
                text={`Stores (${Object.keys(images.stores).length}, source: images.stores → store-*.png)`}
              />
              <BrandLogoGrid logos={Object.values(images.stores)} />
            </View>
          </View>

          {/* 34b. STORE ABOUT BRAND — both states */}
          <View>
            <SectionHeader
              title="34b. StoreAboutBrand"
              subtitle="Figma 3832:31404 — logo block + optional truncated description w/ View More. Reuses BrandLogo."
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="brandDescription={true} — On (360×76). Tap to toggle View More / View Less." />
                <StoreAboutBrand
                  brandDescription
                  logo={images.stores.mcaffeine}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="brandDescription={false} — Off (360×48, logo only)" />
                <StoreAboutBrand
                  brandDescription={false}
                  logo={images.stores.mcaffeine}
                />
              </View>
            </View>
          </View>

          {/* 34c. STORE CASHBACK DETAILS — both states */}
          <View>
            <SectionHeader
              title="34c. StoreCashbackDetails"
              subtitle="Figma 3824:101184 — Off (summary) / On (+ Bonus Offer card). Reuses Timer atom."
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="bonusOffer={false} — Off (360×96)" />
                <StoreCashbackDetails
                  bonusOffer={false}
                  onViewRates={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="bonusOffer={true} — On (360×284, Bonus Offer + Timer + badge)" />
                <StoreCashbackDetails
                  bonusOffer
                  onViewRates={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 34d. STORE OFFER DETAILS — both states */}
          <View>
            <SectionHeader
              title="34d. StoreOfferDetails"
              subtitle="Figma 3795:78469 — Off (168) / On (+ How-to card, 248). Reuses Icon (copy-outline)."
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="howToGetThisOffer={true} — On (360×248)" />
                <StoreOfferDetails
                  howToGetThisOffer
                  onCopyCode={() => undefined}
                  onSeeDetails={() => undefined}
                  onHowToGet={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="howToGetThisOffer={false} — Off (360×168)" />
                <StoreOfferDetails
                  howToGetThisOffer={false}
                  onCopyCode={() => undefined}
                  onSeeDetails={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 34e. STORE BENEFIT DETAILS — both states */}
          <View>
            <SectionHeader
              title="34e. StoreBenefitDetails"
              subtitle="Figma 3821:93543 — Off (166) / On (+ How-to card, 246). Reuses ListRow + shared HowToGetOfferCard."
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="howToGetThisOffer={true} — On (360×246)" />
                <StoreBenefitDetails
                  howToGetThisOffer
                  onSeeDetails={() => undefined}
                  onHowToGet={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="howToGetThisOffer={false} — Off (360×166)" />
                <StoreBenefitDetails
                  howToGetThisOffer={false}
                  onSeeDetails={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 34f. STORE CASHBACK TIMELINES — both states */}
          <View>
            <SectionHeader
              title="34f. StoreCashbackTimelines"
              subtitle="Figma 3795:78834 — Off (2 tiles) / On (3 tiles, 3rd wraps). Reuses Grid cashback-timelines."
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="appOrderTile={true} — On (360×316, 3 tiles)" />
                <StoreCashbackTimelines
                  appOrderTile
                  onTilePress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="appOrderTile={false} — Off (360×164, 2 tiles)" />
                <StoreCashbackTimelines
                  appOrderTile={false}
                  onTilePress={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 34g. STORE TERMS & CONDITIONS — both states */}
          <View>
            <SectionHeader
              title="34g. StoreTermsConditions"
              subtitle="Figma 3795:84158 — Card View (HowItWorks carousel) / List View (bullets). Card icon substituted (feat-celebration-outline)."
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text='property1="Card View" — carousel of T&C cards' />
                <StoreTermsConditions
                  property1="Card View"
                  onViewAll={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text='property1="List View" — disc-bulleted T&C list' />
                <StoreTermsConditions
                  property1="List View"
                  onViewAll={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 34h. STORE SIMILAR STORE — both states */}
          <View>
            <SectionHeader
              title="34h. StoreSimilarStore"
              subtitle="Figma 3832:25789 — Stores (1 row of 3) / 6 stores (two stacked grids). Reuses Grid brand-1x3."
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text='property1="Stores" — one row of 3' />
                <StoreSimilarStore
                  property1="Stores"
                  onStorePress={() => undefined}
                />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text='property1="6 stores" — two stacked grids (6 cards)' />
                <StoreSimilarStore
                  property1="6 stores"
                  onStorePress={() => undefined}
                />
              </View>
            </View>
          </View>

          {/* 34i. AMAZON OFFER-DETAIL SHEETS — Template A (List body) */}
          <View>
            <SectionHeader
              title="34i. Amazon offer sheets (Template A)"
              subtitle="Figma 4439:291383 — ONE reusable BottomSheet shell, List-body templates. Template B (3 ScreenState sheets) is BLOCKED: the illustration PNGs are missing from assets."
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="rewards-rate (open) — saffron values + dashed separators" />
                <View
                  style={{
                    borderWidth: borderWidth.thin,
                    borderColor: colors.border.subtle3,
                    borderTopLeftRadius: radius['2xl'],
                    borderTopRightRadius: radius['2xl'],
                    overflow: 'hidden',
                    backgroundColor: colors.surface.default,
                  }}
                >
                  <BottomSheetHeader title="Reward Rates" showStroke />
                  <BottomSheetBody
                    template="rate-list"
                    rewardRates={AMAZON_RATE_ROWS}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="terms-conditions (open) — intro line + disc bullets" />
                <View
                  style={{
                    borderWidth: borderWidth.thin,
                    borderColor: colors.border.subtle3,
                    borderTopLeftRadius: radius['2xl'],
                    borderTopRightRadius: radius['2xl'],
                    overflow: 'hidden',
                    backgroundColor: colors.surface.default,
                  }}
                >
                  <BottomSheetHeader title="Terms & Conditions" showStroke />
                  <BottomSheetBody
                    template="terms-list"
                    text={AMAZON_TC_INTRO}
                    bullets={AMAZON_TC_BULLETS}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 35. SEARCHBAR — 3 states (default / focused / filled) */}
          <View>
            <SectionHeader
              title="35. SearchBar"
              subtitle="Figma 1859:17 — h48 white bar w/ border, 3 states + grouped results dropdown on filled"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="default — search icon + 'Search' placeholder + saffron cursor" />
                <SearchBar state="default" />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="focused — back icon + empty input + saffron cursor" />
                <SearchBar state="focused" onBack={() => undefined} />
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="filled — back + typed value + close X + results (Banks, Cards)" />
                <SearchBar
                  state="filled"
                  value="HDFC"
                  onBack={() => undefined}
                  onClear={() => undefined}
                  onResultPress={() => undefined}
                  sections={[
                    {
                      header: 'Banks',
                      rows: [
                        {
                          logo: images.stores.hsbcCreditCardt11,
                          title: 'HDFC Bank',
                          subtitle: 'Flat 0.35% Cashback',
                        },
                        {
                          logo: images.stores.sbicard,
                          title: 'SBI Card',
                          subtitle: 'Flat 0.50% Cashback',
                        },
                      ],
                    },
                    {
                      header: 'Cards',
                      rows: [
                        {
                          logo: images.stores.myzoneLtfRupayCard1,
                          title: 'HDFC Regalia Gold',
                          subtitle: 'Upto ₹2,500 Cashback',
                        },
                        {
                          logo: images.stores.sbiMilesCard1,
                          title: 'SBI Cashback Credit Card',
                          subtitle: 'Upto ₹2,000 Cashback',
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* 36. SEARCH TOP SHEET — slides DOWN from top */}
          <View>
            <SectionHeader
              title="36. SearchTopSheet"
              subtitle="Figma 4798:46697 — slides down from top, dim backdrop dismisses. Composes SearchBar + Chip."
            />
            <View style={{ flexDirection: 'row', gap: spacing[8], flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => openSearchSheet('suggestions')}
                accessibilityRole="button"
                accessibilityLabel="Open search — suggestions"
                style={({ pressed }) => ({
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                  borderRadius: radius.md,
                  borderWidth: borderWidth.thin,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.default,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text variant="body14Medium" color={colors.text.primary}>
                  Open — suggestions
                </Text>
              </Pressable>

              <Pressable
                onPress={() => openSearchSheet('history')}
                accessibilityRole="button"
                accessibilityLabel="Open search — history"
                style={({ pressed }) => ({
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                  borderRadius: radius.md,
                  borderWidth: borderWidth.thin,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.default,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text variant="body14Medium" color={colors.text.primary}>
                  Open — history
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 37. GRID — 'features' variant (variant 1 of ~6–7) */}
          <View>
            <SectionHeader
              title="37. Grid"
              subtitle="Figma 3098:60741 (features) + 3098:60742 (brand-1x3)"
            />
            <View style={{ gap: spacing[20] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="features — 2-col tiles, cobalt-100 border, icon/info blue glyphs" />
                <View style={{ width: 328, alignSelf: 'center' }}>
                  <Grid
                    variant="features"
                    items={[
                      {
                        icon: 'feat-dining-outline',
                        label: '10% cashback on dining and food delivery',
                      },
                      {
                        icon: 'feat-mobile-recharge-outline',
                        label: '1.5% cashback on all online purchases',
                      },
                      {
                        icon: 'feat-lounge-outline',
                        label: '4 international & 6 domestic airport lounge access',
                      },
                      {
                        icon: 'feat-travel-outline',
                        label: '₹12,000 yatra voucher upon joining',
                      },
                      {
                        icon: 'feat-discount-outline',
                        label: '₹0 annual fee on ₹2L+ annual spend',
                      },
                      {
                        icon: 'feat-fuel-outline',
                        label: 'Save 1% on fuel spends between ₹500 and ₹3,000',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="brand-1x3 — row of 3 brand-offer cards (ruby-50 badge, cobalt-700 CTA)" />
                <View style={{ width: 334, alignSelf: 'center' }}>
                  <Grid
                    variant="brand-1x3"
                    items={[
                      {
                        logo: images.stores.amazon2,
                        badgeText: 'Live Now',
                        ctaLabel: 'Upto 7% Cashback',
                      },
                      {
                        logo: images.stores.fkFashion1,
                        badgeText: 'Upto 80% Off',
                        ctaLabel: 'Upto 7% Cashback',
                      },
                      {
                        logo: images.stores.myntra31,
                        badgeText: 'Live Now',
                        ctaLabel: 'Upto 7% Cashback',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="brand-1x2 — 2×2 grid of offer cards (big image + cobalt-500 CTA bar)" />
                <View style={{ width: 328, alignSelf: 'center' }}>
                  <Grid
                    variant="brand-1x2"
                    items={[
                      {
                        image: images.brands.amazon,
                        ctaLabel: 'Shop & Earn upto 2.5%',
                      },
                      {
                        image: images.brands.flipkart,
                        ctaLabel: 'Shop & Earn upto 2.5%',
                      },
                      {
                        image: images.brands.myntra,
                        ctaLabel: 'Shop & Earn upto 2.5%',
                      },
                      {
                        image: images.brands.nykaa,
                        ctaLabel: 'Shop & Earn upto 2.5%',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="cashback-timelines — 2-per-row stat cards w/ forward-arrow tap" />
                <View style={{ width: 328, alignSelf: 'center' }}>
                  <Grid
                    variant="cashback-timelines"
                    items={[
                      {
                        label: 'Cashback tracks in',
                        metric: '30',
                        unit: 'Minutes',
                        onPress: () => undefined,
                      },
                      {
                        label: 'Cashback Confirms in',
                        metric: '30',
                        unit: 'Minutes',
                        onPress: () => undefined,
                      },
                      {
                        label: 'Cashback on Mcaffeine app orders',
                        metric: 'NO',
                        onPress: () => undefined,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="filters — 2-col selectable squares (lavender + cobalt focus when selected)" />
                <View style={{ alignSelf: 'center' }}>
                  <Grid
                    variant="filters"
                    onToggle={(i, next) =>
                      setFilterSelections((prev) =>
                        prev.map((v, idx) => (idx === i ? next : v))
                      )
                    }
                    items={[
                      {
                        image: images.filters.shopping,
                        label: 'Shopping',
                        selected: filterSelections[0],
                      },
                      {
                        image: images.filters.fuel,
                        label: 'Fuel',
                        selected: filterSelections[1],
                      },
                      {
                        image: images.filters.foodOrdering,
                        label: 'Food Ordering',
                        selected: filterSelections[2],
                      },
                      {
                        image: images.filters.dining,
                        label: 'Dining',
                        selected: filterSelections[3],
                      },
                      {
                        image: images.filters.grocery,
                        label: 'Grocery',
                        selected: filterSelections[4],
                      },
                      {
                        image: images.filters.travel,
                        label: 'Travel',
                        selected: filterSelections[5],
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 38. ELIGIBILITY MASTHEAD — 'eligible' + 'maybe' (variants 1 + 2 of 3) */}
          <View>
            <SectionHeader
              title="38. EligibilityMasthead"
              subtitle="Figma 2835:194699 (eligible) + 3762:78994 (maybe)"
            />
            <View style={{ gap: spacing[24] }}>
              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="eligible — green gradient banner, info pill, floating card" />
                <View style={{ alignSelf: 'center' }}>
                  <EligibilityMasthead variant="eligible" />
                </View>
              </View>

              <View style={{ gap: spacing[8] }}>
                <ButtonLabel text="maybe — gold radial gradient (gradient.warning), info card, ghost CTA" />
                <View style={{ alignSelf: 'center' }}>
                  <EligibilityMasthead
                    variant="maybe"
                    onContinue={() => undefined}
                    onEditPress={() => undefined}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 39. ELIGIBILITY SHEETS — tap to open each as a slide-up sheet */}
          <View>
            <SectionHeader
              title="39. Eligibility Sheets"
              subtitle="Figma 2917:67213 (EligibleSheet) + 2917:67223 (MaybeSheet) — tap a button to open"
            />
            <View
              style={{
                flexDirection: 'row',
                gap: spacing[8],
                flexWrap: 'wrap',
              }}
            >
              <Pressable
                onPress={() => eligibleSheetRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel="Open EligibleSheet"
                style={({ pressed }) => ({
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                  borderRadius: radius.md,
                  borderWidth: borderWidth.thin,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.default,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text variant="body14Medium" color={colors.text.primary}>
                  Open EligibleSheet
                </Text>
              </Pressable>

              <Pressable
                onPress={() => maybeSheetRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel="Open MaybeSheet"
                style={({ pressed }) => ({
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                  borderRadius: radius.md,
                  borderWidth: borderWidth.thin,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.default,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text variant="body14Medium" color={colors.text.primary}>
                  Open MaybeSheet
                </Text>
              </Pressable>

              <Pressable
                onPress={() => eligibilityCheckerRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel="Open EligibilityCheckerSheet"
                style={({ pressed }) => ({
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                  borderRadius: radius.md,
                  borderWidth: borderWidth.thin,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.default,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text variant="body14Medium" color={colors.text.primary}>
                  Open Eligibility Checker
                </Text>
              </Pressable>

              <Pressable
                onPress={() => loginSheetRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel="Open LoginSheet"
                style={({ pressed }) => ({
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                  borderRadius: radius.md,
                  borderWidth: borderWidth.thin,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.default,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text variant="body14Medium" color={colors.text.primary}>
                  Open Login Sheet
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 4. IMAGES */}
          <View>
            <SectionHeader
              title="4. Images"
              subtitle={(() => {
                const total = Object.values(images).reduce(
                  (n, g) => n + Object.keys(g).length,
                  0
                );
                return `${total} PNGs across ${Object.keys(images).length} folders`;
              })()}
            />
            <View style={{ gap: spacing[24] }}>
              {(
                Object.keys(images) as Array<keyof typeof images>
              ).map((folder) => {
                const group = images[folder] as unknown as ImageGroup;
                const count = Object.keys(group).length;
                return (
                  <View key={folder} style={{ gap: spacing[12] }}>
                    <Text
                      variant="heading18SemiBold"
                      color={colors.text.primary}
                    >
                      {folder}{' '}
                      <Text
                        variant="body14Regular"
                        color={colors.text.tertiary}
                      >
                        ({count})
                      </Text>
                    </Text>
                    <ImageGroupGrid
                      group={group}
                      isCard={folder === 'cards'}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Shared BottomSheet — one ref, state-driven template + footer.
          Each tile in section 30 calls openSheet(tile) which updates
          the state then present()s this modal. */}
      <BottomSheet
        ref={sheetRef}
        title={sheetTitle}
        showStroke
        template={sheetTemplate}
        bodyProps={sheetBodyProps}
        footer={sheetFooter}
        footerProps={sheetFooterProps}
      />

      {/* Section 39 — Eligibility CHECKER (form). On Check Now, parse
          income vs the spec'd ₹50,000 threshold and route to the
          EligibleSheet or MaybeSheet. */}
      <EligibilityCheckerSheet
        ref={eligibilityCheckerRef}
        defaultPincode="144000"
        defaultIncome="₹1,20,000"
        threshold={50000}
        onCheck={(result) => {
          eligibilityCheckerRef.current?.dismiss();
          // Small timeout so the dismiss animation finishes before the
          // next sheet's present() — otherwise gorhom can race on iOS.
          setTimeout(() => {
            if (result.isEligible) {
              eligibleSheetRef.current?.present();
            } else {
              maybeSheetRef.current?.present();
            }
          }, 250);
        }}
      />

      {/* Section 39 preview — Login sheet, INLINED to match the
          EligibleSheet pattern (a custom LoginSheet wrapper's ref
          wasn't propagating, so the modal never registered). */}
      <GorhomBottomSheetModal
        ref={loginSheetRef}
        snapPoints={loginSnapPoints}
        enablePanDownToClose
        backdropComponent={renderLoginBackdrop}
        handleComponent={() => null}
        // Keyboard handling (FIX 1) — sheet must slide up so the input,
        // CTA, and T&C stay visible while typing.
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          {/* Drag handle — REUSED BottomSheetHeader, no title */}
          <BottomSheetHeader showStroke={false} />

          {/* Body — four blocks in spec order:
              (1) header text  (2) mobile input  (3) CTA  (4) T&C */}
          <View
            style={{
              backgroundColor: colors.surface.default,
              paddingTop: spacing[24],
              paddingBottom: insets.bottom + spacing[20],
              paddingHorizontal: spacing[20],
              gap: spacing[24],
              alignItems: 'flex-start',
            }}
          >
            {/* (1) Header text */}
            <View
              style={{
                width: '100%',
                alignItems: 'center',
                gap: spacing[4],
              }}
            >
              <Text
                variant="heading24SemiBold"
                color={colors.text.primary}
                align="center"
              >
                Log in or Sign up
              </Text>
              <Text
                variant="body14Regular"
                color={colors.text.secondary}
                align="center"
              >
                We will send an OTP to verify
              </Text>
            </View>

            {/* (2) Mobile Number — uses gorhom's <BottomSheetTextInput>
                so the sheet's keyboard machinery sees the focus event
                and lifts the modal above the keyboard. The Input atom
                wraps a raw RN TextInput which gorhom can't track, so
                the input is wrapped in a styled View here that mimics
                the Input atom's filled look (white bg, border, radius,
                floating label above). */}
            <View style={{ width: '100%', gap: spacing[6] }}>
              <Text
                variant="body12Medium"
                color={colors.text.secondary}
              >
                Mobile Number
              </Text>
              <BottomSheetTextInput
                value={loginPhone}
                onChangeText={(t: string) =>
                  setLoginPhone(t.replace(/\D/g, '').slice(0, 10))
                }
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="Enter 10-digit number"
                placeholderTextColor={colors.text.placeholder}
                style={{
                  height: sizing.inputHeight + spacing[12],
                  paddingHorizontal: spacing[16],
                  borderRadius: radius.lg,
                  borderWidth: borderWidth.thin,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.default,
                  color: colors.text.primary,
                  fontSize: 16,
                }}
              />
            </View>

            {/* (3) Get OTP — CTA active from the start, no disabled
                gating per spec (was disabled={!loginPhoneValid}). */}
            <Button
              label="Get OTP"
              variant="solid"
              tone="second"
              size={52}
              fullWidth
              onPress={() => loginSheetRef.current?.dismiss()}
            />

            {/* (4) T&C — inline Text per spec: body12Medium (12/16)
                in text.secondary, two link phrases nested in
                text.link (#0036da). Inline because the
                TermsAndConditions molecule's body defaults to
                body12Regular (Regular weight) — spec wants Medium. */}
            <Text
              variant="body12Medium"
              color={colors.text.secondary}
              align="center"
              style={{ width: '100%' }}
            >
              By continuing, you agree to Cashkaro's{' '}
              <Text
                variant="body12Medium"
                color={colors.text.link}
              >
                Terms & Conditions
              </Text>
              {' '}and{' '}
              <Text
                variant="body12Medium"
                color={colors.text.link}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </BottomSheetScrollView>
      </GorhomBottomSheetModal>

      {/* Section 39 — EligibleSheet via gorhom BottomSheetModal,
          same animation + backdrop opacity as the project's existing
          BottomSheet organism (Section 30). */}
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
          <EligibleSheet
            onApply={() => eligibleSheetRef.current?.dismiss()}
            onEditPress={() => undefined}
          />
        </BottomSheetScrollView>
      </GorhomBottomSheetModal>

      {/* Section 39 — MaybeSheet via gorhom BottomSheetModal */}
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
            onContinue={() => maybeSheetRef.current?.dismiss()}
            onEditPress={() => undefined}
            cards={[
                {
                  id: 'axis-magnus',
                  cardImage: images.cards.axisMagnus,
                  cardName: 'Axis Bank Magnus',
                  cashbackText: '₹3,500',
                  tags: ['Premium', 'Travel'],
                  benefits: [
                    {
                      icon: 'feat-lounge-outline',
                      title: 'Unlimited domestic & 8 intl lounges',
                    },
                    {
                      icon: 'feat-rewards-outline',
                      title: '25,000 EDGE points on activation',
                    },
                  ],
                },
                {
                  id: 'axis-ace',
                  cardImage: images.cards.axisFlipkart,
                  cardName: 'Axis Bank ACE',
                  cashbackText: '₹1,500',
                  tags: ['Daily Spends', 'Bills'],
                  benefits: [
                    {
                      icon: 'feat-mobile-recharge-outline',
                      title: '5% cashback on bills & recharges',
                    },
                    {
                      icon: 'feat-discount-outline',
                      title: '4% cashback on Swiggy, Zomato, Ola',
                    },
                  ],
                },
                {
                  id: 'hdfc-regalia-gold',
                  cardImage: images.cards.hdfcRegaliaGold,
                  cardName: 'HDFC Regalia Gold',
                  cashbackText: '₹2,500',
                  tags: ['Travel', 'Lounge'],
                  benefits: [
                    {
                      icon: 'feat-lounge-outline',
                      title: '12 complimentary domestic lounges',
                    },
                    {
                      icon: 'feat-dining-outline',
                      title: 'Up to 7% off at partner restaurants',
                    },
                  ],
                },
              ]}
            />
        </BottomSheetScrollView>
      </GorhomBottomSheetModal>

      {/* Section 36 — slides down from the top over everything */}
      <SearchTopSheet
        visible={searchSheetOpen}
        variant={searchSheetVariant}
        onClose={() => setSearchSheetOpen(false)}
        sections={[
          {
            header: 'Banks',
            rows: [
              {
                logo: images.stores.hsbcCreditCardt11,
                title: 'HDFC Bank',
                subtitle: 'Flat 0.35% Cashback',
              },
              {
                logo: images.stores.sbicard,
                title: 'SBI Card',
                subtitle: 'Flat 0.50% Cashback',
              },
            ],
          },
          {
            header: 'Cards',
            rows: [
              {
                logo: images.stores.myzoneLtfRupayCard1,
                title: 'HDFC Regalia Gold',
                subtitle: 'Upto ₹2,500 Cashback',
              },
              {
                logo: images.stores.sbiMilesCard1,
                title: 'SBI Cashback Credit Card',
                subtitle: 'Upto ₹2,000 Cashback',
              },
            ],
          },
        ]}
        recentSearches={[
          { label: 'Amazon Cashback', leadingIcon: 'clock-outline' },
          { label: 'New Card', leadingIcon: 'clock-outline' },
          { label: 'Neo Card', leadingIcon: 'clock-outline' },
        ]}
      />
    </View>
  );
}
