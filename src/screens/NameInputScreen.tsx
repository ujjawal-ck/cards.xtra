/**
 * NameInputScreen — "What should we call you?"
 *
 * First screen of the post-OTP handoff for a fresh signup. The heading types
 * in char-by-char; the form (DLS Input + Continue) fades + slides up a beat
 * later. On submit we store the chosen name (AuthContext.setDisplayName) and
 * cross-fade to the Greeting, passing the name forward.
 *
 * Plain white surface (surface.default); the handoff card background is white
 * too, so the Otp→here and here→Greeting cross-fades never flash a coloured
 * edge.
 *
 * Animation: Reanimated (the repo standard). Each character is its own
 * Animated.Text whose opacity staggers in; the gradient "call you?" span uses
 * the GradientText recipe (Twilight Iris — Violet→Cobalt) with the same
 * per-char reveal driven through a MaskedView mask. Heading hierarchy uses
 * mobile type tokens (not the web's px sizes). The Continue CTA + active input
 * border are Cobalt (action.accent).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Keyboard } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Input, Button } from '../atoms';
import { colors, spacing, typography } from '../tokens';
import type { TextVariant } from '../atoms';
import { gradients } from '../theme/gradients';
import { useAuth } from '../auth/AuthContext';
import { analytics, Events } from '../analytics';
import { useKeyboardPadding } from '../lib/useKeyboardInset';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NameInput'>;

// Per-char fade duration. The web spec's ~18ms is an instant pop; a short
// real fade reads as a smoother typewriter cascade while keeping the staggers.
const CHAR_FADE_MS = 220;
// Line 1 ("Almost There!") — starts early, slightly slower step.
const LINE1_START = 60;
const LINE1_STEP = 26;
// Line 2 (the question) — starts after line 1 is underway, tighter step.
const LINE2_START = 430;
const LINE2_STEP = 22;
// Form (input + CTA) rises after the heading is mostly in.
const FORM_DELAY = 550;
// All-caps eyebrow tracking. The body14Bold token carries only 0.4px, so a
// literal +20% (0.48px) is sub-pixel/invisible; this opens the caps to a clean,
// readable eyebrow instead. Tune to taste.
const EYEBROW_TRACKING = 1.4;

// ---------------------------------------------------------------------------
// One character that fades in at `delay`. Rendered as Animated.Text so it can
// live inline in a wrapping row alongside its neighbours.
// ---------------------------------------------------------------------------
function RevealChar({
  char,
  delay,
  variant,
  color,
  italic,
  letterSpacing,
}: {
  char: string;
  delay: number;
  variant: TextVariant;
  color: string;
  italic?: boolean;
  /** Override tracking (px). On a single-glyph node this adds trailing space,
   *  so a row of these reads as an evenly-tracked word. */
  letterSpacing?: number;
}) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withTiming(1, { duration: CHAR_FADE_MS, easing: Easing.out(Easing.quad) }),
    );
  }, [o, delay]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.Text
      style={[
        typography[variant],
        { color },
        italic ? { fontStyle: 'italic' } : null,
        letterSpacing != null ? { letterSpacing } : null,
        st,
      ]}
    >
      {char}
    </Animated.Text>
  );
}

// A word filled with the Twilight-Iris gradient that ALSO reveals char-by-char:
// the gradient is the fill, and a row of RevealChars (black) is the alpha mask,
// so each glyph fades in through the gradient. Kept per-word so it never breaks
// mid-gradient across a line wrap. Same weight + upright style as the lead-in
// text — only the colour differs.
function RevealGradientWord({
  word,
  startIndex,
  baseDelay,
  step,
  variant,
}: {
  word: string;
  startIndex: number;
  baseDelay: number;
  step: number;
  variant: TextVariant;
}) {
  const chars = word.split('');
  return (
    <MaskedView
      maskElement={
        <View style={{ flexDirection: 'row' }}>
          {chars.map((c, i) => (
            <RevealChar
              key={i}
              char={c}
              delay={baseDelay + (startIndex + i) * step}
              variant={variant}
              color={colors.text.primary}
            />
          ))}
        </View>
      }
    >
      <LinearGradient
        colors={gradients.twilightIris}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text variant={variant} style={{ opacity: 0 }}>
          {word}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

// A wrapping line of plain RevealChars (continuous index → continuous stagger).
function RevealLine({
  text,
  baseDelay,
  step,
  variant,
  color,
  letterSpacing,
}: {
  text: string;
  baseDelay: number;
  step: number;
  variant: TextVariant;
  color: string;
  letterSpacing?: number;
}) {
  const chars = text.split('');
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {chars.map((c, i) => (
        <RevealChar
          key={i}
          char={c}
          delay={baseDelay + i * step}
          variant={variant}
          color={color}
          letterSpacing={letterSpacing}
        />
      ))}
    </View>
  );
}

export function NameInputScreen() {
  const navigation = useNavigation<Nav>();
  const kbStyle = useKeyboardPadding();
  const { setDisplayName } = useAuth();

  const [name, setName] = useState('');
  const trimmed = name.trim();
  const isValid = trimmed.length >= 1;

  // Second heading line: plain lead-in + the gradient italic "call you?" span.
  // Both share one continuous char index so the stagger never resets.
  const lead = 'What should we ';
  const gradientWords = useMemo(() => ['call', ' ', 'you?'], []);

  // Form entrance — fade + slide up, once.
  const form = useSharedValue(0);
  useEffect(() => {
    form.value = withDelay(
      FORM_DELAY,
      withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }),
    );
  }, [form]);
  const formStyle = useAnimatedStyle(() => ({
    opacity: form.value,
    transform: [{ translateY: 20 * (1 - form.value) }],
  }));

  const handleSubmit = () => {
    if (!isValid) return;
    Keyboard.dismiss();
    setDisplayName(trimmed);
    // Name captured (not sent) — record only that the signup step completed.
    analytics.track(Events.SIGN_UP_NAME_SET, { has_name: trimmed.length > 0 });
    navigation.navigate('Greeting', { name: trimmed });
  };

  // Where the gradient span's char index continues from (after the lead-in).
  let runningIndex = lead.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Animated.View style={[{ flex: 1 }, kbStyle]}>
          <SafeAreaView
            edges={['top', 'left', 'right', 'bottom']}
            style={{
              flex: 1,
              paddingHorizontal: spacing[24],
              justifyContent: 'center',
              gap: spacing[32],
            }}
          >
            {/* Heading — types in char by char. */}
            <View style={{ gap: spacing[8] }}>
              <RevealLine
                text="ALMOST THERE!"
                baseDelay={LINE1_START}
                step={LINE1_STEP}
                // ~40% smaller than the heading24 it was (24 → 14 nearest token).
                variant="body14Bold"
                color={colors.text.primary}
                letterSpacing={EYEBROW_TRACKING}
              />
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}
              >
                {lead.split('').map((c, i) => (
                  <RevealChar
                    key={`lead-${i}`}
                    char={c}
                    delay={LINE2_START + i * LINE2_STEP}
                    variant="display32Bold"
                    color={colors.text.primary}
                  />
                ))}
                {gradientWords.map((w, wi) => {
                  if (w.trim() === '') {
                    // Preserve the inter-word space (plain, keeps the stagger).
                    const node = (
                      <RevealChar
                        key={`gap-${wi}`}
                        char={w}
                        delay={LINE2_START + runningIndex * LINE2_STEP}
                        variant="display32Bold"
                        color={colors.text.primary}
                      />
                    );
                    runningIndex += w.length;
                    return node;
                  }
                  const node = (
                    <RevealGradientWord
                      key={`grad-${wi}`}
                      word={w}
                      startIndex={runningIndex}
                      baseDelay={LINE2_START}
                      step={LINE2_STEP}
                      variant="display32Bold"
                    />
                  );
                  runningIndex += w.length;
                  return node;
                })}
              </View>
            </View>

            {/* Form — fades + slides up after the heading. */}
            <Animated.View style={[{ gap: spacing[16] }, formStyle]}>
              <Input
                label="Your Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                maxLength={30}
                // ≥1 char promotes the border to the accent (Cobalt) even on a
                // momentary blur; focus already does this, this keeps it stuck.
                state={isValid ? 'selected' : undefined}
                onSubmitEditing={handleSubmit}
              />
              <Button
                label="Let's Go!"
                variant="solid"
                tone="second"
                size={52}
                fullWidth
                disabled={!isValid}
                onPress={handleSubmit}
              />
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
    </View>
  );
}
