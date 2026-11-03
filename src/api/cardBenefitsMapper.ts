/**
 * cardBenefitsMapper.ts — BankKaro card-detail `product_benefits` → the
 * "All Card Benefits" page's category tabs.
 *
 * The detail endpoint (`GET /cardgenius/cards/:alias` → data[0]) carries
 * `product_benefits[]`, each `{ benefit_type, sub_type, html_text }` where
 * html_text is a `<ul><li>…</li></ul>` bullet list, grouped by category
 * (welcome / travel / lounge / dining / fuel / movie_ticket / …). We:
 *   - parse the <li> bullets, strip tags, decode entities,
 *   - drop the "This card does not offer any benefits…" placeholders,
 *   - group by benefit_type into tabs, deduping bullets,
 *   - prepend an aggregate "All Benefits" tab.
 */

export interface BenefitCategory {
  /** benefit_type key (e.g. 'welcome'); 'all' for the aggregate tab. */
  key: string;
  /** Tab label, e.g. "Welcome". */
  label: string;
  items: string[];
}

// benefit_type → friendly tab label. Unknown types fall back to Title Case.
const TYPE_LABEL: Record<string, string> = {
  welcome: 'Welcome',
  travel: 'Travel',
  lounge: 'Lounge',
  dining: 'Dining',
  fuel: 'Fuel',
  movie_ticket: 'Movie',
  movie: 'Movie',
  shopping: 'Shopping',
  insurance: 'Insurance',
  bank_offers: 'Bank Offers',
  reward: 'Rewards',
  rewards: 'Rewards',
  milestone: 'Milestone',
  golf: 'Golf',
  concierge: 'Concierge',
};

// Display order for the tabs (after "All Benefits"). Types not listed keep
// their natural discovery order at the end.
const TYPE_ORDER = [
  'welcome',
  'milestone',
  'travel',
  'lounge',
  'dining',
  'shopping',
  'fuel',
  'movie_ticket',
  'movie',
  'insurance',
  'bank_offers',
  'golf',
  'concierge',
];

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&lsquo;|&#8216;/g, '‘')
    .replace(/&ldquo;|&#8220;/g, '“')
    .replace(/&rdquo;|&#8221;/g, '”')
    .replace(/&quot;/g, '"')
    .replace(/&#8377;/g, '₹')
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return '';
      }
    });
}

function clean(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pull bullet strings out of an html_text `<ul><li>…</li></ul>` block. */
function parseBullets(html?: string): string[] {
  if (!html) return [];
  const matches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  const raw = matches.length ? matches.map((m) => m[1]) : [html];
  return raw.map(clean).filter(Boolean);
}

const isPlaceholder = (t: string) => /does not offer any benefits/i.test(t);

function titleCase(key: string): string {
  return key
    .split(/[_\s]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

interface RawBenefit {
  benefit_type?: string;
  sub_type?: string;
  html_text?: string;
}

/** Map `getCardDetail(alias)` → benefit-category tabs. */
export function mapCardBenefits(res: any): BenefitCategory[] {
  const card = Array.isArray(res?.data) ? res.data[0] : res?.data;
  const pb: RawBenefit[] = Array.isArray(card?.product_benefits)
    ? card.product_benefits
    : [];

  // The "All Benefits" tab is the bank's own curated summary — the
  // `benefit_type: 'all'` entry (NOT an aggregate of the other tabs). For
  // SBI Cashback this is the 5-bullet "5% online / ₹2,000 cap / …" list the
  // website shows; aggregating instead dropped it.
  const allEntry = pb.find((b) => (b.benefit_type || '').toLowerCase().trim() === 'all');
  const allItems = allEntry
    ? parseBullets(allEntry.html_text).filter((t) => !isPlaceholder(t))
    : [];

  // Category tabs — every non-'all' benefit_type with ≥1 real bullet (the
  // "does not offer any benefits in this category" placeholders are dropped).
  const byType = new Map<string, string[]>();
  for (const b of pb) {
    const type = (b.benefit_type || '').toLowerCase().trim();
    if (!type || type === 'all') continue;
    const items = parseBullets(b.html_text).filter((t) => !isPlaceholder(t));
    if (!items.length) continue;
    const arr = byType.get(type) ?? [];
    for (const it of items) if (!arr.includes(it)) arr.push(it);
    byType.set(type, arr);
  }

  const types = [...byType.keys()].sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a);
    const ib = TYPE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const cats: BenefitCategory[] = types.map((type) => ({
    key: type,
    label: TYPE_LABEL[type] ?? titleCase(type),
    items: byType.get(type) as string[],
  }));

  // First tab: prefer the curated 'all' summary; if a card has none, fall
  // back to the union of all category bullets so the tab is never empty.
  let firstItems = allItems;
  if (!firstItems.length) {
    for (const c of cats) for (const it of c.items) if (!firstItems.includes(it)) firstItems.push(it);
  }

  const result: BenefitCategory[] = [];
  if (firstItems.length) result.push({ key: 'all', label: 'What We Love', items: firstItems });
  result.push(...cats);
  return result;
}
