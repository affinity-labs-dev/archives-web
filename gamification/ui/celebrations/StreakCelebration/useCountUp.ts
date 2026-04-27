// countUp: animate `displayedNumber` toward `streakCount` over 800ms
// after a 750ms delay. RAF loop on the JS thread (text updates don't
// need 60fps reanimated bridging).
//
// Critical invariant: each effect run animates FROM the current
// displayed value (via `displayedRef`) TO `streakCount`. Hard-coding
// the start at 0 (the previous behaviour) caused a `0 → 1 → 0 → 1`
// flicker on re-fires (StrictMode dev double-invoke, parent
// re-renders) — most visible at streakCount = 1 where only two
// distinct values render. Anchoring on the current value means a
// re-fire after completion degenerates to `1 → 1` (no change),
// a re-fire mid-animation continues smoothly from where it was,
// and a fresh entrance still animates 0 → N because `displayedRef`
// was reset to 0 on the previous `!visible` cleanup branch.
//
// We also skip redundant React state writes when the floored value
// equals the previous frame — for low streakCounts most frames
// produce the same value (e.g. streakCount=1 produces 0 for ~47
// frames then 1 for the last), so skipping turns the animation
// into a single dispatch instead of 48.

import { safeDuration } from '@/components/ui';
import { useEffect, useRef, useState } from 'react';

import { ANIM } from './constants';

interface UseCountUpParams {
  visible: boolean;
  streakCount: number;
}

export function useCountUp({ visible, streakCount }: UseCountUpParams) {
  const [displayedNumber, setDisplayedNumber] = useState(0);
  const displayedRef = useRef(0);

  const setDisplayed = (n: number) => {
    if (n !== displayedRef.current) {
      displayedRef.current = n;
      setDisplayedNumber(n);
    }
  };

  useEffect(() => {
    if (!visible) {
      setDisplayed(0);
      return;
    }
    if (streakCount <= 0) {
      setDisplayed(0);
      return;
    }
    let raf: number | null = null;
    let startTs: number | null = null;
    const startAtMs = ANIM.countUp.delay;
    const durationMs = safeDuration(ANIM.countUp.dur);
    const mountTs = performance.now();
    // Anchor on the current displayed value, not 0. Survives re-fires
    // without flickering back to 0.
    const startValue = displayedRef.current;
    const tick = (ts: number) => {
      if (ts - mountTs < startAtMs) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (startTs === null) startTs = ts;
      const elapsed = ts - startTs;
      if (durationMs === 0) {
        setDisplayed(streakCount);
        return;
      }
      const progress = Math.min(1, elapsed / durationMs);
      const value = Math.floor(startValue + progress * (streakCount - startValue));
      setDisplayed(value);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplayed(streakCount);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [visible, streakCount]);

  return { displayedNumber };
}
