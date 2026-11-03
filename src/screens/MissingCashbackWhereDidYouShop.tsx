/**
 * MissingCashbackWhereDidYouShop — screen (Figma 4129:23675,
 * "help/missing-cashback/where-did-you-shop-v2"). FLOW ENTRY for a new claim.
 *
 * Live: lists the retailers the user can claim against (CashKaro
 * /users/missingcashback/retailers via useRetailers). Each row carries the
 * store's `group` + `tracking_speed` forward in the claim draft, so the rest
 * of the flow can branch by group. Tap → ChooseDate with that draft.
 *
 * Token map unchanged from the original spec (card/list/dividers). Loading /
 * empty / error states added.
 *
 * Imports: Header, Divider, BrandLogoTile, Text (atoms); useRetailers.
 */
import React from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Divider, BrandLogoTile } from '../atoms';
import { Header } from '../organisms';
import { useRetailers } from '../query/useMissingCashback';
import { colors, spacing, radius } from '../tokens';
import { analytics, Events } from '../analytics';
import type { RetailerRow } from '../api/missingCashbackMapper';
import type { RootStackParamList, McClaimDraft } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackWhereDidYouShop'>;

const CONTENT_GAP = 36; // no Spacing/36 token (scale jumps 32 → 40)

const SUPPORT_EMAIL = 'contact@cashkaro.com';

/** "Oops! no visits in 30 days" empty state — Figma 4129:23753. */
function NoVisitsEmpty() {
  const mailTo = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  const EmailLink = () => (
    <Text variant="body14Regular" color={colors.text.link} onPress={mailTo}>
      {SUPPORT_EMAIL}
    </Text>
  );
  return (
    <View style={{ paddingHorizontal: spacing[24], gap: spacing[16] }}>
      <Text variant="display36ExtraBold" color={colors.text.primary}>
        Oops!
      </Text>
      <Text variant="body16SemiBold" color={colors.text.primary}>
        Looks like you have not visited any website via CashKaro in last 30 days
      </Text>
      <Text variant="body14Regular" color={colors.text.secondary}>
        For any assistance, please write to us at <EmailLink />
      </Text>
      <Text variant="body14Regular" color={colors.text.secondary}>
        We get commission (and pay you Cashback) only when you visit the website
        via CashKaro and shop. If you shopped via CashKaro over 30 days ago,
        please reach out at <EmailLink />
      </Text>
    </View>
  );
}

export function MissingCashbackWhereDidYouShop() {
  const navigation = useNavigation<Nav>();
  const { data: retailers, isLoading, isError, refetch, isFetching } = useRetailers();

  const startClaim = (r: RetailerRow) => {
    const draft: McClaimDraft = {
      storeId: r.storeId,
      storeName: r.name,
      storeLogoUri: typeof r.logo === 'object' && r.logo && 'uri' in r.logo ? (r.logo as { uri: string }).uri : undefined,
      group: r.group,
      trackingSpeed: r.trackingSpeed,
    };
    analytics.track(Events.MISSING_CASHBACK_START, { store: r.name, group: r.group });
    navigation.navigate('MissingCashbackChooseDate', { draft });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <View style={{ flex: 1, gap: spacing[24] }}>
          <Header leading="back" title="Did You Shop?" onLeadingPress={() => navigation.goBack()} />

          <View style={{ flex: 1, gap: CONTENT_GAP }}>
            {/* Info text */}
            <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
              <Text variant="body16Bold" color={colors.text.primary}>
                Where did you shop?
              </Text>
              <Text variant="body15Regular" color={colors.text.secondary}>
                These are the retailers you have visited in last 30 days
              </Text>
            </View>

            {/* Retailer list */}
            {isLoading ? (
              <View style={{ paddingVertical: spacing[40], alignItems: 'center' }}>
                <ActivityIndicator color={colors.action.primary.default} />
              </View>
            ) : isError ? (
              <View style={{ paddingHorizontal: spacing[24], alignItems: 'center', gap: spacing[8] }}>
                <Text variant="body14SemiBold" color={colors.text.primary} align="center">
                  Couldn’t load your retailers.
                </Text>
                <Pressable accessibilityRole="button" onPress={() => refetch()} hitSlop={spacing[8]}>
                  <Text variant="body14SemiBold" color={colors.action.accent.default}>
                    {isFetching ? 'Retrying…' : 'Retry'}
                  </Text>
                </Pressable>
              </View>
            ) : !retailers || retailers.length === 0 ? (
              <NoVisitsEmpty />
            ) : (
              <ScrollView contentContainerStyle={{ paddingHorizontal: spacing[16], paddingBottom: spacing[24] }}>
                <View
                  style={{
                    width: '100%',
                    backgroundColor: colors.surface.default,
                    borderRadius: radius.xl,
                    padding: spacing[16],
                    gap: spacing[16],
                  }}
                >
                  {retailers.map((r, i) => (
                    <React.Fragment key={`${r.storeId}-${i}`}>
                      <Pressable
                        onPress={() => startClaim(r)}
                        accessibilityRole="button"
                        style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing[16] }}
                      >
                        <BrandLogoTile source={r.logo} size="40" />
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text variant="body12Medium" color={colors.text.primary}>
                            {r.trackLabel}
                          </Text>
                        </View>
                      </Pressable>
                      {i < retailers.length - 1 ? <Divider style="solid" color={colors.border.subtle3} /> : null}
                    </React.Fragment>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
