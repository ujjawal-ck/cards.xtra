import React from 'react';
import type { Meta } from '@storybook/react';
import { View, Text, ScrollView } from 'react-native';
import {
  primitives,
  colors,
  spacing,
  radius,
  borderWidth,
  typography,
  gradients,
  elevation,
  opacity,
} from '../src/tokens';

/**
 * Foundations — the design tokens, rendered straight from src/tokens.
 * These are 100% accurate because they display the REAL token values,
 * not a recreation. Everything below references the same files the app
 * components import from.
 */
const meta: Meta = { title: 'Foundations' };
export default meta;

// ---- helpers ----------------------------------------------------------------
const Mono = (p: any) => (
  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#5c5c5c' }} {...p} />
);
const H = ({ children }: any) => (
  <Text style={{ fontSize: 18, fontWeight: '700', color: '#262626', marginBottom: 4, marginTop: 24 }}>
    {children}
  </Text>
);
const Sub = ({ children }: any) => (
  <Text style={{ fontSize: 12, color: '#878787', marginBottom: 16 }}>{children}</Text>
);

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <View style={{ width: 132, marginBottom: 14, marginRight: 12 }}>
      <View
        style={{
          height: 56,
          borderRadius: 10,
          backgroundColor: value,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.08)',
        }}
      />
      <Text style={{ fontSize: 11, color: '#262626', marginTop: 6 }}>{name}</Text>
      <Mono>{value}</Mono>
    </View>
  );
}
const Row = ({ children }: any) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View>
);
const Wrap = ({ children }: any) => (
  <ScrollView style={{ maxHeight: 620 }} contentContainerStyle={{ padding: 4, width: 760 }}>
    {children}
  </ScrollView>
);

// flatten a nested token object to dot-path → value
function flatten(obj: any, prefix = ''): [string, any][] {
  const out: [string, any][] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, key));
    else out.push([key, v]);
  }
  return out;
}

// ============================================================================
// 1. PRIMITIVES
// ============================================================================
export const Primitives = () => (
  <Wrap>
    {Object.entries(primitives).map(([family, shades]) => (
      <View key={family}>
        <H>{family}</H>
        <Row>
          {Object.entries(shades as Record<string, string>).map(([shade, hex]) => (
            <Swatch key={shade} name={`${family}.${shade}`} value={hex} />
          ))}
        </Row>
      </View>
    ))}
  </Wrap>
);

// ============================================================================
// 2. SEMANTIC COLORS
// ============================================================================
export const SemanticColors = () => {
  const groups = Object.keys(colors);
  return (
    <Wrap>
      {groups.map((g) => (
        <View key={g}>
          <H>colors.{g}</H>
          <Row>
            {flatten((colors as any)[g], g)
              .filter(([, v]) => typeof v === 'string' && v.startsWith('#') || (typeof v === 'string' && v.startsWith('rgba')))
              .map(([name, hex]) => (
                <Swatch key={name} name={`colors.${name}`} value={hex as string} />
              ))}
          </Row>
        </View>
      ))}
    </Wrap>
  );
};

// ============================================================================
// 3. TYPOGRAPHY (all 54 variants)
// ============================================================================
export const Typography = () => (
  <Wrap>
    <H>Type scale</H>
    <Sub>Font: Outfit. Every variant from src/tokens/typography.ts.</Sub>
    {Object.entries(typography).map(([name, style]) => (
      <View key={name} style={{ marginBottom: 14, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 }}>
        <Text style={[style as any, { color: '#262626' }]}>The quick brown fox</Text>
        <Mono>
          {name} · {(style as any).fontSize}/{(style as any).lineHeight} · ls {(style as any).letterSpacing}
        </Mono>
      </View>
    ))}
  </Wrap>
);

// ============================================================================
// 4. GRADIENTS
// ============================================================================
export const Gradients = () => (
  <Wrap>
    <H>Gradients</H>
    <Sub>Linear rendered as CSS; radial entries (spotlightRadial, warning) noted.</Sub>
    <Row>
      {Object.entries(gradients).map(([name, g]: any) => {
        const isRadial = g.type === 'radial';
        const stops = (g.colors as string[])
          .map((c, i) => (g.locations ? `${c} ${Math.round(g.locations[i] * 100)}%` : c))
          .join(', ');
        const bg = isRadial
          ? `radial-gradient(circle, ${stops})`
          : `linear-gradient(${Math.round(
              (Math.atan2((g.end?.y ?? 1) - (g.start?.y ?? 0), (g.end?.x ?? 1) - (g.start?.x ?? 0)) * 180) /
                Math.PI +
                90
            )}deg, ${stops})`;
        return (
          <View key={name} style={{ width: 180, marginRight: 12, marginBottom: 14 }}>
            <View style={{ height: 64, borderRadius: 12, backgroundImage: bg } as any} />
            <Text style={{ fontSize: 12, color: '#262626', marginTop: 6 }}>
              gradients.{name} {isRadial ? '· radial' : ''}
            </Text>
            <Mono>{(g.colors as string[]).join(' → ')}</Mono>
          </View>
        );
      })}
    </Row>
  </Wrap>
);

// ============================================================================
// 5. ELEVATION
// ============================================================================
export const Elevation = () => (
  <Wrap>
    {Object.entries(elevation).map(([family, steps]) => (
      <View key={family}>
        <H>elevation.{family}</H>
        <Row>
          {Object.entries(steps as any).map(([step, sh]: any) => (
            <View key={step} style={{ width: 120, marginRight: 20, marginBottom: 24, alignItems: 'center' }}>
              <View
                style={{
                  width: 88,
                  height: 64,
                  borderRadius: 12,
                  backgroundColor: '#fff',
                  shadowColor: sh.shadowColor,
                  shadowOffset: sh.shadowOffset,
                  shadowOpacity: sh.shadowOpacity,
                  shadowRadius: sh.shadowRadius,
                }}
              />
              <Mono>{family}.{step}</Mono>
            </View>
          ))}
        </Row>
      </View>
    ))}
  </Wrap>
);

// ============================================================================
// 6. RADIUS & SPACING
// ============================================================================
export const RadiusAndSpacing = () => (
  <Wrap>
    <H>radius</H>
    <Row>
      {Object.entries(radius).map(([k, v]) => (
        <View key={k} style={{ alignItems: 'center', marginRight: 18, marginBottom: 16 }}>
          <View style={{ width: 64, height: 64, backgroundColor: '#dce5fe', borderRadius: Math.min(v as number, 32) }} />
          <Mono>radius.{k} = {v as number}</Mono>
        </View>
      ))}
    </Row>
    <H>spacing</H>
    {Object.entries(spacing).map(([k, v]) => (
      <View key={k} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Mono>spacing.{k}</Mono>
        <View style={{ height: 12, width: v as number, backgroundColor: '#ff6d1d', marginLeft: 12, borderRadius: 2 }} />
        <Mono> {v as number}px</Mono>
      </View>
    ))}
    <H>borderWidth</H>
    {Object.entries(borderWidth).map(([k, v]) => (
      <View key={k} style={{ marginBottom: 8 }}>
        <View style={{ borderBottomWidth: v as number, borderColor: '#262626', width: 200 }} />
        <Mono>borderWidth.{k} = {v as number}</Mono>
      </View>
    ))}
  </Wrap>
);

// ============================================================================
// 7. OPACITY
// ============================================================================
export const Opacity = () => (
  <Wrap>
    <H>opacity</H>
    <Row>
      {Object.entries(opacity).map(([k, v]) => (
        <View key={k} style={{ alignItems: 'center', marginRight: 16, marginBottom: 16 }}>
          <View style={{ width: 64, height: 64, backgroundColor: '#262626', borderRadius: 10, opacity: v as number }} />
          <Mono>opacity.{k} = {v as number}</Mono>
        </View>
      ))}
    </Row>
  </Wrap>
);
