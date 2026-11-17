/**
 * DS-ADD(ds-figma-1, 2026-11-17): variant maps for the Figma tags (status, card type, cashback tag sizes).
 * Figma: Q7235KVU3sU3HOTiibOXhv nodes 1042:2257748 (status-tag), 1049:2331859 (card-type-tag), 1046:2276333 (cashback-tag)
 * Rollback: delete this file and its test, then src/atoms/CardTypeTag.tsx, src/atoms/CashbackTag.tsx,
 * and the DS-ADD(ds-figma-1) blocks in src/atoms/Tag.tsx.
 *
 * Status-tag and card-type-tag metrics were read from the Figma Properties panel (2026-11-17, see
 * data/figma/specs-2026-11-17.md in the factory folder). Colours follow our roles, not Figma hex values.
 */
import { spacing, radius, borderWidth } from '../tokens/spacing';
import { colors } from '../tokens/colors';
import type { ToneName } from '../tokens/colors';

export type StatusTagTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/** Figma status-tone name → our tone. "Neutral" is our "gray" tone. */
export const STATUS_TAG_TONE: Record<StatusTagTone, ToneName> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'gray',
};

/**
 * Figma status-tag colours by role: fill = feedback/<tone>/subtle, border = feedback/<tone>/border,
 * label = feedback/<tone>/text. Figma "Info" uses feedback/info/on-color as fill (same pale blue role).
 * Neutral: fill color/background/muted, border color/border/default.
 */
export const STATUS_TAG_COLORS: Record<StatusTagTone, { bg: string; border: string; text: string }> = {
  success: { bg: colors.feedback.success.subtle, border: colors.feedback.success.border, text: colors.feedback.success.text },
  warning: { bg: colors.feedback.warning.subtle, border: colors.feedback.warning.border, text: colors.feedback.warning.text },
  error: { bg: colors.feedback.error.subtle, border: colors.feedback.error.border, text: colors.feedback.error.text },
  info: { bg: colors.feedback.info.subtle, border: colors.feedback.info.border, text: colors.feedback.info.text },
  neutral: { bg: colors.background.muted, border: colors.border.subtle2, text: colors.text.secondary },
};

/**
 * Figma status-tag box: min height 24, padding 4 / 8, gap 4, radius 6 (our radius.sm = 8, nearest),
 * hairline border (Figma 0.6, our hairline 0.5). Not a pill.
 */
export const STATUS_TAG_STYLE = {
  minHeight: spacing[24],
  paddingHorizontal: spacing[8],
  paddingVertical: spacing[4],
  borderRadius: radius.sm,
  borderWidth: borderWidth.hairline,
} as const;

export type CardTypeTagKind = 'lifetimeFree' | 'inviteOnly' | 'discontinued';
export type CardTypeTagPlacement = 'table' | 'general' | 'onCard';

/** Our words. Figma shows "LIFETIME FREE", "INVITE ONLY", "DISCONTINUED" (on a card: plus " CARD"). */
export const CARD_TYPE_TAG: Record<CardTypeTagKind, { label: string; tone: ToneName }> = {
  lifetimeFree: { label: 'Lifetime free', tone: 'success' },
  inviteOnly: { label: 'Invite only', tone: 'warning' },
  discontinued: { label: 'Discontinued', tone: 'gray' },
};

/** Label shown for a placement: on a card the word "card" is added, as in the design. */
export function cardTypeTagLabel(kind: CardTypeTagKind, placement: CardTypeTagPlacement): string {
  const base = CARD_TYPE_TAG[kind].label;
  return (placement === 'onCard' ? `${base} card` : base).toUpperCase();
}

/**
 * Figma card-type-tag chip metrics per placement (nodes 1049:2331850 / 51 / 52).
 * table: radius 0, thin border, padding 4 / 8, min height 20, label 9 px (we use 10, see manifest).
 * general: radius 4, hairline, padding 6 / 8, min height 24. onCard: left corners 4, right corners 0.
 */
export const CARD_TYPE_TAG_METRICS = {
  table: { minHeight: spacing[20], padV: spacing[4], padH: spacing[8], border: borderWidth.thin, tl: 0, tr: 0, br: 0, bl: 0 },
  general: { minHeight: spacing[24], padV: spacing[6], padH: spacing[8], border: borderWidth.hairline, tl: radius.xs, tr: radius.xs, br: radius.xs, bl: radius.xs },
  onCard: { minHeight: spacing[24], padV: spacing[6], padH: spacing[8], border: borderWidth.hairline, tl: radius.xs, tr: 0, br: 0, bl: radius.xs },
} as const satisfies Record<
  CardTypeTagPlacement,
  { minHeight: number; padV: number; padH: number; border: number; tl: number; tr: number; br: number; bl: number }
>;

export type CashbackTagSize = 'sm' | 'md' | 'lg';

/** Height, padding, radius key and logo size per size (Figma min heights 20 / 28 / 36). All values come from the spacing scale. */
export const CASHBACK_TAG_SIZE = {
  sm: { minHeight: spacing[20], padH: spacing[8], padV: spacing[4], radius: 'xs', logo: spacing[16], showInfo: false },
  md: { minHeight: spacing[24] + spacing[4], padH: spacing[12], padV: spacing[6], radius: 'sm', logo: spacing[24], showInfo: true },
  lg: { minHeight: spacing[32] + spacing[4], padH: spacing[16], padV: spacing[8], radius: 'md', logo: spacing[32] + spacing[4], showInfo: true },
} as const satisfies Record<
  CashbackTagSize,
  { minHeight: number; padH: number; padV: number; radius: 'xs' | 'sm' | 'md'; logo: number; showInfo: boolean }
>;
