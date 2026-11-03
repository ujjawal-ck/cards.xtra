/**
 * RollingAmount — atom
 *
 * An odometer / slot-machine money reveal: each digit sits in its own
 * vertical reel that spins through a few 0-9 cycles and decelerates to
 * settle on the real digit. Used for the Earnings "All Time Earnings"
 * headline so the number rolls in on load instead of just appearing.
 *
 * Non-digit characters (the ₹ symbol, the thousands comma, a decimal
 * point + paise) render statically; only 0-9 spin. Reels start at the
 * left and finish left→right (a small per-digit stagger), so the figure
 * reads as settling into place.
 *
 * Edges: while a reel is spinning the half-visible neighbour digits would
 * otherwise hard-clip at the window edge, so during the roll each reel is
 * wrapped in a MaskedView whose vertical gradient fades the top + bottom
 * to transparent (a true alpha fade that works over the dark masthead
 * image). Once the reel settles the mask is dropped so the final digit is
 * crisp. Each cell also carries a little vertical + horizontal padding so
 * the glyph never touches the window edge at rest.
 *
 * Token-bound: typography comes from a `variant` (same scale as <Text>),
 * colour + everything else from src/tokens.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import type { TextVariant } from './Text';
import { typography, colors } from '../tokens';

// Animation feel — full 0-9 cycles each reel spins before landing, the
// base roll duration, and the left→right stagger between digits.
const SPINS = 2;
const ROLL_MS = 900;
const STAGGER_MS = 90;

const isDigit = (c: string) => c >= '0' && c <= '9';

// The edge-fade gradient used as the MaskedView mask while a reel spins.
// Opaque ('black') through the middle, transparent at top + bottom so the
// partially-visible neighbour digits fade out instead of hard-clipping.
function EdgeFadeMask() {
  return (
    <LinearGradient
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      colors={['transparent', 'black', 'black', 'transparent']}
      locations={[0, 0.24, 0.76, 1]}
    />
  );
}

export interface RollingAmountProps {
  /** The formatted amount, e.g. "₹1,500" or "₹775.60". */
  value: string;
  /** Typography variant — defaults to the earnings headline. */
  variant?: TextVariant;
  color?: string;
  /** Override the base roll duration (ms). */
  duration?: number;
  /** Change this value to replay the roll (e.g. bump it on every screen
   *  focus so the reveal runs each time the page is opened). */
  playToken?: number | string;
  style?: StyleProp<ViewStyle>;
}

// One spinning column. Renders a strip of digits — SPINS full 0-9 cycles
// then 0..target — and translates up so `target` lands in the window.
// `masked` true (while rolling) → edges fade; false (settled) → crisp.
function DigitReel({
  target,
  cellH,
  cellW,
  lineH,
  variant,
  color,
  delay,
  duration,
  playToken,
  masked,
  marginLeft,
}: {
  target: number;
  cellH: number;
  cellW: number;
  lineH: number;
  variant: TextVariant;
  color: string;
  delay: number;
  duration: number;
  playToken?: number | string;
  masked: boolean;
  marginLeft: number;
}) {
  const progress = useSharedValue(0);
  const finalIndex = SPINS * 10 + target; // last index in the strip = target

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      // Ease-out so the reel decelerates into its final digit (the slot
      // "click into place" feel) rather than stopping abruptly.
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
    // playToken in the deps replays the roll on every screen focus.
  }, [target, delay, duration, progress, playToken]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.value * finalIndex * cellH }],
  }));

  // Strip: 0-9 repeated SPINS times, then 0..target.
  const seq: number[] = [];
  for (let s = 0; s < SPINS; s += 1) for (let n = 0; n < 10; n += 1) seq.push(n);
  for (let n = 0; n <= target; n += 1) seq.push(n);

  const column = (
    <Animated.View style={animStyle}>
      {seq.map((n, i) => (
        <View
          key={i}
          style={{
            height: cellH,
            width: cellW,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant={variant} color={color} style={{ lineHeight: lineH }}>
            {n}
          </Text>
        </View>
      ))}
    </Animated.View>
  );

  // MaskedView stays mounted in both states (swapping it for a plain View
  // would remount the reel and flicker). While spinning the mask is the
  // edge-fade gradient; once settled it's a solid fill, so the final digit
  // is fully crisp with no faded top/bottom.
  return (
    <MaskedView
      style={{ height: cellH, width: cellW, marginLeft }}
      maskElement={
        masked ? <EdgeFadeMask /> : <View style={{ flex: 1, backgroundColor: 'black' }} />
      }
    >
      {column}
    </MaskedView>
  );
}

export function RollingAmount({
  value,
  variant = 'display36ExtraBold',
  color = colors.text.inverse,
  duration = ROLL_MS,
  playToken,
  style,
}: RollingAmountProps) {
  const fontSize = typography[variant].fontSize;
  // Text line height for the glyph itself…
  const lineH = typography[variant].lineHeight ?? fontSize;
  // …and the reel cell / window, padded a little taller + wider than the
  // glyph so it never touches the clipped edge (the old hard cut-off).
  const vPad = Math.ceil(fontSize * 0.1);
  // Cells are sized to the glyph's natural advance width — no extra side pad
  // (that read as airy / robotic). Tightening happens instead via `kern`, a
  // small negative left-margin applied UNIFORMLY between every glyph (digits
  // AND the ₹ / comma / decimal), so the whole figure kerns together evenly
  // rather than only squeezing the digit reels and leaving loose punctuation.
  const hPad = 0;
  const kern = Math.round(fontSize * -0.035);
  const cellH = lineH + vPad * 2;

  // Digit cells need a fixed width so the reel doesn't jitter as numbers
  // change width. Measure a single "0" in this exact variant, then use
  // that width (plus a little padding) for every reel.
  const [digitWidth, setDigitWidth] = useState<number | null>(null);
  const onMeasure = (e: LayoutChangeEvent) =>
    setDigitWidth(e.nativeEvent.layout.width);

  // `rolling` gates the edge-fade mask — true while any reel is spinning,
  // dropped once the last (most-delayed) reel has settled.
  const chars = value.split('');
  const digitCount = chars.filter(isDigit).length;
  const [rolling, setRolling] = useState(true);
  useEffect(() => {
    if (digitWidth == null) return undefined;
    setRolling(true);
    const total =
      Math.max(digitCount - 1, 0) * STAGGER_MS + duration + 80; // + settle buffer
    const id = setTimeout(() => setRolling(false), total);
    return () => clearTimeout(id);
  }, [playToken, value, duration, digitWidth, digitCount]);

  const cellW = digitWidth != null ? digitWidth + hPad * 2 : 0;
  let digitIndex = 0;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {/* Hidden measurer — sizes the digit cells, never visible. */}
      <Text
        variant={variant}
        color={color}
        style={{ position: 'absolute', opacity: 0 }}
        onLayout={onMeasure}
      >
        0
      </Text>

      {digitWidth != null
        ? chars.map((c, i) => {
            // Every glyph after the first gets the uniform negative kern, so
            // digit↔digit and digit↔punctuation gaps tighten by the same
            // amount and the figure reads as one number.
            const marginLeft = i === 0 ? 0 : kern;
            if (isDigit(c)) {
              const delay = digitIndex * STAGGER_MS;
              digitIndex += 1;
              return (
                <DigitReel
                  key={i}
                  target={Number(c)}
                  cellH={cellH}
                  cellW={cellW}
                  lineH={lineH}
                  variant={variant}
                  color={color}
                  delay={delay}
                  duration={duration}
                  playToken={playToken}
                  masked={rolling}
                  marginLeft={marginLeft}
                />
              );
            }
            // Static glyph (₹, comma, decimal point) — boxed to the same
            // height as the reels so it shares their vertical centre.
            return (
              <View
                key={i}
                style={{ height: cellH, justifyContent: 'center', marginLeft }}
              >
                <Text variant={variant} color={color} style={{ lineHeight: lineH }}>
                  {c}
                </Text>
              </View>
            );
          })
        : null}
    </View>
  );
}
