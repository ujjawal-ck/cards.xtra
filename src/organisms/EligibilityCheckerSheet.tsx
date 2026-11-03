/**
 * EligibilityCheckerSheet — organism (Figma 3976:56859)
 *
 * Pure composition of existing components — no new primitives:
 *   - <BottomSheetModal>          (@gorhom/bottom-sheet, same pattern
 *                                  the BottomSheet organism uses)
 *   - <BottomSheetBackdrop>       (matches the project's standard
 *                                  scrim — opacity 0.5)
 *   - <BottomSheetScrollView>     (scrollable body)
 *   - <BottomSheetHeader>         (organism — drag handle + title +
 *                                  optional bottom stroke)
 *   - <Input>                     (atom — text fields)
 *   - <Choice>                    (molecule — radio selectors for
 *                                  Salaried / Self-employed)
 *   - <FooterButtons>             (organism — single CTA + caption
 *                                  strip "Cards Available 10")
 *
 * Layout (matches Figma):
 *   header        BottomSheetHeader, title='Check Your Eligibility',
 *                 showStroke=true.
 *   body          padTop spacing[32], padBottom spacing[20], gap[24]
 *                 Input fields group (gap[16]):
 *                   - Input "Pincode" (md, filled when value present)
 *                   - Input "Monthly Income" (₹, number-pad)
 *                 Income Type group (gap[8]):
 *                   - Label body12Medium text.secondary
 *                   - Row of Choice radios: Salaried / Self-employed
 *   footer        FooterButtons, buttons='single', size=52, color='second'
 *                 (cobalt), strip='caption' (renders <StripAlert tone='info'/>
 *                 — the spec'd "Cards Available 10" cobalt-50 strip),
 *                 primaryLabel='Check Now'.
 *
 * Imperative API:
 *   ref.present() / ref.dismiss() — mirrors @gorhom/bottom-sheet.
 *   When the user taps "Check Now", `onCheck(result)` fires with the
 *   parsed values + the boolean `isEligible` (defaults threshold to
 *   ₹50,000/month). The caller does the routing to EligibleSheet vs
 *   MaybeSheet (it's not this sheet's job to navigate).
 *
 * Hex → token: every value sourced from src/tokens (#0741ef → Button
 * color='second', #ebf0ff → StripAlert tone='info').
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetFooter,
} from '@gorhom/bottom-sheet';
import type {
  BottomSheetModal as BottomSheetModalRef,
  BottomSheetBackdropProps,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Input, Selector, Button } from '../atoms';
import { InlineMessage } from '../molecules';
import { icons } from '../assets/icons';
import { BottomSheetHeader } from './BottomSheetHeader';
import { colors, spacing, radius, elevation } from '../tokens';
import { fetchEligibility } from '../api/eligibility';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type IncomeType = 'salaried' | 'self-employed';

/** Result shown after a check — drives the inline result banner. */
export type EligibilityVerdict = 'eligible' | 'maybe' | 'ineligible';

export interface EligibilityCheckerResult {
  pincode: string;
  /** Raw text the user typed in the income field (e.g. "₹1,20,000"). */
  incomeRaw: string;
  /** Parsed numeric value, e.g. 120000. NaN if the input can't be parsed. */
  incomeValue: number;
  incomeType: IncomeType;
  /** True when the API says the user is eligible for at least one card.
   *  Not called at all when the API call fails (an error banner shows). */
  isEligible: boolean;
  /** Number of cards the user is eligible for (from the API). */
  eligibleCount: number;
  /** card_alias of each eligible card — used to filter the Home list. */
  eligibleCardAliases: string[];
}

export interface EligibilityCheckerSheetProps {
  /** Initial pincode value. */
  defaultPincode?: string;
  /** Initial monthly income value (raw, can include ₹/commas). */
  defaultIncome?: string;
  /** Initial income type radio selection. Default 'salaried'. */
  defaultIncomeType?: IncomeType;
  /** Income threshold in rupees per month. Default 50000. */
  threshold?: number;
  /** When true, the sheet does NOT render its own inline result banner —
   *  the caller routes the outcome to a dedicated result sheet (green /
   *  amber / red) instead. The form still validates + calls onCheck. */
  routeResultExternally?: boolean;
  /** Fired when the user taps "Check Now" with the form's current state. */
  onCheck?: (result: EligibilityCheckerResult) => void;
  /** Fired when the user taps "Clear details" — the caller wipes the saved
   *  eligibility details. Shown only when the form has prefilled values. */
  onClear?: () => void;
  /** Fired when the sheet is dismissed (swipe-down / backdrop). Lets the
   *  caller undo the eligibility toggle if it was opened but not completed. */
  onDismiss?: () => void;
}

/** Parse a user-typed income string like "₹1,20,000" → 120000. NaN if
 *  the string has no digits. */
export function parseIncome(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return NaN;
  return Number(digits);
}

/** Analytics-safe income bucket: floors the parsed monthly income to a
 *  ₹10,000 band and returns its range label, e.g. 57000 → "50000-59999".
 *  Returns undefined when the income can't be parsed (so the param drops). */
export function incomeBand(raw: string): string | undefined {
  const value = parseIncome(raw);
  if (!Number.isFinite(value)) return undefined;
  const lower = Math.floor(value / 10000) * 10000;
  return `${lower}-${lower + 9999}`;
}

/** Analytics-safe pincode: the first 3 digits of a 6-digit Indian PIN — the
 *  sorting-district/region, NOT the full address. Returns undefined if there
 *  aren't 3 digits to take (so the param drops rather than leaking a partial). */
export function pincodePrefix(pincode: string): string | undefined {
  const digits = pincode.replace(/\D/g, '');
  return digits.length >= 3 ? digits.slice(0, 3) : undefined;
}

/** Group a number string in the Indian (lakh) system as the user types:
 *  "115000" → "1,15,000", "1500000" → "15,00,000". Strips any non-digits +
 *  leading zeros first; returns '' when there are no digits. The last three
 *  digits stay together, everything before is grouped in pairs. */
export function formatIndianIncome(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export const EligibilityCheckerSheet = forwardRef<
  BottomSheetModalRef,
  EligibilityCheckerSheetProps
>(function EligibilityCheckerSheet(
  {
    defaultPincode = '',
    defaultIncome = '',
    defaultIncomeType = 'salaried',
    threshold = 50000,
    routeResultExternally = false,
    onCheck,
    onClear,
    onDismiss,
  },
  ref
) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModalRef>(null);
  useImperativeHandle(ref, () => sheetRef.current as BottomSheetModalRef);

  // ONE fixed tall snap point — deliberately NOT a compact+tall pair we
  // re-snap between on keyboard events. Under Android edge-to-edge, calling
  // snapToIndex() while an input is focused BLURS that field (moving the sheet
  // tears down the focused input's connection — the "type one digit then it
  // deselects" bug). The CTA's keyboard avoidance is now handled by the pinned
  // footer below (which lifts with the live keyboard height), so the sheet
  // itself never needs to move. autoFocus opens the keypad on present(); the
  // single snap means there's no snap-to-tall to race that. [[gorhom-keyboard-edge-to-edge]]
  const eligibilitySnapPoints = useMemo(() => ['94%'], []);

  // Live keyboard height (UI thread). useAnimatedKeyboard measures the IME
  // inset correctly under edge-to-edge when given the translucent flags —
  // RN's Keyboard events report ~0 here. Drives (a) the footer lift so the CTA
  // floats a fixed 24-px above the keypad, and (b) a scroll spacer so the body
  // fields can always be scrolled clear of the keypad on shorter screens.
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const keyboardSpacerStyle = useAnimatedStyle(() => ({
    height: keyboard.height.value,
  }));

  // Footer lift — translate the pinned CTA up by the live keyboard height so it
  // sits exactly spacing[24] above the keypad (no overlap). When the keypad is
  // down the footer rests above the home indicator (insets.bottom + 24).
  const footerAnimStyle = useAnimatedStyle(() => {
    const kb = keyboard.height.value;
    return {
      transform: [{ translateY: -kb }],
      paddingBottom: (kb > 0 ? 0 : insets.bottom) + spacing[24],
    };
  });

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        // Tap outside (the scrim) closes the sheet; closing blurs the focused
        // input, so both the sheet and the keypad dismiss in one tap.
        pressBehavior="close"
      />
    ),
    []
  );

  // Form state — kept local so the caller doesn't have to wire each
  // field; the final values are surfaced via onCheck.
  const [pincode, setPincode] = useState(defaultPincode);
  const [income, setIncome] = useState(formatIndianIncome(defaultIncome));
  const [incomeType, setIncomeType] = useState<IncomeType>(defaultIncomeType);

  // Re-sync the form to the remembered details whenever they change. Without
  // this, useState seeds the fields ONCE at mount, so details entered
  // elsewhere (e.g. the card-detail checker) wouldn't prefill here and the
  // user would be asked to type them again. Defaults only change after a
  // committed check, so this never clobbers mid-edit input.
  useEffect(() => {
    setPincode(defaultPincode);
    setIncome(formatIndianIncome(defaultIncome));
    setIncomeType(defaultIncomeType);
  }, [defaultPincode, defaultIncome, defaultIncomeType]);
  // Loading state for the Check Eligibility CTA — the button toggles
  // into its spinner state, then a brief delay simulates the async
  // eligibility lookup before we hand control to the caller for sheet
  // routing. Reset on dismiss so a re-open starts fresh.
  const [isChecking, setIsChecking] = useState(false);
  // Result banner (eligible / maybe / ineligible) + pincode validation —
  // both shown inline in the sheet after the user taps Check (Figma
  // 4439:291874).
  const [verdict, setVerdict] = useState<EligibilityVerdict | null>(null);
  const [pinError, setPinError] = useState(false);
  // API failure → explicit error banner. Never guess a verdict from income.
  const [checkFailed, setCheckFailed] = useState(false);

  // Show the "Clear" CTA only when the sheet opened with SAVED details
  // (i.e. a check was committed in an earlier session and the caller
  // prefilled them). Keyed off the default* props, not the live input, so
  // it stays hidden throughout the very first entry — even as the user
  // types — and only appears on a later reopen.
  const showClear = !!onClear && (defaultPincode.length > 0 || defaultIncome.length > 0);

  // Aggregate verdict for this sheet's inline banner. The API is the source
  // of truth: any qualifying card → eligible. Zero qualifying cards → a
  // near-miss on income (within 20% of the bar) reads "maybe", otherwise
  // ineligible. Income alone never turns an API "no" into "eligible".
  const decideVerdict = (
    eligibleCount: number,
    incomeValue: number
  ): EligibilityVerdict => {
    if (eligibleCount > 0) return 'eligible';
    if (Number.isFinite(incomeValue) && incomeValue >= 0.8 * threshold && incomeValue < threshold) {
      return 'maybe';
    }
    return 'ineligible';
  };

  const handleCheck = async () => {
    if (isChecking) return;
    // Validate the pincode first — must be 6 digits (Indian PIN).
    const pinDigits = pincode.replace(/\D/g, '');
    if (pinDigits.length !== 6) {
      setPinError(true);
      setVerdict(null);
      return;
    }
    setPinError(false);
    setIsChecking(true);
    const incomeValue = parseIncome(income);
    try {
      // Real eligibility lookup. The API returns one row per card with an
      // `eligible` boolean; the user is "eligible" if any card qualifies.
      const { eligibleCount, eligibleAliases } = await fetchEligibility({
        pincode,
        incomeMonthly: incomeValue,
        selfEmployed: incomeType === 'self-employed',
      });
      setCheckFailed(false);
      // Inline banner only when the caller isn't routing to a result sheet.
      if (!routeResultExternally) setVerdict(decideVerdict(eligibleCount, incomeValue));
      onCheck?.({
        pincode,
        incomeRaw: income,
        incomeValue,
        incomeType,
        isEligible: eligibleCount > 0,
        eligibleCount,
        eligibleCardAliases: eligibleAliases,
      });
    } catch {
      // Network/API failure — show an error and let the user retry. Do not
      // commit a guessed result (that told users "eligible" when the bank
      // would reject them).
      setVerdict(null);
      setCheckFailed(true);
    } finally {
      setIsChecking(false);
    }
  };

  // Pinned CTA — rendered in gorhom's footer (non-scrolling, anchored to the
  // sheet's visible bottom) and lifted above the keypad by footerAnimStyle so
  // there's always a 24-px gap between the button and the keyboard, never an
  // overlap. First-time entry → a single full-width "Check Eligibility".
  // Reopened with saved details → a "Clear" + "Check" pair (matches the Home
  // filters footer). `showClear` keys off the saved details (default* props),
  // NOT live input, so it never appears during the very first entry.
  const renderFooter = (props: BottomSheetFooterProps) => (
    <BottomSheetFooter {...props} bottomInset={0}>
      <Animated.View
        style={[
          {
            backgroundColor: colors.surface.default,
            paddingHorizontal: spacing[16],
            paddingTop: spacing[16],
          },
          elevation.light.up,
          footerAnimStyle,
        ]}
      >
        {showClear ? (
          <View style={{ flexDirection: 'row', gap: spacing[12] }}>
            <Button
              label="Clear"
              variant="outline"
              tone="second"
              size={52}
              onPress={() => {
                setPincode('');
                setIncome('');
                setIncomeType('salaried');
                setVerdict(null);
                setPinError(false);
                onClear?.();
              }}
            />
            <View style={{ flex: 1 }}>
              <Button
                label={verdict ? 'Re-Check Eligibility' : 'Check Eligibility'}
                variant="solid"
                tone="second"
                size={52}
                fullWidth
                loading={isChecking}
                onPress={handleCheck}
              />
            </View>
          </View>
        ) : (
          <Button
            label={verdict ? 'Re-Check Eligibility' : 'Check Eligibility'}
            variant="solid"
            tone="second"
            size={52}
            fullWidth
            loading={isChecking}
            onPress={handleCheck}
          />
        )}
      </Animated.View>
    </BottomSheetFooter>
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose
      // Single tall snap (see eligibilitySnapPoints). gorhom's own
      // keyboardBehavior can't lift the sheet here because it derives the lift
      // from RN's reported keyboard height, which Android gives as ~0 under
      // edge-to-edge — so instead the pinned footer rides up over the keypad.
      snapPoints={eligibilitySnapPoints}
      android_keyboardInputMode="adjustResize"
      onDismiss={() => {
        setVerdict(null);
        setPinError(false);
        setCheckFailed(false);
        onDismiss?.();
      }}
      footerComponent={renderFooter}
      backdropComponent={renderBackdrop}
      // Hide gorhom's default handle — BottomSheetHeader renders the
      // visual handle per Figma spec (same trick BottomSheet uses).
      handleComponent={() => null}
      backgroundStyle={{
        backgroundColor: colors.surface.default,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
      }}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          // Reserve room for the pinned footer (paddingTop[16] + 52-px CTA +
          // its resting bottom padding) so the last body field can scroll
          // clear of the footer and never sits hidden behind it.
          paddingBottom: spacing[16] + 52 + spacing[24] + insets.bottom,
        }}
      >
        {/* Header — REUSED */}
        <BottomSheetHeader
          title="Check Your Eligibility"
          showStroke
        />

        {/* Result banner — eligible / maybe / ineligible (Figma 4439:291874).
            REUSES the InlineMessage molecule (baked desc-* icons + DS tones). */}
        {checkFailed ? (
          <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[16] }}>
            <InlineMessage
              tone="error"
              icon="desc-cross"
              message="We couldn't check your eligibility right now. Please try again."
            />
          </View>
        ) : null}
        {verdict ? (
          <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[16] }}>
            {verdict === 'eligible' ? (
              <InlineMessage
                tone="success"
                icon="desc-celebrate"
                message="Congrats! You're eligible for this card!"
              />
            ) : verdict === 'maybe' ? (
              <InlineMessage
                tone="warning"
                icon="desc-exclamation"
                title="You might qualify for this card."
                message="Usually offered for salaries above ₹50,000/month. You may qualify or the bank might still approve your application"
              />
            ) : (
              <InlineMessage
                tone="error"
                icon="desc-cross"
                message="Sorry, You Are Ineligible!"
              />
            )}
          </View>
        ) : null}

        {/* Body — composed inline from Input + Choice */}
        <View
          style={{
            paddingTop: spacing[32],
            paddingBottom: spacing[24],
            paddingHorizontal: spacing[16],
            gap: spacing[24],
          }}
        >
          {/* Input fields group */}
          <View style={{ gap: spacing[16] }}>
            <Input
              label="PIN Code"
              placeholder="6 Digit PIN Code"
              keyboardType="number-pad"
              // Plain input (no useBottomSheetInput): gorhom's keyboard lift
              // is unused here (manual snap above), and the wrapped input drops
              // focus per keystroke on the new architecture.
              // Open with the PIN field focused so the keypad is up by
              // default when the sheet appears.
              autoFocus
              maxLength={6}
              value={pincode}
              state={pinError ? 'error' : undefined}
              hint={pinError ? 'Incorrect Pin Code' : undefined}
              onChangeText={(t) => {
                setPincode(t.replace(/[^0-9]/g, ''));
                if (pinError) setPinError(false);
                if (verdict) setVerdict(null);
              }}
            />
            <Input
              label="Monthly Income"
              placeholder="Enter your monthly income"
              leadingText="₹"
              keyboardType="number-pad"
              value={income}
              onChangeText={(t) => {
                // Re-group into the Indian (lakh) format on every keystroke.
                setIncome(formatIndianIncome(t));
                if (verdict) setVerdict(null);
              }}
            />
          </View>

          {/* Income Type group — Selector chips, single-select. Each
              chip is flex:1 so the row always renders horizontally
              side-by-side on every device (the default 160 width would
              wrap on Android-sized 360-wide canvases; flex:1 makes the
              chips share the row width equally). */}
          <View style={{ gap: spacing[8] }}>
            <Text variant="body12Medium" color={colors.text.secondary}>
              Income type
            </Text>
            <View
              style={{
                flexDirection: 'row',
                gap: spacing[12],
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
          {/* CTA lives in the pinned footer (renderFooter), not here — it must
              stay anchored above the keypad rather than scroll with the body. */}
        </View>

        {/* Keyboard spacer — grows to the live keyboard height so the body
            fields can always be scrolled clear of the keypad on shorter
            screens (the sheet itself doesn't ride up with the keyboard). */}
        <Animated.View style={keyboardSpacerStyle} />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export type EligibilityCheckerSheetRef = BottomSheetModalRef;
