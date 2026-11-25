/** Helpers that walk the token objects. Nothing is retyped: every value comes from src/tokens. */
import { primitives, colors } from '../../src/tokens';

export interface Leaf { path: string[]; value: string }

export function leaves(obj: unknown, path: string[] = []): Leaf[] {
  if (typeof obj === 'string') return [{ path, value: obj }];
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => leaves(v, [...path, k]));
  }
  return [];
}

/** ['saffron','500'] -> 'saffron[500]'; ['action','primary','default'] -> 'action.primary.default'. */
export function fmt(path: string[]): string {
  return path.map((p, i) => (/^\d+$/.test(p) ? `[${p}]` : i === 0 ? p : `.${p}`)).join('');
}

const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');

export const primitiveLeaves = leaves(primitives);
export const semanticLeaves = leaves(colors);

function group(list: Leaf[], prefix: string): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const l of list) {
    const k = norm(l.value);
    m.set(k, [...(m.get(k) ?? []), prefix + fmt(l.path)]);
  }
  return m;
}

/** hex -> every primitive name with that value, e.g. 'primitives.saffron[500]'. */
export const primitivesByValue = group(primitiveLeaves, 'primitives.');
/** hex -> every semantic path with that value, e.g. 'colors.action.primary.default'. */
export const semanticByValue = group(semanticLeaves, 'colors.');

export const byValue = (m: Map<string, string[]>, v: string) => m.get(norm(v)) ?? [];

/** First n names, then "+k more". */
export function short(names: string[], n = 3): string[] {
  return names.length <= n ? names : [...names.slice(0, n), `+${names.length - n} more`];
}
