/**
 * Choice — molecule (Figma Choice 3261:4856)
 *
 * A labelled row that wraps a Checkbox or Radio with a tappable surface.
 * Layout:
 *   [control]  [label]
 *              [description?]   ← only when showDescription is true
 *
 * The whole row is pressable — tapping anywhere toggles the control.
 *
 * Label treatment by state (matches the Filters BottomSheet spec):
 *   unchecked  body14Regular + colors.text.primary
 *   checked    body14Medium  + colors.border.focussed (cobalt)
 *   indeterminate uses the checked treatment (any "on" state).
 *
 * Props:
 *   type            'checkbox' | 'radio'
 *   checked         boolean | 'indeterminate' (the 'indeterminate' value
 *                   only applies to type='checkbox')
 *   label           shown next to the control
 *   description     optional secondary line (body12Regular, text.secondary)
 *   showDescription render the description line when true
 *   disabled        dims everything and blocks tap
 *   onChange        receives the next boolean state
 */
import React from 'react';
import { Pressable, View, StyleProp, ViewStyle } from 'react-native';
import { Text, Checkbox, Radio } from '../atoms';
import type { CheckboxValue } from '../atoms';
import { colors, spacing } from '../tokens';
import { haptics } from '../lib/haptics';

export type ChoiceType = 'checkbox' | 'radio';

export interface ChoiceProps {
  type: ChoiceType;
  checked: CheckboxValue;
  label: string;
  description?: string;
  showDescription?: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

const DISABLED_OPACITY = 0.4;

export function Choice({
  type,
  checked,
  label,
  description,
  showDescription = false,
  disabled = false,
  onChange,
  style,
}: ChoiceProps) {
  // "On" = checked OR indeterminate. Drives the label colour + weight
  // swap below so the row reads as "applied" in either state.
  const isOn = checked === true || checked === 'indeterminate';

  const handlePress = () => {
    if (disabled) return;
    // The inner checkbox/radio is visual-only (Choice owns the tap), so fire
    // the selection haptic here.
    haptics.selection();
    if (type === 'radio') {
      onChange?.(true);
    } else {
      // checkbox semantics: indeterminate → true, otherwise toggle
      onChange?.(checked === 'indeterminate' ? true : !checked);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={type === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{
        disabled,
        checked:
          checked === 'indeterminate'
            ? 'mixed'
            : (checked as boolean),
        selected: type === 'radio' ? (checked as boolean) : undefined,
      }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing[12],
          // 6 top + 20 control + 6 bottom = 32 — halved from the
          // previous spacing[12] so the Filters checkbox lists read
          // tighter. The visible row gap (spacing[20] in the parent)
          // keeps rows clearly separated. Below iOS HIG's 44 minimum
          // but explicitly accepted in favour of denser layout.
          paddingVertical: spacing[6],
          opacity: disabled ? DISABLED_OPACITY : 1,
        },
        style,
      ]}
    >
      {/* pointerEvents='none' on the control wrapper so taps pass
          through to the outer Pressable (which owns toggle). Without
          this, the Checkbox / Radio atoms — both themselves Pressable
          when used standalone — would capture the tap and swallow it
          (Choice doesn't pass them an onChange). The result was that
          tapping the checkbox square did nothing; only the label
          area worked. */}
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {type === 'checkbox' ? (
          <Checkbox checked={checked} disabled={disabled} />
        ) : (
          <Radio selected={checked === true} disabled={disabled} />
        )}
      </View>

      <View style={{ flex: 1, gap: spacing[2] }}>
        <Text
          variant={isOn ? 'body14Medium' : 'body14Regular'}
          color={isOn ? colors.border.focussed : colors.text.primary}
        >
          {label}
        </Text>
        {showDescription && description ? (
          <Text variant="body12Regular" color={colors.text.secondary}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
