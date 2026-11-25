/** "Use these parts" list for the pattern pages. Links open the Components docs by story id. */
import React from 'react';
import { primitives as p } from '../../src/tokens/colors';

const font = '"Outfit", system-ui, sans-serif';

export interface PartRow { name: string; id: string; note: string }

export function Parts({ rows }: { rows: PartRow[] }) {
  return (
    <ul style={{ fontFamily: font, fontSize: 14, lineHeight: 1.6, paddingLeft: 18, margin: '8px 0 24px' }}>
      {rows.map((r) => (
        <li key={r.id}>
          <a href={`?path=/docs/${r.id}`} target="_top" style={{ color: p.cobalt[700], fontWeight: 600 }}><code>{r.name}</code></a>
          <span style={{ color: p.slate[700] }}>{` ${r.note}`}</span>
        </li>
      ))}
    </ul>
  );
}
