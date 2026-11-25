/**
 * Docs blocks in the gc-ds page shape: header, pick-the-right-one table, anatomy,
 * do and don't, state tag. They render in the docs page (React DOM), not in the phone.
 * Colours come from src/tokens/colors.ts; no new values.
 */
import React from 'react';
import { primitives as p, colors } from '../../src/tokens/colors';

const font = '"Outfit", system-ui, sans-serif';
const cell: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${p.slate[250]}`, textAlign: 'left', verticalAlign: 'top', fontSize: 14 };
const head: React.CSSProperties = { ...cell, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: p.slate[700], fontWeight: 700 };
const card: React.CSSProperties = { border: `1px solid ${p.slate[250]}`, borderRadius: 16, background: p.slate[50], margin: '16px 0 24px', overflow: 'hidden', fontFamily: font };

/** Page title block: "<family> · N components · tiers". */
export function PageHeader({ title, meta, children }: { title: string; meta?: string; children?: React.ReactNode }) {
  return (
    <div style={{ fontFamily: font, margin: '0 0 24px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: p.saffron[700], textTransform: 'uppercase', letterSpacing: '.08em' }}>Cards.xtra · {meta ?? 'design system'}</div>
      <h1 style={{ fontSize: 34, fontWeight: 700, margin: '6px 0 10px', color: p.slate[900] }}>{title}</h1>
      {children ? <div style={{ fontSize: 16, lineHeight: 1.55, color: p.slate[800], maxWidth: 760 }}>{children}</div> : null}
    </div>
  );
}

export interface PickRow { building: string; use: string; tier?: string; story?: string }
/** "Pick the right one in 5 seconds". */
export function PickTable({ rows, rule }: { rows: PickRow[]; rule?: string }) {
  return (
    <div style={card}>
      <div style={{ padding: '14px 16px', fontWeight: 700, fontSize: 16 }}>Pick the right one in 5 seconds</div>
      {rule ? <div style={{ padding: '0 16px 10px', fontSize: 13, color: p.slate[700] }}>{rule}</div> : null}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={head}>You are building…</th><th style={head}>Use</th><th style={head}>Tier</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.use + r.building}><td style={cell}>{r.building}</td>
            <td style={cell}>{r.story ? <a href={`?path=/docs/${r.story}`} target="_top" style={{ color: p.cobalt[700], fontWeight: 600 }}><code>{r.use}</code></a> : <code>{r.use}</code>}</td>
            <td style={{ ...cell, color: p.slate[700] }}>{r.tier ?? ''}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

/** Anatomy: each part and the token that sets it. */
export function Anatomy({ parts }: { parts: { part: string; token: string; note?: string }[] }) {
  return (
    <div style={card}>
      <div style={{ padding: '14px 16px', fontWeight: 700, fontSize: 16 }}>Anatomy</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={head}>Part</th><th style={head}>Token</th><th style={head}>Note</th></tr></thead>
        <tbody>{parts.map((r) => (<tr key={r.part}><td style={cell}>{r.part}</td><td style={cell}><code>{r.token}</code></td><td style={{ ...cell, color: p.slate[700] }}>{r.note ?? ''}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

/** Do and don't, side by side. */
export function DoDont({ dos, donts }: { dos: string[]; donts: string[] }) {
  const col = (title: string, items: string[], tone: 'do' | 'dont') => (
    <div style={{ flex: 1, minWidth: 260, border: `1px solid ${tone === 'do' ? p.fern[200] : p.ruby[200]}`, borderRadius: 16, padding: 16, background: tone === 'do' ? p.fern[50] : p.ruby[50] }}>
      <div style={{ fontWeight: 700, color: tone === 'do' ? p.fern[700] : p.ruby[700], marginBottom: 8 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 14 }}>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
  return <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '16px 0 24px', fontFamily: font }}>{col('✓ Do', dos, 'do')}{col('✕ Don’t', donts, 'dont')}</div>;
}

export type StateStatus = 'live' | 'proposed' | 'hidden' | 'demo';
const tagTone: Record<StateStatus, [string, string]> = {
  live: [p.fern[50], p.fern[700]], proposed: [p.amber[50], p.amber[700]],
  hidden: [p.slate[150], p.slate[700]], demo: [p.cobalt[50], p.cobalt[700]],
};
/** State tag. live = in the app today; proposed = designed here, not built. */
export function StateTag({ status, source }: { status: StateStatus; source?: string }) {
  const [bg, fg] = tagTone[status];
  return (
    <span style={{ fontFamily: font, display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
      <span style={{ background: bg, color: fg, fontWeight: 700, borderRadius: 999, padding: '2px 10px', textTransform: 'uppercase', letterSpacing: '.05em' }}>{status}</span>
      {source ? <code style={{ color: p.slate[700] }}>{source}</code> : null}
    </span>
  );
}

/** One row per state of a screen: the state matrix for a flow step. */
export function StateMatrix({ rows }: { rows: { state: string; status: StateStatus; source?: string; story?: string; note?: string }[] }) {
  return (
    <div style={card}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={head}>State</th><th style={head}>Status</th><th style={head}>Note</th></tr></thead>
        <tbody>{rows.map((r) => (<tr key={r.state}>
          <td style={cell}>{r.story ? <a href={`?path=/story/${r.story}`} target="_top" style={{ color: p.cobalt[700], fontWeight: 600 }}>{r.state}</a> : r.state}</td>
          <td style={cell}><StateTag status={r.status} source={r.source} /></td>
          <td style={{ ...cell, color: p.slate[700] }}>{r.note ?? ''}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

export { colors };
