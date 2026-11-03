/**
 * OtpInput — atom (Figma component set 426:23735)
 *
 * Vertical stack, gap spacing[8], paddingHorizontal 16:
 *   [slots row]      — N digit boxes, gap spacing[12]
 *   [hint row]?      — optional 16px icon + body12Regular text
 *   [resend row]?    — 'hidden' | 'timer' | 'ready'
 *
 * Each slot: 56 × 64 (length 4) or fill-width × 56 (length 6), radius 12,
 * surface.default fill, centred digit (heading20SemiBold).
 * Border per state:
 *   default / filled : colors.border.default (#d9e3ec) · borderWidth.thin
 *   focused          : colors.border.focussed (#0741ef) · borderWidth.thick (1.5)
 *   error            : colors.feedback.error.border (#ff3535) · borderWidth.thin
 *
 * Input mechanism: one hidden TextInput captures all digits; tapping
 * anywhere on the slot row focuses it; typing fills left → right;
 * backspace deletes the last digit and moves focus visually back. The
 * "active" slot (showing the focused border) is the next-to-fill index
 * (or the last index once the input is full).
 *
 * Hint colours:
 *   default state           → colors.text.secondary (#5c5c5c)
 *   value full (filled)     → colors.text.tertiary  (#878787)
 *   error                   → colors.feedback.error.default (#d41000)
 *
 * Resend:
 *   hidden : nothing rendered
 *   timer  : "Resend OTP in:" (secondary) + "<seconds>s" (text.link)
 *   ready  : tappable "Resend OTP" (body14Medium · text.link), onResend
 *
 * Slot dimensions aren't in the shared token scale; they live here as
 * component-spec consts, same pattern as Button/Input heights.
 */
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Pressable,
  TextInput,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
} from '../tokens';
import { Text } from './Text';
import { haptics } from '../lib/haptics';
import { Icon, IconName } from './Icon';

export type OtpInputLength = 4 | 6;
export type OtpInputState = 'default' | 'focused' | 'error';
export type OtpInputResend = 'hidden' | 'timer' | 'ready';

export interface OtpInputProps {
  length?: OtpInputLength;
  value: string;
  onChangeText: (v: string) => void;
  /** Force a state. If omitted, the state is derived from real focus. */
  state?: OtpInputState;
  hint?: string;
  hintIcon?: IconName;
  resend?: OtpInputResend;
  /** Seconds remaining for `resend === 'timer'`. */
  seconds?: number;
  onResend?: () => void;
  /** Focus the hidden TextInput on mount (pops keyboard). */
  autoFocus?: boolean;
  /** Opt-in: swap the hidden RN <TextInput> for gorhom's
   *  <BottomSheetTextInput> so the surrounding bottom sheet's keyboard
   *  machinery (keyboardBehavior) tracks focus and keeps the sheet
   *  lifted while the user types the OTP. Default false. */
  useBottomSheetInput?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Imperative handle exposed via forwardRef — lets parents transfer
 *  keyboard focus to the OtpInput (e.g. when sliding into the OTP
 *  stage of a multi-step sheet, so the keyboard doesn't drop between
 *  inputs). */
export interface OtpInputHandle {
  focus: () => void;
  blur: () => void;
}

// Slot layout per length — component-spec values, not in the shared scale.
//   4 digits: fixed 56 × 64 slots, spacing[12] gaps.
//   6 digits: Figma "Text Field/OTP · Size=6 digits" (3106:103) — slots
//             FILL the row equally, 56 tall, spacing[8] gaps. Filling (not a
//             fixed 48) keeps the row inside a 360-wide phone; the old fixed
//             48 + 12-gap row was 348 wide and overflowed the 328 inner width.
const SLOT_DIMS: Record<OtpInputLength, { w: number | null; h: number; gap: number }> = {
  4: { w: 56, h: 64, gap: spacing[12] },
  6: { w: null, h: 56, gap: spacing[8] },
};

interface SlotProps {
  char: string;
  isActive: boolean;
  isError: boolean;
  /** Fixed slot width, or null to share the row equally (flex: 1). */
  width: number | null;
  height: number;
}

function Slot({ char, isActive, isError, width, height }: SlotProps) {
  const borderColor = isError
    ? colors.feedback.error.border
    : isActive
    ? colors.border.focussed
    : colors.border.default;

  // 1.5px (borderWidth.thick) only on the focused slot of a non-error field.
  const bw = isActive && !isError ? borderWidth.thick : borderWidth.thin;

  return (
    <View
      style={{
        ...(width == null ? { flex: 1 } : { width }),
        height,
        borderRadius: radius.lg,
        borderWidth: bw,
        borderColor,
        backgroundColor: colors.surface.default,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        variant="heading20SemiBold"
        color={colors.text.primary}
        align="center"
      >
        {char}
      </Text>
    </View>
  );
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  {
    length = 6, // OTPs are 6 digits app-wide (backend). 4 kept only for legacy use.
    value,
    onChangeText,
    state,
    hint,
    hintIcon,
    resend = 'hidden',
    seconds,
    onResend,
    autoFocus = false,
    useBottomSheetInput = false,
    style,
  },
  ref
) {
  // Ref must accept either RN's TextInput or gorhom's BottomSheetTextInput
  // (which forwards to gesture-handler's TextInput — a different nominal
  // type). `any` keeps the ref usable across both component flavours;
  // we only ever call .focus() on it.
  const inputRef = useRef<any>(null);
  const [focused, setFocused] = useState(false);

  // Expose a tiny imperative API to parents so they can focus / blur
  // the hidden input without owning its ref directly.
  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }),
    []
  );

  // Pick the input component once. Both accept the same TextInputProps
  // API — the difference is only whether gorhom's keyboard tracker can
  // see the focus event.
  const TextInputCmp = useBottomSheetInput ? BottomSheetTextInput : TextInput;

  const isError = state === 'error';
  const isFocusedState = state === 'focused' || focused;
  const isFilled = value.length === length;

  // The "active" slot is the next-to-fill, clamped to the last slot once full.
  const activeIndex = Math.min(value.length, length - 1);

  const hintColor = isError
    ? colors.feedback.error.default
    : isFilled
    ? colors.text.tertiary
    : colors.text.secondary;

  const focusHidden = () => inputRef.current?.focus();

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    // Subtle tick as each new digit lands (not on delete).
    if (digits.length > value.length) haptics.impact('light');
    onChangeText(digits);
  };

  return (
    <View
      style={[
        {
          gap: spacing[8],
          paddingHorizontal: spacing[16],
        },
        style,
      ]}
    >
      {/* Slots row — tapping anywhere here focuses the hidden TextInput. */}
      <Pressable
        // Stretch even when a parent centres children (alignItems:'center'),
        // so fill-width 6-digit slots get the full row to share.
        style={{ alignSelf: 'stretch' }}
        onPress={focusHidden}
        accessibilityLabel={`OTP, ${length} digits, ${value.length} entered`}
      >
        <View
          style={{
            flexDirection: 'row',
            gap: SLOT_DIMS[length].gap,
          }}
        >
          {Array.from({ length }).map((_, i) => (
            <Slot
              key={i}
              char={value[i] ?? ''}
              isActive={isFocusedState && i === activeIndex}
              isError={isError}
              width={SLOT_DIMS[length].w}
              height={SLOT_DIMS[length].h}
            />
          ))}
        </View>

        {/* Hidden TextInput — sized 1×1 with opacity 0 so it stays
            focusable / keyboard-active but invisible. */}
        <TextInputCmp
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          maxLength={length}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          style={{
            position: 'absolute',
            opacity: 0,
            height: 1,
            width: 1,
          }}
        />
      </Pressable>

      {hint ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[4],
          }}
        >
          {hintIcon ? (
            <Icon name={hintIcon} size={iconSize[16]} color={hintColor} />
          ) : null}
          <Text variant="body12Regular" color={hintColor}>
            {hint}
          </Text>
        </View>
      ) : null}

      {resend === 'timer' ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing[4],
          }}
        >
          <Text variant="body14Regular" color={colors.text.secondary}>
            Resend OTP in:
          </Text>
          <Text variant="body14Regular" color={colors.text.link}>
            {seconds ?? 0}s
          </Text>
        </View>
      ) : null}

      {resend === 'ready' ? (
        <Pressable
          onPress={onResend}
          hitSlop={spacing[8]}
          style={{ alignSelf: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Resend OTP"
        >
          <Text variant="body14Medium" color={colors.text.link}>
            Resend OTP
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

OtpInput.displayName = 'OtpInput';
