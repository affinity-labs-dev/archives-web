// SpotlightMask — full-surface dim with two animated rect cutouts that
// share a single SVG <Mask>. Mock parity: Downloads/06 guided walkthrough/
// index.html line 1776-1785 (mask def) + 3471-3491 (positionSpotlight tween).
//
// Why SVG mask (and not 4-rect dim):
//   1. Step 1 needs DUAL cutouts (streak pill + calendar week row, separate).
//      A 4-rect frame can only outline ONE rect cleanly; merging via union
//      lights the gap between them, which the user explicitly flagged.
//   2. Cutout edges must be ROUNDED (rx=18) to match the design tokens'
//      bubble + button radii. SVG <Rect rx ry> renders this natively; a
//      4-rect approach can't round the cutout edges without complex masking.
//
// Touch pass-through:
//   The earlier draft set `pointerEvents="none"` directly on <Svg>, but
//   react-native-svg has known quirks where that doesn't propagate to
//   child <Rect> nodes on iOS — the dim Rect was swallowing taps on action
//   targets (START MY DAY, READ, VOICEOVER). Robust fix: wrap the entire
//   SVG in a `<View pointerEvents="none">`. View-level hit-testing is
//   reliable across platforms; the SVG and all its children are then
//   excluded from the touch responder chain regardless of svg internals.
//
//   Passive-mode steps still need to swallow taps (so only Skip/Next on
//   the bubble work). That's handled by a sibling full-screen Pressable
//   in the orchestrator — NOT by this mask. Keep this component a pure
//   presentation layer.

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { safeDuration } from '@/components/ui/theme/motion';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export type Cutout = { x: number; y: number; w: number; h: number } | null;

type Props = {
  width: number;
  height: number;
  // Primary cutout — single-target steps. null collapses to a 0×0 rect at
  // the frame center (no visible hole).
  primary: Cutout;
  // Optional secondary cutout — only used by step 1 (streak + week dual
  // spotlight). null means "no second hole".
  secondary: Cutout;
  // Tour visibility on this surface — drives dim opacity. Required for
  // passive center-bubble steps (target=null on both primary/secondary)
  // where the dim should still cover the screen even though there's no
  // cutout. Tying dim opacity to "has cutout" hid the overlay entirely
  // for steps 7 + 10 (passive, no target).
  active: boolean;
};

const DIM_FADE_MS = 200;
// Cutout transition timing — tween between target rects on step change.
// Mock spec: 350ms `power2.out` (line 3483-3490). Reduced to 200ms here so
// the spotlight transition + bubble entrance + dim fade all fit within
// ~250ms on Android, where SVG mask compositing is software-rendered.
const TRANSITION_MS = 200;
const RECT_PADDING = 8;
const CUTOUT_RADIUS = 18;

function hiddenRect(width: number, height: number) {
  return { x: width / 2, y: height / 2, w: 0, h: 0 };
}

function expanded(rect: NonNullable<Cutout>) {
  return {
    x: rect.x - RECT_PADDING,
    y: rect.y - RECT_PADDING,
    w: rect.w + RECT_PADDING * 2,
    h: rect.h + RECT_PADDING * 2,
  };
}

export function SpotlightMask({ width, height, primary, secondary, active }: Props) {
  // Cutout positions are driven by shared values so the per-rect attributes
  // update on the UI thread via Reanimated worklets. Mock-parity: cutout
  // tweens 280ms `power2.out` between targets — the spotlight "slides" to
  // the new step's target instead of snapping. Compositing still happens
  // on software canvas on Android, but a single in-flight tween is far
  // less work than re-rendering the entire bubble subtree.
  const initial = hiddenRect(width, height);
  const x1 = useSharedValue(initial.x);
  const y1 = useSharedValue(initial.y);
  const w1 = useSharedValue(initial.w);
  const h1 = useSharedValue(initial.h);
  const x2 = useSharedValue(initial.x);
  const y2 = useSharedValue(initial.y);
  const w2 = useSharedValue(initial.w);
  const h2 = useSharedValue(initial.h);

  // First-show optimization: on the FIRST non-null primary/secondary we
  // receive, jump initial position to a 0×0 dot AT THE TARGET CENTER
  // before kicking the tween. This makes the cutout "open up" at the
  // target instead of "sliding from screen center to target" (which is
  // the visual you get if we let withTiming interpolate from the initial
  // hiddenRect = screen center).
  //
  // Why this matters for perf: same number of frames either way, but the
  // SVG mask redraw is cheaper when the cutout doesn't traverse a long
  // distance — Reanimated worklet has shorter interpolation deltas, and
  // visually the user perceives a snappy "expand" instead of a slow
  // "drag" from center. Combined with TRANSITION_MS=200ms, step 1 lag is
  // gone but the animation IS visible (unlike the pure-snap approach that
  // looked like the spotlight teleported with no animation at all).
  const primaryShownRef = useRef(false);
  const secondaryShownRef = useRef(false);

  // Tween primary cutout to new target on prop change. null collapses
  // back to the centered hiddenRect — the spotlight "closes" before the
  // tour finishes or layer hides.
  useEffect(() => {
    const target = primary ? expanded(primary) : hiddenRect(width, height);
    const dur = safeDuration(TRANSITION_MS);
    const easing = Easing.out(Easing.quad);
    if (!primaryShownRef.current && primary) {
      // First non-null primary — initialize at target-center 0×0, then
      // tween to full target. Cutout opens AT the target.
      const cx = target.x + target.w / 2;
      const cy = target.y + target.h / 2;
      x1.value = cx;
      y1.value = cy;
      w1.value = 0;
      h1.value = 0;
      primaryShownRef.current = true;
    }
    x1.value = withTiming(target.x, { duration: dur, easing });
    y1.value = withTiming(target.y, { duration: dur, easing });
    w1.value = withTiming(target.w, { duration: dur, easing });
    h1.value = withTiming(target.h, { duration: dur, easing });
  }, [primary, width, height, x1, y1, w1, h1]);

  // Tween secondary cutout — same pattern. Only step 1 sets a non-null
  // secondary; for every other step it's null (collapsed at center).
  useEffect(() => {
    const target = secondary ? expanded(secondary) : hiddenRect(width, height);
    const dur = safeDuration(TRANSITION_MS);
    const easing = Easing.out(Easing.quad);
    if (!secondaryShownRef.current && secondary) {
      const cx = target.x + target.w / 2;
      const cy = target.y + target.h / 2;
      x2.value = cx;
      y2.value = cy;
      w2.value = 0;
      h2.value = 0;
      secondaryShownRef.current = true;
    }
    x2.value = withTiming(target.x, { duration: dur, easing });
    y2.value = withTiming(target.y, { duration: dur, easing });
    w2.value = withTiming(target.w, { duration: dur, easing });
    h2.value = withTiming(target.h, { duration: dur, easing });
  }, [secondary, width, height, x2, y2, w2, h2]);

  // useAnimatedProps feeds x/y/width/height to AnimatedRect each frame
  // from the worklet — no React re-render, no JS bridge per frame. The
  // SVG node receives setNativeProps directly on the UI thread.
  const primaryAnimatedProps = useAnimatedProps(() => ({
    x: x1.value,
    y: y1.value,
    width: w1.value,
    height: h1.value,
  }));
  const secondaryAnimatedProps = useAnimatedProps(() => ({
    x: x2.value,
    y: y2.value,
    width: w2.value,
    height: h2.value,
  }));

  // Dim opacity tied to TOUR ACTIVITY on this surface (NOT cutout existence).
  // Earlier draft drove dim from `primary !== null || secondary !== null`,
  // but that broke passive center-bubble steps (step 7 'explore-page', step
  // 10 'quiz') which have target=null AND secondary=null → dim faded out
  // entirely → user saw a centered bubble floating on a fully-bright screen,
  // perceived as "no overlay". Active prop comes from the parent
  // (TodayWalkthroughOverlay) and reflects `isOurStep` — so dim is visible
  // for ALL active steps regardless of whether they have a spotlight cutout.
  const dimOpacity = useSharedValue(0);
  useEffect(() => {
    dimOpacity.value = withTiming(active ? 1 : 0, {
      duration: safeDuration(DIM_FADE_MS),
      easing: Easing.out(Easing.quad),
    });
  }, [active, dimOpacity]);
  const dimAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dimOpacity.value,
  }));

  return (
    // View wrapper enforces touch pass-through reliably across platforms
    // regardless of react-native-svg pointerEvents quirks.
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, dimAnimatedStyle]}>
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          <Defs>
            <Mask id="walkthrough-hole" maskUnits="userSpaceOnUse">
              <Rect x={0} y={0} width={width} height={height} fill="white" />
              <AnimatedRect
                rx={CUTOUT_RADIUS}
                ry={CUTOUT_RADIUS}
                fill="black"
                animatedProps={primaryAnimatedProps}
              />
              <AnimatedRect
                rx={CUTOUT_RADIUS}
                ry={CUTOUT_RADIUS}
                fill="black"
                animatedProps={secondaryAnimatedProps}
              />
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="rgba(0,0,0,0.55)"
            mask="url(#walkthrough-hole)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
