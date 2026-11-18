/**
 * AdvisorChatHeader: back arrow, the mascot, then "Swipey" over a one-line status.
 *
 * Built here because the shared Header organism takes only a string title (no avatar slot).
 * It matches that header: the same back arrow (redrawn: Header's glyph is not exported),
 * the same 32 dp glyph box with an 8 dp hit slop, 16 dp side padding and the 56 dp row height.
 * The row uses minHeight, not height, so a 48 dp avatar and two lines at 130 % font never clip.
 *
 * In a development build a long press on the mascot opens the avatar demo screen.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../atoms';
import { colors, spacing, iconSize, sizing, borderWidth } from '../../tokens';
import { CreditCardAdvisorAvatar } from '../../organisms/CreditCardAdvisorAvatar';
import type { AdvisorAvatarState } from '../../lib/advisorAvatar/types';

/** The mascot size in the header. */
export const HEADER_AVATAR_SIZE = iconSize[48];

/** Same path and stroke as BackArrowGlyph in src/organisms/Header.tsx. */
function BackArrowGlyph({ color }: { color: string }) {
  return (
    <Svg width={iconSize[32]} height={iconSize[32]} viewBox="0 0 32 32" fill="none">
      <Path d="M4 16 L28 16" stroke={color} strokeWidth={borderWidth.thick} strokeLinecap="round" />
      <Path
        d="M12 8 L4 16 L12 24"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AdvisorChatHeader({
  showAvatar,
  avatarState,
  status,
  onBack,
  onAvatarLongPress,
}: {
  /** Only one animated mascot is mounted at a time: false while the large intro mascot shows. */
  showAvatar: boolean;
  avatarState: AdvisorAvatarState;
  status: string;
  onBack: () => void;
  /** Development builds only. */
  onAvatarLongPress?: () => void;
}) {
  return (
    <View
      style={{
        minHeight: sizing.headerHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
        paddingVertical: spacing[4],
        paddingHorizontal: spacing[16],
        backgroundColor: colors.surface.default,
      }}
    >
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={spacing[8]}
        style={{ width: iconSize[32], height: iconSize[32], alignItems: 'center', justifyContent: 'center' }}
      >
        <BackArrowGlyph color={colors.text.primary} />
      </Pressable>

      {showAvatar ? (
        __DEV__ && onAvatarLongPress ? (
          <Pressable onLongPress={onAvatarLongPress} accessible={false}>
            <CreditCardAdvisorAvatar state={avatarState} size={HEADER_AVATAR_SIZE} />
          </Pressable>
        ) : (
          <CreditCardAdvisorAvatar state={avatarState} size={HEADER_AVATAR_SIZE} />
        )
      ) : null}

      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`Swipey. ${status}`}
        style={{ flex: 1, gap: spacing[2] }}
      >
        <Text variant="body16SemiBold" color={colors.text.primary} numberOfLines={1}>
          Swipey
        </Text>
        <Text variant="body12Regular" color={colors.text.secondary} numberOfLines={1}>
          {status}
        </Text>
      </View>
    </View>
  );
}
