// SpeechBubble — coach-mark popover with arrow + step counter + Typewriter
// + Skip / Next buttons. Mock CSS line 1213-1306.
//
// Layout:
//   [step counter]            ← DM Sans 11px uppercase, bluePrimary 60%
//   [Typewriter copy]         ← Onest 600 15px (we substitute DM Sans)
//   [Skip]    [Next]          ← right-aligned button row, hidden on action
//   [arrow ▲▼◀▶]              ← absolute, pointing at target
//
// Arrow rendering: 4 directions via React Native border-triangle hack
// (transparent perpendicular borders + solid leading border = triangle).
// Mock uses an outer blue triangle with a 1px-offset inner white triangle
// to create the 1.5px rim effect — we stack two View nodes for the same look.
//
// Position: parent (overlay orchestrator) sets `style={{ left, top }}` so
// the bubble sits at the placeBubble() output. transformOrigin per arrow
// direction lets the entrance scale animate from the side that points at
// the target.

import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Typography, colors } from '@/components/ui';

import { Typewriter } from './Typewriter';

// Match WalkthroughMode in steps.ts but local to avoid circular import.
type Mode = 'passive' | 'action' | 'interactive';
export type ArrowDirection = 'top' | 'bottom' | 'left' | 'right' | 'none';

// Where on the bubble the arrow attaches (1px past the border, like the
// CSS ::after offset). Parent passes the offset along the relevant axis so
// the arrow visually connects to the target's center even when the bubble
// is edge-clamped — matches placeBubble()'s axis-aware arrow positioning
// (mock line 3444-3454).
// One variant per direction so TS narrows cleanly in the if-return chain in
// Arrow(). Combining 'top'|'bottom' into one variant prevents the structural
// narrowing TS needs to know `offsetX` vs `offsetY` is present in the
// fallback branch.
type ArrowProps =
  | { direction: 'none' }
  | { direction: 'top'; offsetX: number }
  | { direction: 'bottom'; offsetX: number }
  | { direction: 'left'; offsetY: number }
  | { direction: 'right'; offsetY: number };

type Props = {
  copy: string;
  // 1-based for display ("3 / 10").
  stepNumber: number;
  totalSteps: number;
  mode: Mode;
  arrow: ArrowProps;
  onSkip: () => void;
  onNext: () => void;
  // Animated entrance is owned by parent (Reanimated shared values).
  // Bubble itself is just a presentational shell.
  animatedStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function SpeechBubble({
  copy,
  stepNumber,
  totalSteps,
  mode,
  arrow,
  onSkip,
  onNext,
  animatedStyle,
  style,
}: Props) {
  // Hide Next button on action steps (mock line 1261). Skip is always shown.
  const showNext = mode !== 'action';

  return (
    <View style={[styles.bubble, animatedStyle, style]}>
      <Typography
        size={11}
        weight="600"
        uppercase
        style={styles.counter}
      >
        {stepNumber} / {totalSteps}
      </Typography>

      <View style={styles.copyRow}>
        <Typewriter text={copy} />
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onSkip}
          hitSlop={8}
          style={({ pressed }) => [
            styles.skipBtn,
            pressed && styles.skipBtnPressed,
          ]}
        >
          <Typography size={13} weight="700" uppercase color="bluePrimary">
            Skip tour
          </Typography>
        </Pressable>
        {showNext ? (
          <Pressable
            onPress={onNext}
            hitSlop={8}
            style={({ pressed }) => [
              styles.nextBtn,
              pressed && styles.nextBtnPressed,
            ]}
          >
            <Typography size={13} weight="700" uppercase color="bluePrimary">
              Next
            </Typography>
          </Pressable>
        ) : null}
      </View>

      <Arrow {...arrow} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Arrow — outer (blue) + inner (white) stacked triangles for the 1.5px rim.
// ---------------------------------------------------------------------------

function Arrow(props: ArrowProps) {
  if (props.direction === 'none') return null;

  // Triangle dimensions match mock (12px half-base, 14px height for outer;
  // 10px / 12px for inner inset 3px from outer edge).
  if (props.direction === 'top') {
    // Bubble is BELOW target; arrow on TOP edge of bubble pointing UP.
    return (
      <View
        pointerEvents="none"
        style={[
          styles.arrowAnchor,
          { top: -14, left: props.offsetX - 12 },
        ]}
      >
        <View style={styles.arrowOuterTop} />
        <View style={[styles.arrowInnerTop, { top: 3, left: 2 }]} />
      </View>
    );
  }
  if (props.direction === 'bottom') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.arrowAnchor,
          { bottom: -14, left: props.offsetX - 12 },
        ]}
      >
        <View style={styles.arrowOuterBottom} />
        <View style={[styles.arrowInnerBottom, { bottom: 3, left: 2 }]} />
      </View>
    );
  }
  if (props.direction === 'left') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.arrowAnchor,
          { left: -14, top: props.offsetY - 12 },
        ]}
      >
        <View style={styles.arrowOuterLeft} />
        <View style={[styles.arrowInnerLeft, { left: 3, top: 2 }]} />
      </View>
    );
  }
  // right
  return (
    <View
      pointerEvents="none"
      style={[
        styles.arrowAnchor,
        { right: -14, top: props.offsetY - 12 },
      ]}
    >
      <View style={styles.arrowOuterRight} />
      <View style={[styles.arrowInnerRight, { right: 3, top: 2 }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BORDER = 1.5;
const BUBBLE_BORDER_COLOR = colors.bluePrimary;
const BUBBLE_BG = '#FFFFFF';

const styles = StyleSheet.create({
  bubble: {
    // No `position: 'absolute'` — outer Animated.View (in the
    // orchestrator) owns positioning via left/top. With position:absolute
    // here, the bubble would be removed from the parent's intrinsic
    // layout pass, the parent Animated.View would measure width=0 in
    // onLayout, placeBubble would compute x = target_center - 0 = wrong,
    // and the bubble would render visually at the right of the screen
    // with the arrow stuck at its left edge. (RN layout: position:absolute
    // children DON'T contribute size to the parent — same as web.)
    //
    // FIXED width (not min/max range) so placeBubble's x clamp math is
    // stable across all 10 steps regardless of copy length. Without a
    // fixed width, short-copy bubbles measured ~220 and long-copy bubbles
    // ~280, causing the orchestrator's onLayout to re-place after the
    // typewriter settled — visible drift to the side.
    width: 280,
    backgroundColor: BUBBLE_BG,
    borderColor: BUBBLE_BORDER_COLOR,
    borderWidth: BORDER,
    borderRadius: 18,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  counter: {
    color: BUBBLE_BORDER_COLOR,
    opacity: 0.6,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  copyRow: {
    minHeight: 40,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
    minWidth: 44,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BUBBLE_BORDER_COLOR,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnPressed: {
    backgroundColor: '#E5EDFF',
  },
  nextBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 40,
    minWidth: 44,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BUBBLE_BORDER_COLOR,
    backgroundColor: colors.blueSecondary,
    // Subtle 3D depth — solid 3px shadow drop on the bottom edge,
    // mimicking mock's `box-shadow: 0 3px 0 #1e3c88`.
    shadowColor: BUBBLE_BORDER_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    // Android elevation for parity (drops a slight blurred shadow vs
    // iOS's hard offset, but it's the closest analog without a wrapper).
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 0, height: 1 },
  },

  // Arrow anchor — absolute positioning frame for the triangle pair.
  arrowAnchor: {
    position: 'absolute',
    width: 24,
    height: 14,
  },

  // Top/bottom arrows: vertical triangles. transparent left/right borders
  // form the diagonals; the bottom (or top) border is the solid colored edge.
  arrowOuterTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: BUBBLE_BORDER_COLOR,
  },
  arrowInnerTop: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: BUBBLE_BG,
  },
  arrowOuterBottom: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: BUBBLE_BORDER_COLOR,
  },
  arrowInnerBottom: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: BUBBLE_BG,
  },

  // Left/right arrows — same pattern but rotated 90deg (transparent top/bottom).
  arrowOuterLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderRightWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: BUBBLE_BORDER_COLOR,
  },
  arrowInnerLeft: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: BUBBLE_BG,
  },
  arrowOuterRight: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: BUBBLE_BORDER_COLOR,
  },
  arrowInnerRight: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: BUBBLE_BG,
  },
});
