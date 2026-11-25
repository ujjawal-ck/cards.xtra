/**
 * Helpers for the card tool flows (4a to 4d, 4 Shared result). Not a story file.
 * - TapScript: a short DOM click sequence for states that only a tap reaches (quiz step N, a filter on).
 * - answers and params that every tool story shares.
 * - league rows built from the calculate fixture, for the sheet stories.
 */
import React, { useEffect } from 'react';
import { buildBankDirectory, mapBkCardToCardModel } from '../../../src/api/cardMapper';
import { buildLeague, mapCalculateResponse, rankByNetValue, type SpendKey } from '../../../src/lib/cardTools';
import type { CardModel } from '../../../src/molecules';
import { BK_CARDS, calculateFixture, initBundleFixture, spends, clone, reply } from '../../../storybook/fixtures';

/** What the user typed, in question units (monthly rupees, yearly rupees, visits a year). */
export const ANSWERS: Partial<Record<SpendKey, number>> = {
  amazon_spends: 8000,
  flipkart_spends: 4000,
  online_food_ordering: 3000,
  offline_grocery: 6000,
  fuel: 3000,
  mobile_phone_bills: 800,
  electricity_bills: 2500,
};

/** The same spends in the calculate call shape. */
export const SPENDS = spends({ ...ANSWERS });

// ── Tap script ───────────────────────────────────────────────────────────────

export type TapStep =
  | { click: string; prefix?: boolean; times?: number }
  | { type: string; into: string; blur?: boolean }
  | { wait: number };

const INTERACTIVE = '[role="button"],[role="switch"],[role="checkbox"],[role="tab"],[role="radio"],[role="link"],button,a,[tabindex="0"]';

function visible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function findTarget(text: string, prefix: boolean): Element | null {
  const test = (s: string | null) => s !== null && (prefix ? s.trim().startsWith(text) : s.trim() === text);
  const byLabel = Array.from(document.querySelectorAll('[aria-label]')).filter((e) => test(e.getAttribute('aria-label')) && visible(e));
  if (byLabel[0]) return byLabel[0];
  const hit = (e: Element) => test(e.textContent);
  const byText = Array.from(document.querySelectorAll('div,span,button,a')).filter(
    (e) => hit(e) && visible(e) && !Array.from(e.children).some(hit),
  );
  const el = byText[0];
  if (!el) return null;
  return el.closest(INTERACTIVE) ?? el;
}

function findInput(into: string): HTMLInputElement | null {
  const els = Array.from(document.querySelectorAll('input,textarea')) as HTMLInputElement[];
  return els.find((e) => (e.getAttribute('aria-label') === into || e.placeholder === into) && visible(e)) ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor<T>(get: () => T | null, ms = 8000): Promise<T | null> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = get();
    if (v) return v;
    await sleep(100);
  }
  return null;
}

/**
 * Runs the steps once after mount, with a pause after each. A step that finds nothing in 8 s
 * is skipped, and the story stays where it got to. Render it next to the harness.
 */
export function TapScript({ steps, startMs = 900, gapMs = 350 }: { steps: TapStep[]; startMs?: number; gapMs?: number }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await sleep(startMs);
      for (const step of steps) {
        if (cancelled) return;
        if ('wait' in step) {
          await sleep(step.wait);
          continue;
        }
        if ('click' in step) {
          for (let i = 0; i < (step.times ?? 1); i += 1) {
            const el = await waitFor(() => findTarget(step.click, !!step.prefix));
            if (cancelled || !el) break;
            (el as HTMLElement).click();
            await sleep(gapMs);
          }
          continue;
        }
        const input = await waitFor(() => findInput(step.into));
        if (cancelled || !input) continue;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        input.focus();
        setter?.call(input, step.type);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        if (step.blur) input.blur();
        await sleep(gapMs);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── Calculate fixtures ───────────────────────────────────────────────────────

/** The league fixture, cloned, with only the rows whose card has a joining fee (nothing is lifetime free). */
export function calcAllPaid() {
  const body = clone(calculateFixture.league);
  body.data.savings = body.data.savings.filter((s: { joining_fees?: string }) => Number(s.joining_fees) > 0);
  return body;
}

/** The league fixture with the second row a copy of the first: the two cards tie on yearly savings. */
export function calcTie() {
  const body = clone(calculateFixture.league);
  const list = body.data.savings as Array<Record<string, unknown>>;
  const [a, b] = list;
  list[1] = { ...clone(a), id: b.id, card_name: b.card_name, seo_card_alias: b.seo_card_alias };
  return body;
}

// ── League rows for the sheet stories ───────────────────────────────────────

const bankDir = buildBankDirectory(initBundleFixture.default);
export const APP_CARDS: CardModel[] = BK_CARDS.filter((c) => c.status).map((c) => mapBkCardToCardModel(c, bankDir));

/** The ranked league of the calculate fixture, joined to the fixture cards. Rank 1 is not in the app. */
export const LEAGUE = buildLeague(rankByNetValue(mapCalculateResponse(calculateFixture.league)), APP_CARDS, true);

/** First row that has an app card, and first that does not. */
export const ROW_IN_APP = LEAGUE.find((r) => r.card)!;
export const ROW_NOT_IN_APP = LEAGUE.find((r) => !r.card)!;

// ── Edge-case calculate answers (always built on a clone of the fixture) ─────

type Row = Record<string, any>;

/** Every endpoint failure the app retries: the error state shows only after the retries (calculate 2 calls, GETs 3). */
export const e500 = reply.error(500);

/** A fresh copy of the league answer with `edit` applied to its rows. Return null from `edit` to drop a row. */
export function calcEdit(edit: (row: Row, index: number) => Row | null) {
  const body: { data: { savings: Row[] } } & Record<string, unknown> = clone(calculateFixture.league) as never;
  body.data.savings = body.data.savings.map(edit).filter((r): r is Row => r !== null);
  return body;
}

/** The league without one card. */
export const calcWithout = (alias: string) => calcEdit((r) => (r.seo_card_alias === alias ? null : r));

/** One row with the fees unknown (null): the app reads them as 0 and tags the card "Lifetime free". */
export function calcNullFee() {
  return calcEdit((r, i) => (i === 0 ? { ...r, annual_fees: null, joining_fees: null } : r));
}

/** The first row only. */
export const calcOneCard = () => calcEdit((r, i) => (i === 0 ? r : null));

/**
 * Every row nets below 0: yearly savings, milestones and lounge value 0, no fee waiver, and a ₹500
 * annual fee on the rows that have no annual fee in the fixture (the other rows keep their own fee).
 */
export const calcAllLose = () =>
  calcEdit((r) => ({
    ...r,
    total_savings: 0,
    total_savings_yearly: 0,
    total_extra_benefits: 0,
    annual_fee_spends: '0',
    travel_benefits: { total_travel_benefit_annual: 0 },
    annual_fees: Number(r.annual_fees) > 0 ? r.annual_fees : '500',
  }));

/** The CRED row (not in the app) without card art (no `image`, no `card_bg_image`). */
export const calcNoArt = () =>
  calcEdit((r) => {
    if (r.seo_card_alias !== 'cred-indusind-bank-credit-card') return r;
    const { image: _image, card_bg_image: _bg, ...rest } = r;
    return rest;
  });

/**
 * The CRED row (not in the app) is dropped, so the best other card is one the app sells. Every row except `keepAlias` saves 0 a year and has a fee that is not waived, so every other card nets below 0.
 * `keepAlias` also saves 0 but keeps its own bigger fee, so it ranks last and "the best other card" still loses money, only less.
 */
export function calcOthersLose(keepAlias: string) {
  return calcEdit((r) =>
    r.seo_card_alias === 'cred-indusind-bank-credit-card'
      ? null
      : r.seo_card_alias === keepAlias
      ? { ...r, total_savings_yearly: 0, total_savings: 0, total_extra_benefits: 0, annual_fee_spends: '0' }
      : { ...r, total_savings_yearly: 0, total_savings: 0, total_extra_benefits: 0, annual_fees: '100', joining_fees: '100', annual_fee_spends: '0', travel_benefits: { total_travel_benefit_annual: 0 } },
  );
}

/** `n` rows: the 9 fixture rows, then clones with new aliases and savings that fall by 25 a row, so the rank order is the index order. */
export function calcLarge(n = 220) {
  const body: { data: { savings: Row[] } } & Record<string, unknown> = clone(calculateFixture.league) as never;
  const base = body.data.savings;
  const rows: Row[] = [...base];
  for (let i = base.length; i < n; i += 1) {
    const src = base[i % base.length];
    rows.push({
      ...clone(src),
      id: 1000 + i,
      card_name: `${src.card_name} ${i}`,
      seo_card_alias: `${src.seo_card_alias}-${i}`,
      annual_fees: '0',
      joining_fees: '0',
      total_savings: Math.round((6000 - (i - base.length) * 25) / 12),
      total_savings_yearly: 6000 - (i - base.length) * 25,
    });
  }
  body.data.savings = rows;
  return body;
}
/** Alias of the clone at index 200 of `calcLarge()`. */
export const LARGE_ALIAS_200 = `${(calculateFixture.league.data.savings as Row[])[200 % 9].seo_card_alias}-200`;
