/**
 * Input — atom (Figma component set 425:24469)
 *
 * Vertical stack, gap spacing[4]:
 *   [floating label pill]   ← overlaps the box's top border
 *   [box: leading icon? + TextInput + trailing icon?]
 *   [hint row: 16px icon? + body12Regular text]
 *
 * Box: height 56 (md) or 48 (sm), radius 12 (radius.lg), padLeft 16,
 * padRight 12, gap 8, surface.default fill, content centred vertically.
 * Typed text is ALWAYS the size's Regular variant (body16Regular / md,
 * body14Regular / sm) in EVERY state. The DLS (component 425:24469)
 * renders the value as Body/N/Regular for unfilled, selected, filled and
 * error alike — only the border colour + floating-label colour change per
 * state. (This atom previously switched to SemiBold for filled/selected/
 * error; that wasn't in the DLS and made filled fields read too heavy —
 * corrected to match Figma.) The floating label is likewise body12Regular.
 * All weights flow through typography tokens — never set fontFamily,
 * fontSize, fontWeight, lineHeight, or letterSpacing inline.
 *
 * States (token mapping from the Figma hex values):
 *   unfilled  : border #d9e3ec / 1px  (colors.border.default,   borderWidth.thin)
 *               — no floating label; label is shown inside as placeholder
 *   selected  : border #0741ef / 1.5px (colors.border.focussed, borderWidth.thick)
 *               — floating label text #0036da (colors.text.link)
 *   filled    : border #d9e3ec / 1px  (colors.border.default,   borderWidth.thin)
 *               — floating label text #878787 (colors.text.tertiary)
 *   error     : border #d41000 / 1px  (colors.feedback.error.default)
 *               — floating label + hint text #d41000 (colors.feedback.error.default)
 *   disabled  : box muted via 0.4 opacity, editable=false
 *
 * Focus auto-promotes the underlying state to `selected`; if an explicit
 * `state` prop is passed it wins (so external error flags / forced states
 * are honoured).
 *
 * Floating label pill: white surface.default bg, radius.full, padH
 * spacing[4], body12Regular; positioned -lineHeight/2 above the box so
 * its vertical centre sits on the box's top border.
 *
 * Heights: sm = 48 reuses sizing.touchComfortable (it IS a comfortable
 * touch target); md = 56 is component-local — sizing.headerHeight is
 * also 56 but semantically belongs to nav headers, so a local const
 * keeps the intent honest.
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Platform,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
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
  sizing,
  typography,
} from '../tokens';
import { Text, TextVariant } from './Text';
import { Icon, IconName } from './Icon';

export type InputSize = 'md' | 'sm';
export type InputState =
  | 'unfilled'
  | 'selected'
  | 'filled'
  | 'error'
  | 'disabled';

export interface InputProps
  extends Omit<TextInputProps, 'style' | 'placeholder' | 'editable'> {
  label?: string;
  placeholder?: string;
  size?: InputSize;
  /** Force a state. If omitted, the state is derived from focus + value. */
  state?: InputState;
  hint?: string;
  hintIcon?: IconName;
  /** Static text adornment shown inside the box, before the typed value
   *  (e.g. a "₹" currency prefix). Sized to match the typed text; dims to
   *  the placeholder colour while the field is empty. */
  leadingText?: string;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  onTrailingPress?: () => void;
  /** Convenience flag — equivalent to passing state="disabled". */
  disabled?: boolean;
  /** Opt-in: swap the inner RN <TextInput> for gorhom's
   *  <BottomSheetTextInput>. Required when this Input is rendered
   *  inside a gorhom bottom-sheet that needs to lift above the
   *  keyboard — gorhom's keyboard machinery only tracks its own
   *  text-input wrapper. Default false (no behaviour change for
   *  every existing call-site). */
  useBottomSheetInput?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

// ----------------------------------------------------------------------------
// Component-local constants
// ----------------------------------------------------------------------------
// Box heights — md (56) is component-local; sm (48) reuses sizing.touchComfortable.
const BOX_HEIGHT_MD = 56;

// Disabled opacity — mirrors the *40 transparency family in primitives.
const DISABLED_OPACITY = 0.4;

// The floating label pill is positioned so its vertical centre lands on the
// box's top border. That's -(lineHeight / 2) from the box's top edge. The
// lineHeight is pulled from whichever typography variant the floating label
// actually uses (declared just below as FLOATING_LABEL_VARIANT) so the
// offset stays in sync if the variant is ever changed.

// Typed text uses one Regular variant per size, in every state — the DLS
// never weights the value by state (only the border + label colour change).
// `textVariant` is a key of the typography token; nothing is inlined.
const SIZE_CONFIG: Record<InputSize, { height: number; textVariant: TextVariant }> = {
  md: {
    height: BOX_HEIGHT_MD,
    textVariant: 'body16Regular',
  },
  sm: {
    height: sizing.touchComfortable,
    textVariant: 'body14Regular',
  },
};

// Floating label is the same weight in every state — only its colour
// changes per state (driven by getStateStyle.labelColor below). The DLS
// renders it Body/12/Regular.
const FLOATING_LABEL_VARIANT: TextVariant = 'body12Regular';

const FLOATING_LABEL_OFFSET =
  typography[FLOATING_LABEL_VARIANT].lineHeight / 2;

// ----------------------------------------------------------------------------
// State styles
// ----------------------------------------------------------------------------
type StateStyle = {
  border: string;
  borderWidth: number;
  labelColor: string;
};

function getStateStyle(state: InputState): StateStyle {
  switch (state) {
    case 'selected':
      return {
        border: colors.border.focussed,
        borderWidth: borderWidth.thick,
        labelColor: colors.text.link,
      };
    case 'error':
      return {
        border: colors.feedback.error.default,
        borderWidth: borderWidth.thin,
        labelColor: colors.feedback.error.default,
      };
    case 'filled':
      return {
        border: colors.border.default,
        borderWidth: borderWidth.thin,
        labelColor: colors.text.tertiary,
      };
    case 'disabled':
    case 'unfilled':
    default:
      return {
        border: colors.border.default,
        borderWidth: borderWidth.thin,
        labelColor: colors.text.tertiary,
      };
  }
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function Input({
  label,
  placeholder,
  size = 'md',
  state: stateProp,
  hint,
  hintIcon,
  leadingText,
  leadingIcon,
  trailingIcon,
  onTrailingPress,
  disabled = false,
  useBottomSheetInput = false,
  value,
  onChangeText,
  onFocus,
  onBlur,
  containerStyle,
  ...inputProps
}: InputProps) {
  // Pick the input component once. Both accept the same TextInputProps
  // API, so every other prop passes through unchanged. Only when this
  // flag is set will gorhom's keyboard machinery actually see the focus
  // event and lift the sheet above the keyboard.
  const TextInputCmp = useBottomSheetInput ? BottomSheetTextInput : TextInput;
  const [focused, setFocused] = useState(false);

  const isDisabled = disabled || stateProp === 'disabled';
  const hasValue = (value ?? '').length > 0;

  const effectiveState: InputState = isDisabled
    ? 'disabled'
    : stateProp ?? (focused ? 'selected' : hasValue ? 'filled' : 'unfilled');

  const config = SIZE_CONFIG[size];
  const stateStyle = getStateStyle(effectiveState);

  // Floating label visible whenever the state implies it — including
  // disabled-with-value (so a disabled field with content keeps its label).
  const showFloatingLabel =
    !!label &&
    (effectiveState === 'selected' ||
      effectiveState === 'filled' ||
      effectiveState === 'error' ||
      (effectiveState === 'disabled' && hasValue));

  // When unfilled, the label collapses into the placeholder slot.
  const effectivePlaceholder =
    !hasValue && !showFloatingLabel && label ? label : placeholder;

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setFocused(false);
    onBlur?.(e);
  };

  const isError = effectiveState === 'error';
  const hintColor = isError
    ? colors.feedback.error.default
    : colors.text.secondary;

  const sideIconColor = colors.text.tertiary;

  return (
    <View
      style={[
        {
          gap: spacing[4],
          opacity: isDisabled ? DISABLED_OPACITY : 1,
        },
        containerStyle,
      ]}
    >
      {/* Box wrapper — holds the box + the absolutely-positioned label pill. */}
      <View style={{ position: 'relative' }}>
        <View
          style={{
            height: config.height,
            borderRadius: radius.lg,
            borderWidth: stateStyle.borderWidth,
            borderColor: stateStyle.border,
            backgroundColor: colors.surface.default,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: spacing[16],
            paddingRight: spacing[12],
            gap: spacing[8],
          }}
        >
          {leadingIcon ? (
            <Icon
              name={leadingIcon}
              size={iconSize[20]}
              color={sideIconColor}
            />
          ) : null}

          {leadingText ? (
            <Text
              variant={config.textVariant}
              color={hasValue ? colors.text.primary : colors.text.placeholder}
            >
              {leadingText}
            </Text>
          ) : null}

          <TextInputCmp
            // Autofill defaults (kept from the DLS). NOTE: these do NOT fix the
            // Android "typing stops after one character" bug — that was never
            // autofill; the real fix is the explicit Android height in `style`.
            autoComplete="off"
            importantForAutofill="no"
            {...inputProps}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!isDisabled}
            placeholder={effectivePlaceholder}
            placeholderTextColor={colors.text.placeholder}
            selectionColor={colors.border.focussed}
            style={[
              typography[config.textVariant],
              {
                flex: 1,
                color: colors.text.primary,
                padding: 0,
                // iOS centres single-line TextInput text by its frame, but an
                // explicit lineHeight makes it sit off-centre (lower) — which
                // mis-aligned it against the `leadingText` (₹). Drop it here so
                // the typed value and the ₹ prefix share the same baseline.
                lineHeight: undefined,
              },
              // ANDROID FOCUS FIX: with the Outfit font and NO explicit height,
              // this row-laid-out, centre-aligned (not height-stretched)
              // TextInput recomputes its height from the font metrics on every
              // keystroke, and on the new architecture that re-measure DROPS
              // FOCUS — you could type only one character before the field
              // blurred (every visible Input field; Android only, iOS fine).
              // Pinning the height + centring the text removes the per-keystroke
              // re-measure. (A bare input, or one with an explicit height, never
              // hit this — the atom had neither.)
              Platform.OS === 'android'
                ? ({ height: config.height, textAlignVertical: 'center' } as const)
                : null,
            ]}
          />

          {trailingIcon ? (
            onTrailingPress ? (
              <Pressable
                onPress={onTrailingPress}
                hitSlop={spacing[8]}
                accessibilityRole="button"
                accessibilityLabel="Clear"
              >
                <Icon
                  name={trailingIcon}
                  size={iconSize[20]}
                  color={sideIconColor}
                />
              </Pressable>
            ) : (
              <Icon
                name={trailingIcon}
                size={iconSize[20]}
                color={sideIconColor}
              />
            )
          ) : null}
        </View>

        {showFloatingLabel ? (
          <View
            style={{
              position: 'absolute',
              top: -FLOATING_LABEL_OFFSET,
              left: spacing[12],
              paddingHorizontal: spacing[4],
              borderRadius: radius.full,
              backgroundColor: colors.surface.default,
            }}
          >
            <Text variant={FLOATING_LABEL_VARIANT} color={stateStyle.labelColor}>
              {label}
            </Text>
          </View>
        ) : null}
      </View>

      {hint ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[4],
            paddingLeft: spacing[12],
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
    </View>
  );
}
