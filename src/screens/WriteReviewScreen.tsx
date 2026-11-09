/**
 * WriteReviewScreen — Figma "help/review/with-comment" (3713:52291).
 *
 * Reached from ReviewUs → "Write a Review". Pushed on the ROOT stack with its
 * own back header. On Submit it returns to ReviewUs with `{ submitted: true }`,
 * which surfaces the success Toast (Figma "rating-filled" 3741:53612).
 *
 * Composition (reuses existing components — no new molecules):
 *   1. <Header leading="back" title="Write Review" />   (organism, REUSED)
 *   2. Prompt line                                        (Body/16/Semi Bold)
 *   3. <TextArea label="Review Comment" />                (atom, REUSED) — the
 *      120-tall multi-line field with the cobalt floating label.
 *   4. "Rate your experience" title                       (Body/16/Semi Bold)
 *   5. Interactive 5-star row (40px, gap 8) — tappable Icon stars, NOT the
 *      display-only <Rating> atom (that has no press handling).
 *   6. Selected-rating caption                            (Body/14/Regular).
 *   7. <FooterButtons> single cobalt "Submit" CTA, disabled until a rating is
 *      picked. Wrapped in KeyboardAvoidingView (same pattern as the withdraw
 *      input screens) so the keyboard doesn't cover it.
 *
 * Tokens: bg background/default; section gap Spacing/24; horizontal Spacing/16;
 * star gold colors.icon.warning / empty colors.border.strong.
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, TextArea, Icon } from '../atoms';
import { Header, FooterButtons } from '../organisms';
import { colors, spacing } from '../tokens';
import { analytics, Events } from '../analytics';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WriteReview'>;

// Star geometry — Figma rating "2X" variant: 40px glyphs, 8px gap.
const STAR_SIZE = 40;
const TOTAL_STARS = 5;

// Caption per rating (1–5). Index 0 is unused (no caption before a tap).
const RATING_CAPTIONS = [
  '',
  'Poor',
  'Could be better',
  'Good',
  'Great Experience',
  'Awesome Experience',
];

export function WriteReviewScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);

  const handleSubmit = () => {
    if (rating === 0) return;
    analytics.track(Events.REVIEW_SUBMIT, {
      rating,
      has_comment: comment.trim().length > 0,
    });
    // Pop back to the already-mounted ReviewUs and flag the success toast.
    navigation.navigate('ReviewUs', { submitted: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: spacing[24], paddingBottom: spacing[24] }}
        >
          <Header
            leading="back"
            title="Write Review"
            onLeadingPress={() => navigation.goBack()}
          />

          {/* Prompt. */}
          <Text
            variant="body16SemiBold"
            color={colors.text.primary}
            style={{ paddingHorizontal: spacing[16] }}
          >
            Please tell us how was your experience with us:
          </Text>

          {/* Review comment — multi-line field with floating label. */}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <TextArea
              label="Review Comment"
              size="md"
              value={comment}
              onChangeText={setComment}
              autoCapitalize="sentences"
            />
          </View>

          {/* Rating block. */}
          <View style={{ gap: spacing[12] }}>
            <Text
              variant="body16SemiBold"
              color={colors.text.primary}
              style={{ paddingHorizontal: spacing[16] }}
            >
              Rate your experience
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: spacing[8],
                paddingHorizontal: spacing[16],
              }}
            >
              {Array.from({ length: TOTAL_STARS }).map((_, i) => {
                const value = i + 1;
                const active = value <= rating;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setRating(value)}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${value} ${value === 1 ? 'star' : 'stars'}`}
                    hitSlop={spacing[4]}
                  >
                    <Icon
                      name="star-filled"
                      size={STAR_SIZE}
                      color={active ? colors.icon.warning : colors.border.strong}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Caption appears once a rating is chosen. */}
            {rating > 0 ? (
              <Text
                variant="body14Regular"
                color={colors.text.primary}
                style={{ paddingHorizontal: spacing[16] }}
              >
                {`“${RATING_CAPTIONS[rating]}”`}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FooterButtons
          buttons="single"
          size={52}
          color="second"
          shadow="off"
          strip="none"
          primaryLabel="Submit"
          primaryDisabled={rating === 0}
          onPrimary={handleSubmit}
          style={{ paddingBottom: insets.bottom }}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
