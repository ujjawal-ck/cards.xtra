/**
 * Earnings-page transaction filter chips → orders API `filter[status]`.
 * Same rule as OrdersList: the status param is the lower-cased
 * ORDER_STATUS_OPTIONS label ("Pending" → "pending"; the API keeps delayed
 * orders inside pending). "All" sends no status.
 */
export const EARNINGS_FILTERS = ['All', 'Pending', 'Confirmed', 'Paid'] as const;
export type EarningsFilter = (typeof EARNINGS_FILTERS)[number];

export const EARNINGS_EMPTY_COPY: Record<EarningsFilter, string> = {
  All: 'Your cashback and rewards will show up here',
  Pending: 'No pending earnings',
  Confirmed: 'No confirmed earnings',
  Paid: 'No paid earnings',
};

/** `options` = ORDER_STATUS_OPTIONS (passed in so this file stays pure). */
export function statusParamFor(
  filter: EarningsFilter,
  options: ReadonlyArray<{ label: string }>
): string | undefined {
  if (filter === 'All') return undefined;
  const hit = options.find((o) => o.label === filter);
  return hit ? hit.label.toLowerCase() : undefined;
}
