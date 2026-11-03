/**
 * TextArea — atom (Figma component set 426:23542)
 *
 * Multiline sibling of Input. Same state language (border colours,
 * focus → selected derivation, floating-label pill, hint row) — only
 * the box geometry and the TextInput multiline behaviour differ.
 *
 * Box:
 *   size 'md' → height 120, padding 16 all sides
 *   size 'sm' → height 80,  padding 12 all sides
 *   radius 12 (radius.lg), surface.default fill, text TOP-aligned
 *   (textAlignVertical='top').
 *
 * Typed value uses body14Regular for both sizes — paragraph content
 * reads better at consistent weight, so the focus-state weight bump
 * used by Input is intentionally NOT applied here. Floating label
 * follows Input: body12SemiBold, colour per state.
 *
 * Token mapping (hex → semantic token, no inline colours):
 *   #d9e3ec → colors.border.default          (default + filled border)
 *   #0741ef → colors.border.focussed         (selected border)
 *   #d41000 → colors.feedback.error.default  (error border / label / hint)
 *   #ffffff → colors.surface.default         (box + floating-pill fill)
 *   #262626 → colors.text.primary            (typed value)
 *   #878787 → colors.text.placeholder        (placeholder text)
 *           → colors.text.tertiary           (filled / disabled label)
 *   #5c5c5c → colors.text.secondary          (default hint)
 *   #0036da → colors.text.link               (selected floating label)
 *
 * Heights 120 / 80 aren't in the shared sizing scale — component-spec
 * consts here, same pattern as Input.
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  typography,
} from '../tokens';
import { Text, TextVariant } from './Text';
import { Icon, IconName } from './Icon';

export type TextAreaSize = 'md' | 'sm';
export type TextAreaState =
  | 'unfilled'
  | 'selected'
  | 'filled'
  | 'error'
  | 'disabled';

export interface TextAreaProps
  extends Omit<
    TextInputProps,
    'style' | 'placeholder' | 'editable' | 'multiline' | 'textAlignVertical'
  > {
  label?: string;
  placeholder?: string;
  size?: TextAreaSize;
  /** Force a state. If omitted, derived from focus + value. */
  state?: TextAreaState;
  hint?: string;
  hintIcon?: IconName;
  /** Convenience flag — equivalent to passing state="disabled". */
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

// Box heights — component-local; not in the shared sizing scale.
const BOX_HEIGHT_MD = 120;
const BOX_HEIGHT_SM = 80;

const DISABLED_OPACITY = 0.4;

const FLOATING_LABEL_VARIANT: TextVariant = 'body12SemiBold';
const FLOATING_LABEL_OFFSET =
  typography[FLOATING_LABEL_VARIANT].lineHeight / 2;

const TYPED_TEXT_VARIANT: TextVariant = 'body14Regular';

const SIZE_CONFIG: Record<TextAreaSize, { height: number; padding: number }> = {
  md: { height: BOX_HEIGHT_MD, padding: spacing[16] },
  sm: { height: BOX_HEIGHT_SM, padding: spacing[12] },
};

// ----------------------------------------------------------------------------
// State styles — identical mapping to Input
// ----------------------------------------------------------------------------
type StateStyle = {
  border: string;
  borderWidth: number;
  labelColor: string;
};

function getStateStyle(state: TextAreaState): StateStyle {
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
export function TextArea({
  label,
  placeholder,
  size = 'md',
  state: stateProp,
  hint,
  hintIcon,
  disabled = false,
  value,
  onChangeText,
  onFocus,
  onBlur,
  containerStyle,
  ...inputProps
}: TextAreaProps) {
  const [focused, setFocused] = useState(false);

  const isDisabled = disabled || stateProp === 'disabled';
  const hasValue = (value ?? '').length > 0;

  const effectiveState: TextAreaState = isDisabled
    ? 'disabled'
    : stateProp ?? (focused ? 'selected' : hasValue ? 'filled' : 'unfilled');

  const config = SIZE_CONFIG[size];
  const stateStyle = getStateStyle(effectiveState);

  const showFloatingLabel =
    !!label &&
    (effectiveState === 'selected' ||
      effectiveState === 'filled' ||
      effectiveState === 'error' ||
      (effectiveState === 'disabled' && hasValue));

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
      <View style={{ position: 'relative' }}>
        <View
          style={{
            height: config.height,
            borderRadius: radius.lg,
            borderWidth: stateStyle.borderWidth,
            borderColor: stateStyle.border,
            backgroundColor: colors.surface.default,
            padding: config.padding,
          }}
        >
          <TextInput
            {...inputProps}
            multiline
            textAlignVertical="top"
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!isDisabled}
            placeholder={effectivePlaceholder}
            placeholderTextColor={colors.text.placeholder}
            selectionColor={colors.border.focussed}
            style={[
              typography[TYPED_TEXT_VARIANT],
              {
                flex: 1,
                color: colors.text.primary,
                padding: 0,
              },
            ]}
          />
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
            <Text
              variant={FLOATING_LABEL_VARIANT}
              color={stateStyle.labelColor}
            >
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
