/**
 * network.ts — device connectivity for React Query and the offline banner.
 *
 * `connectOnlineManager()` feeds NetInfo into React Query's onlineManager:
 * while offline, queries pause instead of failing, and they refetch the
 * moment the connection returns. `useIsOffline()` drives the banner.
 */
import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/** Offline only when NetInfo is sure: `isInternetReachable === null` means unknown. */
export function isOfflineState(state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

let connected = false;

/** Call once at startup (App.js). */
export function connectOnlineManager(): void {
  if (connected) return;
  connected = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(!isOfflineState(state))),
  );
}

export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => NetInfo.addEventListener((state) => setOffline(isOfflineState(state))), []);
  return offline;
}
