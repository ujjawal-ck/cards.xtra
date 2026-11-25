/**
 * ImageryGallery: every image file in src/assets, grouped by folder, in the gc-ds imagery shape
 * (https://gc-ds.surge.sh/docs/foundations/imagery.html). Each tile shows the art, the file name,
 * the path, the `images.*` registry key when the code uses it, the type and the pixel size.
 * Hover a tile for two actions: Copy path and Copy as PNG (for pasting into Figma).
 * Renders in the docs page (React DOM). Colours come from src/tokens.
 */
import React, { useMemo, useState } from 'react';
import { primitives as p } from '../../src/tokens/colors';
import { images } from '../../src/assets/images';

// Every raster and SVG file under src/assets, as a served URL. `?url` skips the SVG-as-component plugin.
const FILES = {
  ...import.meta.glob('../../src/assets/**/*.{png,webp,jpg,jpeg,svg,gif,riv,lottie,mp4}', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob('../../src/assets/animations/*.json', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob('../../assets/*.{png,webp,jpg,jpeg,svg}', { eager: true, query: '?url', import: 'default' }),
} as Record<string, string>;

const IMAGE_TYPES = new Set(['PNG', 'WEBP', 'JPG', 'JPEG', 'SVG', 'GIF']);

const font = '"Outfit", system-ui, sans-serif';

/** Folder → readable group name and order. */
const GROUPS: { key: string; label: string; note: string }[] = [
  { key: 'images/cards', label: 'Cards', note: 'Credit card art. Key: images.cards.<name>.' },
  { key: 'images/brands', label: 'Brands', note: 'Brand marks used in tools and offers.' },
  { key: 'images/stores', label: 'Stores', note: 'Store logos for offers and orders.' },
  { key: 'images/logos', label: 'Logos', note: 'App and partner logos.' },
  { key: 'icons/raster', label: 'Payment and partner marks', note: 'Raster marks for withdraw methods and marketplaces.' },
  { key: 'images/categories', label: 'Categories', note: 'Spend and offer category art.' },
  { key: 'images/filters', label: 'Filters', note: 'Art for the filter menu.' },
  { key: 'images/storepage', label: 'Store page', note: 'Store page mastheads.' },
  { key: 'images/help', label: 'Help and mastheads', note: 'Help and missing-cashback headers.' },
  { key: 'images/screenstate', label: 'Screen states', note: 'Illustrations for empty, tracking and confirmation states.' },
  { key: 'images/onboarding', label: 'Onboarding', note: 'Onboarding slides.' },
  { key: 'images/promos', label: 'Promos', note: 'Promo banners.' },
  { key: 'images/backgrounds', label: 'Backgrounds', note: 'Screen and masthead backgrounds.' },
  { key: 'icons', label: 'Icons', note: 'Every icon of the Icon atom (buttons, list rows, steppers, tabs). Black parts follow the text colour in the app.' },
  { key: 'animations', label: 'Animations', note: 'Lottie (JSON) and Rive files. They play in the app only; Storybook cannot run them on web.' },
  { key: 'app', label: 'App icon and splash', note: 'Store icon, Android adaptive icon, splash and web favicon. Folder: assets/ at the repo root.' },
];

interface Item { group: string; path: string; file: string; url: string; type: string; regKey?: string }

function registryIndex(): Map<string, string> {
  const out = new Map<string, string>();
  for (const [g, entries] of Object.entries(images as Record<string, Record<string, unknown>>)) {
    for (const [k, v] of Object.entries(entries ?? {})) if (typeof v === 'string') out.set(v, `images.${g}.${k}`);
  }
  return out;
}

function buildItems(): Item[] {
  const reg = registryIndex();
  return Object.entries(FILES).map(([rel, url]) => {
    const path = rel.replace(/^(\.\.\/)+/, ''); // src/assets/... or assets/...
    const inAssets = path.startsWith('assets/') ? 'app/' + path.slice('assets/'.length) : path.replace(/^src\/assets\//, '');
    const dir = inAssets.split('/').slice(0, -1).join('/');
    const group = GROUPS.find((g) => dir === g.key || dir.startsWith(g.key + '/'))?.key
      ?? (dir.startsWith('icons') ? 'icons' : dir || 'other');
    const file = inAssets.split('/').pop() ?? inAssets;
    return { group, path, file, url, type: (file.split('.').pop() ?? '').toUpperCase(), regKey: reg.get(url) };
  });
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

async function copyPng(url: string) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || 512; c.height = img.naturalHeight || 512;
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch { return false; }
}

function Tile({ it, onToast, groupLabel }: { it: Item; onToast: (m: string) => void; groupLabel?: string }) {
  const isImage = IMAGE_TYPES.has(it.type);
  const [size, setSize] = useState<string>('');
  const [hover, setHover] = useState(false);
  const btn: React.CSSProperties = {
    fontFamily: font, fontSize: 11, fontWeight: 700, border: `1px solid ${p.slate[300]}`, borderRadius: 999,
    background: p.slate[50], color: p.slate[900], padding: '4px 10px', cursor: 'pointer',
  };
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ border: `1px solid ${p.slate[250]}`, borderRadius: 14, background: p.slate[50], overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{
        position: 'relative', height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
        backgroundColor: p.slate[150],
        backgroundImage: `linear-gradient(45deg, ${p.slate[200]} 25%, transparent 25%), linear-gradient(-45deg, ${p.slate[200]} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${p.slate[200]} 75%), linear-gradient(-45deg, transparent 75%, ${p.slate[200]} 75%)`,
        backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
      }}>
        {isImage ? (
          <img
            src={it.url}
            alt={it.file}
            loading="lazy"
            onLoad={(e) => setSize(`${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight}`)}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : it.type === 'MP4' ? (
          <video src={it.url} muted loop playsInline controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
        ) : (
          <div style={{ textAlign: 'center', color: p.slate[700] }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: p.saffron[700] }}>{it.type === 'JSON' ? 'LOTTIE' : it.type === 'RIV' ? 'RIVE' : it.type}</div>
            <div style={{ fontSize: 11 }}>Plays in the app only</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 8, right: 8, display: hover ? 'flex' : 'none', gap: 6 }}>
          <button style={btn} onClick={async () => onToast((await copyText(it.regKey ?? it.path)) ? 'Path copied' : 'Copy failed')}>Path</button>
          {isImage ? <button style={btn} onClick={async () => onToast((await copyPng(it.url)) ? 'PNG copied' : 'PNG copy needs https')}>PNG</button> : null}
        </div>
      </div>
      <div style={{ padding: '8px 10px 10px', fontFamily: font, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: p.slate[900], wordBreak: 'break-all' }}>{it.file}</div>
        {it.regKey
          ? <code style={{ fontSize: 10.5, color: p.cobalt[700], wordBreak: 'break-all' }}>{it.regKey}</code>
          : it.path.startsWith('src/assets/images/')
            ? <span style={{ fontSize: 10.5, color: p.amber[700] }}>Not in the images registry</span>
            : <code style={{ fontSize: 10.5, color: p.slate[700], wordBreak: 'break-all' }}>{it.path}</code>}
        <div style={{ fontSize: 10.5, color: p.slate[700] }}>{groupLabel ? `${groupLabel} · ` : ''}{it.type}{size ? ` · ${size}px` : ''}</div>
      </div>
    </div>
  );
}

export function ImageryGallery() {
  const items = useMemo(buildItems, []);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grouped' | 'list'>('grouped');
  const [toast, setToast] = useState('');
  const showToast = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1600); };

  const groups = useMemo(() => {
    const keys = GROUPS.map((g) => g.key).concat([...new Set(items.map((i) => i.group))].filter((k) => !GROUPS.some((g) => g.key === k)));
    const needle = q.trim().toLowerCase();
    return keys.map((k) => {
      const meta = GROUPS.find((g) => g.key === k) ?? { key: k, label: k, note: '' };
      const list = items
        .filter((i) => i.group === k)
        .filter((i) => !needle || i.path.toLowerCase().includes(needle) || (i.regKey ?? '').toLowerCase().includes(needle))
        .sort((a, b) => a.file.localeCompare(b.file));
      return { ...meta, list };
    }).filter((g) => g.list.length > 0 || !needle);
  }, [items, q]);

  const total = groups.reduce((n, g) => n + g.list.length, 0);
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div style={{ fontFamily: font }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '8px 0 12px' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by file name or registry key"
          style={{ fontFamily: font, fontSize: 14, padding: '8px 12px', border: `1px solid ${p.slate[300]}`, borderRadius: 10, minWidth: 260, flex: '1 1 260px' }}
        />
        <div style={{ display: 'inline-flex', background: p.slate[150], borderRadius: 999, padding: 3, gap: 2 }}>
          {(['grouped', 'list'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ fontFamily: font, fontSize: 12, fontWeight: 600, border: 0, borderRadius: 999, padding: '5px 12px', cursor: 'pointer', background: view === v ? p.slate[50] : 'transparent', color: view === v ? p.slate[900] : p.slate[700] }}>
              {v === 'grouped' ? 'Grouped' : 'One list'}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: p.slate[700] }}>{total} assets · {groups.filter((g) => g.list.length).length} categories</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {view === 'grouped' && groups.filter((g) => g.list.length).map((g) => (
          <a key={g.key} href={`#img-${slug(g.label)}`} style={{ fontSize: 12, fontWeight: 600, textDecoration: 'none', color: p.slate[900], background: p.slate[150], border: `1px solid ${p.slate[250]}`, borderRadius: 999, padding: '4px 10px' }}>
            {g.label} <span style={{ color: p.saffron[700] }}>{g.list.length}</span>
          </a>
        ))}
      </div>
      {view === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
          {groups.flatMap((g) => g.list.map((it) => <Tile key={it.path} it={it} onToast={showToast} groupLabel={g.label} />))}
        </div>
      ) : groups.map((g) => (
        <section key={g.key} id={`img-${slug(g.label)}`} style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 2px', color: p.slate[900] }}>
            {g.label} <span style={{ fontSize: 13, fontWeight: 600, color: p.saffron[700], background: p.saffron[50], borderRadius: 999, padding: '2px 8px', marginLeft: 6 }}>{g.list.length}</span>
          </h3>
          <div style={{ fontSize: 13, color: p.slate[700], marginBottom: 12 }}>{g.note} <code>{g.key === 'app' ? 'assets/' : `src/assets/${g.key}`}</code></div>
          {g.list.length === 0
            ? <div style={{ fontSize: 13, color: p.slate[600] }}>No files in this folder.</div>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
                {g.list.map((it) => <Tile key={it.path} it={it} onToast={showToast} />)}
              </div>
            )}
        </section>
      ))}
      {toast ? (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: p.slate[900], color: p.slate[50], fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, zIndex: 10 }}>{toast}</div>
      ) : null}
    </div>
  );
}
