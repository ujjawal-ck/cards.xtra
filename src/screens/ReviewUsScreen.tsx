/**
 * ReviewUsScreen — Figma "help/review/rating-empty" (3685:197563), 360×800.
 *
 * Reached from Profile → "Review Us". Pushed on the ROOT stack (over the
 * tabs), so it slides in on top with its own back header.
 *
 * Composition — reuses existing components, builds only what's new:
 *   1. <Header leading="back">     (organism, REUSED) — "Review Us" title.
 *   2. Masthead counter block      (NEW, inline) — peach-fade hero card
 *      (images.backgrounds.large, the project's saffron-fade masthead
 *      backdrop, reused via ImageBackground) holding a data-driven row
 *      of digit tiles + "And Counting" caption.
 *   3. Section title               — "See What Our Happy Users Say".
 *   4. Reviews list                — <ReviewCard> (NEW molecule) ×3,
 *      fed by REVIEWS. Each card reuses the <Rating> atom (NEW).
 *   5. <FooterButtons>             (organism, REUSED) — single cobalt
 *      "Write a Review" CTA pinned to the bottom.
 *
 * The 360×800 frame's interior offsets map to: header height 56, then a
 * spacing[24] gap to the masthead (top ≈ 80), spacing[24] to the section
 * title, spacing[24] to the list, spacing[12] between cards.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, ImageBackground, Animated, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '../atoms';
import { ReviewCard, Toast } from '../molecules';
import type { ReviewModel } from '../molecules';
import { Header, FooterButtons } from '../organisms';
import { images } from '../assets/images';
import { colors, spacing, radius, elevation } from '../tokens';
import { analytics, Events } from '../analytics';
import type { RootStackParamList } from '../navigation/types';

// Counter digits — data-driven (rendered as an array, not 4 fixed blocks).
const COUNTER_DIGITS = ['7', '3', '3', '8'];

// The three Figma reviews — exact strings (incl. the "Ieamless" spelling
// and the literal "... More" truncation affordance on the 3rd card).
const REVIEWS: ReviewModel[] = [
  {
    stars: 4,
    title: 'Seamless experience',
    body: 'Ieamless experience, add more merchants',
    author: 'Subhrendu Sen, Mar 02, 2023',
  },
  {
    stars: 5,
    title: 'Love for customer support team',
    body: 'I have been using cashkaro for a long time. Its awesome specially customer',
    author: 'Subhrendu Sen, Mar 02, 2023',
  },
  {
    stars: 5,
    title: 'Tracking as good as butter',
    body: 'Awesome experience. Tracking was as good as butter. Thank you Cashkaro for ... More',
    author: 'Subhrendu Sen, Mar 02, 2023',
  },
];

// Counter block geometry — Figma 3685:197700 (component-spec, not on the
// spacing scale).
const COUNTER_CARD_H = 120;

// Slot-machine digit reel ----------------------------------------------------
// One column per digit. On mount each reel spins through several 0–9 cycles
// and eases to a stop on its target value, staggered left→right so the four
// digits land in sequence (the classic slot-machine settle).
//
// CELL_H matches typography.display32Bold's lineHeight (40) so each digit
// occupies exactly one viewport cell; the outer tile clips to one cell.
const CELL_H = 40;

function SlotDigit({ digit, index }: { digit: string; index: number }) {
  const target = parseInt(digit, 10);
  // Later digits get more full spins so they keep turning a beat longer.
  const loops = 5 + index;

  // Strip: `loops` complete 0–9 cycles, then 0..target. The reel starts at
  // index 0 and translates up to the final cell (the target digit).
  const strip = useMemo(() => {
    const arr: number[] = [];
    for (let l = 0; l < loops; l += 1) {
      for (let n = 0; n < 10; n += 1) arr.push(n);
    }
    for (let n = 0; n <= target; n += 1) arr.push(n);
    return arr;
  }, [loops, target]);

  const finalIndex = strip.length - 1;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -finalIndex * CELL_H,
        duration: 1400 + index * 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 120);
    return () => clearTimeout(id);
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface.default,
          borderRadius: radius.sm,
          paddingHorizontal: spacing[12],
          paddingVertical: spacing[8],
        },
        elevation.light.xs,
      ]}
    >
      {/* Clipped viewport — exactly one digit tall. Shadow lives on the
          parent tile (overflow:hidden would otherwise clip it). */}
      <View style={{ height: CELL_H, overflow: 'hidden' }}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          {strip.map((n, i) => (
            <View
              key={i}
              style={{
                height: CELL_H,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="display32Bold" color={colors.text.primary}>
                {n}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

// Footer block height (single CTA: action row pt12 + 52 button + pb16) — the
// success toast floats just above it. Component-spec, not on the scale.
const FOOTER_BLOCK = 80;

export function ReviewUsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ReviewUs'>>();
  const insets = useSafeAreaInsets();

  // After WriteReview submits it returns here with { submitted: true }: show
  // the success toast, clear the param (so a back-and-forth won't re-trigger
  // it), and auto-dismiss after 3s.
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (!route.params?.submitted) return;
    setShowToast(true);
    navigation.setParams({ submitted: undefined });
    const id = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(id);
  }, [route.params?.submitted, navigation]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.surface.default }}
    >
      {/* Dark status-bar glyphs against the white screen background. */}
      <StatusBar style="dark" />

      {/* 1. Header — REUSED back variant. Its 'back' spec already maps
          to the 32px arrow, spacing[8] gap, and body16Medium title. */}
      <Header
        leading="back"
        title="Review Us"
        onLeadingPress={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing[24] }}
      >
        {/* 2. Masthead counter block (NEW) — spacing[24] below header. */}
        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingTop: spacing[24],
          }}
        >
          <ImageBackground
            source={images.backgrounds.large}
            resizeMode="cover"
            imageStyle={{ borderRadius: radius.xl }}
            style={{
              // alignSelf:'stretch' (not width:'100%') so the ImageBackground
              // fills the wrapper's content box regardless of bg-large.png's
              // intrinsic width — otherwise it falls back to the image's
              // natural width and left-aligns, leaving a gap on the right.
              alignSelf: 'stretch',
              height: COUNTER_CARD_H,
              borderRadius: radius.xl,
              overflow: 'hidden',
              paddingVertical: spacing[20],
              paddingHorizontal: spacing[16],
              gap: spacing[8],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Digit tiles — data-driven row of slot-machine reels that
                spin on page load and settle on 7 3 3 8. */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[4],
              }}
            >
              {COUNTER_DIGITS.map((digit, i) => (
                <SlotDigit key={i} digit={digit} index={i} />
              ))}
            </View>

            {/* Caption */}
            <Text
              variant="body12Regular"
              color={colors.text.secondary}
              align="center"
              style={{ width: '100%' }}
            >
              reviews so far
            </Text>
          </ImageBackground>
        </View>

        {/* 3. Section title — spacing[24] below the masthead. */}
        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingTop: spacing[24],
          }}
        >
          <Text variant="body16SemiBold" color={colors.text.primary}>
            See What Our Happy Users Say
          </Text>
        </View>

        {/* 4. Reviews list — spacing[24] below the title, gap spacing[12]
            between cards. Data-driven from REVIEWS. */}
        <View
          style={{
            paddingHorizontal: spacing[16],
            paddingTop: spacing[24],
            gap: spacing[12],
          }}
        >
          {REVIEWS.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}
        </View>
      </ScrollView>

      {/* 5. Footer — REUSED FooterButtons. Single cobalt-accent CTA,
          size 52, shadow off. Wrapper adds the bottom safe-area inset so
          the bar clears the home indicator. */}
      <View
        style={{
          paddingBottom: insets.bottom,
          backgroundColor: colors.surface.default,
        }}
      >
        <FooterButtons
          buttons="single"
          size={52}
          color="second"
          shadow="off"
          strip="none"
          primaryLabel="Write a Review"
          onPrimary={() => {
            analytics.track(Events.REVIEW_START);
            navigation.navigate('WriteReview');
          }}
        />
      </View>

      {/* Success toast — floats above the footer after a review is submitted. */}
      {showToast ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: FOOTER_BLOCK + insets.bottom + spacing[12],
            alignItems: 'center',
            paddingHorizontal: spacing[16],
          }}
        >
          <Toast
            tone="success"
            icon="check-circle-filled"
            message="Your review is submitted successfully"
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
