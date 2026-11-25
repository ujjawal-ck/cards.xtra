/**
 * DOM helpers for `play` functions in this flow. They drive the REAL screen the
 * way a finger would (type into the input, tap a label). No timers are patched
 * and no state is faked. react-native-web turns a DOM click into onPress.
 */
import { Alert } from 'react-native';

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Poll until `find` returns something. Throws after `timeout` ms. */
export async function waitFor<T>(find: () => T | null | undefined | false, timeout = 12000, what = 'element'): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = find();
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`[storybook] play: timed out waiting for ${what}`);
    await sleep(100);
  }
}

/** The deepest element whose full text is `text`. */
export function byText(root: HTMLElement, text: string): HTMLElement | null {
  let hit: HTMLElement | null = null;
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if ((el.textContent ?? '').trim() !== text) return;
    if (Array.from(el.children).some((c) => (c.textContent ?? '').trim() === text)) return;
    hit = el;
  });
  return hit;
}

/** Wait for a label, then click it (the click bubbles to the Pressable). */
export async function tapText(root: HTMLElement, text: string, timeout?: number) {
  const el = await waitFor(() => byText(root, text), timeout, `text "${text}"`);
  el.click();
}

/** Wait for the n-th text input (0 based). */
export async function nthInput(root: HTMLElement, n = 0) {
  return waitFor(() => root.querySelectorAll<HTMLInputElement>('input').item(n), 12000, `input #${n}`);
}

/** Set a controlled input's value and fire the event React listens to. */
export function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function typeInto(root: HTMLElement, n: number, value: string) {
  const input = await nthInput(root, n);
  input.focus();
  setValue(input, value);
}

/** Tick the terms checkbox of the footer strip. */
export async function tickTerms(root: HTMLElement) {
  const box = await waitFor(() => root.querySelector<HTMLElement>('[role="checkbox"]'), 12000, 'terms checkbox');
  box.click();
}

/**
 * Log the app's native alerts to the console as well. The preview shim
 * (.storybook/preview.tsx) draws them as a plain dialog.
 */
export function logNativeAlerts() {
  const g = globalThis as { __sbAlertLogged?: boolean };
  if (g.__sbAlertLogged) return;
  g.__sbAlertLogged = true;
  const original = Alert.alert.bind(Alert);
  Alert.alert = (title, message, buttons, options) => {
    console.log(`[storybook] native Alert: "${title}" / "${message ?? ''}"`);
    original(title, message, buttons, options);
  };
}
