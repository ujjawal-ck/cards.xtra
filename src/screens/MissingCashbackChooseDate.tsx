/**
 * MissingCashbackChooseDate — screen (Figma 4129:23861,
 * "help/missing-cashback/choose-date-v2").
 *
 * Live: the user's real visit dates for the chosen store
 * (useExitClickDates → /users/missingcashback/exitclickdates/:id), grouped by
 * month. Pick month + day, then Continue carries the chosen exitclick_date +
 * exit_id forward in the draft to the order-id step.
 *
 * Imports: Header, Button, BrandLogoTile, MonthSelector, DateSelection (atoms);
 * useExitClickDates.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Button, BrandLogoTile, MonthSelector, DateSelection } from '../atoms';
import { Header } from '../organisms';
import { useExitClickDates } from '../query/useMissingCashback';
import { colors, spacing } from '../tokens';
import { analytics, Events } from '../analytics';
import { images } from '../assets/images';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackChooseDate'>;
type Rt = RouteProp<RootStackParamList, 'MissingCashbackChooseDate'>;

const CONTENT_GAP = 36;

export function MissingCashbackChooseDate() {
  const navigation = useNavigation<Nav>();
  const { draft } = useRoute<Rt>().params;
  const { data, isLoading, isError, refetch, isFetching } = useExitClickDates(draft.storeId);

  const months = data?.months ?? [];
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [exitDate, setExitDate] = useState<string | null>(null);

  // Default-select the first month + first date once data arrives.
  const activeMonthKey = monthKey ?? months[0]?.key ?? null;
  const activeMonth = useMemo(() => months.find((m) => m.key === activeMonthKey) ?? null, [months, activeMonthKey]);
  const activeExitDate = exitDate ?? activeMonth?.dates[0]?.exitDate ?? null;

  const logoSource = draft.storeLogoUri ? { uri: draft.storeLogoUri } : images.logos.darkSmall;

  const onContinue = () => {
    const picked = activeMonth?.dates.find((d) => d.exitDate === activeExitDate);
    if (!picked) return;
    analytics.track(Events.MISSING_CASHBACK_STEP, { step: 'choose_date', group: draft.group });
    navigation.navigate('MissingCashbackEnterOrderId', {
      draft: { ...draft, exitDate: picked.exitDate, exitId: picked.exitId },
    });
  };

  const hasDates = months.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <View style={{ flex: 1, gap: spacing[24] }}>
          <Header leading="back" title="Did You Shop?" onLeadingPress={() => navigation.goBack()} />

          <View style={{ flex: 1, gap: CONTENT_GAP }}>
            {/* Info: brand tile + heading */}
            <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
              <BrandLogoTile source={logoSource} size="44" />
              <Text variant="body16Bold" color={colors.text.primary}>
                {`Great! Choose the date you shopped on ${draft.storeName}`}
              </Text>
            </View>

            {isLoading ? (
              <View style={{ paddingVertical: spacing[40], alignItems: 'center' }}>
                <ActivityIndicator color={colors.action.primary.default} />
              </View>
            ) : isError ? (
              <View style={{ paddingHorizontal: spacing[24], alignItems: 'center', gap: spacing[8] }}>
                <Text variant="body14SemiBold" color={colors.text.primary} align="center">
                  Couldn’t load your visit dates.
                </Text>
                <Pressable accessibilityRole="button" onPress={() => refetch()} hitSlop={spacing[8]}>
                  <Text variant="body14SemiBold" color={colors.action.accent.default}>
                    {isFetching ? 'Retrying…' : 'Retry'}
                  </Text>
                </Pressable>
              </View>
            ) : !hasDates ? (
              <View style={{ paddingHorizontal: spacing[24], alignItems: 'center' }}>
                <Text variant="body14Regular" color={colors.text.secondary} align="center">
                  {`We couldn’t find any recent visits to ${draft.storeName}.`}
                </Text>
              </View>
            ) : (
              <>
                {/* Month wheel */}
                <View style={{ paddingHorizontal: spacing[16], paddingVertical: spacing[32], gap: spacing[4], alignItems: 'center' }}>
                  {months.map((m) => (
                    <MonthSelector
                      key={m.key}
                      month={m.label}
                      property1={m.key === activeMonthKey ? 'Selected' : 'Default'}
                      onPress={() => {
                        setMonthKey(m.key);
                        setExitDate(m.dates[0]?.exitDate ?? null);
                      }}
                    />
                  ))}
                </View>

                {/* Date selection */}
                <View style={{ gap: spacing[16], alignItems: 'center' }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: spacing[16], gap: spacing[10] }}
                  >
                    {(activeMonth?.dates ?? []).map((d) => (
                      <DateSelection
                        key={`${d.exitId}-${d.day}`}
                        day={d.day}
                        property1={d.exitDate === activeExitDate ? 'Selected' : 'Default'}
                        onPress={() => setExitDate(d.exitDate)}
                      />
                    ))}
                  </ScrollView>
                  <Text variant="body14Regular" color={colors.text.primary} align="center">
                    {`These are the dates you visited ${draft.storeName}`}
                  </Text>
                </View>
              </>
            )}

            <View style={{ flex: 1 }} />
          </View>

          {/* Footer CTA */}
          <View style={{ paddingTop: spacing[10], paddingBottom: spacing[20], paddingHorizontal: spacing[16] }}>
            <Button
              label="Continue"
              variant="solid"
              tone="second"
              size={52}
              fullWidth
              disabled={!hasDates || !activeExitDate}
              onPress={onContinue}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
