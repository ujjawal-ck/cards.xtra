/**
 * editContact — shared copy + helpers for the email / mobile change flow
 * (Figma 3395:21424 · 3395:23867 · 3395:23891 · 3395:23921).
 *
 * Both the email and the mobile change reuse the same 4-step template:
 *   A. Verify identity (OTP to existing email + mobile)
 *   B. Enter the new value
 *   C. Verify the new value (OTP to it)
 *   D. Return to Account Settings with a success message
 *
 * The only thing that differs between the two is copy, so it's collected
 * here and the screens stay field-agnostic. The Figma file labels some of
 * these nodes with mixed/placeholder copy (e.g. the email "Enter Your New
 * Email" screen carries an "Enter Mobile Number" input label); the correct
 * per-field strings live below.
 */
import type { EditContactField } from '../navigation/types';

interface FieldCopy {
  /** Title on the "enter new value" screen. */
  enterNewTitle: string;
  /** Subtitle on the "enter new value" screen. */
  enterNewSubtitle: string;
  /** Floating label on the new-value Input. */
  inputLabel: string;
  /** "Edit email" / "Edit mobile" link on the verify-new-value screen. */
  editLink: string;
  /** Success message shown back on Account Settings. */
  successMessage: string;
}

export const FIELD_COPY: Record<EditContactField, FieldCopy> = {
  email: {
    enterNewTitle: 'Enter Your New Email',
    enterNewSubtitle: 'We will send you OTP to verify',
    inputLabel: 'Enter New Email',
    editLink: 'Edit email',
    successMessage: 'Your email has been updated successfully',
  },
  mobile: {
    enterNewTitle: 'Enter Your New Mobile Number',
    enterNewSubtitle: 'We will send you OTP to verify',
    inputLabel: 'Enter New Mobile Number',
    editLink: 'Edit mobile',
    successMessage: 'Your mobile number has been updated successfully',
  },
};

/** Basic per-field validity for enabling the "Send OTP" CTA. */
export function isValidContact(field: EditContactField, value: string): boolean {
  if (field === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
  return value.replace(/\D/g, '').length === 10;
}

/** Mask a mobile to "967XXXX551"; pass an email through unchanged. Used in
 *  the verify-new-value subtitle ("OTP sent to …"). */
export function contactDisplay(field: EditContactField, value: string): string {
  if (field === 'email') return value.trim();
  const d = value.replace(/\D/g, '');
  return d.length >= 7 ? `${d.slice(0, 3)}XXXX${d.slice(-3)}` : value;
}
