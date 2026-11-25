/**
 * Helpers for the sheet stories: a 390x844 phone frame and a wrapper that calls
 * `present()` on the sheet ref once it has mounted (as in stories/_spike/Sheet.stories.tsx).
 * Not a story file. Only the sheet stories in this folder import it.
 */
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { colors } from '../../../src/tokens';

export function Frame({ children }: { children?: React.ReactNode }) {
  return (
    <View style={{ width: 390, height: 844, alignSelf: 'center', backgroundColor: colors.background.default }}>
      {children}
    </View>
  );
}

interface Presentable { present: (...a: any[]) => void; dismiss?: () => void }

/** Render the sheet with a ref, then present it after `delay` ms. `args` go to present(). */
export function Open({ children, args = [], delay = 300 }: {
  children: (ref: React.RefObject<any>) => React.ReactNode;
  args?: unknown[];
  delay?: number;
}) {
  const ref = useRef<Presentable>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.present(...args), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Frame>{children(ref)}</Frame>;
}

/** Click the first pressable whose text is `label` (web only). Used to reach states that need a tap. */
export function clickByText(label: string): boolean {
  if (typeof document === 'undefined') return false;
  const els = Array.from(document.querySelectorAll<HTMLElement>('[role="button"], button, [tabindex="0"]'));
  const hit = els.find((e) => (e.textContent ?? '').trim() === label);
  hit?.click();
  return !!hit;
}

/** Like Open, then taps the pressable labelled `tap` after `tapDelay` ms from present. */
export function OpenThenTap({ children, tap, tapDelay = 900 }: {
  children: (ref: React.RefObject<any>) => React.ReactNode;
  tap: string;
  tapDelay?: number;
}) {
  useEffect(() => {
    const t = setTimeout(() => clickByText(tap), 300 + tapDelay);
    return () => clearTimeout(t);
  }, [tap, tapDelay]);
  return <Open>{children}</Open>;
}
