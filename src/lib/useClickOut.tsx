/**
 * useClickOut — the single way the app opens a card "Apply Now" or a store
 * "Shop & Earn" link, so every click can be traced to the CashKaro user.
 *
 *   • Signed out → EarnLoginSheet: "Log in to earn cashback", or continue
 *     without cashback (the link opens unattributed; never a dead end).
 *   • Signed in → resolve the CashKaro user id from the profile (refetching it
 *     if it hasn't loaded yet) and refuse to open an unattributed link if it
 *     still can't be resolved.
 *   • Builds the link with buildClickOutUrl (CashKaro `id=` or partner
 *     `{user_id}` / `{click_id}`), logs CLICK_OUT, then opens it.
 *
 * Returns `openClickOut` (call from the CTA) and `clickOutSheets` (render once
 * in the screen tree) — same shape as useWithdrawGate.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { EarnLoginSheet } from '../organisms/EarnLoginSheet';
import type { EarnLoginKind, EarnLoginSheetRef } from '../organisms/EarnLoginSheet';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../query/useProfile';
import { analytics, Events } from '../analytics';
import type { RootStackParamList } from '../navigation/types';
import { openUrl } from './openUrl';
import { buildClickOutUrl, newClickId } from './clickOut';

export interface ClickOutTarget {
  kind: EarnLoginKind;
  /** The raw link: card applyUrl or store cashbackUrl. */
  url?: string | null;
  itemId?: string | number;
  itemName?: string;
}

export function useClickOut() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { status } = useAuth();
  const profileQ = useProfile();
  const sheetRef = useRef<EarnLoginSheetRef>(null);
  const pending = useRef<ClickOutTarget | null>(null);
  const [sheetKind, setSheetKind] = useState<EarnLoginKind>('card');

  const launch = useCallback((target: ClickOutTarget, userId?: string) => {
    const raw = (target.url ?? '').trim();
    if (!raw) return;
    const clickId = newClickId();
    const built = buildClickOutUrl(raw, { userId, clickId });
    analytics.track(Events.CLICK_OUT, {
      kind: target.kind,
      item_id: target.itemId != null ? String(target.itemId) : undefined,
      item_name: target.itemName,
      click_id: clickId,
      attributed: built.attributed,
      link_type: built.linkType,
    });
    openUrl(built.url);
  }, []);

  const openClickOut = useCallback(
    async (target: ClickOutTarget) => {
      if (!(target.url ?? '').trim()) return;

      if (status === 'unauthenticated') {
        pending.current = target;
        setSheetKind(target.kind);
        sheetRef.current?.present();
        return;
      }

      let userId = profileQ.data?.id;
      if (!userId) {
        try {
          userId = (await profileQ.refetch()).data?.id;
        } catch {
          userId = undefined;
        }
      }
      if (!userId) {
        // Opening now would send a click nobody gets cashback for.
        Alert.alert(
          'Couldn’t open this right now',
          'We couldn’t confirm your account, so the cashback wouldn’t be tracked. Check your connection and try again.'
        );
        return;
      }
      launch(target, String(userId));
    },
    [status, profileQ, launch]
  );

  const clickOutSheets = (
    <EarnLoginSheet
      ref={sheetRef}
      kind={sheetKind}
      onLogin={() => {
        pending.current = null;
        navigation.navigate('Onboarding', { login: true });
      }}
      onContinue={() => {
        const target = pending.current;
        pending.current = null;
        if (target) launch(target);
      }}
    />
  );

  return { openClickOut, clickOutSheets };
}
