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
import { BK_CARDS, calculateFixture, initBundleFixture, spends, clone } from '../../../storybook/fixtures';

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
  | { type: string; into: string }
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
const appCards: CardModel[] = BK_CARDS.filter((c) => c.status).map((c) => mapBkCardToCardModel(c, bankDir));

/** The ranked league of the calculate fixture, joined to the fixture cards. Rank 1 is not in the app. */
export const LEAGUE = buildLeague(rankByNetValue(mapCalculateResponse(calculateFixture.league)), appCards, true);

/** First row that has an app card, and first that does not. */
export const ROW_IN_APP = LEAGUE.find((r) => r.card)!;
export const ROW_NOT_IN_APP = LEAGUE.find((r) => !r.card)!;
