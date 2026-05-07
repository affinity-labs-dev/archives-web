// Typewriter — char-by-char fill of a Text node + blinking cursor.
// Mock: runSimpleTypewriter() in Downloads/06 guided walkthrough/index.html
// line 3230 (28ms/char + cursor `|`). Engine bumps the rate to 24ms in
// runWtTypewriter() — we use 24 here to match.
//
// Reduced-motion fallback: render full text immediately and skip the cursor
// blink. Matches isReducedMotion() guard pattern used by the rest of the app.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography, colors } from '@/components/ui';
import { isReducedMotion } from '@/components/ui/theme/motion';

// Batched char reveal — a setState per char (24ms × 80 chars ≈ 80 re-renders
// for the longest copy) was hammering React reconciliation on the bubble
// subtree, contributing to the perceived step-transition lag on mid-tier
// Android. CHARS_PER_TICK > 1 keeps the visual cadence at the same effective
// CPS (chars-per-second) but with 1/N the React updates: 60ms tick × 2 chars
// = 30ms/char, same as the original 24ms/char × 1, but only ~40 setStates
// for the longest copy.
const CHAR_INTERVAL_MS = 60;
const CHARS_PER_TICK = 2;
const CURSOR_BLINK_MS = 500;

type Props = {
  // Source string. When this changes, the typewriter restarts from index 0.
  text: string;
};

export function Typewriter({ text }: Props) {
  const [visible, setVisible] = useState('');
  const [cursorOn, setCursorOn] = useState(true);
  const charTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Char-by-char effect. Restarts on every text change.
  useEffect(() => {
    if (charTimerRef.current) {
      clearInterval(charTimerRef.current);
      charTimerRef.current = null;
    }
    if (isReducedMotion()) {
      setVisible(text);
      return;
    }
    setVisible('');
    let i = 0;
    charTimerRef.current = setInterval(() => {
      // Reveal CHARS_PER_TICK chars per setState — same effective CPS as
      // a 24ms/char single-char loop, but with ~half the re-renders.
      i = Math.min(text.length, i + CHARS_PER_TICK);
      setVisible(text.slice(0, i));
      if (i >= text.length) {
        if (charTimerRef.current) {
          clearInterval(charTimerRef.current);
          charTimerRef.current = null;
        }
      }
    }, CHAR_INTERVAL_MS);

    return () => {
      if (charTimerRef.current) {
        clearInterval(charTimerRef.current);
        charTimerRef.current = null;
      }
    };
  }, [text]);

  // Independent cursor blink effect — runs continuously while text is
  // typing. Stops blinking and stays solid once the text is fully revealed
  // so the bubble settles into a non-distracting end state.
  useEffect(() => {
    if (isReducedMotion()) return;
    if (visible.length >= text.length) {
      setCursorOn(false);
      return;
    }
    cursorTimerRef.current = setInterval(() => {
      setCursorOn((c) => !c);
    }, CURSOR_BLINK_MS);
    return () => {
      if (cursorTimerRef.current) {
        clearInterval(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
    };
  }, [visible.length, text.length]);

  // Sizer-overlay pattern: hidden sizer with FULL text drives bubble
  // layout from frame 0 (so the bubble doesn't grow as the typewriter
  // fills). The visible overlay renders the typed portion + cursor as
  // a SINGLE Typography — earlier draft used two separate Typography
  // siblings in a flex row, but in RN each <Text> is a block-level node
  // and the cursor would land at the right edge of the visible text's
  // BOUNDING BOX (= right edge of longest wrapped line), not at the
  // actual end of the typed characters on the last line. Concatenating
  // into one Text makes the cursor flow inline natively — same as the
  // mock's `<span><span>` browser behavior.
  const showCursor = cursorOn && visible.length < text.length;
  return (
    <View>
      {/* Hidden sizer: full text, opacity 0. Drives layout. */}
      <Typography
        size={15}
        weight="600"
        color="onyx"
        style={[styles.copy, styles.hidden]}
      >
        {text}
      </Typography>
      {/* Visible overlay: typed portion + inline cursor. Single Typography
          so the cursor follows the typed text wherever it wraps to. */}
      <View style={StyleSheet.absoluteFill}>
        <Typography size={15} weight="600" color="onyx" style={styles.copy}>
          {visible}
          {showCursor ? '|' : ''}
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    lineHeight: 20,
    color: colors.onyx,
  },
  hidden: {
    // Keep the sizer in the document flow but invisible. NOT
    // `display: none` — that would collapse to 0 size and defeat the
    // whole purpose of using it for layout.
    opacity: 0,
  },
});
