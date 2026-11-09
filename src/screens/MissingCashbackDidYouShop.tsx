/**
 * MissingCashbackDidYouShop — the single LIVE claims list (consolidates the
 * former 4 demo ticket-list screens). Figma 4129:27642.
 *
 * Three tabs (In Review / Closed / Others) → /users/missingcashback/queue.
 * In Review / Closed map to Pending / Resolved and render tracking
 * HelpTicketCards; need-details cards resume the flow at the right step by
 * group (B1 → New/Existing user, C1 → category, C2 → invoice), tracked cards
 * deep-link to the order, and raised tickets show as informational "under
 * review" cards (Ticket ID + "Expect update by <date>", no CTA). The "Others"
 * tab lists those same raised tickets as flat detail rows — tapping "View"
 * opens the MissingCashbackSummarySheet with the full ticket breakdown.
 *
 * Back arrow → Orders list by default (the user arrives here at the end of the
 * raise-a-claim flow, so going "back" should land on the orders listing, never
 * re-enter the flow they just finished). When opened from the Earnings /
 * Profile "Missing Cashback" menu row the caller passes `backTo: 'back'`, so
 * the arrow does a plain goBack() to that menu instead.
 *
 * A sticky bottom "Have more cashback to track?" banner (purple) starts a fresh
 * claim via the "Did You Shop?" Yes/No intake (MissingCashbackHelp).
 *
 * Composition: Header (tabs), HelpTicketCard (per claim/ticket), TrackMoreBanner,
 * MissingCashbackSummarySheet (Others "View").
 */
import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { Text, Divider, StatusBadge } from '../atoms';
import {
  Header,
  MissingCashbackSummarySheet,
  type MissingCashbackSummarySheetRef,
  ScreenState,
} from '../organisms';
import { images } from '../assets/images';
import { HelpTicketCard, TrackMoreBanner } from '../molecules';
import { useClaims, type ClaimTab } from '../query/useMissingCashback';
import type { ClaimCard, OthersClaimCard } from '../api/missingCashbackMapper';
import type { RootStackParamList, McClaimDraft } from '../navigation/types';
import { colors, spacing, radius, iconSize, borderWidth } from '../tokens';

function ChevronRightGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M7 5 L13 10 L7 15" stroke={color} strokeWidth={borderWidth.thick} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// One row inside a flat "Others" card — label left, value right.
function OthersRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[8] }}>
      <Text variant="body14SemiBold" color={colors.text.primary} style={{ flex: 1 }}>{label}</Text>
      <Text variant="body14Regular" color={colors.text.primary} align="right" style={{ flex: 1 }}>{value}</Text>
    </View>
  );
}

function OthersCard({ card, onView }: { card: OthersClaimCard; onView: () => void }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface.default,
        borderRadius: radius.lg,
        paddingHorizontal: spacing[16],
        paddingVertical: spacing[12],
        gap: spacing[8],
      }}
    >
      <OthersRow label="Date" value={card.date} />
      <Divider style="solid" />
      <OthersRow label="Retailer" value={card.retailer} />
      <Divider style="solid" />
      <OthersRow label="Transaction Amount" value={card.orderAmount} />
      <Divider style="solid" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[8] }}>
        <Text variant="body14SemiBold" color={colors.text.primary} style={{ flex: 1 }}>Status</Text>
        <StatusBadge status={card.statusTone} size="pill" label={card.statusLabel} />
      </View>
      <Divider style="solid" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="body14SemiBold" color={colors.text.primary} style={{ flex: 1 }}>Info</Text>
        <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel="View ticket details" hitSlop={spacing[8]} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
          <Text variant="body14Medium" color={colors.text.link}>View</Text>
          <ChevronRightGlyph size={iconSize[20]} color={colors.text.link} />
        </Pressable>
      </View>
    </View>
  );
}

const TAB_NAMES: ClaimTab[] = ['In Review', 'Closed', 'Others'];

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackDidYouShop'>;
type Route = RouteProp<RootStackParamList, 'MissingCashbackDidYouShop'>;

export function MissingCashbackDidYouShop() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  // Default back → Orders (end-of-flow arrival). Menu entries pass 'back'.
  const backTo = useRoute<Route>().params?.backTo ?? 'orders';
  const onBack = () =>
    backTo === 'back' ? navigation.goBack() : navigation.navigate('OrdersList');
  const [activeTab, setActiveTab] = useState(0);
  const tabName = TAB_NAMES[activeTab];
  const { data, isLoading, isError, refetch, isFetching } = useClaims(tabName);

  // "Others" tab: View → ticket summary sheet.
  const [selectedOther, setSelectedOther] = useState<OthersClaimCard | null>(null);
  const summaryRef = useRef<MissingCashbackSummarySheetRef>(null);
  const openSummary = (card: OthersClaimCard) => {
    setSelectedOther(card);
    summaryRef.current?.present();
  };

  // Tab counts come from the In-Review response's meta (which carries all
  // three totals) so the labels stay stable even when another tab's own
  // fetch fails or returns empty. When In Review is the active tab this is
  // the same cached query (no extra request).
  const counts = useClaims('In Review').data?.counts;
  const withCount = (base: string, n?: number) => (n && n > 0 ? `${base} (${n})` : base);
  const tabs = [
    { label: withCount('In Review', counts?.pending) },
    { label: withCount('Closed', counts?.resolved) },
    { label: withCount('Others', counts?.others) },
  ];

  // Resume a need-details claim at the right step. The invoice/category screens
  // hydrate any missing exit_id/store_id from the queue item, so the draft only
  // needs the queue id + group + what we already know.
  const onCtaPress = (card: ClaimCard) => {
    if (card.status === 'tracked') {
      // Deep-link to the order when we have its id; otherwise fall back to
      // the orders list so "View Details" always goes somewhere.
      if (card.cashbackId != null) {
        navigation.navigate('OrdersDetail', { id: String(card.cashbackId) });
      } else {
        navigation.navigate('OrdersList');
      }
      return;
    }
    const draft: McClaimDraft = {
      storeId: '',
      storeName: card.storeName,
      storeLogoUri: card.storeLogoUri,
      group: card.group,
      trackingSpeed: '',
      orderId: card.orderId !== '—' ? card.orderId : undefined,
      orderAmount: card.orderAmount,
      queueId: card.queueId,
    };
    if (card.group === 'B1') navigation.navigate('MissingCashbackNewUserCheck', { draft });
    else if (card.group === 'C1') navigation.navigate('MissingCashbackCategorySelect', { draft });
    else navigation.navigate('MissingCashbackInvoiceUpload', { draft });
  };

  const cards = data?.cards ?? [];
  const othersCards = data?.othersCards ?? [];
  const isOthers = tabName === 'Others';
  const listEmpty = isOthers ? othersCards.length === 0 : cards.length === 0;

  // Per-tab empty copy. "In Review" used to say "Cashbacks being tracked
  // show up here" — that describes the Closed tab (Figma 4129:23827).
  const emptyState =
    tabName === 'Closed'
      ? { title: 'No closed claims yet', body: 'Cashback being tracked shows up here.' }
      : tabName === 'In Review'
        ? { title: 'Nothing under review', body: 'Claims you raise show up here while we check them.' }
        : { title: 'No tickets yet', body: 'Raised tickets will show up here.' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="Missing Cashback"
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLeadingPress={onBack}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing[24],
            gap: spacing[16],
            paddingBottom: spacing[24],
          }}
        >
          {isLoading ? (
            <View style={{ paddingVertical: spacing[40], alignItems: 'center' }}>
              <ActivityIndicator color={colors.action.primary.default} />
            </View>
          ) : isError ? (
            <ScreenState
              title="Couldn’t load your claims"
              body="Something went wrong. Please try again."
              actionLabel={isFetching ? 'Retrying…' : 'Try again'}
              onAction={() => refetch()}
            />
          ) : listEmpty ? (
            <ScreenState
              image={images.screenstate.tracking}
              title={emptyState.title}
              body={emptyState.body}
            />
          ) : isOthers ? (
            othersCards.map((card) => (
              <View key={card.ticketId} style={{ paddingHorizontal: spacing[16], width: '100%' }}>
                <OthersCard card={card} onView={() => openSummary(card)} />
              </View>
            ))
          ) : (
            cards.map((card) => (
              <View key={card.queueId} style={{ paddingHorizontal: spacing[16], width: '100%' }}>
                <HelpTicketCard
                  status={card.status}
                  brandLogo={card.brandLogo}
                  title={card.title}
                  orderId={card.orderId}
                  orderAmount={card.orderAmount}
                  ticketId={card.ticketId}
                  expectByDate={card.expectByDate}
                  timer={card.timer}
                  timerTarget={card.timerTarget}
                  ctaLabel={card.ctaLabel}
                  onCtaPress={() => onCtaPress(card)}
                />
              </View>
            ))
          )}
        </ScrollView>

        {/* Sticky purple CTA — start a fresh claim via the "Did You Shop?"
            Yes/No intake (Yes → tracking steps, No → feedback). */}
        <View
          style={{
            paddingTop: spacing[12],
            paddingBottom: insets.bottom + spacing[12],
            backgroundColor: colors.background.muted,
          }}
        >
          <TrackMoreBanner
            onPress={() => navigation.navigate('MissingCashbackHelp')}
          />
        </View>
      </SafeAreaView>

      {/* "Others" ticket summary detail sheet (opened by a row's View link). */}
      <MissingCashbackSummarySheet ref={summaryRef} card={selectedOther} />
    </View>
  );
}
