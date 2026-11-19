/**
 * Chat bubbles for the card advisor.
 *
 *   AdvisorBubble     left, the advisor ("Swipey"): surface, thin border, small bottom-left corner.
 *   UserAnswerBubble  right, the user's answer: the selected-chip colours (saffron tint), small
 *                     bottom-right corner, a pencil to show it can change. A tap rewinds to it.
 *   AdvisorEarlierLine left, one muted line for an earlier set of cards.
 *
 * No fixed heights: every bubble grows with its text and the font size.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Text, Icon } from '../../atoms';
import { colors, spacing, radius, borderWidth, iconSize, opacity, sizing } from '../../tokens';

/** A bubble never runs the full width, so the left and right sides stay readable as a chat.
 *  A layout ratio, not a token value. */
export const BUBBLE_MAX_WIDTH = '84%' as const;

/** Side padding of the transcript. The card rail bleeds past it to the screen edges. */
export const CHAT_GUTTER = spacing[16];

const BUBBLE_PAD_H = spacing[12];
const BUBBLE_PAD_V = spacing[10];

export function AdvisorBubble({
  children,
  accessibilityLabel,
  style,
}: {
  children: React.ReactNode;
  /** Read as one sentence: "Swipey: ...". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          alignSelf: 'flex-start',
          maxWidth: BUBBLE_MAX_WIDTH,
          gap: spacing[4],
          paddingHorizontal: BUBBLE_PAD_H,
          paddingVertical: BUBBLE_PAD_V,
          borderRadius: radius.xl,
          borderBottomLeftRadius: radius.xs,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
          backgroundColor: colors.surface.default,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function UserAnswerBubble({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Change answer: ${text}`}
      accessibilityHint="Removes this answer and every answer after it, then asks again."
      style={({ pressed }) => ({
        alignSelf: 'flex-end',
        maxWidth: BUBBLE_MAX_WIDTH,
        minHeight: sizing.touchMin,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
        paddingHorizontal: BUBBLE_PAD_H,
        paddingVertical: BUBBLE_PAD_V,
        borderRadius: radius.xl,
        borderBottomRightRadius: radius.xs,
        borderWidth: borderWidth.thin,
        borderColor: colors.chip.selectedBorder,
        backgroundColor: colors.background.emphasis,
        opacity: pressed ? opacity[80] : opacity[100],
      })}
    >
      <Text variant="body14Medium" color={colors.text.primary} style={{ flexShrink: 1 }}>
        {text}
      </Text>
      <Icon name="edit-outline" size={iconSize[14]} color={colors.text.secondary} />
    </Pressable>
  );
}

export function AdvisorEarlierLine({ header }: { header: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`Swipey: Earlier suggestion. ${header}`}
      style={{
        alignSelf: 'flex-start',
        maxWidth: BUBBLE_MAX_WIDTH,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[6],
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[4],
      }}
    >
      {/* No tintable card glyph ships (nav-cards-* bake white), so the "results" glyph stands in. */}
      <Icon name="clipboard-search-outline" size={iconSize[14]} color={colors.text.tertiary} />
      <Text variant="body12Regular" color={colors.text.tertiary} style={{ flexShrink: 1 }}>
        {header}
      </Text>
    </View>
  );
}

/** A quick tip from the advisor: the advisor bubble's shape and edge, on the calm info tint the
 *  app uses for notes (feedback.info.subtle, as in the withdraw note boxes), with a sparkle. */
export function AdvisorTipBubble({ text }: { text: string }) {
  return (
    <AdvisorBubble
      accessibilityLabel={`Quick tip: ${text}`}
      style={{ backgroundColor: colors.feedback.info.subtle, borderColor: colors.feedback.info.subtle }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
        <Icon name="feat-sparkle-filled" size={iconSize[14]} color={colors.feedback.info.text} />
        <Text variant="body12SemiBold" color={colors.feedback.info.text}>
          Quick tip
        </Text>
      </View>
      <Text variant="body14Regular" color={colors.text.primary}>
        {text}
      </Text>
    </AdvisorBubble>
  );
}
