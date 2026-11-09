/**
 * experiments — A/B flags backed by Firebase Remote Config.
 *
 * How to run an experiment (no app release needed):
 *   Firebase console → project cardsxtra-miniapp → A/B Testing → Create
 *   experiment → Remote Config → parameter `eligibility_gate`, variants
 *   `mandatory` (control) and `skippable`. Goal: `card_apply_outbound`.
 *
 * Rules:
 *   - Each flag has a safe DEFAULT (today's behaviour) used until Remote
 *     Config answers, in Expo Go, and if Firebase fails. The app never waits
 *     on the network for a flag.
 *   - A flag is read ONCE per app session and then frozen, so a user never
 *     sees the flow change mid-session when a fetch lands.
 *   - The variant is sent to GA4 as a user property (`exp_<flag>`) and on the
 *     events that matter, so funnels can be split by variant.
 *
 * Remote Config is a native module: it only works in a dev/store build. It is
 * required lazily and every call is wrapped so Expo Go keeps running.
 */
import Constants from 'expo-constants';
import { analytics } from '../analytics';

/** Eligibility before Apply: mandatory checker (control) or skippable. */
export type EligibilityGateVariant = 'mandatory' | 'skippable';

const DEFAULTS = {
  eligibility_gate: 'mandatory' as EligibilityGateVariant,
};

type FlagName = keyof typeof DEFAULTS;

// Local override for QA, e.g. EXPO_PUBLIC_FORCE_ELIGIBILITY_GATE=skippable.
const OVERRIDES: Partial<Record<FlagName, string | undefined>> = {
  eligibility_gate: process.env.EXPO_PUBLIC_FORCE_ELIGIBILITY_GATE,
};

const isNativeBuild = Constants.executionEnvironment !== 'storeClient';
const frozen: Partial<Record<FlagName, string>> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function remoteConfig(): any | null {
  if (!isNativeBuild) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/remote-config').default();
  } catch {
    return null;
  }
}

/**
 * Call once at startup. Sets defaults, then fetches + activates in the
 * background. Values apply from the NEXT read of each flag (flags already
 * read this session stay frozen).
 */
export async function initExperiments(): Promise<void> {
  const rc = remoteConfig();
  if (!rc) return;
  try {
    await rc.setDefaults(DEFAULTS);
    await rc.setConfigSettings({ minimumFetchIntervalMillis: 60 * 60 * 1000 });
    await rc.fetchAndActivate();
  } catch (e) {
    console.warn('Remote Config fetch failed, using defaults:', (e as Error)?.message ?? e);
  }
}

function read(flag: FlagName, allowed: readonly string[]): string {
  const cached = frozen[flag];
  if (cached) return cached;
  let value: string = DEFAULTS[flag];
  const override = OVERRIDES[flag];
  if (override && allowed.includes(override)) {
    value = override;
  } else {
    try {
      const remote = remoteConfig()?.getValue(flag)?.asString?.();
      if (remote && allowed.includes(remote)) value = remote;
    } catch {
      // keep default
    }
  }
  frozen[flag] = value;
  analytics.setUserProperties({ [`exp_${flag}`]: value });
  return value;
}

/** Which Apply flow this user gets. Frozen for the session after first read. */
export function getEligibilityGateVariant(): EligibilityGateVariant {
  return read('eligibility_gate', ['mandatory', 'skippable']) as EligibilityGateVariant;
}
