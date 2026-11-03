/**
 * OrderRow — organism (Figma file P7UcoZYBnfyefmJIA8wcM7, orders/list rows:
 * cashback-with-note 4049:131984, referral 4049:132059, bonus 4049:132186,
 * tag-badge 4049:132129)
 *
 * Reconciled against LIVE Figma (file P7UcoZYBnfyefmJIA8wcM7) — see flag log
 * at the bottom of this comment. All five spec-time flags resolved.
 *
 * One parameterized FLAT list row (NOT a card): bg background/default, a 1px
 * bottom border for separation, no radius/shadow.
 *
 * Layout:
 *   root  — column, items-start, px spacing[24], py spacing[16], bottom border
 *   row 1 — header: space-between / center. Left = LogoContainer (80×48).
 *           Right = fixed 208 row (space-between / center): badge + amount
 *           group (optional inline amount + 24px Action chevron).
 *   row 2 — amount line: row, gap spacing[8], center, paddingTop spacing[8].
 *           "{type}:" label + amount value.
 *   row 3 — meta line: row, gap spacing[8], center, paddingBottom spacing[4],
 *           paddingRight spacing[8], full width. label + value packed left
 *           (both shrink-0 in Figma); value ellipsizes only if it overflows.
 *   row 4 — note (optional): paddingTop spacing[8]; collapsed = 1-line + "More",
 *           expanded = full text + "Less".
 *
 * Metropolis → Outfit substitution (Figma file's fontFamily/primary IS Outfit;
 * the 16px style still carries the legacy Metropolis "sectionTitle" = Extra Bold
 * 16/24). Mapped to Outfit tokens:
 *   amount-line label + value  (ExtraBold 16/24) → heading16ExtraBold  ✏️ FIXED
 *       └ was body16Bold (Bold); Figma is ExtraBold, and heading16ExtraBold is
 *         the exact-weight/size/lineHeight token (only delta: letterSpacing 0.4
 *         vs Figma 0 — kept token per tokens-are-law).
 *   meta label/value, "Note:", "More"/"Less" (SemiBold 12/16) → body12SemiBold
 *   note body text (Medium 12/16) → body12Medium
 *
 * Token map (per property):
 *   root bg                 → colors.background.default
 *   root bottom border      → borderWidth.thin / colors.border.default (#d9e3ec)
 *   root px / py            → spacing[24] / spacing[16]
 *   logo                    → <LogoContainer> (80×48) — REUSED atom
 *   right column width      → 208 (Figma-confirmed component width; off-scale literal)
 *   badge 'status'          → <StatusBadge size="pill"> — REUSED atom
 *   badge 'tag'             → <Tag size="xs" pill> — REUSED atom (Badges/Tags)
 *   amount chevron          → inline 24px glyph (no chevron-right in Icon
 *                             registry) / colors.icon.actions (slate900, matches
 *                             Figma "Action" 24px dark chevron)
 *   amount-line gap / padTop→ spacing[8] / spacing[8]
 *   amount-line label color → colors.text.secondary (#5c5c5c)
 *   amount value color      → colors.text.primary (#262626)
 *   meta gap / padBottom / padRight → spacing[8] / spacing[4] / spacing[8]
 *   meta label color        → colors.text.secondary
 *   meta value color        → colors.text.primary
 *   note padTop             → spacing[8]
 *   note label/More/Less    → body12SemiBold / colors.text.secondary
 *   note body               → body12Medium / colors.text.secondary
 *
 * FLAG LOG (reconciled vs live Figma):
 *   1. right-col width 208            ✅ CONFIRMED — all 4 nodes show w-[208px].
 *   2. badge sizes (status=pill,      ✅ CONFIRMED — status = CashbackStatus pill
 *      tag=xs/pill)                      (px12/py4, full radius); tag = Caption 10
 *                                        SemiBold, p8, ~16 radius. xs/pill mapping holds.
 *   3. row-1 inline ₹amount           ✅ CONFIRMED ABSENT — the row-1 "amount" group
 *                                        holds ONLY the 24px chevron in every node;
 *                                        ₹value lives solely on row 2. No prop needed.
 *                                        (referral node 4049:132059 has NO chevron at
 *                                        all — handled by showAmountChevron=false.)
 *   4. chevron (node 4049:131990)     ✅ CONFIRMED — "Action" 24px, dark/near-black
 *                                        right chevron; iconSize[24] + icon.actions match.
 *   5. 16px amount weight             ✏️ FIXED — Figma is ExtraBold (sectionTitle),
 *                                        was Bold; now heading16ExtraBold.
 */
import React, { useState } from 'react';
import {
  View,
  Pressable,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, StatusBadge, Tag, LogoContainer } from '../atoms';
import type { StatusBadgeStatus } from '../atoms';
import { haptics } from '../lib/haptics';
import {
  colors,
  spacing,
  iconSize,
  borderWidth,
} from '../tokens';
import type { ToneName } from '../tokens';

export type OrderRowType = 'cashback' | 'rewards' | 'referral' | 'bonus';
export type OrderRowBadgeVariant = 'status' | 'tag';

export interface OrderRowNote {
  text: string;
  expandable: boolean;
}

export interface OrderRowProps {
  type: OrderRowType;
  badgeVariant: OrderRowBadgeVariant;
  /** Drives the StatusBadge when badgeVariant='status'. */
  status?: StatusBadgeStatus;
  /** Drives the Tag when badgeVariant='tag'. */
  tagLabel?: string;
  tagTone?: ToneName;
  amount: string;
  showAmountChevron: boolean;
  metaLabel: string;
  metaValue: string;
  note?: OrderRowNote;
  logoSrc: ImageSourcePropType;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Fixed right-column width — Figma component spec (208), not on the scale.
const RIGHT_COL_W = 208;

const TYPE_LABEL: Record<OrderRowType, string> = {
  cashback: 'Cashback:',
  rewards: 'Rewards:',
  referral: 'Referral:',
  bonus: 'Bonus:',
};

/** 24px right-pointing Action chevron — no `chevron-right` in the Icon
 *  registry, so drawn inline (Header-organism precedent). */
function ChevronRightGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6 L15 12 L9 18"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function OrderRow({
  type,
  badgeVariant,
  status = 'pending',
  tagLabel = '',
  tagTone = 'info',
  amount,
  showAmountChevron,
  metaLabel,
  metaValue,
  note,
  logoSrc,
  onPress,
  style,
}: OrderRowProps) {
  const [expanded, setExpanded] = useState(false);

  const badge =
    badgeVariant === 'tag' ? (
      <Tag label={tagLabel} size="xs" pill tone={tagTone} />
    ) : (
      <StatusBadge status={status} size="pill" />
    );

  const body = (
    <View
      style={[
        {
          width: '100%',
          flexDirection: 'column',
          alignItems: 'flex-start',
          backgroundColor: colors.background.default,
          borderBottomWidth: borderWidth.thin,
          borderBottomColor: colors.border.default,
          paddingHorizontal: spacing[24],
          paddingVertical: spacing[16],
        },
        style,
      ]}
    >
      {/* Row 1 — header */}
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <LogoContainer source={logoSrc} />

        <View
          style={{
            width: RIGHT_COL_W,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {badge}
          {/* Amount group — only the chevron is wired (the single `amount`
              prop renders on row 2; there's no separate inline-amount prop,
              so when showAmountChevron is false this collapses to badge-only). */}
          {showAmountChevron ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4] }}
            >
              <ChevronRightGlyph size={iconSize[24]} color={colors.icon.actions} />
            </View>
          ) : null}
        </View>
      </View>

      {/* Row 2 — amount line */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing[8],
          alignItems: 'center',
          paddingTop: spacing[8],
        }}
      >
        <Text variant="heading16ExtraBold" color={colors.text.secondary}>
          {TYPE_LABEL[type]}
        </Text>
        <Text variant="heading16ExtraBold" color={colors.text.primary}>
          {amount}
        </Text>
      </View>

      {/* Row 3 — meta line */}
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          gap: spacing[8],
          alignItems: 'center',
          paddingBottom: spacing[4],
          paddingRight: spacing[8],
        }}
      >
        <Text variant="body12SemiBold" color={colors.text.secondary}>
          {metaLabel}
        </Text>
        {/* Value sits directly beside the label (Figma: both shrink-0, gap 8).
            flexShrink lets a very long value ellipsize instead of overflowing,
            but it never grows to push itself to the right edge. */}
        <Text
          variant="body12SemiBold"
          color={colors.text.primary}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ flexShrink: 1 }}
        >
          {metaValue}
        </Text>
      </View>

      {/* Row 4 — note (optional) */}
      {note ? (
        <View
          style={{
            width: '100%',
            paddingTop: spacing[8],
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing[4],
          }}
        >
          <Text
            variant="body12Medium"
            color={colors.text.secondary}
            numberOfLines={note.expandable && !expanded ? 1 : undefined}
            style={{ flex: 1 }}
          >
            <Text variant="body12SemiBold" color={colors.text.secondary}>
              Note:{' '}
            </Text>
            {note.text}
          </Text>
          {note.expandable ? (
            <Pressable onPress={() => setExpanded((e) => !e)} hitSlop={spacing[8]}>
              <Text variant="body12SemiBold" color={colors.text.secondary}>
                {expanded ? 'Less' : 'More'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return onPress ? (
    <Pressable
      onPress={() => {
        haptics.impact('light');
        onPress?.();
      }}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  ) : (
    body
  );
}
