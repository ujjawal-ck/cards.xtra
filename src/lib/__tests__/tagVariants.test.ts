import {
  STATUS_TAG_TONE,
  CARD_TYPE_TAG,
  cardTypeTagLabel,
  CASHBACK_TAG_SIZE,
  STATUS_TAG_COLORS,
  STATUS_TAG_STYLE,
  CARD_TYPE_TAG_METRICS,
} from '../tagVariants';
import { colors } from '../../tokens/colors';

describe('tagVariants', () => {
  it('maps every status tone to an existing colors.tones key', () => {
    for (const tone of Object.values(STATUS_TAG_TONE)) {
      expect(colors.tones[tone]).toBeDefined();
    }
    expect(STATUS_TAG_TONE.neutral).toBe('gray');
  });

  it('maps every card type to an existing tone', () => {
    for (const v of Object.values(CARD_TYPE_TAG)) {
      expect(colors.tones[v.tone]).toBeDefined();
    }
  });

  it('upper-cases labels and adds "card" only on a card', () => {
    expect(cardTypeTagLabel('lifetimeFree', 'table')).toBe('LIFETIME FREE');
    expect(cardTypeTagLabel('inviteOnly', 'general')).toBe('INVITE ONLY');
    expect(cardTypeTagLabel('discontinued', 'onCard')).toBe('DISCONTINUED CARD');
  });

  it('never says "gift card"', () => {
    const all = Object.values(CARD_TYPE_TAG).map((v) => v.label.toLowerCase()).join(' ');
    expect(all).not.toMatch(/gift/);
  });

  it('cashback tag sizes grow', () => {
    expect(CASHBACK_TAG_SIZE.sm.minHeight).toBeLessThan(CASHBACK_TAG_SIZE.md.minHeight);
    expect(CASHBACK_TAG_SIZE.md.minHeight).toBeLessThan(CASHBACK_TAG_SIZE.lg.minHeight);
  });

  it('gives every status tone a fill, border and label colour', () => {
    for (const tone of ['success', 'warning', 'error', 'info', 'neutral'] as const) {
      const c = STATUS_TAG_COLORS[tone];
      expect(c.bg).toBeTruthy();
      expect(c.border).toBeTruthy();
      expect(c.text).toBeTruthy();
    }
    expect(STATUS_TAG_COLORS.success.bg).toBe(colors.feedback.success.subtle);
  });

  it('keeps the Figma status-tag box: min height 24, padding 4 / 8, not a pill', () => {
    expect(STATUS_TAG_STYLE.minHeight).toBe(24);
    expect(STATUS_TAG_STYLE.paddingVertical).toBe(4);
    expect(STATUS_TAG_STYLE.paddingHorizontal).toBe(8);
    expect(STATUS_TAG_STYLE.borderRadius).toBeLessThan(24);
  });

  it('keeps the Figma card-type metrics: square in a table, left corners only on a card', () => {
    expect(CARD_TYPE_TAG_METRICS.table.tl).toBe(0);
    expect(CARD_TYPE_TAG_METRICS.table.minHeight).toBe(20);
    expect(CARD_TYPE_TAG_METRICS.general.padV).toBe(6);
    expect(CARD_TYPE_TAG_METRICS.onCard.tl).toBeGreaterThan(0);
    expect(CARD_TYPE_TAG_METRICS.onCard.tr).toBe(0);
    expect(CARD_TYPE_TAG_METRICS.onCard.br).toBe(0);
  });
});
