/**
 * PrivacyPolicyScreen — Figma "legal/privacy-policy" (3685:197516).
 *
 * Reached from Profile → "Privacy Policy". Pushed on the ROOT stack (over the
 * tabs) with its own back header.
 *
 * Composition (reuses existing components, no new molecules):
 *   1. <Header leading="back" title="Privacy Policy" />   (organism, REUSED)
 *   2. "Last updated: …" caption                           (Body/12/Medium)
 *   3. One block per PRIVACY_SECTIONS entry — auto-numbered
 *      "<n>. <heading>" (Body/15/SemiBold) + body (Body/14/Regular, the
 *      nearest token to the Figma 13px regular).
 *
 * Tokens: bg background/muted; section gap Spacing/16; in-block gap Spacing/8;
 * horizontal Spacing/24; bottom Spacing/24.
 */
import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '../atoms';
import { Header } from '../organisms';
import { colors, spacing } from '../tokens';
import type { RootStackParamList } from '../navigation/types';
import { PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from './privacyContent';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PrivacyPolicy'>;

export function PrivacyPolicyScreen() {
  const navigation = useNavigation<Nav>();

  return (
    // White page with a pinned header (Figma 4439:291870) — the header used
    // to scroll away inside the ScrollView, unlike every other screen.
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="Privacy Policy"
          onLeadingPress={() => navigation.goBack()}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: spacing[16],
            paddingTop: spacing[8],
            paddingBottom: spacing[24],
          }}
        >

          {/* Last-updated caption. */}
          <View style={{ paddingHorizontal: spacing[24] }}>
            <Text variant="body12Medium" color={colors.text.secondary}>
              {PRIVACY_LAST_UPDATED}
            </Text>
          </View>

          {/* One block per section — auto-numbered from the array index. */}
          {PRIVACY_SECTIONS.map((section, i) => (
            <View
              key={i}
              style={{ paddingHorizontal: spacing[24], gap: spacing[8] }}
            >
              <Text variant="body15SemiBold" color={colors.text.primary}>
                {`${i + 1}. ${section.heading}`}
              </Text>
              <Text variant="body14Regular" color={colors.text.secondary}>
                {section.body}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
