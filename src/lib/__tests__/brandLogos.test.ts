import { BRAND_LOGOS, brandLogoFor } from '../brandLogos';
import { TOOL_BRANDS } from '../cardTools';

describe('brandLogos', () => {
  const ids = TOOL_BRANDS.map((b) => b.id);

  it('maps only TOOL_BRANDS ids', () => {
    for (const key of Object.keys(BRAND_LOGOS)) expect(ids).toContain(key);
  });

  it.each(['amazon', 'flipkart', 'myntra'])('has a logo for %s', (id) => {
    expect(brandLogoFor(id)).toBeDefined();
  });

  it.each(['ajio', 'nykaa', 'swiggy', 'zomato', 'blinkit', 'zepto', 'bigbasket'])('has no logo for %s', (id) => {
    expect(brandLogoFor(id)).toBeUndefined();
  });

  it('returns undefined for an unknown id', () => {
    expect(brandLogoFor('nope')).toBeUndefined();
  });
});
