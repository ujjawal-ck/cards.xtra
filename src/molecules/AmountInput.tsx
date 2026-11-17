/**
 * DS-ADD(ds-expansion-1, 2026-11-17): a rupee amount field with live Indian grouping, min / max, a period and preset chips.
 * Rollback: delete this file, src/lib/amountInput.ts (+ test), and its DS-ADD export lines in src/molecules/index.ts.
 *
 * AmountInput — molecule
 *
 * Built on the Input atom (leadingText "₹") and src/lib/money.ts (groupIndian via
 * src/lib/amountInput.ts). Typing re-groups live ("120000" → "1,20,000"); a value
 * above `max` is held at max while typing, a value below `min` is lifted to min
 * when the field loses focus. Empty = null. Presets are Chips that set the value.
 * Not wired into EligibilityCheckerSheet.
 */
import React from 'react';
import { View } from 'react-native';
import { Input, Chip } from '../atoms';
import { spacing } from '../tokens';
import { parseAmount, formatAmount, clampAmount } from '../lib/amountInput';
import { formatINR } from '../lib/money';

export interface AmountInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  period?: 'month' | 'year' | 'quarter';
  presets?: number[];
  hint?: string;
  error?: string;
  /** Set when rendered inside a gorhom bottom sheet. */
  useBottomSheetInput?: boolean;
}

export function AmountInput({
  label,
  value,
  onChange,
  min,
  max,
  period,
  presets,
  hint,
  error,
  useBottomSheetInput,
}: AmountInputProps) {
  const handleText = (text: string) => {
    const parsed = parseAmount(text);
    onChange(parsed == null ? null : clampAmount(parsed, undefined, max));
  };
  const handleBlur = () => {
    if (value != null && min != null && value < min) onChange(clampAmount(value, min, max));
  };
  return (
    <View style={{ gap: spacing[8] }}>
      <Input
        label={period ? `${label} per ${period}` : label}
        leadingText="₹"
        keyboardType="number-pad"
        value={formatAmount(value)}
        onChangeText={handleText}
        onBlur={handleBlur}
        state={error ? 'error' : undefined}
        hint={error ?? hint}
        useBottomSheetInput={useBottomSheetInput}
        accessibilityLabel={label}
      />
      {presets && presets.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
          {presets.map((p) => (
            <Chip
              key={p}
              label={formatINR(p)}
              state={value === p ? 'selected' : 'default'}
              onPress={() => onChange(clampAmount(p, min, max))}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
