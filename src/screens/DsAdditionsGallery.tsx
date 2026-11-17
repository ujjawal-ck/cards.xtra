/**
 * DS-ADD(ds-expansion-1, 2026-11-17): renders each part added in this batch once, with sample props.
 * Rollback: delete this file and the DS-ADD blocks in src/screens/FoundationCheck.tsx.
 * Sample data only (nothing a user can reach: FoundationCheck is registered only in __DEV__).
 *
 * DsAdditionsGallery — one section for FoundationCheck (the __DEV__ gallery).
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text, StatDelta, RankBadge, StepProgress, Skeleton } from '../atoms';
import {
  GainBand,
  CompareCard,
  RankedCardRow,
  AmountInput,
  BarBreakdown,
  StackedBar,
} from '../molecules';
import { colors, spacing } from '../tokens';
import { images } from '../assets/images';
// DS-ADD(ds-figma-1) start: imports for the Figma batch gallery
import { Tag, CashbackTag, CardTypeTag } from '../atoms';
import { BreakdownTable, SpendCard, PodiumCompare, BigAmountCard } from '../molecules';
// DS-ADD(ds-figma-1) end
// DS-ADD(ds-figma-1) start: imports for the second Figma pass (values read from Figma)
import { WalletTag, NumberBadge, TestimonialSavingsTag, StepIndicator } from '../atoms';
import { CompareTable, Stepper } from '../molecules';
import { Timer } from '../atoms';
// DS-ADD(ds-figma-1) end

const sample = images.cards.hdfcRegaliaGold;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing[8] }}>
      <Text variant="heading18SemiBold" color={colors.text.primary}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function DsAdditionsGallery() {
  const [amount, setAmount] = useState<number | null>(120000);
  const [step, setStep] = useState(2);
  const [compared, setCompared] = useState(false);
  return (
    <View style={{ gap: spacing[24] }}>
      <View style={{ gap: spacing[4] }}>
        <Text variant="heading24Bold" color={colors.text.primary}>
          DS additions (ds-expansion-1)
        </Text>
        <Text variant="body14Regular" color={colors.text.secondary}>
          Sample props only. QuizStep needs a full screen and is not shown here.
        </Text>
      </View>

      <Block title="StatDelta">
        <StatDelta label="Annual fee" value="₹590" delta="₹2,360 less" direction="down" sentiment="good" />
        <StatDelta label="Rewards" value="₹1,600" delta="₹600 more" direction="up" sentiment="good" />
        <StatDelta label="Rewards" value="₹800" delta="₹600 less" direction="down" sentiment="neutral" />
        <StatDelta label="Annual fee" value="₹1,180" delta="Same" direction="same" />
        <StatDelta
          label="Annual fee"
          value="₹590"
          delta="₹2,360 less"
          direction="down"
          sentiment="good"
          reference={{ label: 'Axis ACE', value: '₹2,950' }}
        />
        <StatDelta label="Annual fee" value="₹590" delta="₹2,360 less" direction="down" sentiment="good" layout="stack" />
      </Block>

      <Block title="RankBadge">
        <View style={{ flexDirection: 'row', gap: spacing[8] }}>
          <RankBadge rank={1} />
          <RankBadge rank={2} />
          <RankBadge rank={12} />
        </View>
      </Block>

      <Block title="RankedCardRow">
        <RankedCardRow
          rank={1}
          cardImage={sample}
          name="HDFC Regalia Gold"
          headline={{ label: 'You could save', amount: 24500, period: 'year' }}
          reason="Best for dining and travel spends"
          eligibility="eligible"
          compare={{ selected: compared, onToggle: setCompared }}
          onPress={() => undefined}
          onApply={() => undefined}
        />
      </Block>

      <Block title="AmountInput">
        <AmountInput
          label="Monthly spend"
          period="month"
          value={amount}
          onChange={setAmount}
          min={1000}
          max={10000000}
          presets={[10000, 25000, 50000]}
          hint="Between ₹1,000 and ₹1,00,00,000"
        />
      </Block>

      <Block title="StepProgress">
        <StepProgress value={step} total={6} label="Your spends" />
        <StepProgress value={6} total={6} tone="success" showCount={false} />
        <Text variant="body12SemiBold" color={colors.text.link} onPress={() => setStep((s) => (s >= 6 ? 0 : s + 1))}>
          Next step
        </Text>
      </Block>

      <Block title="Skeleton">
        <Skeleton width="60%" height={20} />
        <Skeleton height={64} radius="lg" />
      </Block>

      <Block title="BarBreakdown">
        <BarBreakdown
          showTotal
          items={[
            { label: 'Dining', value: 12000 },
            { label: 'Travel', value: 30000, note: 'Capped at ₹30,000' },
            { label: 'Fuel', value: 6000 },
          ]}
        />
      </Block>

      <Block title="StackedBar">
        <StackedBar
          segments={[
            { label: 'Rewards', value: 24000, series: 'series1' },
            { label: 'Milestones', value: 8000, series: 'series2' },
            { label: 'Lounge value', value: 4000, series: 'series3' },
            { label: 'Annual fee', value: 2950, series: 'negative' },
          ]}
        />
      </Block>

      <Block title="GainBand">
        <View style={{ gap: spacing[8] }}>
          <GainBand tone="success" icon="feat-savings-outline" amount="₹1,180" text="less a year" />
          <GainBand tone="brand" icon="feat-rewards-outline" amount="₹600" text="more Rewards" />
          <GainBand tone="info" icon="feat-fuel-outline" text="Also for Fuel" />
          <GainBand tone="purple" icon="feat-sparkle-outline" text="Adds Dining, Lounge" />
          <GainBand tone="gray" icon="feat-dot-outline" text="Similar benefits" />
          <GainBand tone="success" icon="feat-savings-outline" amount="₹1,180" text="less a year" viewed />
        </View>
      </Block>

      <Block title="CompareCard">
        <CompareCard
          cardImage={sample}
          name="Axis Bank ACE"
          sourceName="HDFC Regalia Gold"
          bandTone="success"
          bandIcon="feat-savings-outline"
          bandAmount="₹2,360"
          bandText="less a year"
          stats={[
            { label: 'Annual fee', value: '₹590', delta: '₹2,360 less', direction: 'down', sentiment: 'good' },
            { label: 'Rewards', value: 'Upto ₹1,600', delta: '₹600 more', direction: 'up', sentiment: 'good' },
          ]}
          eligible
          onPress={() => undefined}
        />
      </Block>

      {/* DS-ADD(ds-figma-1) start: gallery section for batch ds-figma-1 (sample data only) */}
      <FigmaBatchGallery />
      {/* DS-ADD(ds-figma-1) end */}
    </View>
  );
}

// DS-ADD(ds-figma-1) start: gallery for batch ds-figma-1
function FigmaBatchGallery() {
  const [spend, setSpend] = useState(2500);
  return (
    <View style={{ gap: spacing[24] }}>
      <View style={{ gap: spacing[4] }}>
        <Text variant="heading24Bold" color={colors.text.primary}>
          DS additions (ds-figma-1)
        </Text>
        <Text variant="body14Regular" color={colors.text.secondary}>
          From the great.cards Figma file. Sample props only. Not run on a device.
        </Text>
      </View>

      <Block title="Tag: status (status prop) and category">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
          <Tag label="Success" status="success" size="xs" />
          <Tag label="Warning" status="warning" size="xs" />
          <Tag label="Error" status="error" size="xs" />
          <Tag label="Info" status="info" size="xs" />
          <Tag label="Neutral" status="neutral" size="xs" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
          <Tag label="Lounge access" tone="gray" appearance="subtle" size="md" />
          <Tag label="Food ordering" tone="info" appearance="subtle" size="md" />
        </View>
      </Block>

      <Block title="CashbackTag">
        <CashbackTag size="sm" label="₹1,400 Rewards" />
        <CashbackTag size="md" label="₹1,400 Rewards" logos={[images.brands.amazon, images.brands.flipkart]} onInfoPress={() => undefined} />
        <CashbackTag size="lg" label="₹1,400 Rewards" onInfoPress={() => undefined} />
      </Block>

      <Block title="CardTypeTag">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
          <CardTypeTag kind="lifetimeFree" placement="table" />
          <CardTypeTag kind="inviteOnly" placement="general" />
          <CardTypeTag kind="discontinued" placement="onCard" />
        </View>
      </Block>

      <Block title="BreakdownTable">
        <BreakdownTable
          rows={[
            { label: 'Rewards', a: 79920, b: 79920 },
            { label: 'Milestones', a: 1000, b: 1000 },
            { label: 'Annual fee', a: -2000, b: -1000 },
          ]}
        />
      </Block>

      <Block title="SpendCard">
        <SpendCard name="Amazon" logo={images.brands.amazon} value={spend} onChange={setSpend} />
      </Block>

      <Block title="PodiumCompare">
        <PodiumCompare
          title="Flipkart"
          contextLabel="₹40,000 spends"
          a={{ name: 'Your card', image: sample, value: 3400 }}
          b={{ name: 'Our pick', image: sample, value: 5002 }}
        />
      </Block>

      <Block title="SpendCard (large)">
        <SpendCard size="large" name="Amazon" logo={images.brands.amazon} value={spend} onChange={setSpend} />
      </Block>

      <Block title="WalletTag, NumberBadge, TestimonialSavingsTag (Timer shown for comparison)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[8] }}>
          <WalletTag amount="₹1,200" />
          <NumberBadge count={3} tone="dark" />
          <NumberBadge count={3} tone="light" />
          <Timer format="hh:mm" hours={23} minutes={59} />
        </View>
        <TestimonialSavingsTag label="Saved ₹30,000 annually" />
      </Block>

      <Block title="StepIndicator kinds">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[12] }}>
          <StepIndicator kind="done" />
          <StepIndicator kind="current" />
          <StepIndicator kind="locked" />
          <StepIndicator kind="info" />
          <StepIndicator kind="footprints" />
          <StepIndicator kind="cashback" />
          <StepIndicator kind="image" image={sample} />
        </View>
      </Block>

      <Block title="Stepper">
        <Stepper
          currentIndex={1}
          steps={[
            { title: '1 Marriott Free Night Award (Worth ~₹15,000)', subtext: 'Spend ₹9,00,000 in 365 days' },
            { title: '1 Marriott Free Night Award (Worth ~₹15,000)', subtext: 'Spend ₹9,00,000 in 365 days' },
            { title: '1 Marriott Free Night Award (Worth ~₹15,000)', subtext: 'Spend ₹9,00,000 in 365 days' },
          ]}
        />
      </Block>

      <Block title="CompareTable">
        <CompareTable
          cornerLabel="Card"
          selectedColumnId="fee"
          onSelectColumn={() => undefined}
          columns={[
            { id: 'fee', header: 'Annual fee' },
            { id: 'milestone', header: 'Milestone' },
            { id: 'lounge', header: 'Lounge access' },
            { id: 'forex', header: 'Forex markup' },
          ]}
          rows={[
            {
              id: 'a',
              hero: (
                <View style={{ padding: spacing[8], gap: spacing[8], alignItems: 'center' }}>
                  <CardTypeTag kind="lifetimeFree" placement="table" />
                  <Text variant="body12Medium" color={colors.text.primary} align="center">
                    HDFC Regalia Gold
                  </Text>
                </View>
              ),
              values: ['₹2,500', '₹500', '12 a year', '3.5%'],
            },
            {
              id: 'b',
              hero: (
                <View style={{ padding: spacing[8], gap: spacing[8], alignItems: 'center' }}>
                  <CardTypeTag kind="inviteOnly" placement="table" />
                  <Text variant="body12Medium" color={colors.text.primary} align="center">
                    Axis Magnus
                  </Text>
                </View>
              ),
              values: ['₹12,500', '₹1,000', 'Unlimited', '2%'],
            },
          ]}
        />
      </Block>

      <Block title="BigAmountCard">
        <BigAmountCard
          amount={1200}
          label="Rewards from this order"
          status={{ label: 'Pending', tone: 'warning' }}
          note="Your Rewards for this order will remain pending until the store confirms."
          onReadMore={() => undefined}
        />
      </Block>
    </View>
  );
}
// DS-ADD(ds-figma-1) end
