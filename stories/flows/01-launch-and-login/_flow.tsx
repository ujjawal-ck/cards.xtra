/**
 * Helpers for the flow stories (folders 01, 02, 03a, 03b, 03c). Not a story file.
 * Web only: they use the DOM to reach states that need a tap or a typed value.
 */
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { colors } from '../../../src/tokens';
import { useLoginSheet } from '../../../src/auth/LoginSheetProvider';

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** All elements that look pressable. */
function pressables(): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll<HTMLElement>('[role="button"], button, a, [tabindex="0"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"]'));
}

/** Click the pressable whose text (or aria-label) is `label`. `nth` picks among several. Returns true when it clicked. */
export function clickByText(label: string, nth = 0): boolean {
  const hits = pressables().filter((e) => norm(e.textContent) === label || e.getAttribute('aria-label') === label);
  const hit = hits[nth];
  hit?.click();
  return !!hit;
}

/** Click the pressable whose text or aria-label contains `part`. */
export function clickByPart(part: string, nth = 0): boolean {
  const hits = pressables().filter((e) => norm(e.textContent).includes(part) || (e.getAttribute('aria-label') ?? '').includes(part));
  const hit = hits[nth];
  hit?.click();
  return !!hit;
}

/** Set the value of the n-th text input (React-safe: native setter, then an input event). */
export function typeInto(index: number, value: string): boolean {
  if (typeof document === 'undefined') return false;
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]), textarea'));
  const el = inputs[index];
  if (!el) return false;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/** Same as typeInto, but picks the input by its placeholder or aria-label. */
export function typeIntoLabelled(label: string, value: string): boolean {
  if (typeof document === 'undefined') return false;
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]), textarea'));
  const el = inputs.find((i) => i.placeholder === label || i.getAttribute('aria-label') === label);
  if (!el) return false;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

export type Step = [delayMs: number, action: () => void];

/** Runs each action `delay` ms after the previous one, once, after mount. Renders nothing. */
export function Script({ steps }: { steps: Step[] }) {
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    steps.forEach(([d, fn]) => {
      at += d;
      timers.push(setTimeout(() => { try { fn(); } catch (e) { console.warn('[storybook] script step failed', e); } }, at));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * Inside a ComponentHarness / ScreenHarness tree: opens the app login sheet after `delay` ms,
 * then runs `steps` (typing and taps). The sheet itself is the real LoginSheetProvider UI.
 */
export function OpenLogin({ delay = 500, source = 'storybook', steps = [] }: { delay?: number; source?: string; steps?: Step[] }) {
  const { open } = useLoginSheet();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const t = setTimeout(() => open({ source }), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Script steps={[[delay + 600, () => {}], ...steps]} />;
}

/** A neutral page behind a sheet: the app background. */
export function Backdrop({ children }: { children?: React.ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: colors.background.default }}>{children}</View>;
}
