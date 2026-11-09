/**
 * MissingCashbackTicketListTracked — screen (Figma 4129:27851,
 * "help/missing-cashback/group-b/ticket-list-tracked-4")
 *
 * Same shell as MissingCashbackTicketListClosed; deltas:
 *  - "Closed" tab active (index 1) with count 1.
 *  - One tracked (success) card: "Hurray! Cashback of ₹132 is added…",
 *    ctaLabel "View Details".
 *
 * Token map (per property):
 *   root bg            → colors.background.muted (#f5f7f9)
 *   root padding       → spacing[0]
 *   root gap           → spacing[24]
 *   header             → <Header> leading 'back' · title "Missing Cashback"
 *                        · tabs (TabPrimary → Chip 'tab'); active "Closed" with
 *                          count badge, inactive lavender — same tokens as closed-2
 *   ticket container   → gap spacing[16]
 *   ticket wrapper     → paddingHorizontal spacing[16] (card 328, centred)
 *   card               → <HelpTicketCard status="tracked"> bg surface.default,
 *                          ctaLabel "View Details"
 *   spacer             → flex:1 (flex-grow)
 *   bottom banner      → <TrackMoreBanner> (gradients.dark)
 *
 * Imports: Header (back + title + tabs+count), HelpTicketCard, TrackMoreBanner.
 *
 * Notes (same as closed-2): Chip count badge color/size + tab-bar bottom
 * border are reused-as-is, not rebuilt. "View Details" target screen is not
 * yet built — left inert (TODO).
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Header } from '../organisms';
import { HelpTicketCard, TrackMoreBanner } from '../molecules';
import { colors, spacing } from '../tokens';
import { images } from '../assets/images';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<
  RootStackParamList,
  'MissingCashbackTicketListTracked'
>;

const TABS = [{ label: 'In Review' }, { label: 'Closed', count: 1 }, { label: 'Others' }];

export function MissingCashbackTicketListTracked() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState(1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1 }}>
        <View style={{ flex: 1, gap: spacing[24], paddingBottom: spacing[16] }}>
          {/* 1. Header — back + title + tab row with counts */}
          <Header
            leading="back"
            title="Missing Cashback"
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLeadingPress={() => navigation.goBack()}
          />

          {/* 2. Ticket container */}
          <View style={{ gap: spacing[16] }}>
            <View style={{ paddingHorizontal: spacing[16], width: '100%' }}>
              <HelpTicketCard
                status="tracked"
                brandLogo={images.brands.flipkart}
                title="Hurray! Cashback of ₹132 is added to your CashKaro account"
                orderId="Fl0118903129"
                orderAmount="4210"
                ctaLabel="View Details"
                // TODO(nav): wire to the cashback-details screen once it's built.
              />
            </View>
          </View>

          {/* 3. Grow spacer (Figma's fixed spacer → flex-grow) */}
          <View style={{ flex: 1 }} />

          {/* 4. Bottom banner */}
          <TrackMoreBanner
            onPress={() => navigation.navigate('MissingCashbackTrack')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
