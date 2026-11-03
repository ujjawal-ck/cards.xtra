/**
 * MissingCashbackTicketStatusReview — screen (Figma 4129:25299,
 * "help/missing-cashback/group-a/ticket-status-review-v3")
 *
 * Composition + reuse. Lists missing-cashback tickets under the "In
 * Review" tab. Cards are the reused HelpTicketCard molecule.
 *
 * Token map (per property):
 *   root bg            → colors.background.sunken (#fcfcfd)
 *   root padding       → spacing[0]
 *   root gap           → spacing[24]  (header → ticket container)
 *   header             → <Header> leading 'back' · title "Missing Cashback"
 *                        (body16Medium) · tabs row (TabPrimary):
 *                          active   → Chip 'tab' selected (cobalt #0741ef / text.inverse / Medium14)
 *                          inactive → Chip 'tab' default  (lavender #ebf0ff / text.link / Medium14)
 *                          pills radius.full · px spacing[16] py spacing[6]
 *   ticket container   → gap spacing[16]
 *   ticket wrapper     → paddingHorizontal spacing[16] (card 328, centred)
 *   cards 1–2          → <HelpTicketCard status="in-review">
 *   cards 3–4          → <HelpTicketCard status="need-details"> · onAddDetails → enter-order-id
 *
 * Imports: Header (back + title + tabs), HelpTicketCard.
 *
 * Note: the Figma tab bar carries a bottom border (border/default); the
 * reused Header organism's tab row has no bottom-border slot, so that hair
 * line is omitted rather than rebuilding Header.
 */
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Header } from '../organisms';
import { HelpTicketCard } from '../molecules';
import type { HelpTicketStatus } from '../molecules';
import { colors, spacing, sizing } from '../tokens';
import { images } from '../assets/images';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<
  RootStackParamList,
  'MissingCashbackTicketStatusReview'
>;

const TABS = [{ label: 'In Review' }, { label: 'Closed' }, { label: 'Others' }];

// 4 tickets driving the In-Review list: 1–2 under review, 3–4 need details.
const TICKETS: {
  status: HelpTicketStatus;
  brandLogo: number;
  title: string;
  orderId: string;
  orderAmount: string;
  timer?: string;
}[] = [
  {
    status: 'in-review',
    brandLogo: images.stores.myntra31,
    title: 'Your missing Cashback ticket is under review',
    orderId: 'Fl0118903129',
    orderAmount: '4210',
    timer: '23:59',
  },
  {
    status: 'in-review',
    brandLogo: images.stores.myntra31,
    title: 'Your missing Cashback ticket is under review',
    orderId: 'Fl0118903129',
    orderAmount: '4210',
    timer: '23:59',
  },
  {
    status: 'need-details',
    brandLogo: images.stores.myntra31,
    title: 'We need more details from you to track your Cashback',
    orderId: 'Fl0118903129',
    orderAmount: '4210',
  },
  {
    status: 'need-details',
    brandLogo: images.stores.myntra31,
    title: 'We need more details from you to track your Cashback',
    orderId: 'Fl0118903129',
    orderAmount: '4210',
  },
];

export function MissingCashbackTicketStatusReview() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.sunken }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* 1. Header — back + title + tab row */}
        <Header
          leading="back"
          title="Missing Cashback"
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLeadingPress={() => navigation.goBack()}
        />

        {/* 2. Ticket container (scrolls) */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing[24],
            gap: spacing[16],
            paddingBottom: sizing.bottomNavHeight + spacing[48],
          }}
        >
          {TICKETS.map((t, i) => (
            <View key={i} style={{ paddingHorizontal: spacing[16], width: '100%' }}>
              <HelpTicketCard
                status={t.status}
                brandLogo={t.brandLogo}
                title={t.title}
                orderId={t.orderId}
                orderAmount={t.orderAmount}
                timer={t.timer}
                // Superseded by the live DidYouShop list (which resumes claims
                // by group with a real draft); route there instead of the
                // draft-required order-id step to avoid a crash.
                onCtaPress={() => navigation.navigate('MissingCashbackDidYouShop')}
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
