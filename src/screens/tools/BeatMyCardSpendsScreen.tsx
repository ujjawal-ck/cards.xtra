/**
 * BeatMyCardSpendsScreen: "Beat my card", step 2: one spends page for the picked card.
 *
 * Under the header: the picked card (image + name, from the cached probe list) and "Change" (back to
 * the pick screen). Then one legend line (dot + "Your card earns here") and the 10 category chips: the
 * categories the card rewards first, each with the Chip dot, then the rest. Each selected chip adds a group with one compact SpendCard
 * per question (typed entry on, hint under it). Values start at the saved answer or 0.
 * Selected on entry: the categories with a saved spend above 0; none when nothing is saved.
 *
 * A deselected group's values stay in memory but are not sent. A group with a value folds to one line
 * under its group heading ("₹12,000 a month", Edit) when the user changes a value in a different group; a tap opens it.
 * "See result" sends only the selected groups' keys (others 0), saves only those (merge: hidden groups'
 * saved answers stay), and opens the result.
 *
 * The body is ONE FlatList (chips in the header), so only the rulers near the screen are mounted.
 * The selection and the edits live in a module draft too, so "Change" (back to the pick screen) and
 * back from the result keep them (spec edge 7). The pick screen resets the draft when it opens.
 *
 * Analytics: TOOL_QUIZ_COMPLETE (counts only). Never a spend amount, card name or card id.
 * Design system gap: Chip takes no accessibility label, so a screen reader does not say which chips
 * have the "Your card earns here" dot. Not run on a device: check the ruler drag against the page scroll on
 * Android, 14 rulers on one page, and the fold while a finger is on a ruler.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Button, Chip, RemoteImage } from '../../atoms';
import { SpendCard } from '../../molecules';
import { Header, CARD_THUMB_ASPECT } from '../../organisms';
import { colors, spacing, radius, borderWidth } from '../../tokens';
import { useCardSavings } from '../../query/useCardSavings';
import type { LeagueRow } from '../../query/useCardSavings';
import { useCardTags } from '../../query/useCardTags';
import { useSavedSpends } from '../../lib/savedSpends';
import { SPEND_QUESTIONS, buildSpends, questionsForCategory } from '../../lib/cardTools';
import type { SpendKey, SpendQuestion, ToolCategory, ToolCategoryId } from '../../lib/cardTools';
import {
  PROBE_SPENDS,
  answeredCategories,
  answersToSend,
  canSeeResult,
  categoryCountText,
  defaultSelection,
  groupSummary,
  orderChips,
  toggleCategory,
} from '../../lib/beatFlow';
import type { Answers } from '../../lib/beatFlow';
import { pickName } from '../../lib/beatView';
import { haptics } from '../../lib/haptics';
import { analytics, Events } from '../../analytics';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BeatMyCardSpends'>;
type Rt = RouteProp<RootStackParamList, 'BeatMyCardSpends'>;

const CTA_H = 52;
const STRIP_ART_W = spacing[48];

/** The page draft, kept while the user moves between pick, spends and result. null selection = not set yet. */
let draft: { selected: ToolCategoryId[] | null; edits: Answers } = { selected: null, edits: {} };

/** Called by the pick screen when it opens: a fresh entry starts from the saved spends. */
export function resetBeatSpendsDraft() {
  draft = { selected: null, edits: {} };
}

type Item =
  | { type: 'group'; id: string; category: ToolCategory }
  | { type: 'question'; id: string; question: SpendQuestion }
  | { type: 'folded'; id: string; category: ToolCategory; summary: string };

const groupOf = (key: SpendKey): ToolCategoryId | undefined => SPEND_QUESTIONS.find((q) => q.key === key)?.group;

function artSource(row: LeagueRow) {
  return row.card ? row.card.cardImage : row.savings.imageUrl ? { uri: row.savings.imageUrl } : {};
}

const QuestionRow = React.memo(function QuestionRow({
  question: q,
  value,
  onChange,
}: {
  question: SpendQuestion;
  value: number;
  onChange: (key: SpendKey, value: number) => void;
}) {
  return (
    <View style={{ gap: spacing[6], paddingBottom: spacing[12] }}>
      <SpendCard
        name={q.label}
        unit={q.unit === 'visits' ? 'count' : 'rupees'}
        period={`per ${q.period}`}
        value={value}
        onChange={(v) => onChange(q.key, v)}
        min={q.min}
        max={q.rulerMax}
        step={q.step}
        typedEntry
        typedMax={q.max}
      />
      {q.hint ? (
        <Text variant="body12Regular" color={colors.text.tertiary}>
          {`For example: ${q.hint}`}
        </Text>
      ) : null}
    </View>
  );
});

export function BeatMyCardSpendsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { cardAlias } = params;
  const insets = useSafeAreaInsets();
  const saved = useSavedSpends();

  // The probe list is cached by the pick screen: no new call here.
  const { league } = useCardSavings(PROBE_SPENDS, { keepForSession: true });
  const row = useMemo(() => league.find((r) => r.savings.alias === cardAlias), [league, cardAlias]);
  const { tagsFor } = useCardTags();
  const rewarded = useMemo(() => {
    if (!row) return [];
    const id = row.savings.id ? Number(row.savings.id) : undefined;
    return tagsFor(row.savings.alias, id !== undefined && Number.isFinite(id) ? id : undefined);
  }, [row, tagsFor]);
  const chips = useMemo(() => orderChips(rewarded), [rewarded]);

  const [selectedState, setSelectedState] = useState<ToolCategoryId[] | null>(draft.selected);
  const [edits, setEdits] = useState<Answers>(draft.edits);
  const [folded, setFolded] = useState<ToolCategoryId[]>([]);

  // Selected on entry: the saved categories, once the saved spends are read. Only when not set yet.
  useEffect(() => {
    if (selectedState === null && saved.loaded) setSelectedState(defaultSelection(saved.answers));
  }, [selectedState, saved.loaded, saved.answers]);

  useEffect(() => {
    draft = { selected: selectedState, edits };
  }, [selectedState, edits]);

  const selected = useMemo(() => selectedState ?? [], [selectedState]);
  const answers = useMemo<Answers>(() => ({ ...saved.answers, ...edits }), [saved.answers, edits]);

  // Latest values for the stable change handler below.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const onChange = useCallback((key: SpendKey, value: number) => {
    // A card that mounts or unmounts can report its own value again: that is not a change.
    if ((answersRef.current[key] ?? 0) === value) return;
    const next = { ...answersRef.current, [key]: value };
    const group = groupOf(key);
    setEdits((e) => ({ ...e, [key]: value }));
    // Fold every other selected group that has a value; the group being edited stays open.
    setFolded((f) => {
      const out = new Set(f.filter((id) => id !== group));
      for (const id of selectedRef.current) {
        if (id !== group && groupSummary(id, next) !== '') out.add(id);
      }
      const list = [...out];
      return list.length === f.length && list.every((id) => f.includes(id)) ? f : list;
    });
  }, []);

  const onToggle = (id: ToolCategoryId) => {
    haptics.impact('light');
    setSelectedState((s) => toggleCategory(s ?? [], id));
    // A newly selected group starts open.
    setFolded((f) => (f.includes(id) ? f.filter((x) => x !== id) : f));
  };

  const unfold = (id: ToolCategoryId) => setFolded((f) => f.filter((x) => x !== id));

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const c of chips) {
      if (!selected.includes(c.id)) continue;
      out.push({ type: 'group', id: `g:${c.id}`, category: c });
      const summary = groupSummary(c.id, answers);
      if (folded.includes(c.id) && summary !== '') {
        out.push({ type: 'folded', id: `f:${c.id}`, category: c, summary });
      } else {
        for (const q of questionsForCategory(c.id)) out.push({ type: 'question', id: `q:${q.key}`, question: q });
      }
    }
    return out;
  }, [chips, selected, folded, answers]);

  const can = canSeeResult(selected, answers);
  const countText = categoryCountText(selected, answers);

  const onSee = () => {
    if (!can) return;
    haptics.impact('light');
    const sent = answersToSend(selected, answers);
    const categories = answeredCategories(selected, answers);
    // Merge: saved answers of hidden groups stay.
    saved.save(sent);
    // The sent keys are saved now; drop their local copies so a later edit on the result shows here.
    setEdits((e) => {
      const rest: Answers = { ...e };
      for (const k of Object.keys(sent) as SpendKey[]) delete rest[k];
      return rest;
    });
    analytics.track(Events.TOOL_QUIZ_COMPLETE, {
      tool: 'beat',
      answered: Object.values(sent).filter((v) => (v ?? 0) > 0).length,
      extended: false,
      categories: categories.length,
    });
    navigation.navigate('BeatMyCardResult', {
      cardAlias,
      spends: buildSpends(sent),
      answers: sent,
      categories,
    });
  };

  const renderItem = ({ item }: { item: Item }) => {
    if (item.type === 'group') {
      return (
        <Text
          variant="body14SemiBold"
          color={colors.text.secondary}
          accessibilityRole="header"
          style={{ paddingTop: spacing[8], paddingBottom: spacing[8] }}
        >
          {item.category.label}
        </Text>
      );
    }
    if (item.type === 'folded') {
      const id = item.category.id;
      return (
        <Pressable
          onPress={() => unfold(id)}
          accessibilityRole="button"
          accessibilityLabel={`${item.category.label}, ${item.summary}. Edit`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[12],
            padding: spacing[16],
            marginBottom: spacing[12],
            borderRadius: radius.xl,
            borderWidth: borderWidth.thin,
            borderColor: colors.border.subtle2,
            backgroundColor: pressed ? colors.surface.sunken2 : colors.surface.default,
          })}
        >
          <Text variant="body14Regular" color={colors.text.primary} numberOfLines={2} style={{ flex: 1 }}>
            {item.summary}
          </Text>
          <Text variant="body14SemiBold" color={colors.text.link}>
            Edit
          </Text>
        </Pressable>
      );
    }
    return (
      <QuestionRow question={item.question} value={answers[item.question.key] ?? 0} onChange={onChange} />
    );
  };

  const header = (
    <View style={{ gap: spacing[12], paddingBottom: spacing[16] }}>
      {/* Not while the saved spends are still read: a returning user would see it flash. */}
      {selectedState !== null && selected.length === 0 ? (
        <Text variant="heading18SemiBold" color={colors.text.primary}>
          Pick where you spend
        </Text>
      ) : null}
      {/* One legend line for the dot on the chips of the categories the card rewards. */}
      {rewarded.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[6] }}>
          <View
            style={{
              width: spacing[6],
              height: spacing[6],
              borderRadius: spacing[6] / 2,
              backgroundColor: colors.action.accent.default,
            }}
          />
          <Text variant="body12Regular" color={colors.text.secondary}>
            Your card earns here
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
        {chips.map((c) => {
          const on = selected.includes(c.id);
          const earns = rewarded.includes(c.id);
          return (
            <Chip
              key={c.id}
              label={c.label}
              size={32}
              dot={earns}
              state={on ? 'selected' : 'default'}
              onPress={() => onToggle(c.id)}
            />
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Your spends" onLeadingPress={() => navigation.goBack()} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[8],
          borderBottomWidth: borderWidth.thin,
          borderBottomColor: colors.border.subtle3,
        }}
      >
        {row ? (
          <RemoteImage
            source={artSource(row)}
            style={{
              width: STRIP_ART_W,
              aspectRatio: CARD_THUMB_ASPECT,
              borderRadius: radius.sm,
              backgroundColor: colors.surface.sunken,
            }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <Text variant="body14SemiBold" color={colors.text.primary} numberOfLines={2} style={{ flex: 1 }}>
          {row ? pickName(row) : ''}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Change card"
          hitSlop={spacing[8]}
        >
          <Text variant="body14SemiBold" color={colors.text.link}>
            Change
          </Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          style={{ flex: 1 }}
          data={items}
          extraData={answers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          windowSize={5}
          contentContainerStyle={{ padding: spacing[16] }}
        />
        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingTop: spacing[12],
            paddingBottom: insets.bottom + spacing[12],
            borderTopWidth: borderWidth.thin,
            borderTopColor: colors.border.subtle3,
            backgroundColor: colors.surface.default,
            gap: spacing[8],
          }}
        >
          {countText ? (
            <Text variant="body12Regular" color={colors.text.secondary} align="center">
              {countText}
            </Text>
          ) : null}
          <Button label="See result" variant="solid" tone="main" size={CTA_H} fullWidth disabled={!can} onPress={onSee} />
          {!can ? (
            <Text variant="body12Regular" color={colors.text.tertiary} align="center">
              Enter at least one spend
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
