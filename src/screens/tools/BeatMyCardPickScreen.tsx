/**
 * BeatMyCardPickScreen — "Beat my card", step 1: pick the card the user has.
 *
 * Header, one line of context, a plain search field, and the app's cards that carry a BankKaro
 * alias (the alias is the join to the calculate call, so a card without one cannot be compared).
 * Tapping a card goes to the spend quiz with that alias. The card name is never sent to analytics.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, Image, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Icon, Input } from '../../atoms';
import type { CardModel } from '../../molecules';
import { CARD_THUMB_ASPECT, CardListSkeleton, Header, ScreenState } from '../../organisms';
import { colors, spacing, radius, borderWidth, iconSize } from '../../tokens';
import { useCards } from '../../query/useCards';
import { haptics } from '../../lib/haptics';
import { analytics, Events } from '../../analytics';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BeatMyCardPick'>;

// Row art: 64 wide at the shared card thumbnail ratio.
const ART_W = spacing[64];

type PickRowProps = { card: CardModel; alias: string; onPress: (alias: string) => void };

const PickRow = React.memo(function PickRow({ card, alias, onPress }: PickRowProps) {
  return (
    <Pressable
      onPress={() => onPress(alias)}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}. I have this card`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[12],
        padding: spacing[12],
        borderRadius: radius.lg,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle3,
        backgroundColor: pressed ? colors.surface.sunken2 : colors.surface.default,
      })}
    >
      <Image
        source={card.cardImage}
        style={{
          width: ART_W,
          aspectRatio: CARD_THUMB_ASPECT,
          borderRadius: radius.sm,
          backgroundColor: colors.surface.sunken,
        }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <Text variant="body14SemiBold" color={colors.text.primary} style={{ flex: 1 }}>
        {card.name}
      </Text>
      <Icon name="chevron-right" size={iconSize[20]} color={colors.text.secondary} />
    </Pressable>
  );
});

export function BeatMyCardPickScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { data: cards = [], isLoading, isError, refetch } = useCards();
  const [query, setQuery] = useState('');

  useEffect(() => {
    analytics.track(Events.TOOL_START, { tool: 'beat' });
  }, []);

  // Only cards with an alias can be compared.
  const comparable = useMemo(
    () =>
      cards
        .map((card) => ({ card, alias: card.filterMeta?.cardAlias }))
        .filter((r): r is { card: CardModel; alias: string } => !!r.alias),
    [cards],
  );
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? comparable.filter((r) => r.card.name.toLowerCase().includes(q)) : comparable;
  }, [comparable, query]);

  const onPick = (alias: string) => {
    haptics.impact('light');
    navigation.navigate('SpendQuiz', { next: 'beat', cardAlias: alias });
  };

  const shell = (body: React.ReactNode) => (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Beat my card" onLeadingPress={() => navigation.goBack()} />
      {body}
    </SafeAreaView>
  );

  if (isLoading) {
    return shell(
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[16] }}>
        <CardListSkeleton count={3} />
      </View>,
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
  if (comparable.length === 0) {
    return shell(
      <ScreenState title="No cards to compare yet" body="We could not find a card we can compare right now." />,
    );
  }

  return shell(
    <FlatList
      data={shown}
      keyExtractor={(r) => r.alias}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: spacing[16], paddingBottom: spacing[16] }}>
          <Text variant="body14Regular" color={colors.text.secondary}>
            Pick the card you have.
          </Text>
          <Input
            size="sm"
            label="Search cards"
            placeholder="Search cards"
            leadingIcon="search-outline"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      }
      ListEmptyComponent={
        <ScreenState
          title="No card matches that name"
          body="Check the spelling, or clear the search."
          actionLabel="Clear search"
          onAction={() => setQuery('')}
        />
      }
      ListFooterComponent={
        shown.length > 0 ? (
          <Text
            variant="body12Regular"
            color={colors.text.tertiary}
            align="center"
            style={{ paddingTop: spacing[16] }}
          >
            Only cards the app can compare are listed.
          </Text>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing[8] }} />}
      renderItem={({ item }) => <PickRow card={item.card} alias={item.alias} onPress={onPick} />}
      contentContainerStyle={{
        paddingHorizontal: spacing[16],
        paddingTop: spacing[8],
        paddingBottom: insets.bottom + spacing[24],
      }}
    />,
  );
}
