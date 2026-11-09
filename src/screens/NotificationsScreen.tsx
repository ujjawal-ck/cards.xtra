/**
 * NotificationsScreen — Figma "notifications" (5784:25661).
 *
 * Reached from the Home header's notification bell. Pushed on the ROOT stack
 * (over the tabs), so it slides in with its own back header.
 *
 * Composition — reuses existing components only:
 *   1. <Header leading="back">        (organism) — "Notifications" title.
 *   2. Tab pills                       — <Chip type="tab"> ×3 (All / Offers /
 *                                        Information), single-select.
 *   3. "Older" section label           — <Text>.
 *   4. Notification card               — inline: avatar circle (<Icon>) +
 *                                        body text + <Button variant="outline">
 *                                        CTA, in a white elevation card.
 *
 * Content is static demo data for now (matches the Figma's single referral
 * card); swap NOTIFICATIONS for a live feed when one lands.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Chip, Button, Icon, Divider } from '../atoms';
import type { IconName } from '../atoms';
import { Header } from '../organisms';
import {
  colors,
  spacing,
  radius,
  iconSize,
  elevation,
} from '../tokens';
import type { RootStackParamList } from '../navigation/types';
import { analytics, Events } from '../analytics';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TABS = ['All', 'Offers', 'Information'] as const;
type TabKey = 'offers' | 'information';

interface NotificationItem {
  id: string;
  icon: IconName;
  text: string;
  cta?: string;
  /** Which tab(s) this belongs to — shown under "All" regardless. */
  kind: TabKey;
}

// Static demo feed (Figma 5784:25661 shows the referral card under "Older").
const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'referral',
    icon: 'desc-cashback',
    text: 'Earn Rs. 50 for every friend you invite! They get Rs. 50 too',
    cta: 'Start Earning',
    kind: 'information',
  },
];

const AVATAR_SIZE = spacing[40]; // 40 — circular icon frame

function NotificationCard({ item }: { item: NotificationItem }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: spacing[12],
          backgroundColor: colors.surface.default,
          borderRadius: radius.xl,
          padding: spacing[16],
        },
        elevation.light.sm,
      ]}
    >
      {/* Avatar — circular tinted frame holding the illustration icon. */}
      <View
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: radius.full,
          backgroundColor: colors.background.sunken,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={item.icon} size={iconSize[24]} />
      </View>

      <View style={{ flex: 1, gap: spacing[12] }}>
        <Text variant="body14SemiBold" color={colors.text.primary}>
          {item.text}
        </Text>
        {item.cta ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              label={item.cta}
              variant="outline"
              size={36}
              onPress={() =>
                analytics.track(Events.NOTIFICATION_SELECT, { id: item.id, cta: item.cta })
              }
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState(0);

  // Tab 0 = All (everything); Offers / Information filter by `kind`.
  const visible = useMemo(() => {
    if (activeTab === 0) return NOTIFICATIONS;
    const key: TabKey = activeTab === 1 ? 'offers' : 'information';
    return NOTIFICATIONS.filter((n) => n.kind === key);
  }, [activeTab]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background.muted }}
    >
      <StatusBar style="dark" />

      <Header
        leading="back"
        title="Notifications"
        onLeadingPress={() => navigation.goBack()}
      />

      {/* Filter pills — single-select. */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing[8],
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[12],
        }}
      >
        {TABS.map((label, i) => (
          <Chip
            key={label}
            label={label}
            type="tab"
            state={i === activeTab ? 'selected' : 'default'}
            onPress={() => setActiveTab(i)}
          />
        ))}
      </View>
      <Divider style="solid" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: spacing[16],
          gap: spacing[12],
        }}
      >
        {visible.length > 0 ? (
          <>
            <Text variant="body16SemiBold" color={colors.text.primary}>
              Older
            </Text>
            {visible.map((item) => (
              <NotificationCard key={item.id} item={item} />
            ))}
          </>
        ) : (
          <Text
            variant="body14Regular"
            color={colors.text.secondary}
            align="center"
            style={{ paddingTop: spacing[48] }}
          >
            No notifications here yet.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
