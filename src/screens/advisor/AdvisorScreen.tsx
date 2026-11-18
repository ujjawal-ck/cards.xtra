/**
 * AdvisorScreen: "Find my card". One tap-to-answer question at a time; after the first answer
 * three cards show and update as the answers change.
 *
 * All logic is in useAdvisor and src/lib/advisor. This file only lays the state out.
 * "Likely to qualify" appears only when the eligibility result says so (proof === 'likely').
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Chip, Button, Input, Skeleton } from '../../atoms';
import { InlineMessage } from '../../molecules';
import { Header, ScreenState } from '../../organisms';
import { colors, spacing, radius, borderWidth } from '../../tokens';
import { useCardDetailSheet } from '../../lib/useCardDetailSheet';
import type { ClickOutSource } from '../../lib/useClickOut';
import { analytics, Events } from '../../analytics';
import { NOT_SURE } from '../../lib/advisor/types';
import type { ProofLevel } from '../../lib/advisor/types';
import type { CardModel } from '../../molecules';
import { useAdvisor } from './useAdvisor';
import { AdvisorCardRow } from './AdvisorCardRow';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Advisor'>;
type Rt = RouteProp<RootStackParamList, 'Advisor'>;

const SOURCE: ClickOutSource = 'advisor';
const SKELETON_ROWS = 3;
const PINCODE = /^[1-9]\d{5}$/;

function SkeletonRow() {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing[12],
        padding: spacing[12],
        borderRadius: radius.lg,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle3,
        backgroundColor: colors.surface.default,
      }}
    >
      <Skeleton width={spacing[64]} height={spacing[40]} radius="sm" />
      <View style={{ flex: 1, gap: spacing[8] }}>
        <Skeleton width="80%" height={spacing[16]} />
        <Skeleton width="60%" height={spacing[12]} />
        <Skeleton width="90%" height={spacing[12]} />
      </View>
    </View>
  );
}

function listReason(card: CardModel): string {
  return card.tileBenefits?.[0]?.title || card.cashback;
}

export function AdvisorScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const advisor = useAdvisor(params?.source);
  const { openCard, sheets } = useCardDetailSheet(SOURCE);

  const { step, reveal, pills, state } = advisor;
  const stepNumber = step?.stepNumber ?? 0;

  const [showAll, setShowAll] = useState(false);
  const [pin, setPin] = useState('');

  // The list closes when an answer changes.
  const answersKey = JSON.stringify(state.answers);
  useEffect(() => {
    setShowAll(false);
  }, [answersKey]);

  // A new pincode question starts empty.
  const questionId = step?.question.id;
  useEffect(() => {
    setPin('');
  }, [questionId]);

  const extraCards = useMemo(() => {
    if (!reveal) return [];
    const inTop = new Set(reveal.top.map((t) => t.card.id));
    return reveal.all.filter((c) => !inTop.has(c.id));
  }, [reveal]);

  const goBack = () => {
    analytics.track(Events.ADVISOR_EXIT, { destination: 'back', step: stepNumber });
    navigation.goBack();
  };

  const openRow = (card: CardModel, slot: number, proof: ProofLevel) => {
    if (!reveal) return;
    analytics.track(Events.ADVISOR_CARD_TAP, { item_id: card.id, slot, proof });
    analytics.track(Events.ADVISOR_EXIT, { destination: 'card', step: stepNumber });
    openCard(card, reveal.all, reveal.all);
  };

  const haveThis = (card: CardModel) => {
    analytics.track(Events.ADVISOR_CARD_ACTION, { item_id: card.id, action: 'have_this' });
    advisor.markHeld(card.id);
  };

  const toggleAll = () => {
    if (!showAll) analytics.track(Events.ADVISOR_EXIT, { destination: 'list', step: stepNumber });
    setShowAll((v) => !v);
  };

  let body: React.ReactNode;
  if (advisor.isLoading) {
    body = (
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    );
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
    const pinValid = PINCODE.test(pin);
    body = (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: spacing[16],
          gap: spacing[16],
          paddingBottom: insets.bottom + spacing[24],
        }}
      >
        {pills.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
            {pills.map((p) => (
              <Pressable
                key={p.questionId}
                onPress={() => advisor.reopen(p.questionId)}
                accessibilityRole="button"
                accessibilityLabel={`Change answer: ${p.label}`}
              >
                <View pointerEvents="none">
                  <Chip label={p.label} state="selected" />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {advisor.usingSaved ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[8] }}>
            <Text variant="body12Regular" color={colors.text.secondary}>
              Using your saved details.
            </Text>
            <Pressable
              onPress={advisor.changeSavedDetails}
              hitSlop={spacing[8]}
              accessibilityRole="button"
              accessibilityLabel="Change saved details"
            >
              <Text variant="body12SemiBold" color={colors.text.link}>
                Change
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={{
            gap: spacing[12],
            padding: spacing[16],
            borderRadius: radius.lg,
            borderWidth: borderWidth.thin,
            borderColor: colors.border.subtle3,
            backgroundColor: colors.surface.default,
          }}
        >
          {step ? (
            <>
              <View style={{ gap: spacing[4] }}>
                <Text variant="body12Regular" color={colors.text.secondary}>
                  {step.why}
                </Text>
                <Text variant="body16SemiBold" color={colors.text.primary}>
                  {step.ask}
                </Text>
              </View>
              {step.question.kind === 'choice' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
                  {step.options.map((o) => (
                    <Chip key={o.id} label={o.label} onPress={() => advisor.answer(step.question.id, o.id)} />
                  ))}
                  {step.question.notSure ? (
                    <Chip label="Not sure" onPress={() => advisor.answer(step.question.id, NOT_SURE)} />
                  ) : null}
                </View>
              ) : (
                <View style={{ gap: spacing[12] }}>
                  <Input
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="6-digit PIN code"
                    hint={pin.length === 6 && !pinValid ? 'Enter your 6-digit PIN code' : undefined}
                    state={pin.length === 6 && !pinValid ? 'error' : undefined}
                  />
                  <Button
                    label="Check cards"
                    variant="solid"
                    tone="main"
                    size={44}
                    fullWidth
                    disabled={!pinValid}
                    onPress={() => advisor.answer('pincode', pin)}
                  />
                </View>
              )}
            </>
          ) : (
            <>
              <Text variant="body14Regular" color={colors.text.primary}>
                {reveal?.proof === 'likely'
                  ? 'Apply for one card at a time. Each application is recorded on your credit report.'
                  : 'Take your time. Tap an answer above to change it.'}
              </Text>
              <Button label="Start over" variant="outline" tone="second" size={44} onPress={advisor.restart} />
            </>
          )}
        </View>

        {advisor.isCheckingEligibility ? (
          <Text variant="body12Regular" color={colors.text.secondary}>
            Checking which cards fit your income and pincode.
          </Text>
        ) : null}
        {advisor.eligibilityError ? (
          <InlineMessage
            tone="warning"
            message="Couldn't check right now."
            action="single"
            primaryActionLabel="Try again"
            onPrimaryAction={advisor.retryEligibility}
          />
        ) : null}

        {reveal ? (
          <View style={{ gap: spacing[12] }}>
            <View style={{ gap: spacing[4] }}>
              <Text variant="body16SemiBold" color={colors.text.primary}>
                {reveal.header}
              </Text>
              {reveal.note ? (
                <Text variant="body12Regular" color={colors.text.secondary}>
                  {reveal.note}
                </Text>
              ) : null}
            </View>
            {reveal.top.map((t, i) => (
              <AdvisorCardRow
                key={t.card.id}
                card={t.card}
                label={t.label}
                proof={t.proof}
                reason={t.reason}
                isNew={t.isNew}
                onPress={() => openRow(t.card, i + 1, t.proof)}
                onHaveThis={() => haveThis(t.card)}
              />
            ))}
            {reveal.proof === 'likely' ? (
              <Text variant="body12Regular" color={colors.text.secondary}>
                The bank makes the final decision.
              </Text>
            ) : null}
            {reveal.total > 3 ? (
              <Button
                label={showAll ? 'Show fewer cards' : `See all ${reveal.total} cards`}
                variant="outline"
                tone="second"
                size={44}
                fullWidth
                onPress={toggleAll}
              />
            ) : null}
            {showAll
              ? extraCards.map((card) => {
                  const proof: ProofLevel =
                    reveal.proof === 'likely' ? 'likely' : reveal.proof === 'matches' ? 'matches' : 'none';
                  return (
                    <AdvisorCardRow
                      key={card.id}
                      card={card}
                      proof={proof}
                      reason={listReason(card)}
                      isNew={false}
                      onPress={() => openRow(card, 0, proof)}
                      onHaveThis={() => haveThis(card)}
                    />
                  );
                })
              : null}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Find my card" onLeadingPress={goBack} />
      {body}
      {sheets}
    </SafeAreaView>
  );
}
