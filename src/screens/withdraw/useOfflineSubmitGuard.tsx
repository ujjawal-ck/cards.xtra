/**
 * useOfflineSubmitGuard — the CashKaro offline pattern for the withdraw forms.
 *
 * The form keeps what the user typed. A submit (send OTP, verify, resend)
 * first asks NetInfo; when the phone is offline it sends nothing and shows a
 * short toast: "Your network connection seems to be down".
 *
 * Returns `blockIfOffline` (await it at the start of a submit: true means
 * stop) and `offlineToast` (render it just above the footer buttons).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { Toast } from '../../molecules';
import { spacing } from '../../tokens';
import { isOfflineState } from '../../lib/network';
import { play } from '../../lib/haptics';

export const OFFLINE_SUBMIT_MESSAGE = 'Your network connection seems to be down';

// How long the toast stays up.
const TOAST_MS = 3000;

/** Offline only when NetInfo is sure. If NetInfo fails, let the request try. */
async function isDeviceOffline(): Promise<boolean> {
  try {
    return isOfflineState(await NetInfo.fetch());
  } catch {
    return false;
  }
}

export function useOfflineSubmitGuard() {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const hide = useCallback(() => setVisible(false), []);

  const blockIfOffline = useCallback(async (): Promise<boolean> => {
    if (!(await isDeviceOffline())) return false;
    play('error');
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, TOAST_MS);
    return true;
  }, [hide]);

  const offlineToast = visible ? (
    <View
      accessibilityLiveRegion="polite"
      style={{ paddingHorizontal: spacing[16], paddingBottom: spacing[8] }}
    >
      <Toast tone="warning" message={OFFLINE_SUBMIT_MESSAGE} onDismiss={hide} />
    </View>
  ) : null;

  return { blockIfOffline, offlineToast };
}
