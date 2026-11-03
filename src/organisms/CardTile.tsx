/**
 * CardTile — organism (Figma 3762:85548)
 *
 * The hero credit-card tile composed entirely from existing
 * components: <Image>, Text, CashbackBadge, Tag (info), Icon
 * (feature outline icons), CardFeeStrip. The only inline piece is
 * the small gold "INVITE ONLY" pill — small enough that adding a
 * dedicated Badge variant for it would be overkill.
 *
 * Container:
 *   vertical column, gap spacing[12], padding spacing[12],
 *   borderRadius radius.xl (16), bg surface.default,
 *   border 1px border.subtle3, drop shadow elevation.light.xs
 *   (#000 @ 6%, y1, blur2 — per design directive: cards use Shadow/Light/XS).
 *
 * Sections (order):
 *   1. Card row — 132×84 card image (radius.md) + Card Info (name
 *      body16SemiBold + CashbackBadge size="sm")
 *   2. Invite-Only badge (optional)
 *   3. Tags row — array of Tag atoms (variant='info', size='sm')
 *   4. Benefits — feat-* outline icon (16, text.tertiary) + body12Regular text
 *   5. Fee strip — <CardFeeStrip />
 *
 * Type 'scrollable' is the compact variant: card + tags + benefits
 * only. No invite badge, no fee strip.
 *
 * Hex → token:
 *   #ffffff → colors.surface.default
 *   #eeeeee → colors.border.subtle3
 *   #262626 → colors.text.primary
 *   #5c5c5c → colors.text.secondary
 *   #878787 → colors.text.tertiary
 *   shadow → elevation.light.xs
 *   Gold pill (#fff8e1→#edd68c, amber border, amber-700 text) — gradient
 *   stops are inlined since #edd68c isn't in the primitives table; flag
 *   for a future primitive add.
 */
import React from 'react';
import {
  View,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Icon, CashbackBadge, Tag } from '../atoms';
import type { IconName } from '../atoms';
import { CardFeeStrip } from '../molecules';
import type { CardFeeStripProps } from '../molecules';
import {
  colors,
  primitives,
  spacing,
  radius,
  borderWidth,
  iconSize,
  elevation,
} from '../tokens';

export type CardTileType = 'full' | 'scrollable';

export interface CardTileBenefit {
  icon: IconName;
  /** Punchy lede — the USP header, e.g. "Get 5% Cashback on Dining". */
  title: string;
  /** Optional qualifier / fine print, rendered muted beneath the title. */
  description?: string;
  /** Category tag id (product_usps tag_id), used for category-aware display. */
  tagId?: number;
}

export interface CardTileProps {
  type?: CardTileType;
  cardImage: ImageSourcePropType;
  cardName: string;
  cashbackText: string;
  inviteOnly?: boolean;
  tags?: string[];
  benefits?: CardTileBenefit[];
  /** Required when type='full'. */
  feeType?: CardFeeStripProps['type'];
  feeProps?: Omit<CardFeeStripProps, 'type'>;
  onApply?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Card image dims — component-spec; not in spacing scale.
const CARD_IMG_W = 132;
const CARD_IMG_H = 84;

// Gold gradient stops for the INVITE ONLY pill. The dark stop
// (#edd68c) isn't in the primitives table; flagging as a future
// primitive addition rather than blocking on a token here.
const GOLD_STOP_START = primitives.amber[50]; // #fff8e1
const GOLD_STOP_END = '#edd68c';
const GOLD_BORDER = primitives.amber[400];
const GOLD_TEXT = primitives.amber[700];

function InviteOnlyPill() {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.full,
        overflow: 'hidden',
        // Soft gold-tinted lift.
        shadowColor: primitives.amber[700],
        shadowOpacity: 0.16,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <LinearGradient
        colors={[GOLD_STOP_START, GOLD_STOP_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingVertical: spacing[2],
          paddingHorizontal: spacing[8],
          borderRadius: radius.full,
          borderWidth: borderWidth.thick, // 1.5
          borderColor: GOLD_BORDER,
        }}
      >
        <Text
          variant="caption10SemiBold"
          color={GOLD_TEXT}
        >
          INVITE ONLY
        </Text>
      </LinearGradient>
    </View>
  );
}

export function CardTile({
  type = 'full',
  cardImage,
  cardName,
  cashbackText,
  inviteOnly = false,
  tags = [],
  benefits = [],
  feeType = 'with-fees',
  feeProps,
  onApply,
  style,
}: CardTileProps) {
  const isFull = type === 'full';

  return (
    <View
      style={[
        {
          gap: spacing[12],
          padding: spacing[12],
          borderRadius: radius.xl,
          backgroundColor: colors.surface.default,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
        },
        elevation.light.xs,
        style,
      ]}
    >
      {/* 1. Card row */}
      <View style={{ flexDirection: 'row', gap: spacing[8] }}>
        <Image
          source={cardImage}
          style={{
            width: CARD_IMG_W,
            height: CARD_IMG_H,
            borderRadius: radius.md,
            backgroundColor: colors.surface.sunken,
          }}
          resizeMode="cover"
        />
        <View style={{ flex: 1, gap: spacing[6], justifyContent: 'center' }}>
          <Text
            variant="body16SemiBold"
            color={colors.text.primary}
            numberOfLines={2}
          >
            {cardName}
          </Text>
          {/* Commission-based reward, per product: "Flat ₹X Rewards".
              "Flat" / "Rewards" are constant; only the value (cashbackText)
              varies per card. */}
          <CashbackBadge
            size="sm"
            prefix="Flat"
            value={`${cashbackText} Rewards`}
          />
        </View>
      </View>

      {/* 2. Invite Only — only in 'full' */}
      {isFull && inviteOnly ? <InviteOnlyPill /> : null}

      {/* 3. Tags row */}
      {tags.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing[8],
          }}
        >
          {tags.map((t, i) => (
            <Tag
              key={i}
              tone="info"
              size="sm"
              appearance="gradient"
              label={t}
            />
          ))}
        </View>
      ) : null}

      {/* 4. Benefits — cap at 2 on the Home-page tile (full list is shown in
          the CardDetailSheet's features grid). Each benefit reads as ONE
          continuous line: a bold lede (title) flowing straight into the regular
          qualifier (description) via nested <Text>, so it scans as a sentence
          ("Get 5% Cashback on all online spends…") rather than a stacked pair.
          Full tiles cap at 2 lines (longer benefits crop with an ellipsis to
          keep the tile compact and uncluttered); scrollable carousel tiles
          clamp to 1 for a fixed height. */}
      {benefits.length > 0 ? (
        <View style={{ gap: spacing[8] }}>
          {benefits.slice(0, 2).map((b, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                // Top-align the icon with the first line so a two-line benefit
                // doesn't leave the icon floating in the vertical middle.
                alignItems: 'flex-start',
                gap: spacing[8],
              }}
            >
              <Icon
                name={b.icon}
                size={iconSize[16]}
                color={colors.text.tertiary}
              />
              <Text
                variant="body12Regular"
                color={colors.text.secondary}
                style={{ flex: 1 }}
                numberOfLines={isFull ? 2 : 1}
                ellipsizeMode="tail"
              >
                <Text variant="body12SemiBold" color={colors.text.primary}>
                  {b.title}
                </Text>
                {b.description ? ` ${b.description}` : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* 5. Fee strip — only in 'full' */}
      {isFull ? (
        <CardFeeStrip
          type={feeType}
          {...feeProps}
          onPress={onApply}
        />
      ) : null}
    </View>
  );
}
