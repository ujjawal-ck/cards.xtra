/**
 * Saved profile — the few inputs the user already gave, kept on the device so
 * they survive the app closing: the eligibility inputs (PIN code, monthly income,
 * salaried / self-employed) and the aliases of cards they opened the bank link for.
 *
 * Inputs only. The eligibility RESULT, the eligible card list, the user id, phone
 * and name are never stored. Same store as recent searches (expo-secure-store);
 * unavailable on web, where nothing is saved. Every function swallows storage
 * errors, so a failure only costs the saved profile and never breaks a screen.
 * Cleared on sign-out.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type SavedIncomeType = 'salaried' | 'self-employed';

export interface SavedEligibility {
  pincode: string;
  income: string;
  incomeType: SavedIncomeType;
}

export interface AppliedCard {
  alias: string;
  /** ISO date of the first apply. */
  at: string;
}

export interface SavedProfile {
  eligibility?: SavedEligibility;
  applied: AppliedCard[];
}

const KEY = 'cardsxtra.profile.v1';
// expo-secure-store holds at most 2048 bytes per value. One entry is about
// 85 bytes, so 20 entries plus the eligibility inputs stay under the limit.
export const MAX_APPLIED_CARDS = 20;

const canPersist = Platform.OS !== 'web';

const emptyProfile = (): SavedProfile => ({ applied: [] });

/** Defensive parse: anything malformed is dropped, never thrown. */
export function parseSavedProfile(raw: string | null): SavedProfile {
  if (!raw) return emptyProfile();
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyProfile();
    const out: SavedProfile = { applied: [] };
    const e = data.eligibility;
    if (
      e &&
      typeof e === 'object' &&
      typeof e.pincode === 'string' &&
      typeof e.income === 'string' &&
      (e.incomeType === 'salaried' || e.incomeType === 'self-employed')
    ) {
      out.eligibility = { pincode: e.pincode, income: e.income, incomeType: e.incomeType };
    }
    if (Array.isArray(data.applied)) {
      out.applied = data.applied
        .filter(
          (a: unknown): a is AppliedCard =>
            !!a &&
            typeof (a as AppliedCard).alias === 'string' &&
            (a as AppliedCard).alias !== '' &&
            typeof (a as AppliedCard).at === 'string'
        )
        .map((a: AppliedCard) => ({ alias: a.alias, at: a.at }))
        .slice(-MAX_APPLIED_CARDS);
    }
    return out;
  } catch {
    return emptyProfile();
  }
}

/** Oldest first. De-duplicated by alias (the FIRST `at` is kept), capped with the newest kept. */
export function addApplied(list: AppliedCard[], alias: string, at: string): AppliedCard[] {
  if (!alias || list.some((a) => a.alias === alias)) return list;
  return [...list, { alias, at }].slice(-MAX_APPLIED_CARDS);
}

async function write(profile: SavedProfile) {
  try {
    if (!profile.eligibility && profile.applied.length === 0) {
      await SecureStore.deleteItemAsync(KEY);
    } else {
      await SecureStore.setItemAsync(KEY, JSON.stringify(profile));
    }
  } catch {
    // Storage failure only loses the saved profile.
  }
}

export async function loadSavedProfile(): Promise<SavedProfile> {
  if (!canPersist) return emptyProfile();
  try {
    return parseSavedProfile(await SecureStore.getItemAsync(KEY));
  } catch {
    return emptyProfile();
  }
}

/** Pass null to remove the saved inputs. */
export async function saveEligibilityInputs(details: SavedEligibility | null): Promise<void> {
  if (!canPersist) return;
  try {
    const current = await loadSavedProfile();
    const next: SavedProfile = { applied: current.applied };
    if (details) {
      next.eligibility = {
        pincode: details.pincode,
        income: details.income,
        incomeType: details.incomeType,
      };
    }
    await write(next);
  } catch {
    // never throw
  }
}

export async function addAppliedCard(alias: string): Promise<void> {
  if (!canPersist || !alias) return;
  try {
    const current = await loadSavedProfile();
    const applied = addApplied(current.applied, alias, new Date().toISOString());
    if (applied === current.applied) return;
    await write({ ...current, applied });
  } catch {
    // never throw
  }
}

export async function clearSavedProfile(): Promise<void> {
  if (!canPersist) return;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // never throw
  }
}
