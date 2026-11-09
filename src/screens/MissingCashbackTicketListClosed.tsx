/**
 * MissingCashbackTicketListClosed — screen (Figma 4129:27830,
 * "help/missing-cashback/group-b/ticket-list-closed-2")
 *
 * Composition + reuse. Ticket list with the "In Review" tab active
 * (count 1); shows a need-details card whose CTA is "Upload Screenshot"
 * (group-b invoice-upload entry).
 *
 * Token map (per property):
 *   root bg            → colors.background.muted (#f5f7f9)
 *   root padding       → spacing[0]
 *   root gap           → spacing[24]
 *   header             → <Header> leading 'back' · title "Missing Cashback"
 *                        (body16Medium) · tabs (TabPrimary → Chip 'tab'):
 *                          active   → cobalt #0741ef / text.inverse / Medium14
 *                                     + count badge (surface.default pill,
 *                                       radius.sm, minW iconSize[16], px spacing[4])
 *                          inactive → lavender #ebf0ff / text.link / Medium14
 *                          pills radius.full · px spacing[16] py spacing[6]
 *   ticket container   → gap spacing[16]
 *   ticket wrapper     → paddingHorizontal spacing[16] (card 328, centred)
 *   card               → <HelpTicketCard status="need-details"> bg surface.alert,
 *                          NEED DETAILS tag, ctaLabel "Upload Screenshot"
 *   spacer             → flex:1 (Figma's fixed 302px spacer → flex-grow)
 *   bottom banner      → <TrackMoreBanner> (gradients.dark)
 *
 * Imports: Header (back + title + tabs+count), HelpTicketCard, TrackMoreBanner.
 *
 * Notes:
 *  - Count-badge: Chip renders caption10SemiBold / text.primary on the active
 *    pill; Figma asks SemiBold12 / #0741ef. Reused as-is (not rebuilding Chip).
 *  - Header's tab row has no bottom-border slot; the Figma border/default
 *    hairline is omitted rather than rebuilding Header.
 *  - "Upload Screenshot" routes to the invoice-upload step, which is not yet
 *    built — left inert (TODO) until that screen lands.
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
  'MissingCashbackTicketListClosed'
>;

const TABS = [{ label: 'In Review', count: 1 }, { label: 'Closed' }, { label: 'Others' }];

export function MissingCashbackTicketListClosed() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState(0);

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
                status="need-details"
                brandLogo={images.brands.flipkart}
                title="We need more details from you to track your Cashback"
                orderId="Fl0118903129"
                orderAmount="4210"
                ctaLabel="Upload Screenshot"
                // TODO(nav): wire to the invoice-upload step once it's built.
              />
            </View>
          </View>

          {/* 3. Grow spacer (Figma's fixed 302px spacer → flex-grow) */}
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
