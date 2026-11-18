/**
 * BeatMyCardPickScreen: "Beat my card", step 1: pick the card the user has.
 *
 * The list is every card the calculate call returns (also cards this app does not list), because the
 * user's own card is an input, not a product we sell. No savings number is shown here: the result
 * screen is the reveal. The user can edit the spends from here; the list loads again for new spends.
 * Analytics: the start event only. Never the card name, never a spend amount.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Icon, Input, Button, Chip, Radio, RemoteImage, Skeleton } from '../../atoms';
import { EditSpendsSheet, Header, ScreenState, CARD_THUMB_ASPECT } from '../../organisms';
import type { EditSpendsSheetHandle } from '../../organisms';
import { colors, spacing, radius, borderWidth, iconSize } from '../../tokens';
import { useCardSavings } from '../../query/useCardSavings';
import type { LeagueRow } from '../../query/useCardSavings';
import { useSavedSpends } from '../../lib/savedSpends';
import { buildSpends, hasAnySpend, totalYearlySpend } from '../../lib/cardTools';
import type { SpendKey } from '../../lib/cardTools';
import { filterPickRows, pickBanks, pickName } from '../../lib/beatView';
import { formatINR } from '../../lib/money';
import { haptics } from '../../lib/haptics';
import { analytics, Events } from '../../analytics';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BeatMyCardPick'>;
type Rt = RouteProp<RootStackParamList, 'BeatMyCardPick'>;

// Row art: 64 wide at the shared card thumbnail ratio.
const ART_W = spacing[64];

type PickRowProps = { row: LeagueRow; selected: boolean; onPress: (alias: string) => void };

const PickRow = React.memo(function PickRow({ row, selected, onPress }: PickRowProps) {
  const name = pickName(row);
  const bank = row.savings.bankName;
  const source = row.card ? row.card.cardImage : row.savings.imageUrl ? { uri: row.savings.imageUrl } : undefined;
  return (
    <Pressable
      onPress={() => onPress(row.savings.alias)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}${bank ? `, ${bank}` : ''}. I have this card`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[12],
        padding: spacing[12],
        borderRadius: radius.lg,
        borderWidth: borderWidth.thin,
        borderColor: selected ? colors.action.accent.default : colors.border.subtle3,
        backgroundColor: selected || pressed ? colors.surface.sunken2 : colors.surface.default,
      })}
    >
      <View pointerEvents="none">
        <Radio selected={selected} accessibilityLabel={name} />
      </View>
      <RemoteImage
        source={source ?? {}}
        style={{
          width: ART_W,
          aspectRatio: CARD_THUMB_ASPECT,
          borderRadius: radius.sm,
          backgroundColor: colors.surface.sunken,
        }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={{ flex: 1, gap: spacing[2] }}>
        <Text variant="body14SemiBold" color={colors.text.primary} numberOfLines={2}>
          {name}
        </Text>
        {bank ? (
          <Text variant="body12Regular" color={colors.text.secondary} numberOfLines={1}>
            {bank}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export function BeatMyCardPickScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const [answers, setAnswers] = useState(params.answers);
  const [spends, setSpends] = useState(params.spends);
  // New params (e.g. the result screen edited the spends) replace local state.
  useEffect(() => {
    setAnswers(params.answers);
    setSpends(params.spends);
  }, [params.answers, params.spends]);

  const { league, isLoading, isOffline, isError, refetch } = useCardSavings(spends);
  const { save } = useSavedSpends();
  const editRef = useRef<EditSpendsSheetHandle>(null);

  const [query, setQuery] = useState('');
  const [bank, setBank] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  // The quiz already sent TOOL_START when it opened this screen.
  useEffect(() => {
    if (!params.fromQuiz) analytics.track(Events.TOOL_START, { tool: 'beat' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const banks = useMemo(() => pickBanks(league), [league]);
  const shown = useMemo(() => filterPickRows(league, bank, query), [league, bank, query]);
  // A pick that no longer exists (spends changed) is dropped.
  const pickedRow = useMemo(() => league.find((r) => r.savings.alias === picked), [league, picked]);

  const onPick = (alias: string) => {
    haptics.impact('light');
    setPicked(alias);
  };

  const onSubmitSpends = (next: Partial<Record<SpendKey, number>>) => {
    setAnswers(next);
    setSpends(buildSpends(next));
    save(next);
  };

  const onSee = () => {
    if (!pickedRow) return;
    haptics.impact('light');
    navigation.navigate('BeatMyCardResult', { cardAlias: pickedRow.savings.alias, spends, answers });
  };

  const shell = (body: React.ReactNode, footer?: React.ReactNode) => (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Beat my card" onLeadingPress={() => navigation.goBack()} />
      {body}
      {footer}
      <EditSpendsSheet ref={editRef} answers={answers} onSubmit={onSubmitSpends} />
    </SafeAreaView>
  );

  if (!hasAnySpend(spends)) {
    return shell(
      <ScreenState
        title="Enter at least one spend"
        body="Every spend is 0 now, so there is nothing to compare."
        actionLabel="Edit spends"
        onAction={() => editRef.current?.present()}
      />,
    );
  }
  if (isLoading) {
    return shell(
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[16], gap: spacing[12] }}>
        <Text variant="body14Regular" color={colors.text.secondary}>
          Checking every card against your spends. This can take up to a minute.
        </Text>
        <Skeleton height={spacing[80]} radius="lg" />
        <Skeleton height={spacing[80]} radius="lg" />
        <Skeleton height={spacing[80]} radius="lg" />
      </View>,
    );
  }
  if (isOffline) {
    return shell(
      <ScreenState
        title="You're offline"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />,
    );
  }
  if (isError) {
    return shell(
      <ScreenState
        title="Couldn't load cards"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />,
    );
  }
  if (league.length === 0) {
    return shell(
      <ScreenState title="No cards to compare yet" body="We could not find a card we can compare right now." />,
    );
  }

  return shell(
    <FlatList
      data={shown}
      extraData={picked}
      keyExtractor={(r) => r.savings.alias}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: spacing[12], paddingBottom: spacing[12] }}>
          <Text variant="heading18SemiBold" color={colors.text.primary}>
            Which card do you have?
          </Text>
          <Pressable
            onPress={() => editRef.current?.present()}
            accessibilityRole="button"
            accessibilityLabel={`Annual spends: ${formatINR(totalYearlySpend(spends))} a year. Edit`}
            hitSlop={spacing[8]}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[6],
              paddingVertical: spacing[6],
              paddingHorizontal: spacing[12],
              borderRadius: radius.full,
              backgroundColor: colors.action.secondary.default,
            }}
          >
            <Text variant="body12SemiBold" color={colors.text.link}>
              {`Annual spends: ${formatINR(totalYearlySpend(spends))} a year`}
            </Text>
            <Icon name="edit-outline" size={iconSize[16]} color={colors.text.link} />
          </Pressable>
          <Input
            size="sm"
            label="Search cards"
            placeholder="Search by card or bank"
            leadingIcon="search-outline"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {banks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', gap: spacing[8] }}>
                <Chip
                  label="All"
                  size={32}
                  state={bank === null ? 'selected' : 'default'}
                  onPress={() => setBank(null)}
                />
                {banks.map((b) => (
                  <Chip
                    key={b.bank}
                    label={b.bank}
                    size={32}
                    state={bank === b.bank ? 'selected' : 'default'}
                    onPress={() => setBank(bank === b.bank ? null : b.bank)}
                  />
                ))}
              </View>
            </ScrollView>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <ScreenState
          title="We could not find that card"
          body="Check the spelling, or pick the closest card."
          actionLabel="Clear search"
          onAction={() => {
            setQuery('');
            setBank(null);
          }}
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing[8] }} />}
      renderItem={({ item }) => (
        <PickRow row={item} selected={item.savings.alias === picked} onPress={onPick} />
      )}
      contentContainerStyle={{
        paddingHorizontal: spacing[16],
        paddingTop: spacing[8],
        paddingBottom: spacing[24],
      }}
    />,
    pickedRow ? (
      <View
        style={{
          paddingHorizontal: spacing[16],
          paddingTop: spacing[12],
          paddingBottom: insets.bottom + spacing[12],
          borderTopWidth: borderWidth.thin,
          borderTopColor: colors.border.subtle3,
          backgroundColor: colors.surface.default,
        }}
      >
        <Button label="See if a card beats it" variant="solid" tone="main" size={52} fullWidth onPress={onSee} />
      </View>
    ) : null,
  );
}
