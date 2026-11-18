/**
 * AdvisorScreen: "Find my card" as a chat with Swipey, the card advisor mascot.
 *
 * The advisor's questions and cards sit on the left; the user's answers sit on the right. A tap
 * on an answer rewinds to that question. Replies are given in the tray pinned at the bottom.
 *
 * All logic is in useAdvisor and src/lib/advisor. This file only lays the transcript out.
 * "Likely to qualify" appears only when the eligibility result says so (proof === 'likely').
 *
 * Motion: new advisor messages fade and rise in one after another (iOS only, reduce motion off,
 * ids never shown before). Only one animated mascot is mounted at a time: a large intro mascot
 * before the first answer, then the small one in the header.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Platform, Pressable } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Skeleton } from '../../atoms';
import { InlineMessage } from '../../molecules';
import type { CardModel } from '../../molecules';
import { ScreenState } from '../../organisms';
import { CreditCardAdvisorAvatar } from '../../organisms/CreditCardAdvisorAvatar';
import { colors, spacing } from '../../tokens';
import { useCardDetailSheet } from '../../lib/useCardDetailSheet';
import { useKeyboardPadding } from '../../lib/useKeyboardInset';
import { useReduceMotion } from '../../lib/useReduceMotion';
import type { ClickOutSource } from '../../lib/useClickOut';
import { analytics, Events } from '../../analytics';
import type { ProofLevel } from '../../lib/advisor/types';
import type { ChatMessage } from '../../lib/advisor/chatTypes';
import { useAdvisor } from './useAdvisor';
import { AdvisorChatHeader } from './AdvisorChatHeader';
import { AdvisorBubble, AdvisorEarlierLine, UserAnswerBubble } from './AdvisorChatBubble';
import { AdvisorRevealBlock } from './AdvisorRevealBlock';
import { AdvisorReplyTray } from './AdvisorReplyTray';
import { AdvisorTypingDots } from './AdvisorTypingDots';
import { AdvisorMessageEntrance } from './AdvisorMessageEntrance';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Advisor'>;
type Rt = RouteProp<RootStackParamList, 'Advisor'>;

const SOURCE: ClickOutSource = 'advisor';
/** Entrances run on iOS only (see src/organisms/StaggeredEntrance.tsx). */
const CAN_ANIMATE_PLATFORM = Platform.OS === 'ios';
/** ms between advisor messages that arrive together. No motion token holds a stagger step. */
const STAGGER_MS = 90;
/** The intro mascot before the first answer (the brief asks for about 120 dp). */
const INTRO_AVATAR_SIZE = spacing[128];
/** After a new message appears, every size change of the transcript within this window scrolls
 *  to the end, so a row that lays out late, or a tile entrance, cannot leave the end below the fold.
 *  Covers a few staggered entrances plus motion.duration.slow. A drag by the user ends it at once. */
const FOLLOW_MS = 1500;
/** Skeleton bubble widths while the catalogue loads. */
const SKELETON_BUBBLES = ['64%', '80%', '48%'] as const;

const CHECKING_TEXT = 'Checking which cards fit your income and pincode.';

function isUser(m: ChatMessage | undefined): boolean {
  return m?.kind === 'user-answer';
}

function SkeletonTranscript() {
  return (
    <View style={{ padding: spacing[16], gap: spacing[8] }} accessibilityLabel="Loading" accessible>
      {SKELETON_BUBBLES.map((w) => (
        <Skeleton key={w} width={w} height={spacing[40]} radius="xl" />
      ))}
    </View>
  );
}

export function AdvisorScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const advisor = useAdvisor(params?.source);
  const { openCard, sheets } = useCardDetailSheet(SOURCE);
  const keyboardPadding = useKeyboardPadding();
  const reduceMotion = useReduceMotion();
  const canAnimate = CAN_ANIMATE_PLATFORM && !reduceMotion;

  const { messages, step, reveal, state, arrivingId, markArrivalDone } = advisor;
  const stepNumber = step?.stepNumber ?? 0;
  const listVisible = !advisor.isLoading && !advisor.isError && advisor.hasCards;
  const hasAnswered = !!state.answers.opener;
  const showIntro = listVisible && !hasAnswered;

  // ---- The full card list ("See all") ----
  const [showAll, setShowAll] = useState(false);
  // The list closes when an answer changes.
  const answersKey = JSON.stringify(state.answers);
  useEffect(() => {
    setShowAll(false);
  }, [answersKey]);

  const extraCards = useMemo(() => {
    if (!reveal) return [];
    const inTop = new Set(reveal.top.map((t) => t.card.id));
    return reveal.all.filter((c) => !inTop.has(c.id));
  }, [reveal]);

  // The detail sheet swipes through these. A "Worth a look" card is in `top` but
  // not in `all`, so the list is the top cards first, then the rest.
  const pagerCards = useMemo(
    () => (reveal ? [...reveal.top.map((t) => t.card), ...extraCards] : []),
    [reveal, extraCards],
  );

  // The "same cards" note can stand in the chat as its own line AND sit on the current reveal.
  // Show it once: as the line.
  const revealNote = useMemo(() => {
    const note = reveal?.note;
    if (!note) return undefined;
    return messages.some((m) => m.kind === 'agent-text' && m.text === note) ? undefined : note;
  }, [reveal, messages]);

  // ---- Entrances ----
  // Ids already on screen never animate again. Read in render, marked after commit.
  // The user's own bubble appears at once.
  const shownIds = useRef<Set<string>>(new Set());
  const entranceDelay = useMemo(() => {
    const plan = new Map<string, number>();
    if (!listVisible) return plan;
    let n = 0;
    for (const m of messages) {
      if (shownIds.current.has(m.id) || m.kind === 'user-answer') continue;
      plan.set(m.id, n * STAGGER_MS);
      n += 1;
    }
    return plan;
  }, [messages, listVisible]);
  useEffect(() => {
    if (!listVisible) return;
    // Rebuilt from the current messages: an id that left (a rewind, "Start over") and comes back
    // later arrives as new and animates again.
    shownIds.current = new Set(messages.map((m) => m.id));
  }, [messages, listVisible]);

  // The mascot "speaks" while the newest advisor message arrives. When that message will not
  // animate (Android, reduce motion, already shown), the arrival ends at once.
  useEffect(() => {
    if (arrivingId && !(canAnimate && entranceDelay.has(arrivingId))) markArrivalDone(arrivingId);
  }, [arrivingId, canAnimate, entranceDelay, markArrivalDone]);

  // ---- Auto-scroll ----
  // Why a window, not a one-shot flag: the first size change after an answer can come before all
  // new rows are laid out (the intro mascot leaves in the same commit, and the old FlatList
  // rendered new rows in a later batch). A one-shot flag was used up on that first, partial
  // change, and the question stayed below the fold. Now every size change inside FOLLOW_MS of a
  // new id scrolls to the end, and the transcript is a plain ScrollView, so all rows mount in
  // the same pass. "New" is any id not on screen yet: when the check ends, the status line goes
  // and the cards arrive, so the count can stay the same. Runs before shownIds is rebuilt.
  const scrollRef = useRef<ScrollView>(null);
  const followUntil = useRef(0);
  useLayoutEffect(() => {
    if (!listVisible) return;
    if (messages.some((m) => !shownIds.current.has(m.id))) followUntil.current = Date.now() + FOLLOW_MS;
  }, [messages, listVisible]);
  const followEnd = useCallback(() => {
    if (Date.now() < followUntil.current) scrollRef.current?.scrollToEnd({ animated: true });
  }, []);
  const stopFollowing = useCallback(() => {
    followUntil.current = 0;
  }, []);
  // The transcript's own height changes when the tray changes (a new question, more chips) or the
  // keyboard opens for the pincode: keep the end in view. Not animated, so it tracks the keyboard.
  const listHeight = useRef(0);
  const onListLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (listHeight.current > 0 && h !== listHeight.current) scrollRef.current?.scrollToEnd({ animated: false });
    listHeight.current = h;
  }, []);
  const onEntranceDone = useCallback(
    (id: string) => {
      markArrivalDone(id);
      followEnd();
    },
    [markArrivalDone, followEnd],
  );

  // ---- Actions ----
  const goBack = () => {
    analytics.track(Events.ADVISOR_EXIT, { destination: 'back', step: stepNumber });
    navigation.goBack();
  };

  const openDemo = __DEV__ ? () => navigation.navigate('AdvisorAvatarDemo') : undefined;

  const openRow = (card: CardModel, slot: number, proof: ProofLevel) => {
    if (!reveal) return;
    analytics.track(Events.ADVISOR_CARD_TAP, { item_id: card.id, slot, proof });
    analytics.track(Events.ADVISOR_EXIT, { destination: 'card', step: stepNumber });
    openCard(card, pagerCards, pagerCards);
  };

  const haveThis = (card: CardModel) => {
    // No card id: a card the user owns never goes to analytics (same rule as the card tools).
    analytics.track(Events.ADVISOR_CARD_ACTION, { action: 'have_this' });
    advisor.markHeld(card.id);
  };

  const toggleAll = () => {
    if (!showAll) analytics.track(Events.ADVISOR_EXIT, { destination: 'list', step: stepNumber });
    setShowAll((v) => !v);
  };

  // ---- Messages ----
  const renderMessage = (m: ChatMessage): React.ReactNode => {
    switch (m.kind) {
      case 'agent-text':
        return (
          <AdvisorBubble accessibilityLabel={`Swipey: ${m.text}`}>
            <Text variant="body14Regular" color={colors.text.primary}>
              {m.text}
            </Text>
          </AdvisorBubble>
        );
      case 'agent-question':
        return (
          <AdvisorBubble accessibilityLabel={`Swipey: ${m.why} ${m.ask}`}>
            <Text variant="body12Regular" color={colors.text.secondary}>
              {m.why}
            </Text>
            <Text variant="body15SemiBold" color={m.current ? colors.text.primary : colors.text.secondary}>
              {m.ask}
            </Text>
          </AdvisorBubble>
        );
      case 'user-answer':
        return <UserAnswerBubble text={m.text} onPress={() => advisor.rewind(m.questionId)} />;
      case 'agent-reveal':
        return m.reveal ? (
          <AdvisorRevealBlock
            header={m.header}
            note={revealNote}
            reveal={m.reveal}
            extraCards={extraCards}
            showAll={showAll}
            onToggleAll={toggleAll}
            onOpen={openRow}
            onHaveThis={haveThis}
            animateTiles={canAnimate && entranceDelay.has(m.id)}
            tileDelay={(entranceDelay.get(m.id) ?? 0) + STAGGER_MS}
            tileStagger={STAGGER_MS}
          />
        ) : (
          <AdvisorEarlierLine header={m.header} />
        );
      case 'agent-status':
        return m.status === 'checking' ? (
          <AdvisorBubble accessibilityLabel={`Swipey: ${CHECKING_TEXT}`}>
            <AdvisorTypingDots />
            <Text variant="body14Regular" color={colors.text.primary}>
              {CHECKING_TEXT}
            </Text>
          </AdvisorBubble>
        ) : (
          <InlineMessage
            tone="warning"
            message="Couldn't check right now."
            action="single"
            primaryActionLabel="Try again"
            onPrimaryAction={advisor.retryEligibility}
          />
        );
      default: {
        const unknown: never = m;
        return unknown;
      }
    }
  };

  const renderRow = (item: ChatMessage, index: number) => {
    const prev = index > 0 ? messages[index - 1] : undefined;
    // Same speaker: 8 dp. A new speaker: 16 dp.
    const marginTop = !prev ? 0 : isUser(prev) === isUser(item) ? spacing[8] : spacing[16];
    const delay = entranceDelay.get(item.id);
    return (
      <View key={item.id} style={{ marginTop }}>
        <AdvisorMessageEntrance
          id={item.id}
          animate={canAnimate && delay !== undefined}
          delay={delay ?? 0}
          onDone={onEntranceDone}
        >
          {renderMessage(item)}
        </AdvisorMessageEntrance>
      </View>
    );
  };

  const intro = showIntro ? (
    <View style={{ alignItems: 'center', paddingTop: spacing[8], paddingBottom: spacing[16] }}>
      {openDemo ? (
        <Pressable onLongPress={openDemo} accessible={false}>
          <CreditCardAdvisorAvatar state={advisor.avatarState} size={INTRO_AVATAR_SIZE} />
        </Pressable>
      ) : (
        <CreditCardAdvisorAvatar state={advisor.avatarState} size={INTRO_AVATAR_SIZE} />
      )}
    </View>
  ) : null;

  const headerStatus = advisor.isCheckingEligibility
    ? 'Checking your cards'
    : advisor.eligibilityError
      ? "Couldn't check right now"
      : 'Card advisor';

  let body: React.ReactNode;
  if (advisor.isLoading) {
    body = <SkeletonTranscript />;
  } else if (advisor.isError) {
    body = (
      <ScreenState
        title="Couldn't load cards"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => advisor.refetch()}
      />
    );
  } else if (!advisor.hasCards) {
    body = <ScreenState title="No cards are available right now" body="Please check back a little later." />;
  } else {
    body = (
      <Animated.View style={[{ flex: 1 }, keyboardPadding]}>
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={followEnd}
          onLayout={onListLayout}
          onScrollBeginDrag={stopFollowing}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing[16], paddingBottom: spacing[24] }}
        >
          {intro}
          {messages.map(renderRow)}
        </ScrollView>
        <AdvisorReplyTray
          step={step}
          usingSaved={advisor.usingSaved}
          onAnswer={advisor.answer}
          onRestart={advisor.restart}
          onChangeSaved={advisor.changeSavedDetails}
        />
      </Animated.View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <AdvisorChatHeader
        showAvatar={!advisor.isLoading && !showIntro}
        avatarState={advisor.avatarState}
        status={headerStatus}
        onBack={goBack}
        onAvatarLongPress={openDemo}
      />
      <View style={{ flex: 1, backgroundColor: colors.background.muted }}>{body}</View>
      {sheets}
    </SafeAreaView>
  );
}
