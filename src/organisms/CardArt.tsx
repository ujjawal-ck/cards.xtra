/**
 * CardArt — organism (extracted from CardDetailMasthead)
 *
 * The credit-card visual on its own: placeholder-colour backing, rounded
 * clip, the card image, a specular glare band, and an Apple-Wallet-style
 * gyro tilt with a tilt-tracking drop shadow.
 *
 * Extracted so the CardDetailMasthead (in-sheet hero) and the
 * FloatingCardRail (the half-out peeking cards above the sheet) render the
 * exact same card — important for the seamless crossfade between them.
 *
 * `tilt` gates the accelerometer: only the active card tilts; neighbour
 * previews pass tilt={false} (a still card with the rest shadow) so N
 * cards never open N sensor listeners.
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Accelerometer } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';

import { cardPlaceholderBgMap } from '../molecules';
import type { CardModel } from '../molecules';
import { primitives, radius, opacity } from '../tokens';

// Session memory of which card images have already painted at least once.
// CardArt remounts constantly: swiping the pager promotes a card from preview
// → active (a different render branch in CardPage → a fresh CardArt), and
// re-opening the sheet mounts it again. Without this, every remount reset
// `loaded` to false and replayed the slate skeleton + fade-in — the "flicker"
// on first open and on each swipe. Once an image has decoded, later mounts
// start already-loaded with no transition, so a cached card appears instantly.
// (Home prefetches every card image into expo-image's cache up front, so the
// data is warm well before the first mount.)
const decodedImageUris = new Set<string>();

/** Mark image URIs as cached so the FIRST CardArt mount skips the skeleton +
 *  fade. Called by HomeScreen once its bulk ExpoImage.prefetch resolves — by
 *  then the bytes are in cache, so the card paints (near-)instantly on open
 *  instead of flashing the slate skeleton through a fade-in. */
export function markCardImagesDecoded(uris: string[]): void {
  for (const u of uris) decodedImageUris.add(u);
}

// Remote images key off their URI; local require() assets are bundled and
// always paint instantly, so they're treated as "already decoded".
function imageCacheKey(src: CardModel['cardImage']): string | null {
  return src && typeof src === 'object' && 'uri' in src && src.uri
    ? (src.uri as string)
    : null;
}

// Card-art footprint (Figma 3762:91705). Exported so the masthead's BG
// push-down math and the rail's pin math share one source of truth.
// Reduced 15% from the original 240×150 (aspect ratio preserved) so the
// hero card reads a touch smaller in the detail sheet.
export const CARD_ART_W = 204;
export const CARD_ART_H = 127.5;

// Crossfade window (in sheet animatedIndex units, 0=partial → 1=full) for
// the hand-off between the FloatingCardRail (visible at partial) and the
// in-masthead card art (visible as the sheet expands). Shared so the rail's
// fade-OUT and the masthead's fade-IN line up exactly.
export const CROSSFADE_LO = 0.08;
export const CROSSFADE_HI = 0.35;

export interface CardArtProps {
  card: CardModel;
  /** Render size — defaults to the Figma 240×150 footprint. */
  width?: number;
  height?: number;
  /** Active card subscribes to the accelerometer for the gyro tilt + glare;
   *  neighbours pass false (still card, rest shadow). Default true. */
  tilt?: boolean;
  /** Optional 0→1 shared value that SUPPRESSES the gyro tilt as it rises to 1
   *  (1 = fully flat). Used by the pager to flatten the card while the user is
   *  swiping between cards, so the leaning/parallax doesn't detach it from the
   *  sheet — the card stays glued. Omitted → tilt is never suppressed. */
  tiltSuppress?: SharedValue<number>;
}

function CardArtComponent({
  card,
  width = CARD_ART_W,
  height = CARD_ART_H,
  tilt = true,
  tiltSuppress,
}: CardArtProps) {
  // Accelerometer drives a 3D rotation + parallax shift. Only the active card
  // listens; inactive cards ease to flat (so N cards never open N listeners).
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  useEffect(() => {
    if (!tilt) {
      tiltX.value = withTiming(0, { duration: 120 });
      tiltY.value = withTiming(0, { duration: 120 });
      return;
    }
    Accelerometer.setUpdateInterval(22); // ~45 Hz — smoother, more responsive

    if (Platform.OS === 'android') {
      // Android's rest baseline isn't iOS's −0.65 and varies by device / hold,
      // so a fixed baseline read wrong (the card sat tilted at rest — why gyro
      // was off here). Instead AUTO-CALIBRATE: average the first few readings as
      // the neutral, then lean relative to it. No drift, no per-device tuning.
      let baseX: number | null = null;
      let baseY = 0;
      let n = 0;
      let sumX = 0;
      let sumY = 0;
      const CALIBRATION_SAMPLES = 6; // ~130ms at 45Hz — card stays flat til then
      const sub = Accelerometer.addListener(({ x, y }) => {
        if (baseX === null) {
          n += 1;
          sumX += x;
          sumY += y;
          if (n >= CALIBRATION_SAMPLES) {
            baseX = sumX / n;
            baseY = sumY / n;
          }
          return;
        }
        const dx = Math.max(-1, Math.min(1, x - baseX));
        const dy = Math.max(-1, Math.min(1, y - baseY));
        tiltX.value = withTiming(dx, { duration: 45 });
        tiltY.value = withTiming(dy, { duration: 45 });
      });
      return () => sub.remove();
    }

    // iOS reads y≈-0.65 at a normal portrait hold, so a fixed baseline zeroes
    // the rest tilt there.
    const Y_NEUTRAL = -0.65; // iOS gravity baseline for normal portrait hold
    const sub = Accelerometer.addListener(({ x, y }) => {
      let dx = x;
      let dy = y - Y_NEUTRAL;
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));
      // Shorter low-pass → the lean tracks the phone more immediately.
      tiltX.value = withTiming(dx, { duration: 45 });
      tiltY.value = withTiming(dy, { duration: 45 });
    });
    return () => sub.remove();
  }, [tiltX, tiltY, tilt]);

  const cardArtTiltStyle = useAnimatedStyle(() => {
    const ROTATE_DEG = 40; // ±40° lean — more dramatic
    const SHIFT_PX = 24; // ±24 px parallax
    // While swiping the pager, k→0 flattens the card so it stays glued.
    const k = 1 - (tiltSuppress?.value ?? 0);
    const tx = tiltX.value * k;
    const ty = tiltY.value * k;
    return {
      transform: [
        { perspective: 500 },
        { rotateY: `${tx * ROTATE_DEG}deg` },
        { rotateX: `${-ty * ROTATE_DEG}deg` },
        { translateX: tx * SHIFT_PX },
        { translateY: -ty * SHIFT_PX },
      ] as unknown as { rotateY: string }[],
    };
  });

  // Specular glare — a diagonal shine band that follows the tilt.
  const glareStyle = useAnimatedStyle(() => {
    const RANGE_X = width * 0.65;
    const RANGE_Y = height * 0.55;
    const k = 1 - (tiltSuppress?.value ?? 0);
    const tx = tiltX.value * k;
    const ty = tiltY.value * k;
    const magnitude = Math.min(1, Math.sqrt(tx * tx + ty * ty));
    return {
      transform: [
        { translateX: tx * RANGE_X },
        { translateY: -ty * RANGE_Y },
      ] as unknown as { translateX: number }[],
      opacity: 0.55 + magnitude * 0.35,
    };
  });

  // Drop shadow whose offset tracks the tilt (fixed light source) and whose
  // radius breathes a touch with tilt magnitude.
  const cardArtShadowStyle = useAnimatedStyle(() => {
    const SHADOW_TRACK = 18;
    const SHADOW_REST_Y = 16;
    const k = 1 - (tiltSuppress?.value ?? 0);
    const tiltXv = tiltX.value * k;
    const tiltYv = tiltY.value * k;
    const magnitude = Math.min(
      1,
      Math.sqrt(tiltXv * tiltXv + tiltYv * tiltYv)
    );
    return {
      shadowOffset: {
        width: -tiltXv * SHADOW_TRACK,
        height: SHADOW_REST_Y - tiltYv * SHADOW_TRACK,
      },
      shadowRadius: 22 + magnitude * 10,
    };
  });

  // Loading skeleton — a neutral pulsing card shown until the remote image
  // (bk.image URL) arrives, then expo-image fades the real card in over it.
  // Seed from the session cache: a card image that's already painted once (a
  // local asset, or a remote image decoded earlier this session) starts loaded
  // so a swipe/re-open shows it instantly instead of re-flashing the skeleton.
  const imgKey = imageCacheKey(card.cardImage);
  const startedLoaded = imgKey === null || decodedImageUris.has(imgKey);
  const [loaded, setLoaded] = useState(startedLoaded);
  const shimmer = useSharedValue(0);
  useEffect(() => {
    // Only loop while the skeleton is visible; once the image lands, cancel
    // the repeat so a settled card isn't running an infinite worklet.
    if (loaded) {
      cancelAnimation(shimmer);
      return;
    }
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [shimmer, loaded]);
  const skeletonSheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [opacity[16], opacity[40]]),
  }));

  return (
    <Animated.View style={cardArtTiltStyle}>
      {/* Shadow layer — bg + shape match the card so the shadow has
          geometry to cast from. */}
      <Animated.View
        style={[
          {
            width,
            height,
            borderRadius: radius.lg,
            backgroundColor: cardPlaceholderBgMap[card.placeholderColor],
            shadowColor: '#000',
            shadowOpacity: 0.45,
            elevation: 22,
          },
          cardArtShadowStyle,
        ]}
      >
        {/* Inner clip — rounds the image while the parent's shadow extends
            beyond the bounds. */}
        <View
          style={{
            width: '100%',
            height: '100%',
            borderRadius: radius.lg,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Skeleton — neutral slate card with a pulsing sheen, shown until
              the image loads. Rendered BEFORE the image so the image fades in
              on top of it. */}
          {!loaded ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: primitives.slate[200] },
              ]}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: primitives.slate[100] },
                  skeletonSheenStyle,
                ]}
              />
            </View>
          ) : null}
          {/* expo-image: memory+disk cache so a card loads once then is
              instant on re-open/re-swipe; a short fade-in avoids a hard pop
              when a remote card image (bk.image URL) arrives. onLoadEnd fires
              on success OR error so the skeleton never spins forever. */}
          <Image
            source={card.cardImage}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            // Fade in only on the FIRST decode of an image; once it's cached a
            // remount paints instantly (transition 0) so swiping/re-opening
            // doesn't replay the fade.
            transition={startedLoaded ? 0 : 220}
            onLoadEnd={() => {
              if (imgKey) decodedImageUris.add(imgKey);
              setLoaded(true);
            }}
          />
          {/* Glare layer — wider than the card so the band can translate
              without exposing its hard edges; clipped by the parent. */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: -height,
                left: -width,
                width: width * 3,
                height: height * 3,
              },
              glareStyle,
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.55)',
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0)',
              ]}
              locations={[0, 0.35, 0.5, 0.65, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%' }}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// Memoised: the FloatingCardRail re-renders its mount window as the user
// scrolls across cards; without this, every already-mounted card would re-run
// on each window shift. Props are stable refs (card object, shared values), so
// a shallow compare keeps mounted cards untouched and only the newly-windowed
// card actually mounts.
export const CardArt = React.memo(CardArtComponent);
