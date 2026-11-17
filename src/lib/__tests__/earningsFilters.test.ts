import { EARNINGS_FILTERS, statusParamFor } from '../earningsFilters';

const OPTIONS = [
  { label: 'Pending' },
  { label: 'Confirmed' },
  { label: 'Paid' },
  { label: 'Requested' },
  { label: 'Cancelled' },
];

describe('statusParamFor', () => {
  it('sends no status for All', () => {
    expect(statusParamFor('All', OPTIONS)).toBeUndefined();
  });
  it('maps each chip to the lower-cased option label', () => {
    expect(statusParamFor('Pending', OPTIONS)).toBe('pending');
    expect(statusParamFor('Confirmed', OPTIONS)).toBe('confirmed');
    expect(statusParamFor('Paid', OPTIONS)).toBe('paid');
  });
  it('has a chip for every filter', () => {
    expect(EARNINGS_FILTERS).toHaveLength(4);
  });
});
