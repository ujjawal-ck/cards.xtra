/**
 * Small DOM helpers for `play` functions in flow stories. They tap and type in
 * the real screen after mount, so a state that needs a tap (a filter applied, a
 * sheet opened, a tab switched) is reached the way a user reaches it.
 * No network, no app code. Text is matched on the rendered label.
 */
export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const matches = (t: string, text: string | RegExp) => (typeof text === 'string' ? t === text : text.test(t));

/** Deepest elements whose visible text matches. */
export function findAllByText(text: string | RegExp, root: ParentNode = document.body): HTMLElement[] {
  const out: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (!matches(norm(el.textContent), text)) return;
    const childMatches = Array.from(el.children).some((c) => matches(norm(c.textContent), text));
    if (!childMatches) out.push(el);
  });
  return out;
}

export async function waitFor<T>(get: () => T | null | undefined, timeoutMs = 10000): Promise<T | undefined> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const v = get();
    if (v) return v;
    await sleep(100);
  }
  return undefined;
}

/** Wait for a label, then click it. `nth: 'last'` picks the sheet copy when a label also sits on the page behind. */
export async function tap(text: string | RegExp, opts: { nth?: 'first' | 'last'; timeoutMs?: number; settleMs?: number } = {}) {
  const el = await waitFor(() => {
    const all = findAllByText(text);
    return all.length ? (opts.nth === 'last' ? all[all.length - 1] : all[0]) : undefined;
  }, opts.timeoutMs);
  if (!el) return false;
  el.click();
  await sleep(opts.settleMs ?? 400);
  return true;
}

/** Type into an input found by its placeholder (React-safe: native setter + input event). */
export async function typeInto(placeholder: string, value: string, timeoutMs = 10000) {
  const input = await waitFor(() => document.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`), timeoutMs);
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  input.focus();
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(300);
  return true;
}
