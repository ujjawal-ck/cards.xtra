/**
 * SavingsBreakdownSheet: the "why this card" sheet of the league table.
 *
 * Opened from a league row with `present(row, focusKey?)`. Top to bottom:
 *  1. Card art, bank, name, status labels.
 *  2. Box "On spends of ₹X a year": Savings, Milestone benefits, Lounge
 *     benefits (only above 0), Annual fee (struck and "Waived" when the bank
 *     waives it, with the bank threshold line from `feeWaiverSpend`), and
 *     "Your annual savings" (`netYearly`).
 *  3. "Where the savings come from": one chip per in-total line with a spend,
 *     a Yearly / Monthly toggle, then spend, rate (only what the API sent:
 *     X% from `cashbackPct`, or points earned and the value of one point),
 *     savings and the API explanation text.
 *  4. With an app card: the CashKaro Rewards line, "View card details" and a
 *     sticky "Apply now" (both hidden by `hideApply`). Without one: "You cannot
 *     apply for this card in this app." and no actions.
 *
 * Actions: "View card details" dismisses this sheet first, then calls
 * `onViewCard` (the card detail sheet opens alone). "Apply now" calls `onApply`
 * and leaves this sheet open, like CardDetailSheet does.
 *
 * Built like EligibilityCheckerSheet: BottomSheetModal, BottomSheetHeader as
 * the handle, BottomSheetScrollView body, BottomSheetFooter for the sticky CTA.
 * Tokens and atoms only. Not run on a device.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, Image, type ImageSourcePropType } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Tag, Chip, Button, Divider, RemoteImage, CashbackBadge } from '../atoms';
import { TabsSecondary } from '../molecules';
import type { CardModel } from '../molecules';
import { colors, spacing, radius, borderWidth, opacity } from '../tokens';
import { BottomSheetHeader } from './BottomSheetHeader';
import { formatINR } from '../lib/money';
import { CARD_TYPE_TAG } from '../lib/tagVariants';
import type { LeagueRowOf } from '../lib/cardTools';
import {
  breakdownLines,
  cardLabels,
  lineFigures,
  rowSum,
  type BreakdownPeriod,
} from '../lib/leagueView';

type Row = LeagueRowOf<CardModel>;

export interface SavingsBreakdownSheetProps {
  /** Rupees a year, from totalYearlySpend(spends). */
  yearlySpend: number;
  /** Column labels for brand runs; default labels come from the lines. */
  labelForKey?: (key: string) => string | undefined;
  /** Shown only when row.card exists. */
  onViewCard?: (card: CardModel) => void;
  /** Shown only when row.card exists. */
  onApply?: (card: CardModel) => void;
  /** Hide Apply and "View card details" (the user's own card: the card page has its own Apply). */
  hideApply?: boolean;
}

export interface SavingsBreakdownSheetHandle {
  present(row: Row, focusKey?: string): void;
  dismiss(): void;
}

const SNAP_POINTS = ['75%', '96%'];
const PERIODS: BreakdownPeriod[] = ['year', 'month'];
const ART_W = spacing[96];
const ART_ASPECT = 132 / 84; // CardTile art ratio
const CTA_H = 52;
// Same pan limits as CardDetailSheet: the sheet pans only on clear vertical
// moves, so the horizontal chip row keeps its swipes (Android ate them without).
const PAN_ACTIVE_OFFSET_Y: [number, number] = [-spacing[12], spacing[12]];
const PAN_FAIL_OFFSET_X: [number, number] = [-spacing[8], spacing[8]];

function SumLine({
  label,
  value,
  strong = false,
  children,
}: {
  label: string;
  value: string;
  strong?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
      <Text variant={strong ? 'body14SemiBold' : 'body14Regular'} color={colors.text.primary} style={{ flex: 1 }}>
        {label}
      </Text>
      {children}
      <Text variant={strong ? 'body16SemiBold' : 'body14Medium'} color={colors.text.primary}>
        {value}
      </Text>
    </View>
  );
}

export const SavingsBreakdownSheet = forwardRef<SavingsBreakdownSheetHandle, SavingsBreakdownSheetProps>(
  function SavingsBreakdownSheet({ yearlySpend, labelForKey, onViewCard, onApply, hideApply = false }, ref) {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const [row, setRow] = useState<Row | null>(null);
    const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
    const [period, setPeriod] = useState<BreakdownPeriod>('year');
    const [presentSeq, setPresentSeq] = useState(0);

    // Present after the new row has committed to state (useCardDetailSheet's pattern).
    useEffect(() => {
      if (presentSeq > 0) sheetRef.current?.present();
    }, [presentSeq]);

    useImperativeHandle(
      ref,
      () => ({
        present(next: Row, focusKey?: string) {
          setRow(next);
          setActiveKey(focusKey);
          setPeriod('year');
          setPresentSeq((s) => s + 1);
        },
        dismiss() {
          sheetRef.current?.dismiss();
        },
      }),
      [],
    );

    const savings = row?.savings;
    const card = row?.card;
    const lines = useMemo(() => (savings ? breakdownLines(savings) : []), [savings]);
    const line = lines.find((l) => l.key === activeKey) ?? lines[0];
    const figures = line ? lineFigures(line, period) : undefined;
    const sum = savings ? rowSum(savings) : undefined;
    const showApply = !!card && !hideApply && !!onApply;
    const reward = card?.cashbackValue ? card.cashbackValue.trim() : '';

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={opacity[50]} />
      ),
      [],
    );

    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) =>
        showApply && card ? (
          <BottomSheetFooter {...props} bottomInset={0}>
            <View
              style={{
                backgroundColor: colors.surface.default,
                paddingHorizontal: spacing[16],
                paddingTop: spacing[12],
                paddingBottom: insets.bottom + spacing[12],
                borderTopWidth: borderWidth.thin,
                borderTopColor: colors.border.subtle3,
              }}
            >
              <Button label="Apply now" size={CTA_H} fullWidth icon="trailing" iconName="chevron-right" onPress={() => onApply?.(card)} />
            </View>
          </BottomSheetFooter>
        ) : null,
      [showApply, card, onApply, insets.bottom],
    );

    const art: ImageSourcePropType | undefined = card
      ? card.cardImage
      : savings?.imageUrl
        ? { uri: savings.imageUrl }
        : undefined;
    const name = card?.name ?? savings?.name ?? '';
    const bank = savings?.bankName ?? card?.filterMeta?.bankName;
    const lineLabel = (key: string, fallback: string) => labelForKey?.(key) ?? fallback;

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        enableDynamicSizing={false}
        activeOffsetY={PAN_ACTIVE_OFFSET_Y}
        failOffsetX={PAN_FAIL_OFFSET_X}
        backdropComponent={renderBackdrop}
        footerComponent={showApply ? renderFooter : undefined}
        handleComponent={() => null}
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: (showApply ? CTA_H + spacing[24] : 0) + insets.bottom + spacing[24],
          }}
        >
          <BottomSheetHeader />
          {savings && sum ? (
            <View style={{ paddingHorizontal: spacing[16], gap: spacing[16] }}>
              {/* 1. Card */}
              <View style={{ flexDirection: 'row', gap: spacing[12], alignItems: 'center' }}>
                {art ? (
                  card ? (
                    <Image
                      source={art}
                      accessibilityIgnoresInvertColors
                      style={{ width: ART_W, aspectRatio: ART_ASPECT, borderRadius: radius.sm, backgroundColor: colors.surface.sunken }}
                      resizeMode="cover"
                    />
                  ) : (
                    <RemoteImage
                      source={art}
                      accessibilityIgnoresInvertColors
                      style={{ width: ART_W, aspectRatio: ART_ASPECT, borderRadius: radius.sm, backgroundColor: colors.surface.sunken }}
                      resizeMode="cover"
                    />
                  )
                ) : (
                  <View style={{ width: ART_W, aspectRatio: ART_ASPECT, borderRadius: radius.sm, backgroundColor: colors.surface.sunken }} />
                )}
                <View style={{ flex: 1, gap: spacing[4] }}>
                  {bank ? (
                    <Text variant="body12Regular" color={colors.text.secondary} numberOfLines={1}>
                      {bank}
                    </Text>
                  ) : null}
                  <Text variant="body16SemiBold" color={colors.text.primary} numberOfLines={3}>
                    {name}
                  </Text>
                  {cardLabels(savings).length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] }}>
                      {cardLabels(savings).map((kind) => (
                        <Tag key={kind} size="xxs" label={CARD_TYPE_TAG[kind].label} tone={CARD_TYPE_TAG[kind].tone} />
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              {/* 2. The sum */}
              <View
                style={{
                  gap: spacing[12],
                  padding: spacing[16],
                  borderRadius: radius.lg,
                  borderWidth: borderWidth.thin,
                  borderColor: colors.border.subtle3,
                  backgroundColor: colors.surface.default2,
                }}
              >
                <Text variant="body14SemiBold" color={colors.text.secondary}>
                  {`On spends of ${formatINR(yearlySpend)} a year`}
                </Text>
                <SumLine label="Savings" value={formatINR(sum.savings)} />
                <SumLine label="Milestone benefits" value={formatINR(sum.milestones)} />
                {sum.lounge > 0 ? <SumLine label="Lounge benefits" value={formatINR(sum.lounge)} /> : null}
                <SumLine label="Annual fee" value={sum.feeCounted > 0 ? `-${formatINR(sum.feeCounted)}` : formatINR(0)}>
                  {sum.feeWaived && sum.fee > 0 ? (
                    <>
                      <Tag size="xxs" label="Waived" tone="success" />
                      <Text
                        variant="body12Regular"
                        color={colors.text.tertiary}
                        style={{ textDecorationLine: 'line-through' }}
                      >
                        {formatINR(sum.fee)}
                      </Text>
                    </>
                  ) : null}
                </SumLine>
                {savings.feeWaiverSpend > 0 && sum.fee > 0 ? (
                  <Text variant="body12Regular" color={colors.feedback.success.text}>
                    {`The bank waives the annual fee when you spend ${formatINR(savings.feeWaiverSpend)} or more in a year.`}
                  </Text>
                ) : null}
                <Divider />
                <SumLine label="Your annual savings" value={formatINR(sum.net)} strong />
              </View>

              {/* 3. Where the savings come from */}
              <View style={{ gap: spacing[12] }}>
                <Text variant="body16SemiBold" color={colors.text.primary}>
                  Where the savings come from
                </Text>
                {line && figures ? (
                  <>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: spacing[8] }}
                    >
                      {lines.map((l) => (
                        <Chip
                          key={l.key}
                          type="tab"
                          label={lineLabel(l.key, l.label)}
                          state={l.key === line.key ? 'selected' : 'default'}
                          onPress={() => setActiveKey(l.key)}
                        />
                      ))}
                    </ScrollView>
                    <TabsSecondary
                      segments={[{ label: 'Yearly' }, { label: 'Monthly' }]}
                      activeIndex={PERIODS.indexOf(period)}
                      onChange={(i) => setPeriod(PERIODS[i] ?? 'year')}
                    />
                    <View
                      style={{
                        gap: spacing[12],
                        padding: spacing[16],
                        borderRadius: radius.lg,
                        backgroundColor: colors.background.lavender,
                      }}
                    >
                      <SumLine
                        label={period === 'year' ? 'Spend in a year' : 'Spend in a month'}
                        value={formatINR(figures.spend)}
                      />
                      {figures.rate?.kind === 'percent' ? (
                        <SumLine label="Cashback rate" value={`${figures.rate.percent}%`} />
                      ) : null}
                      {figures.rate?.kind === 'points' ? (
                        <>
                          <SumLine
                            label={period === 'year' ? 'Points earned in a year' : 'Points earned in a month'}
                            value={String(figures.rate.points)}
                          />
                          {figures.rate.pointValue !== undefined ? (
                            <SumLine label="Value of 1 point" value={formatINR(figures.rate.pointValue)} />
                          ) : null}
                        </>
                      ) : null}
                      <SumLine label="Savings" value={formatINR(figures.savings)} strong />
                      {figures.explanation ? (
                        <Text variant="body12Regular" color={colors.text.secondary}>
                          {figures.explanation}
                        </Text>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <Text variant="body14Regular" color={colors.text.secondary}>
                    This card saves nothing on the spends you entered.
                  </Text>
                )}
              </View>

              {/* 4. Actions */}
              {card ? (
                <View style={{ gap: spacing[12] }}>
                  {reward ? (
                    <CashbackBadge size="sm" prefix={card.rewardPrefix ?? 'Flat'} value={`${reward} Rewards`} />
                  ) : null}
                  {onViewCard && !hideApply ? (
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={spacing[8]}
                      onPress={() => {
                        sheetRef.current?.dismiss();
                        onViewCard(card);
                      }}
                      style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? opacity[80] : opacity[100] })}
                    >
                      <Text variant="body14SemiBold" color={colors.text.link}>
                        View card details
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text variant="body14Regular" color={colors.text.secondary}>
                  You cannot apply for this card in this app.
                </Text>
              )}
            </View>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
