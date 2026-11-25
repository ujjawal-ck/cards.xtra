/**
 * useClickOut — the single way the app opens a card "Apply Now" or a store
 * "Shop & Earn" link, so every click can be traced to the CashKaro user.
 *
 *   • Signed out → EarnLoginSheet: "Log in to earn cashback" (the app-wide
 *     login sheet opens over this screen, and the link opens attributed as
 *     soon as the user is in), or continue without cashback (the link opens
 *     unattributed; never a dead end).
 *   • Signed in → the CashKaro user id saved at login (`ck_user_id`, from the
 *     login or signup response) comes first; only when none is saved does it
 *     fall back to the profile (refetching it if it hasn't loaded yet). A
 *     failed profile call never blocks a click when the id is saved. If no id
 *     can be found, it refuses to open an unattributed link.
 *   • Builds the link with buildClickOutUrl (CashKaro `id=` or partner
 *     `{user_id}` / `{click_id}`), logs CLICK_OUT, then opens it.
 *
 * Only `https:` links open. A missing link, an unconfirmed user, a refused
 * scheme or a failed open shows "Couldn't open this link" and logs nothing.
 * While one click-out is opening, a second tap is ignored (`busy`).
 *
 * Returns `openClickOut` (call from the CTA), `busy` (true while a click-out is
 * opening; callers may show `loading`) and `clickOutSheets` (render once in
 * the screen tree) — same shape as useWithdrawGate.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { EarnLoginSheet } from '../organisms/EarnLoginSheet';
import type { EarnLoginKind, EarnLoginSheetRef } from '../organisms/EarnLoginSheet';
import { useAuth } from '../auth/AuthContext';
import { useLoginSheet } from '../auth/LoginSheetProvider';
import { loadUserId } from '../auth/tokenStore';
import { fetchProfile, useProfile } from '../query/useProfile';
import { queryClient } from '../query/queryClient';
import { qk } from '../query/keys';
import { analytics, Events } from '../analytics';
import { createSingleFlight, openUrl, showOpenLinkError } from './openUrl';
import { buildClickOutUrl, newClickId } from './clickOut';
import { addAppliedCard } from './savedProfile';

/** Which surface an outbound click came from (the `source` param of CLICK_OUT). */
export type ClickOutSource =
  | 'home_tile'
  | 'home_detail'
  | 'crosssell_rail'
  | 'rejection_pick'
  | 'cards_you_can_get'
  | 'store_best_cards'
  | 'tool_results'
  | 'beat_my_card'
  | 'advisor'
  | 'store_page'
  | 'unknown';

export interface ClickOutTarget {
  kind: EarnLoginKind;
  /** The raw link: card applyUrl or store cashbackUrl. */
  url?: string | null;
  itemId?: string | number;
  itemName?: string;
  /** Surface the click came from. Logged as `source`; 'unknown' when absent. */
  source?: ClickOutSource;
  /** Card alias. Saved as "applied" when the bank link opens (cards only). */
  alias?: string;
}

/** The CashKaro user id saved at login (tokenStore), or null when none is saved. */
async function storedUserId(): Promise<string | null> {
  const id = await loadUserId().catch(() => null);
  return id && id.trim() ? id.trim() : null;
}

export function useClickOut() {
  const { status } = useAuth();
  const { open: openLogin } = useLoginSheet();
  const profileQ = useProfile();
  const sheetRef = useRef<EarnLoginSheetRef>(null);
  const pending = useRef<ClickOutTarget | null>(null);
  const [sheetKind, setSheetKind] = useState<EarnLoginKind>('card');
  const [busy, setBusy] = useState(false);
  const flight = useRef(createSingleFlight()).current;

  const launch = useCallback(async (target: ClickOutTarget, userId?: string) => {
    const raw = (target.url ?? '').trim();
    if (!raw) {
      showOpenLinkError();
      return;
    }
    const clickId = newClickId();
    const built = buildClickOutUrl(raw, { userId, clickId });
    // Open first: the click is logged only when the link really opened.
    const opened = await openUrl(built.url, { httpsOnly: true });
    if (!opened) return;
    analytics.track(Events.CLICK_OUT, {
      kind: target.kind,
      item_id: target.itemId != null ? String(target.itemId) : undefined,
      item_name: target.itemName,
      click_id: clickId,
      attributed: built.attributed,
      link_type: built.linkType,
      source: target.source ?? 'unknown',
    });
    if (target.kind === 'card' && target.alias) void addAppliedCard(target.alias);
  }, []);

  const openClickOut = useCallback(
    async (target: ClickOutTarget) => {
      if (!(target.url ?? '').trim()) {
        showOpenLinkError();
        return;
      }

      if (status === 'unauthenticated') {
        pending.current = target;
        setSheetKind(target.kind);
        sheetRef.current?.present();
        return;
      }

      await flight.run(async () => {
        let userId: string | number | undefined = (await storedUserId()) ?? profileQ.data?.id;
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
        await launch(target, String(userId));
      }, setBusy);
    },
    [status, profileQ, launch, flight]
  );

  // After "Log in to earn": the new user's CashKaro id (saved by signIn from
  // the login response; else the profile with the fresh token), then the link
  // opens attributed, so the apply continues by itself.
  const launchAfterLogin = useCallback(
    async (target: ClickOutTarget, accessToken: string) => {
      await flight.run(async () => {
        let userId: string | number | undefined = (await storedUserId()) ?? undefined;
        if (userId == null) {
          try {
            const profile = await queryClient.fetchQuery({
              queryKey: qk.user.profile(),
              queryFn: ({ signal }) => fetchProfile(accessToken, signal),
            });
            userId = profile?.id;
          } catch {
            userId = undefined;
          }
        }
        if (userId == null) {
          Alert.alert(
            'Couldn’t open this right now',
            'We couldn’t confirm your account, so the cashback wouldn’t be tracked. Check your connection and try again.'
          );
          return;
        }
        await launch(target, String(userId));
      }, setBusy);
    },
    [launch, flight]
  );

  const clickOutSheets = (
    <EarnLoginSheet
      ref={sheetRef}
      kind={sheetKind}
      onLogin={() => {
        const target = pending.current;
        pending.current = null;
        openLogin({
          source: target?.kind === 'store' ? 'shop' : 'apply',
          onSuccess: ({ accessToken }) => {
            if (target) void launchAfterLogin(target, accessToken);
          },
        });
      }}
      onContinue={() => {
        const target = pending.current;
        pending.current = null;
        if (target) void flight.run(() => launch(target), setBusy);
      }}
    />
  );

  return { openClickOut, busy, clickOutSheets };
}
