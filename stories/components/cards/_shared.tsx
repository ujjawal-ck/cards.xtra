/** Shared story chrome and fixtures for the Cards family. Not a story file. */
import React from 'react';
import { View, Text as RNText } from 'react-native';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import type { CardModel } from '../../../src/molecules/CardTile';
import type { CardSavings } from '../../../src/lib/cardTools';
import type { LeagueRowOf } from '../../../src/lib/cardTools';
import { colors, spacing, typography } from '../../../src/tokens';

export { SAMPLE_CARDS };
export type { CardModel };

export const FRAME = 390;
export const Frame = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: FRAME, padding: spacing[16], gap: spacing[12] }}>{children}</View>
);
export const Label = ({ children }: { children: React.ReactNode }) => (
  <RNText style={{ ...typography.caption10Medium, color: colors.text.tertiary }}>{children}</RNText>
);

/** "HDFC Bank Regalia Gold Credit Card" -> "HDFC Bank Regalia Gold". */
export const short = (c: CardModel) => c.name.replace(/ Credit Card$/, '');
export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Select control that picks a SAMPLE_CARDS entry by id. */
export const cardControl = {
  control: 'select' as const,
  options: SAMPLE_CARDS.map((c) => c.id),
  mapping: Object.fromEntries(SAMPLE_CARDS.map((c) => [c.id, c])),
};

type LineIn = [key: string, label: string, monthly: number];
interface SavingsIn {
  alias: string;
  name: string;
  bank?: string;
  lines: LineIn[];
  extra?: number;
  lounge?: number;
  fee: number;
  waived?: boolean;
  lifetimeFree?: boolean;
  inviteOnly?: boolean;
  discontinued?: boolean;
  /** Overrides the yearly savings the lines add up to (for extreme values). */
  yearlyOverride?: number;
}

/** Builds a CardSavings so that net = savings + milestones + lounge - counted fee. No imageUrl: nothing loads from the network. */
export function savings(i: SavingsIn): CardSavings {
  const yearly = i.yearlyOverride ?? i.lines.reduce((s, l) => s + l[2] * 12, 0);
  const counted = i.waived ? 0 : i.fee;
  const extra = i.extra ?? 0;
  const lounge = i.lounge ?? 0;
  return {
    alias: i.alias,
    name: i.name,
    bankName: i.bank,
    discontinued: !!i.discontinued,
    inviteOnly: !!i.inviteOnly,
    lifetimeFree: !!i.lifetimeFree,
    monthlySavings: Math.round(yearly / 12),
    yearlySavings: yearly,
    extraBenefits: extra,
    joiningFee: i.fee,
    annualFee: i.fee,
    loungeValue: lounge,
    feeWaiverSpend: i.waived ? 200000 : 0,
    feeWaived: !!i.waived,
    annualFeeCounted: counted,
    netYearly: yearly + extra + lounge - counted,
    lines: i.lines.map(([key, label, m]) => ({ key, label, spend: m * 10, savings: m, explanation: '' })),
  };
}

const AMZ = 'amazon_spends';
const FOOD = 'online_food_ordering';
export const COLUMNS = [
  { key: AMZ, label: 'Amazon' },
  { key: FOOD, label: 'Food delivery' },
] as { key: any; label: string }[];

const byId = (id: string) => SAMPLE_CARDS.find((c) => c.id === id)!;

export const S_REGALIA = savings({ alias: 'hdfc-regalia-gold', name: 'HDFC Bank Regalia Gold Credit Card', bank: 'HDFC Bank', lines: [[AMZ, 'Amazon', 600], [FOOD, 'Food delivery', 300]], extra: 2500, fee: 2500, inviteOnly: true });
export const S_SWIGGY = savings({ alias: 'hdfc-swiggy', name: 'HDFC Swiggy Credit Card', bank: 'HDFC Bank', lines: [[AMZ, 'Amazon', 200], [FOOD, 'Food delivery', 450]], fee: 0, lifetimeFree: true });
export const S_SBI = savings({ alias: 'sbi-cashback', name: 'SBI Cashback Credit Card', bank: 'SBI Card', lines: [[AMZ, 'Amazon', 500], [FOOD, 'Food delivery', 100]], extra: 2000, fee: 999, waived: true });
export const S_MAGNUS = savings({ alias: 'axis-magnus', name: 'Axis Bank Magnus Credit Card', bank: 'Axis Bank', lines: [[AMZ, 'Amazon', 300], [FOOD, 'Food delivery', 600]], extra: 3500, lounge: 4800, fee: 12500, inviteOnly: true, discontinued: true });
export const S_NOT_IN_APP = savings({ alias: 'not-in-app', name: 'Federal Bank Celesta Credit Card', bank: 'Federal Bank', lines: [[AMZ, 'Amazon', 100], [FOOD, 'Food delivery', 0]], fee: 5000 });
export const S_BIG = savings({ alias: 'big', name: 'Premium Travel Credit Card with a Very Long Name That Needs Two Lines', bank: 'A Bank With A Long Name Limited', lines: [[AMZ, 'Amazon', 0]], yearlyOverride: 1000000, fee: 0, lifetimeFree: true });
export const S_ZERO = savings({ alias: 'zero', name: 'ICICI Bank Coral Credit Card', bank: 'ICICI Bank', lines: [[AMZ, 'Amazon', 0], [FOOD, 'Food delivery', 0]], fee: 0, lifetimeFree: true });

export const row = (rank: number, s: CardSavings, cardId?: string): LeagueRowOf<CardModel> => ({ rank, savings: s, ...(cardId ? { card: byId(cardId) } : {}) });
export const ROWS = [
  row(1, S_REGALIA, 'hdfc-regalia-gold'),
  row(2, S_SBI, 'sbi-cashback'),
  row(3, S_SWIGGY, 'hdfc-swiggy'),
  row(4, S_MAGNUS, 'axis-magnus'),
  row(5, S_NOT_IN_APP),
];
