/**
 * AdvisorAvatarDemo: development-only screen to look at the card advisor mascot.
 *
 * Registered under __DEV__ in RootNavigator, so a release build has no route to it.
 * It shows one large avatar for a chosen state, the same state at four sizes,
 * the three ways to feed `audioLevel`, and an auto tour of the six states.
 * "Simulated voice" is this screen pretending to be an audio source: the one
 * timer here is the demo's, the avatar itself uses none.
 * Not run on a device.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Chip, Button } from '../../atoms';
import { Header } from '../../organisms';
import { CreditCardAdvisorAvatar } from '../../organisms/CreditCardAdvisorAvatar';
import { ADVISOR_AVATAR_STATES } from '../../lib/advisorAvatar/types';
import type { AdvisorAvatarState } from '../../lib/advisorAvatar/types';
import { colors, spacing } from '../../tokens';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AdvisorAvatarDemo'>;
type LevelMode = 'own' | 'fixed' | 'simulated';

const SIZES = [48, 96, 160, 300];
const FIXED_LEVELS = [0, 0.25, 0.5, 0.75, 1];
const TOUR_STEP_MS = 2500;
const SIM_TICK_MS = 80;

/** A voice-like value between 0 and 1: two slow waves plus a quick one. */
function simulatedLevel(ms: number): number {
  const t = ms / 1000;
  const v = 0.5 + 0.28 * Math.sin(t * 7) + 0.14 * Math.sin(t * 13.3) + 0.08 * Math.sin(t * 3.1);
  return Math.min(1, Math.max(0, v));
}

export function AdvisorAvatarDemo() {
  const navigation = useNavigation<Nav>();
  const [state, setState] = useState<AdvisorAvatarState>('idle');
  const [mode, setMode] = useState<LevelMode>('own');
  const [fixed, setFixed] = useState(0.5);
  const [simulated, setSimulated] = useState(0);
  const [touring, setTouring] = useState(false);
  const tourTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTour = useCallback(() => {
    if (tourTimer.current) clearTimeout(tourTimer.current);
    tourTimer.current = null;
    setTouring(false);
  }, []);

  // Simulated voice: one interval, cleared on cleanup and on any change of mode or state.
  useEffect(() => {
    if (state !== 'speaking' || mode !== 'simulated') return undefined;
    const start = Date.now();
    const id = setInterval(() => setSimulated(simulatedLevel(Date.now() - start)), SIM_TICK_MS);
    return () => clearInterval(id);
  }, [mode, state]);

  // Auto tour: one timer chain through the six states, once.
  const startTour = useCallback(() => {
    stopTour();
    setTouring(true);
    setState(ADVISOR_AVATAR_STATES[0]);
    let index = 0;
    const next = () => {
      tourTimer.current = setTimeout(() => {
        index += 1;
        if (index >= ADVISOR_AVATAR_STATES.length) {
          tourTimer.current = null;
          setTouring(false);
          return;
        }
        setState(ADVISOR_AVATAR_STATES[index]);
        next();
      }, TOUR_STEP_MS);
    };
    next();
  }, [stopTour]);

  useEffect(() => () => {
    if (tourTimer.current) clearTimeout(tourTimer.current);
  }, []);

  const pickState = useCallback(
    (next: AdvisorAvatarState) => {
      stopTour();
      setState(next);
    },
    [stopTour],
  );

  const audioLevel: number | undefined =
    state !== 'speaking' || mode === 'own' ? undefined : mode === 'fixed' ? fixed : simulated;

  const sectionTitle = (label: string) => (
    <Text variant="body14SemiBold" color={colors.text.secondary}>
      {label}
    </Text>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Advisor avatar" onLeadingPress={() => navigation.goBack()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[16], gap: spacing[16], paddingBottom: spacing[48] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: spacing[8] }}>
          <CreditCardAdvisorAvatar state={state} size={160} audioLevel={audioLevel} />
          <Text variant="body16Medium">{state}</Text>
        </View>

        {sectionTitle('State')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
          {ADVISOR_AVATAR_STATES.map((s) => (
            <Chip key={s} label={s} state={s === state ? 'selected' : 'default'} onPress={() => pickState(s)} />
          ))}
        </View>

        {sectionTitle('Sizes')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[16], alignItems: 'flex-end' }}>
          {SIZES.map((size) => (
            <View key={size} style={{ alignItems: 'center', gap: spacing[4] }}>
              <CreditCardAdvisorAvatar state={state} size={size} audioLevel={audioLevel} />
              <Text variant="body12Regular" color={colors.text.secondary}>
                {size}
              </Text>
            </View>
          ))}
        </View>

        {state === 'speaking' ? (
          <>
            {sectionTitle('Speaking level')}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
              <Chip label="Own loop" state={mode === 'own' ? 'selected' : 'default'} onPress={() => setMode('own')} />
              <Chip label="Fixed" state={mode === 'fixed' ? 'selected' : 'default'} onPress={() => setMode('fixed')} />
              <Chip
                label="Simulated voice"
                state={mode === 'simulated' ? 'selected' : 'default'}
                onPress={() => setMode('simulated')}
              />
            </View>
            {mode === 'fixed' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
                {FIXED_LEVELS.map((level) => (
                  <Chip
                    key={level}
                    label={String(level)}
                    state={level === fixed ? 'selected' : 'default'}
                    onPress={() => setFixed(level)}
                  />
                ))}
              </View>
            ) : null}
            <Text variant="body14Regular" color={colors.text.secondary}>
              {audioLevel === undefined ? 'audioLevel: not set (own loop)' : 'audioLevel: ' + audioLevel.toFixed(2)}
            </Text>
          </>
        ) : null}

        {sectionTitle('Auto tour')}
        <Button
          label={touring ? 'Touring...' : 'Start tour'}
          variant="outline"
          size={44}
          disabled={touring}
          onPress={startTour}
        />

        <Text variant="body12Regular" color={colors.text.secondary}>
          This app has no text to speech and no microphone. `audioLevel` is ready for one when it exists.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
