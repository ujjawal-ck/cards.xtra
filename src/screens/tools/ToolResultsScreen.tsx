/**
 * ToolResultsScreen: the league table, one screen for all four card tools.
 *
 * Every card BankKaro returns for the spends, in one FlatList (219 on UAT),
 * also cards the app does not list (no Apply, no card page for those).
 * Reads its result from useCardSavings(spends); only spends and answers arrive
 * through navigation.
 *
 * Top (fixed): Header, the pill "Annual spends: ₹X a year" (opens
 * EditSpendsSheet; the list reloads in place), find-in-list search with
 * "1 of 3" and next / previous, toggles "Lifetime free" and "Include invite
 * only", "Find my card" (beat tool), tabs "Quick view" / "By category", and
 * "Sort by". Rank numbers are positions in the current view.
 * Row press opens SavingsBreakdownSheet. Apply sits in that sheet, after the
 * explanation (APPLY_ON_ROWS false). Apply and the card page go through
 * useCardDetailSheet, so Apply goes through useClickOut. The user's own card
 * (highlightAlias) never gets Apply.
 * Edits are saved to the device (useSavedSpends, merged) for every tool except
 * brands. Analytics: no spend amount is sent.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Skeleton, Chip, Switch, Icon, Input } from '../../atoms';
import { LeagueCardRow, TabsSecondary } from '../../molecules';
import {
  Header,
  ScreenState,
  EditSpendsSheet,
  SavingsBreakdownSheet,
  type EditSpendsSheetHandle,
  type SavingsBreakdownSheetHandle,
} from '../../organisms';
import { colors, spacing, radius, borderWidth, iconSize, opacity } from '../../tokens';
import { useCardSavings, type LeagueRow } from '../../query/useCardSavings';
import {
  DEFAULT_LEAGUE_FILTERS,
  buildSpends,
  filterLeague,
  hasAnySpend,
  searchLeague,
  sortLeague,
  totalYearlySpend,
  type LeagueFilters,
  type SpendKey,
} from '../../lib/cardTools';
import {
  editKeys,
  indexOfAlias,
  leagueColumns,
  sortOptions,
  stepCursor,
  topByKey,
} from '../../lib/leagueView';
import { useSavedSpends } from '../../lib/savedSpends';
import { formatINR } from '../../lib/money';
import type { ClickOutSource } from '../../lib/useClickOut';
import { useCardDetailSheet } from '../../lib/useCardDetailSheet';
import { analytics, Events } from '../../analytics';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ToolResults'>;
type Rt = RouteProp<RootStackParamList, 'ToolResults'>;
type Answers = Partial<Record<SpendKey, number>>;

/** false: rows have no Apply; Apply is in the breakdown sheet, after the explanation. */
const APPLY_ON_ROWS = false;

const SOURCE: ClickOutSource = 'tool_results';
const SKELETON_ROWS = 4;
const TABS = [{ label: 'Quick view' }, { label: 'By category' }];
/** Scroll to a far row: how many times to jump and try again, and the wait between tries. */
const SCROLL_MAX_RETRIES = 40;
const SCROLL_RETRY_MS = 60;
/** Where a found row lands: a little below the top of the list. */
const SCROLL_VIEW_POSITION = 0.2;

function SkeletonRow() {
  return (
    <View
      style={{
        gap: spacing[8],
        padding: spacing[12],
        borderRadius: radius.lg,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle3,
        backgroundColor: colors.surface.default,
      }}
    >
      <View style={{ flexDirection: 'row', gap: spacing[8] }}>
        <Skeleton width={spacing[24]} height={spacing[24]} radius="sm" />
        <Skeleton width={spacing[64]} height={spacing[40]} radius="sm" />
        <View style={{ flex: 1, gap: spacing[8] }}>
          <Skeleton width="80%" height={spacing[16]} />
          <Skeleton width="40%" height={spacing[24]} />
        </View>
      </View>
      <Skeleton width="90%" height={spacing[12]} />
    </View>
  );
}

/** A filter toggle: Switch atom and label in one pressable chip. */
function FilterToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
        paddingVertical: spacing[6],
        paddingHorizontal: spacing[12],
        borderRadius: radius.sm,
        borderWidth: borderWidth.thin,
        borderColor: value ? colors.border.subtle2 : colors.border.default,
        backgroundColor: value ? colors.action.secondary.default : colors.surface.default,
      }}
    >
      <View pointerEvents="none">
        <Switch value={value} size="sm" />
      </View>
      <Text variant="body12Medium" color={colors.text.primary}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A small round icon button for the search bar. */
function IconButton({
  name,
  label,
  onPress,
  disabled = false,
  flip = false,
}: {
  name: 'chevron-down' | 'close';
  label: string;
  onPress: () => void;
  disabled?: boolean;
  flip?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={spacing[8]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{
        width: iconSize[32],
        height: iconSize[32],
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        backgroundColor: colors.action.secondary.default,
        opacity: disabled ? opacity[40] : opacity[100],
        transform: flip ? [{ rotate: '180deg' }] : undefined,
      }}
    >
      <Icon name={name} size={iconSize[16]} color={colors.text.link} />
    </Pressable>
  );
}

export function ToolResultsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { tool, title, subtitle, brandIds, highlightAlias } = params;
  const insets = useSafeAreaInsets();

  // Answers and spends start from the route and change after an edit.
  const [answers, setAnswers] = useState<Answers>(() => params.answers ?? {});
  const [spends, setSpends] = useState(() => params.spends);
  const { save } = useSavedSpends();

  const { league, isLoading, isOffline, isError, refetch, loadMs } = useCardSavings(spends);
  const { openCard, applyCard, sheets } = useCardDetailSheet(SOURCE);

  const [filters, setFilters] = useState<LeagueFilters>(DEFAULT_LEAGUE_FILTERS);
  const [tab, setTab] = useState(0);
  const [sortId, setSortId] = useState('net');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [presentedAlias, setPresentedAlias] = useState<string | undefined>(undefined);

  const listRef = useRef<FlatList<LeagueRow>>(null);
  const editRef = useRef<EditSpendsSheetHandle>(null);
  const breakdownRef = useRef<SavingsBreakdownSheetHandle>(null);

  const columns = useMemo(() => leagueColumns(tool, spends, brandIds), [tool, spends, brandIds]);
  const options = useMemo(() => sortOptions(columns), [columns]);
  // A key sort falls back to the default when an edit removes that key.
  const sortOption = options.find((o) => o.id === sortId) ?? options[0];
  const filtered = useMemo(() => filterLeague(league, filters), [league, filters]);
  const rows = useMemo(() => sortLeague(filtered, sortOption.sort), [filtered, sortOption]);
  const tops = useMemo(
    () => topByKey(rows.map((r) => r.savings), columns.map((c) => c.key)),
    [rows, columns],
  );
  const matches = useMemo(() => searchLeague(rows, query), [rows, query]);
  const matchCursor = matches.length > 0 ? Math.min(cursor, matches.length - 1) : 0;
  const hitIndex = matches.length > 0 ? matches[matchCursor] : -1;
  // Beat tool: the user's own card stays out of the pager, so its Apply is never one swipe away.
  const pagerCards = useMemo(
    () =>
      rows.flatMap((r) =>
        r.card && !(tool === 'beat' && highlightAlias && r.savings.alias === highlightAlias) ? [r.card] : [],
      ),
    [rows, tool, highlightAlias],
  );
  const yearlySpend = useMemo(() => totalYearlySpend(spends), [spends]);
  const keysForEdit = useMemo(() => editKeys(tool, answers), [tool, answers]);
  const myIndex = indexOfAlias(rows, highlightAlias);
  const myInLeague = indexOfAlias(league, highlightAlias) >= 0;
  const filtersOn =
    filters.lifetimeFreeOnly !== DEFAULT_LEAGUE_FILTERS.lifetimeFreeOnly ||
    filters.includeInviteOnly !== DEFAULT_LEAGUE_FILTERS.includeInviteOnly;

  // Latest rows for stable row callbacks (the analytics rank is the position in view).
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // Analytics, once each. The view fires only for a real result, never while offline.
  const viewTracked = useRef(false);
  const errorTracked = useRef(false);
  useEffect(() => {
    if (isError && !errorTracked.current) {
      errorTracked.current = true;
      analytics.track(Events.TOOL_RESULT_ERROR, { tool });
    }
  }, [isError, tool]);
  useEffect(() => {
    if (!isLoading && !isOffline && !isError && league.length > 0 && !viewTracked.current) {
      viewTracked.current = true;
      // loadMs is undefined when the result came from the cache: leave load_ms out.
      analytics.track(Events.TOOL_RESULT_VIEW, {
        tool,
        cards_shown: rows.length,
        ...(loadMs !== undefined ? { load_ms: loadMs } : {}),
      });
    }
  }, [isLoading, isOffline, isError, league.length, tool, rows.length, loadMs]);

  // ── Scrolling to a row ────────────────────────────────────────────────────
  const retries = useRef(0);
  const scrollTo = useCallback((index: number) => {
    if (index < 0) return;
    retries.current = 0;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: SCROLL_VIEW_POSITION });
  }, []);
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      // Rows have no fixed height, and the list has only drawn the rows near the screen. A jump
      // past the drawn rows stops at the last drawn row, so one try moves only one batch of rows.
      // Jump, let the next batch draw, and try again until the row is there. The limit covers a
      // list of a few hundred rows and still stops if the row never draws.
      listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
      if (retries.current >= SCROLL_MAX_RETRIES) return;
      retries.current += 1;
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: SCROLL_VIEW_POSITION });
      }, SCROLL_RETRY_MS);
    },
    [],
  );

  useEffect(() => {
    if (hitIndex >= 0) scrollTo(hitIndex);
  }, [hitIndex, scrollTo]);

  // "Find my card" when a filter hides it: clear the filters, then scroll once it is back.
  const pendingFind = useRef(false);
  useEffect(() => {
    if (pendingFind.current && myIndex >= 0) {
      pendingFind.current = false;
      scrollTo(myIndex);
    }
  }, [myIndex, scrollTo]);
  const findMine = useCallback(() => {
    if (myIndex >= 0) {
      scrollTo(myIndex);
    } else if (myInLeague) {
      pendingFind.current = true;
      setFilters(DEFAULT_LEAGUE_FILTERS);
    }
  }, [myIndex, myInLeague, scrollTo]);

  // ── Rows and sheets ───────────────────────────────────────────────────────
  const openRow = useCallback(
    (row: LeagueRow) => {
      const position = rowsRef.current.indexOf(row) + 1;
      analytics.track(Events.TOOL_RESULT_SELECT, {
        tool,
        item_id: row.card?.id ?? row.savings.alias,
        rank: position,
      });
      setPresentedAlias(row.savings.alias);
      breakdownRef.current?.present(row);
    },
    [tool],
  );

  const applyRow = useCallback(
    (row: LeagueRow) => {
      if (row.card) applyCard(row.card);
    },
    [applyCard],
  );

  const viewCard = useCallback(
    (card: NonNullable<LeagueRow['card']>) => openCard(card, pagerCards, pagerCards),
    [openCard, pagerCards],
  );

  const labelForKey = useCallback(
    (key: string) => (tool === 'brands' ? columns.find((c) => c.key === key)?.label : undefined),
    [tool, columns],
  );

  const onEditSubmit = useCallback(
    (next: Answers) => {
      setAnswers(next);
      setSpends(buildSpends(next));
      setCursor(0);
      // Brand runs are not saved to the profile.
      if (tool !== 'brands') save(next);
    },
    [tool, save],
  );

  const openEdit = useCallback(() => editRef.current?.present(), []);

  // Beat tool: after an edit, Back takes the new spends to the result screen.
  // `answers` is a new object only after an edit.
  const onBack = () => {
    if (tool === 'beat' && highlightAlias && answers !== params.answers) {
      navigation.popTo('BeatMyCardResult', { cardAlias: highlightAlias, spends, answers });
    } else {
      navigation.goBack();
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setCursor(0);
  };

  const view = tab === 0 ? 'quick' : 'category';
  const renderItem = useCallback(
    ({ item, index }: { item: LeagueRow; index: number }) => {
      const mine = !!highlightAlias && item.savings.alias === highlightAlias;
      return (
        <LeagueCardRow
          row={item}
          rank={index + 1}
          view={view}
          columns={columns}
          tops={tops}
          searchHit={index === hitIndex}
          mine={mine}
          onPress={openRow}
          onApply={APPLY_ON_ROWS && item.card && !mine ? applyRow : undefined}
        />
      );
    },
    [highlightAlias, view, columns, tops, hitIndex, openRow, applyRow],
  );

  // ── Top controls ──────────────────────────────────────────────────────────
  const spendPill = (
    <Pressable
      onPress={openEdit}
      accessibilityRole="button"
      accessibilityLabel={`Annual spends: ${formatINR(yearlySpend)} a year. Edit spends`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing[8],
        paddingVertical: spacing[6],
        paddingHorizontal: spacing[12],
        borderRadius: radius.full,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle2,
        backgroundColor: colors.background.lavender,
        opacity: pressed ? opacity[80] : opacity[100],
      })}
    >
      <Text variant="body14SemiBold" color={colors.text.link}>
        {`Annual spends: ${formatINR(yearlySpend)} a year`}
      </Text>
      <Icon name="edit-outline" size={iconSize[16]} color={colors.text.link} />
    </Pressable>
  );

  const searchRow = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
      <View style={{ flex: 1 }}>
        <Input
          size="sm"
          placeholder="Find a card or bank"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setCursor(0);
          }}
          leadingIcon="search-outline"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      {query.trim() ? (
        <Text variant="body12Medium" color={colors.text.secondary}>
          {matches.length > 0 ? `${matchCursor + 1} of ${matches.length}` : 'No match'}
        </Text>
      ) : null}
      <IconButton
        name="chevron-down"
        flip
        label="Previous match"
        disabled={matches.length < 2}
        onPress={() => setCursor((c) => stepCursor(Math.min(c, matches.length - 1), matches.length, -1))}
      />
      <IconButton
        name="chevron-down"
        label="Next match"
        disabled={matches.length < 2}
        onPress={() => setCursor((c) => stepCursor(Math.min(c, matches.length - 1), matches.length, 1))}
      />
      <IconButton name="close" label="Close search" onPress={closeSearch} />
    </View>
  );

  const filterRow = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[8], alignItems: 'center' }}>
      {/* First in the row: on the beat tool it is why the user opened the full list. */}
      {highlightAlias && myInLeague ? <Chip label="Find my card" size={32} onPress={findMine} /> : null}
      <Chip label="Search" leadingIcon="search-outline" size={32} onPress={() => setSearchOpen(true)} />
      <FilterToggle
        label="Lifetime free"
        value={filters.lifetimeFreeOnly}
        onChange={(v) => setFilters((f) => ({ ...f, lifetimeFreeOnly: v }))}
      />
      <FilterToggle
        label="Include invite only"
        value={filters.includeInviteOnly}
        onChange={(v) => setFilters((f) => ({ ...f, includeInviteOnly: v }))}
      />
    </ScrollView>
  );

  const sortRow = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
      <Text variant="body12Medium" color={colors.text.secondary}>
        Sort by
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[8] }}>
        {options.map((o) => (
          <Chip
            key={o.id}
            label={o.label}
            size={28}
            state={o.id === sortOption.id ? 'selected' : 'default'}
            onPress={() => {
              setSortId(o.id);
              setCursor(0);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );

  const controls = (
    <View
      style={{
        gap: spacing[12],
        paddingHorizontal: spacing[16],
        paddingTop: spacing[8],
        paddingBottom: spacing[12],
        borderBottomWidth: borderWidth.thin,
        borderBottomColor: colors.border.subtle3,
      }}
    >
      {spendPill}
      {subtitle ? (
        <Text variant="body12Regular" color={colors.text.secondary}>
          {subtitle}
        </Text>
      ) : null}
      {searchOpen ? searchRow : filterRow}
      <TabsSecondary segments={TABS} activeIndex={tab} onChange={setTab} />
      {sortRow}
    </View>
  );

  // ── Body ──────────────────────────────────────────────────────────────────
  let content: React.ReactNode;
  if (!hasAnySpend(spends)) {
    content = (
      <ScreenState
        title="Enter at least one spend"
        body="Every spend is 0 now, so there is nothing to compare."
        actionLabel="Edit spends"
        onAction={openEdit}
      />
    );
  } else if (isLoading) {
    content = (
      <View style={{ padding: spacing[16], gap: spacing[16] }}>
        <Text variant="body14Medium" color={colors.text.primary}>
          Checking every card against your spends. This can take up to a minute.
        </Text>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    );
  } else if (isOffline) {
    content = (
      <ScreenState
        title="You're offline"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  } else if (isError) {
    content = (
      <ScreenState
        title="Couldn't load your cards"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  } else if (league.length === 0) {
    content = (
      <ScreenState
        title="No cards came back for these spends"
        body="Change your spends or try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  } else if (rows.length === 0) {
    content = (
      <ScreenState
        title="No card matches these filters"
        actionLabel="Clear filters"
        onAction={() => setFilters(DEFAULT_LEAGUE_FILTERS)}
      />
    );
  } else {
    content = (
      <FlatList
        ref={listRef}
        data={rows}
        extraData={hitIndex}
        keyExtractor={(item) => item.savings.alias}
        renderItem={renderItem}
        ListHeaderComponent={
          <Text variant="body12Regular" color={colors.text.secondary} style={{ paddingBottom: spacing[12] }}>
            {`${rows.length} cards${filtersOn ? ' match your filters' : ''}. Savings are estimates for a year, after the annual fee. CashKaro Rewards are extra. Tap a card to see how it adds up.`}
          </Text>
        }
        ItemSeparatorComponent={Separator}
        onScrollToIndexFailed={onScrollToIndexFailed}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={11}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing[16], paddingBottom: insets.bottom + spacing[24] }}
      />
    );
  }

  const presentedIsMine = !!highlightAlias && presentedAlias === highlightAlias;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title={title} onLeadingPress={onBack} />
      {controls}
      <View style={{ flex: 1 }}>{content}</View>
      <EditSpendsSheet ref={editRef} keys={keysForEdit} answers={answers} onSubmit={onEditSubmit} />
      <SavingsBreakdownSheet
        ref={breakdownRef}
        yearlySpend={yearlySpend}
        labelForKey={labelForKey}
        onViewCard={viewCard}
        onApply={applyCard}
        hideApply={presentedIsMine}
      />
      {sheets}
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={{ height: spacing[12] }} />;
}
