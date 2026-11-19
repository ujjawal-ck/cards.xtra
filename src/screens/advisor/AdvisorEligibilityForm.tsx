/**
 * AdvisorEligibilityForm: the one eligibility form of the advisor chat.
 *
 *   how you earn  three radio rows (Choice), none picked at first
 *   income        "Monthly in-hand income", ₹, digits only, Indian grouping while typing
 *   PIN code      six digits, first digit 1 to 9
 *
 * "Student or not earning yet" hides the income and the PIN code. Their text stays in the state,
 * so a switch back finds it again. The button lives in the reply tray, outside the scroll area:
 * the tray reads the state with useEligForm and calls eligFormValue.
 *
 * Every change goes to advisorSession.formDraft (memory only), so the form comes back filled.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text, Input } from '../../atoms';
import { Choice } from '../../molecules';
import { colors, spacing } from '../../tokens';
import { groupIndian } from '../../lib/money';
import type { EligJob } from '../../lib/advisor/answers';
import { getAdvisorSession, initialEligForm, toDigits, type EligFormState, type SavedInputs } from './advisorSession';

const PINCODE_RE = /^[1-9]\d{5}$/;

const JOBS: { id: EligJob; label: string }[] = [
  { id: 'salaried', label: 'Salaried' },
  { id: 'self', label: 'Self-employed or business' },
  { id: 'none', label: 'Student or not earning yet' },
];

/** The form state. `reset` starts it again from the draft or the saved details. */
export function useEligForm(saved: SavedInputs | null) {
  const [form, setFormState] = useState<EligFormState>(() => initialEligForm(saved));
  const setForm = (next: EligFormState) => {
    getAdvisorSession().formDraft = next;
    setFormState(next);
  };
  const reset = () => setFormState(initialEligForm(saved));
  return { form, setForm, reset };
}

export function AdvisorEligibilityForm({
  form,
  onChange,
}: {
  form: EligFormState;
  onChange: (next: EligFormState) => void;
}) {
  const pinWrong = form.pincode.length === 6 && !PINCODE_RE.test(form.pincode);
  return (
    <View style={{ gap: spacing[16] }}>
      <View style={{ gap: spacing[4] }}>
        <Text variant="body12Medium" color={colors.text.secondary}>
          How do you earn?
        </Text>
        {JOBS.map((j) => (
          <Choice
            key={j.id}
            type="radio"
            label={j.label}
            checked={form.job === j.id}
            onChange={() => onChange({ ...form, job: j.id })}
          />
        ))}
      </View>
      {form.job === 'salaried' || form.job === 'self' ? (
        <>
          <Input
            label="Monthly in-hand income"
            accessibilityLabel="Monthly in-hand income"
            placeholder="Enter your monthly income"
            leadingText="₹"
            keyboardType="number-pad"
            value={form.income ? groupIndian(Number(form.income)) : ''}
            onChangeText={(t: string) => onChange({ ...form, income: toDigits(t, 9).replace(/^0+/, '') })}
          />
          <Input
            label="PIN code"
            accessibilityLabel="PIN code"
            placeholder="6-digit PIN code"
            keyboardType="number-pad"
            maxLength={6}
            value={form.pincode}
            onChangeText={(t: string) => onChange({ ...form, pincode: toDigits(t, 6) })}
            hint={pinWrong ? 'Enter your 6-digit PIN code' : undefined}
            state={pinWrong ? 'error' : undefined}
          />
        </>
      ) : null}
      <Text variant="body12Regular" color={colors.text.secondary}>
        Used only for this check. Not saved, not shared.
      </Text>
    </View>
  );
}
