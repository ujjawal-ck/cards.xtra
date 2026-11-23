/**
 * BeatMyCardPickScreen: "Beat my card", step 1: pick the card the user has. No spends needed.
 *
 * The list is every card the calculate call returns for a fixed probe body (PROBE_SPENDS, spec 9.3),
 * also cards this app does not list, because the user's own card is an input, not a product we sell.
 * The probe is one cached query, so going back to this screen is instant. A to Z by name (never by
 * rank: the rank would show the winner before the result), search, bank chips A to Z. Typing in the
 * search resets the bank chip to "All". "Use this card" shows only after a pick and opens the spends page.
 *
 * "Can't find your card? Tell us" sits under the list, outside it, so it shows also when a search finds
 * nothing. It opens a small sheet with one field; Send tracks an analytics event only (no backend).
 *
 * Analytics: TOOL_START once on open, BEAT_CARD_PICK { bank } on "Use this card", BEAT_CARD_REQUEST
 * { card_name } on Send. Never the name or id of the picked card, never a spend amount.
 * Not run on a device: check the request sheet above the keyboard on Android.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, FlatList, Pressable, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Input, Button, Chip, Radio, RemoteImage, Skeleton } from '../../atoms';
import { Toast } from '../../molecules';
import { Header, ScreenState, CARD_THUMB_ASPECT, BottomSheetHeader } from '../../organisms';
import { colors, spacing, radius, borderWidth, opacity } from '../../tokens';
import { useCardSavings } from '../../query/useCardSavings';
import type { LeagueRow } from '../../query/useCardSavings';
import { PROBE_SPENDS } from '../../lib/beatFlow';
import { filterPickRows, pickBanks, pickName } from '../../lib/beatView';
import { haptics } from '../../lib/haptics';
import { analytics, Events } from '../../analytics';
import { resetBeatSpendsDraft } from './BeatMyCardSpendsScreen';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BeatMyCardPick'>;

// Row art: 64 wide at the shared card thumbnail ratio.
const ART_W = spacing[64];
const CARD_NAME_MAX = 60;
const TOAST_MS = 3000;
const CTA_H = 52;
const SHEET_SNAP_POINTS = ['60%'];

/** Gap between list rows. Module level, so the list keeps one component type (audit NAV-05). */
function RowSeparator() {
  return <View style={{ height: spacing[8] }} />;
}

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

type CardRequestSheetHandle = { present(): void };

/**
 * "Tell us" sheet: one field (card name) and Send. Built like EligibilityCheckerSheet: BottomSheetModal,
 * BottomSheetHeader as the handle, a plain Input (the bottom-sheet input drops focus per keystroke on the
 * new architecture) at the top of one tall snap. Send calls `onSend` with the trimmed name (max 60 characters) and closes the sheet.
 */
const CardRequestSheet = forwardRef<CardRequestSheetHandle, { onSend: (name: string) => void }>(
  function CardRequestSheet({ onSend }, ref) {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const [name, setName] = useState('');
    const trimmed = name.trim().slice(0, CARD_NAME_MAX);

    useImperativeHandle(ref, () => ({ present: () => sheetRef.current?.present() }), []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={opacity[50]} />
      ),
      [],
    );

    const send = () => {
      if (!trimmed) return;
      onSend(trimmed);
      sheetRef.current?.dismiss();
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        enablePanDownToClose
        // One tall snap with the field at the top, like EligibilityCheckerSheet: gorhom's keyboard lift does
        // not track the plain Input, so the field must stay above the keypad without it. Return sends too.
        snapPoints={SHEET_SNAP_POINTS}
        enableDynamicSizing={false}
        android_keyboardInputMode="adjustResize"
        onDismiss={() => setName('')}
        backdropComponent={renderBackdrop}
        handleComponent={() => null}
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <BottomSheetView>
          <BottomSheetHeader title="Tell us your card" />
          <View
            style={{
              paddingHorizontal: spacing[16],
              paddingBottom: insets.bottom + spacing[16],
              gap: spacing[16],
            }}
          >
            <Input
              label="Card name"
              placeholder="Card name"
              value={name}
              onChangeText={setName}
              maxLength={CARD_NAME_MAX}
              autoFocus
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <Button label="Send" size={CTA_H} fullWidth disabled={!trimmed} onPress={send} />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

export function BeatMyCardPickScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const { league, isLoading, isOffline, isError, refetch } = useCardSavings(PROBE_SPENDS, { keepForSession: true });
  const requestRef = useRef<CardRequestSheetHandle>(null);

  const [query, setQuery] = useState('');
  const [bank, setBank] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // A fresh entry (from Home) starts the spends page from the saved spends, not from an old draft.
  useEffect(() => {
    resetBeatSpendsDraft();
    analytics.track(Events.TOOL_START, { tool: 'beat' });
  }, []);

  // Acceptance 2: in a debug build, the list count is logged to check it against the calculate row count.
  useEffect(() => {
    if (__DEV__ && league.length > 0) console.log(`[beat] picker cards: ${league.length}`);
  }, [league.length]);

  useEffect(() => {
    if (!showToast) return;
    const id = setTimeout(() => setShowToast(false), TOAST_MS);
    return () => clearTimeout(id);
  }, [showToast]);

  // Bank chips A to Z (spec 3.1). pickBanks gives the names; the order is set here.
  const banks = useMemo(() => pickBanks(league).sort((a, b) => a.bank.localeCompare(b.bank)), [league]);
  // A to Z by name, not rank order: the rank order would show the winner before the result does.
  const byName = useMemo(
    () => [...league].sort((x, y) => pickName(x).localeCompare(pickName(y))),
    [league],
  );
  const shown = useMemo(() => filterPickRows(byName, bank, query), [byName, bank, query]);
  const pickedRow = useMemo(() => league.find((r) => r.savings.alias === picked), [league, picked]);

  const onPick = useCallback((alias: string) => {
    haptics.impact('light');
    // Close the search keyboard so the "Use this card" button under it shows.
    Keyboard.dismiss();
    setPicked(alias);
  }, []);

  // Stable, so the memoized PickRow re-renders only when its own `selected` changes (audit NAV-05).
  const renderItem = useCallback(
    ({ item }: { item: LeagueRow }) => (
      <PickRow row={item} selected={item.savings.alias === picked} onPress={onPick} />
    ),
    [picked, onPick],
  );

  // Typing resets the bank chip to "All" (spec 3.1).
  const onSearch = (text: string) => {
    setQuery(text);
    setBank(null);
  };

  const onUse = () => {
    if (!pickedRow) return;
    haptics.impact('light');
    analytics.track(Events.BEAT_CARD_PICK, { bank: pickedRow.savings.bankName?.trim() ?? '' });
    navigation.navigate('BeatMyCardSpends', { cardAlias: pickedRow.savings.alias });
  };

  const onRequest = (name: string) => {
    analytics.track(Events.BEAT_CARD_REQUEST, { card_name: name });
    setShowToast(true);
  };

  const shell = (body: React.ReactNode, footer?: React.ReactNode) => (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Beat my card" onLeadingPress={() => navigation.goBack()} />
      {body}
      {footer}
      {showToast ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + spacing[96],
            alignItems: 'center',
            paddingHorizontal: spacing[16],
          }}
        >
          <Toast tone="success" icon="check-circle-filled" message="Thanks. We got your card name." />
        </View>
      ) : null}
      <CardRequestSheet ref={requestRef} onSend={onRequest} />
    </SafeAreaView>
  );

  if (isLoading) {
    return shell(
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[16], gap: spacing[12] }}>
        <Text variant="body14Regular" color={colors.text.secondary}>
          Loading all cards. This can take up to a minute.
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
      style={{ flex: 1 }}
      data={shown}
      extraData={picked}
      keyExtractor={(r) => r.savings.alias}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: spacing[12], paddingBottom: spacing[12] }}>
          <Text variant="heading18SemiBold" color={colors.text.primary}>
            Which card do you have?
          </Text>
          <Input
            size="sm"
            label="Search cards"
            placeholder="Search by card name"
            leadingIcon="search-outline"
            value={query}
            onChangeText={onSearch}
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
      ItemSeparatorComponent={RowSeparator}
      renderItem={renderItem}
      // 219 rows with remote card art: mount a small window (audit NAV-05).
      initialNumToRender={10}
      windowSize={7}
      contentContainerStyle={{
        paddingHorizontal: spacing[16],
        paddingTop: spacing[8],
        paddingBottom: spacing[24],
      }}
    />,
    <View
      style={{
        paddingHorizontal: spacing[16],
        paddingTop: spacing[12],
        paddingBottom: insets.bottom + spacing[12],
        borderTopWidth: borderWidth.thin,
        borderTopColor: colors.border.subtle3,
        backgroundColor: colors.surface.default,
        gap: spacing[12],
      }}
    >
      <Pressable
        onPress={() => requestRef.current?.present()}
        accessibilityRole="button"
        accessibilityLabel="Can't find your card? Tell us"
        hitSlop={spacing[8]}
        style={{ alignSelf: 'center' }}
      >
        <Text variant="body14Regular" color={colors.text.secondary} align="center">
          {"Can't find your card? "}
          <Text variant="body14SemiBold" color={colors.text.link}>
            Tell us
          </Text>
        </Text>
      </Pressable>
      {pickedRow ? (
        <Button label="Use this card" variant="solid" tone="main" size={CTA_H} fullWidth onPress={onUse} />
      ) : null}
    </View>,
  );
}
