/**
 * LeagueCardRow: one row of the league table (ToolResultsScreen).
 *
 * Top: rank (position in the current view), card art, name, bank, status
 * labels ("Lifetime free", "Invite only", "Discontinued") and "Your card".
 * Then the headline "Annual savings ₹X" (the positive money colour only above 0).
 *  - view 'quick': the sum in one line of small cells,
 *    Savings + Milestones (+ Lounge, only above 0) - Annual fee = Annual savings.
 *    A fee the bank waives shows as ₹0 with the tag "Waived at your spend".
 *    Plus the CashKaro Rewards text of the app card, when it has one.
 *  - view 'category': one cell per column (rupees a year from `yearlyForKey`),
 *    with a "Top" tag on the highest value of each key among the visible rows.
 *
 * Memoised: pass a stable `row`, `columns`, `tops` and callbacks. `searchHit`
 * and `mine` are plain booleans so a search step re-renders only two rows.
 * A row without an app card (`row.card` undefined) has no Apply.
 * Tokens and atoms only.
 */
import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { Text, Tag, RankBadge, Button, RemoteImage, CashbackBadge } from '../atoms';
import { colors, spacing, radius, borderWidth, elevation, opacity } from '../tokens';
import { formatINR } from '../lib/money';
import { CARD_TYPE_TAG } from '../lib/tagVariants';
import { yearlyForKey, type LeagueRowOf } from '../lib/cardTools';
import { cardLabels, rowSum, type LeagueColumn } from '../lib/leagueView';
import type { CardModel } from './CardTile';

const ART_W = spacing[64];
const ART_ASPECT = 132 / 84; // CardTile art ratio

export interface LeagueCardRowProps {
  row: LeagueRowOf<CardModel>;
  /** 1-based position in the current view (after filters and sort). */
  rank: number;
  view: 'quick' | 'category';
  /** "By category" cells. */
  columns: LeagueColumn[];
  /** Highest yearly value per key among the visible rows (only keys above 0). */
  tops: Record<string, number>;
  /** The current search match: outlined. */
  searchHit?: boolean;
  /** The user's own card: tinted and labelled "Your card". */
  mine?: boolean;
  onPress: (row: LeagueRowOf<CardModel>) => void;
  /** Shown only when the row has an app card. */
  onApply?: (row: LeagueRowOf<CardModel>) => void;
}

function Cell({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <View style={{ gap: spacing[2] }}>
      <Text variant="caption10Regular" color={colors.text.tertiary} numberOfLines={1}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
        <Text variant="body12SemiBold" color={colors.text.primary}>
          {value}
        </Text>
        {children}
      </View>
    </View>
  );
}

function Op({ sign }: { sign: string }) {
  return (
    <Text variant="body12Regular" color={colors.text.tertiary} style={{ alignSelf: 'flex-end' }}>
      {sign}
    </Text>
  );
}

function LeagueCardRowImpl({
  row,
  rank,
  view,
  columns,
  tops,
  searchHit = false,
  mine = false,
  onPress,
  onApply,
}: LeagueCardRowProps) {
  const { savings, card } = row;
  const sum = rowSum(savings);
  const name = card?.name ?? savings.name;
  const bank = savings.bankName ?? card?.filterMeta?.bankName;
  const labels = cardLabels(savings);
  const reward = card?.cashbackValue ? card.cashbackValue.trim() : '';
  const headline = formatINR(sum.net);
  const artStyle = {
    width: ART_W,
    aspectRatio: ART_ASPECT,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.sunken,
  };

  return (
    <Pressable
      onPress={() => onPress(row)}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${rank}. ${name}.${mine ? ' Your card.' : ''} Annual savings ${headline}.`}
      accessibilityHint="Shows how the savings add up"
      style={({ pressed }) => [
        {
          gap: spacing[8],
          padding: spacing[12],
          borderRadius: radius.lg,
          borderWidth: searchHit ? borderWidth.heavy : borderWidth.thin,
          borderColor: searchHit ? colors.border.focussed : colors.border.subtle3,
          backgroundColor: mine ? colors.surface.emphasis : colors.surface.default,
          opacity: pressed ? opacity[80] : opacity[100],
        },
        elevation.light.xs,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[8] }}>
        <RankBadge rank={rank} />
        {card ? (
          <Image source={card.cardImage} style={artStyle} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : savings.imageUrl ? (
          <RemoteImage
            source={{ uri: savings.imageUrl }}
            style={artStyle}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={artStyle} />
        )}
        <View style={{ flex: 1, gap: spacing[2] }}>
          <Text variant="body14SemiBold" color={colors.text.primary} numberOfLines={2}>
            {name}
          </Text>
          {bank ? (
            <Text variant="body12Regular" color={colors.text.secondary} numberOfLines={1}>
              {bank}
            </Text>
          ) : null}
          {labels.length > 0 || mine ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4], paddingTop: spacing[2] }}>
              {mine ? <Tag size="xxs" label="Your card" tone="brand" /> : null}
              {labels.map((kind) => (
                <Tag key={kind} size="xxs" label={CARD_TYPE_TAG[kind].label} tone={CARD_TYPE_TAG[kind].tone} />
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[6] }}>
        <Text variant="body12Regular" color={colors.text.secondary}>
          Annual savings
        </Text>
        <Text variant="body16SemiBold" color={sum.net > 0 ? colors.feedback.success.text : colors.text.primary}>
          {headline}
        </Text>
      </View>

      {view === 'quick' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: spacing[6], rowGap: spacing[4] }}>
          <Cell label="Savings" value={formatINR(sum.savings)} />
          <Op sign="+" />
          <Cell label="Milestones" value={formatINR(sum.milestones)} />
          {sum.lounge > 0 ? (
            <>
              <Op sign="+" />
              <Cell label="Lounge" value={formatINR(sum.lounge)} />
            </>
          ) : null}
          <Op sign="-" />
          <Cell label="Annual fee" value={formatINR(sum.feeCounted)}>
            {sum.feeWaived && sum.fee > 0 ? <Tag size="xxs" label="Waived at your spend" tone="success" /> : null}
          </Cell>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing[12], rowGap: spacing[6] }}>
          {columns.map((c) => {
            const v = yearlyForKey(savings, c.key);
            return (
              <Cell key={c.key} label={c.label} value={formatINR(v)}>
                {v > 0 && tops[c.key] === v ? <Tag size="xxs" label="Top" tone="success" /> : null}
              </Cell>
            );
          })}
          {/* The rest of the sum, so the cells add up to the annual savings above. */}
          {sum.milestones > 0 ? <Cell label="Milestones" value={formatINR(sum.milestones)} /> : null}
          {sum.lounge > 0 ? <Cell label="Lounge" value={formatINR(sum.lounge)} /> : null}
          {sum.fee > 0 ? (
            <Cell label="Annual fee" value={sum.feeCounted > 0 ? `-${formatINR(sum.feeCounted)}` : formatINR(0)}>
              {sum.feeWaived ? <Tag size="xxs" label="Waived at your spend" tone="success" /> : null}
            </Cell>
          ) : null}
        </View>
      )}

      {view === 'quick' && reward && card ? (
        <CashbackBadge size="sm" prefix={card.rewardPrefix ?? 'Flat'} value={`${reward} Rewards`} />
      ) : null}

      {onApply && card ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Button label="Apply now" size={36} onPress={() => onApply(row)} />
        </View>
      ) : null}
    </Pressable>
  );
}

export const LeagueCardRow = React.memo(LeagueCardRowImpl);
