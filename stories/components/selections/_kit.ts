/** Story layout helpers for this family: a labelled group, a column and a wrapping row. Tokens only.
 *  A .ts file (no JSX) so the story glob `*.@(mdx|tsx)` does not try to index it. */
import React from 'react';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';

const h = React.createElement;

/** One labelled sample: caption above, the component below. */
export function Group({ label, children, width }: { label: string; children: React.ReactNode; width?: number }) {
  return h(View, { style: { gap: spacing[8], width } },
    h(Text, { variant: 'caption10Medium', color: colors.text.tertiary }, label.toUpperCase()),
    children);
}

/** A column of groups with a phone-like width. */
export function Stack({ children, width = 358, gap = spacing[24] }: { children: React.ReactNode; width?: number; gap?: number }) {
  return h(View, { style: { width, gap } }, children);
}

/** A wrapping row of groups. */
export function Wrap({ children, gap = spacing[16] }: { children: React.ReactNode; gap?: number }) {
  return h(View, { style: { flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'flex-start' } }, children);
}
