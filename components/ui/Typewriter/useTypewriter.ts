import { useEffect, useRef, useState } from 'react';

import { durations, isReducedMotion } from '@/components/ui/theme';

export interface UseTypewriterOptions {
  text: string;
  speed?: number;
  cursorHideDelay?: number;
  onComplete?: () => void;
  autoStart?: boolean;
  /** Delay before the typewriter starts revealing chars, in ms. Default `0`. */
  startDelay?: number;
}

export interface UseTypewriterResult {
  displayText: string;
  isTyping: boolean;
  isComplete: boolean;
  showCursor: boolean;
  restart: () => void;
}

/**
 * useTypewriter — reveals text one character at a time with a blinking cursor.
 *
 * Respects reduce-motion by revealing the full text instantly and firing `onComplete`.
 */
export function useTypewriter({
  text,
  speed = durations.typewriterChar,
  cursorHideDelay = durations.typewriterCursorHide,
  onComplete,
  autoStart = true,
  startDelay = 0,
}: UseTypewriterOptions): UseTypewriterResult {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restart = () => setRunKey((k) => k + 1);

  useEffect(() => {
    if (!autoStart) return undefined;

    // Reduce-motion: show full text instantly (no delay needed)
    if (isReducedMotion()) {
      setDisplayText(text);
      setIsTyping(false);
      setIsComplete(true);
      setShowCursor(false);
      onComplete?.();
      return undefined;
    }

    // Reset state before (delayed) start
    indexRef.current = 0;
    setDisplayText('');
    setIsTyping(false);
    setIsComplete(false);
    setShowCursor(false);

    const beginTyping = () => {
      setIsTyping(true);
      setShowCursor(true);

      intervalRef.current = setInterval(() => {
        indexRef.current += 1;
        if (indexRef.current > text.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsTyping(false);
          setIsComplete(true);
          onComplete?.();
          cursorTimeoutRef.current = setTimeout(() => {
            setShowCursor(false);
          }, cursorHideDelay);
        } else {
          setDisplayText(text.slice(0, indexRef.current));
        }
      }, speed);
    };

    if (startDelay > 0) {
      startTimeoutRef.current = setTimeout(beginTyping, startDelay);
    } else {
      beginTyping();
    }

    return () => {
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, cursorHideDelay, autoStart, startDelay, runKey]);

  return {
    displayText,
    isTyping,
    isComplete,
    showCursor,
    restart,
  };
}
