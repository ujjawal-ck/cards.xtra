/**
 * useReduceMotion: true while the OS "reduce motion" setting is on. Follows live changes.
 *
 * Shared by the card advisor avatar and the advisor chat. (ToolsRow has its own
 * copy of this hook; it was not moved, to leave that file alone.)
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
