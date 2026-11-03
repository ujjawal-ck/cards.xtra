/**
 * secureStoreWeb.ts — WEB-ONLY stand-in for expo-secure-store.
 *
 * expo-secure-store has no web implementation (every call throws
 * "UnavailabilityError"), so the web preview could never keep a session and
 * every screen behind login was unreachable for visual QA. metro.config.js
 * aliases `expo-secure-store` to this file ONLY when bundling for web; iOS
 * and Android keep the real Keychain/Keystore module.
 *
 * Backed by localStorage (not encrypted). The web build is a design-QA
 * preview, not a shipping target, so that is acceptable here.
 */

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  return storage()?.getItem(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  storage()?.setItem(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  storage()?.removeItem(key);
}

export function getItem(key: string): string | null {
  return storage()?.getItem(key) ?? null;
}

export function setItem(key: string, value: string): void {
  storage()?.setItem(key, value);
}

export async function isAvailableAsync(): Promise<boolean> {
  return storage() != null;
}

export const AFTER_FIRST_UNLOCK = 0;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 1;
export const ALWAYS = 2;
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 3;
export const ALWAYS_THIS_DEVICE_ONLY = 4;
export const WHEN_UNLOCKED = 5;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;
