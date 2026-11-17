/**
 * groupByMonth — buckets dated rows under "Month YYYY" headings, newest month
 * first (Paytm My Cashback `groupByMonth`). Server order is kept inside a
 * month. Rows with no usable date go under "Earlier", last. When NO row has a
 * date, one heading-less section is returned (never invent dates).
 */
export interface MonthSection<T> {
  /** YYYY-MM, or "earlier". */
  key: string;
  /** "" when the data carries no dates at all. */
  label: string;
  rows: T[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const EARLIER = 'earlier';

function monthKey(iso: string | undefined): string {
  if (!iso) return EARLIER;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return EARLIER;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelFor(key: string): string {
  if (key === EARLIER) return 'Earlier';
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function groupByMonth<T extends { dateISO?: string }>(rows: T[]): MonthSection<T>[] {
  if (rows.length === 0) return [];
  if (rows.every((r) => monthKey(r.dateISO) === EARLIER && !r.dateISO)) {
    return [{ key: EARLIER, label: '', rows }];
  }
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = monthKey(r.dateISO);
    const bucket = map.get(k);
    if (bucket) bucket.push(r);
    else map.set(k, [r]);
  }
  return Array.from(map, ([key, list]) => ({ key, label: labelFor(key), rows: list })).sort(
    (a, b) =>
      a.key === EARLIER ? 1 : b.key === EARLIER ? -1 : a.key < b.key ? 1 : a.key > b.key ? -1 : 0
  );
}
