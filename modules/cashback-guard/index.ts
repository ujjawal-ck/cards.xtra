/**
 * cashback-guard — JS API for the Android "Never Miss Cashback" module.
 *
 * Detection runs natively in a foreground service that polls UsageStatsManager
 * (only while the screen is on + unlocked) to notice when a partner shopping
 * app opens, then fires a one-tap "Activate cashback" push notification. It
 * keeps working when the React Native app is closed. This JS layer only:
 *   - reports whether the two required permissions are granted (Usage access +
 *     Notifications),
 *   - opens the relevant system Settings screens (they cannot be granted
 *     programmatically — the OS forces a manual toggle),
 *   - starts / stops the detection service, and
 *   - pushes the resolved per-merchant tracking URLs down to the service.
 *
 * Android-only. On iOS / web every call is a safe no-op so screens that import
 * this don't crash on other platforms.
 */
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

/** One merchant's resolved tracking config, pushed down to the native service. */
export interface MerchantTracking {
  /** Android package name, e.g. "in.amazon.mShop.android.shopping". */
  packageName: string;
  /** Full CashKaro cashback_url with the user id already injected. */
  url?: string;
  /** Short rate label shown on the bubble, e.g. "Upto 5.2%". */
  label?: string;
}

interface CashbackGuardNative {
  isUsageAccessGranted(): boolean;
  areNotificationsEnabled(): boolean;
  openUsageAccessSettings(): void;
  openNotificationSettings(): void;
  startGuard(): void;
  stopGuard(): void;
  setMerchants(json: string): void;
}

const isAndroid = Platform.OS === 'android';

// requireNativeModule throws if the native module isn't linked (e.g. running in
// Expo Go, or on iOS). Guard so importing this file never crashes JS.
let native: CashbackGuardNative | null = null;
if (isAndroid) {
  try {
    native = requireNativeModule<CashbackGuardNative>('CashbackGuard');
  } catch {
    native = null;
  }
}

/** True only on a native Android build where the module is linked. */
export const isSupported = native !== null;

/** Whether the user has granted "Usage access" (needed to detect the app). */
export function isUsageAccessGranted(): boolean {
  return native?.isUsageAccessGranted() ?? false;
}

/** Whether notifications are enabled for the app (needed to deliver the
 *  reminder). On Android 13+ this is the POST_NOTIFICATIONS permission. */
export function areNotificationsEnabled(): boolean {
  return native?.areNotificationsEnabled() ?? false;
}

/** Opens the system "Usage access" settings list so the user can enable us. */
export function openUsageAccessSettings(): void {
  native?.openUsageAccessSettings();
}

/** Opens this app's notification settings so the user can enable them. */
export function openNotificationSettings(): void {
  native?.openNotificationSettings();
}

/** Convenience: both permissions granted → feature can be armed. */
export function isFullyEnabled(): boolean {
  return isUsageAccessGranted() && areNotificationsEnabled();
}

/** Start the foreground detection service. Call once both permissions are on. */
export function startGuard(): void {
  native?.startGuard();
}

/** Stop the foreground detection service (e.g. user turns the feature off). */
export function stopGuard(): void {
  native?.stopGuard();
}

/**
 * Push the resolved per-merchant tracking URLs + rate labels into the native
 * service. Call after login / when offers data is available so the bubble's
 * "Activate" fires the real, user-attributed CashKaro click-out.
 */
export function setMerchants(merchants: MerchantTracking[]): void {
  native?.setMerchants(JSON.stringify(merchants));
}
