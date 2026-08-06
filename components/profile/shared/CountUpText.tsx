import React, { useEffect, useRef, useState } from 'react';

import { Typography } from '@/components/ui/Typography';

interface CountUpTextProps {
  target: number;
  textColor: string;
  animate?: boolean;
  /** Delay before count-up starts (ms). Use to sync with entrance animation. */
  delay?: number;
}

// RAF-driven count-up. We avoid Reanimated here because the displayed
// value is integer text — interpolating a shared value to a node text
// would require a Reanimated.Text + frame-callback shim that adds zero
// visible benefit over a simple useState + requestAnimationFrame.
export function CountUpText({
  target,
  textColor,
  animate = true,
  delay = 0,
}: CountUpTextProps) {
  const [displayed, setDisplayed] = useState(animate ? 0 : target);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!animate || target === 0) {
      setDisplayed(target);
      return;
    }

    const startAnimation = () => {
      const duration = 900;
      const startTime = Date.now();

      const tick = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * (2 - t);
        const value = Math.round(eased * target);
        setDisplayed(value);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      setDisplayed(0);
      rafRef.current = requestAnimationFrame(tick);
    };

    if (delay > 0) {
      setDisplayed(0);
      timerRef.current = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [target, animate, delay]);

  return (
    <Typography
      family="bounded"
      size={32}
      weight="900"
      extraColor={textColor}
      style={{ lineHeight: 38 }}
    >
      {displayed}
    </Typography>
  );
}
