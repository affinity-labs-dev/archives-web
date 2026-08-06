// TodayWalkthroughOverlay — orchestrator for ONE surface ('home' or 'modal').
// Two instances mount: one inside the home Animated.View, one inside the
// lesson Modal's SafeAreaProvider. Both subscribe to the same Provider
// context but render only when the active step's surface matches their own.
//
// Responsibilities:
//   1. Measure overlay container (onLayout) + the active step's target ref
//      (measureInWindow) and convert to overlay-local coords.
//   2. Run placeBubble() — preferred placement → flip on overflow → center
//      fallback. Returns x/y for bubble + arrow direction for the ::after
//      tail. Mock line 3380-3456.
//   3. Drive bubble entrance (opacity 0→1, scale 0.9→1, 280ms back.out(2))
//      after entryDelay (1200ms first step, 280ms same-screen).
//   4. Drive bubble exit (opacity → 0, scale → 0.92) when step changes or
//      layerHidden flips true (showOn gate).
//   5. Forward primary/secondary rect to SpotlightMask for the cutout tween.
//   6. Forward primary rect + active flag to PulseRing for the affordance
//      ring on action steps.
//   7. pointerEvents gating per mode:
//      - passive    → render full-surface tap blocker so nothing else works.
//      - action     → no blocker; overlay is box-none so target taps pass.
//      - interactive→ same as action; only Skip/Next on bubble are tappable.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { isReducedMotion, safeDuration } from '@/components/ui/theme/motion';

import { PulseRing } from './primitives/PulseRing';
import { SpeechBubble, type ArrowDirection } from './primitives/SpeechBubble';
import { SpotlightMask } from './primitives/SpotlightMask';
import { TOTAL_STEPS, type WalkthroughStep, type WalkthroughSurface } from './steps';
import { useTodayWalkthrough } from './TodayWalkthroughProvider';

// ---------------------------------------------------------------------------
// Constants (mock parity)
// ---------------------------------------------------------------------------

// Entry delays before measuring + showing the bubble.
//   - FRESH_SURFACE_MS: first time the overlay's surface enters the tour.
//     Covers the home AnimatedEntrance settle (~500ms) / modal initial
//     paint (~400ms). 500ms is enough — bubble appearing too soon feels
//     premature; appearing too late feels broken.
//   - SAME_SURFACE_MS: step-to-step transitions on the same surface.
//     Aligned with BUBBLE_EXIT_MS so cutout snap + entry measure happen
//     RIGHT after the bubble finishes fading out — no dead air.
//   - REDUCED_MOTION_MS: minimal frame for layout-settle, no animation.
const ENTRY_DELAY_FRESH_SURFACE_MS = 500;
const ENTRY_DELAY_SAME_SURFACE_MS = 200;
const ENTRY_DELAY_REDUCED_MOTION_MS = 16;

// placeBubble safety margins — same values as mock placeBubble() line 3382.
const BUBBLE_GAP_PX = 14;       // distance between bubble edge and target edge
const SAFE_TOP_PX = 60;         // keep bubble below status bar zone
const SAFE_BOTTOM_PX = 20;      // and above home-indicator zone
const SAFE_HORIZ_PX = 8;

// Bubble entrance / exit timings. Reduced from mock's 280/200 to 200/180:
// shorter durations = fewer Reanimated frames = less work on Android JS
// thread. The back.out(2) easing is steep enough that 200ms still reads as
// a confident "pop" entrance, and 180ms exit is barely perceptible (just
// long enough to mask the cutout snap underneath).
const BUBBLE_ENTER_MS = 200;
const BUBBLE_EXIT_MS = 180;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Rect = { x: number; y: number; w: number; h: number };

type Placement = WalkthroughStep['placement'];

type ResolvedPlacement = {
  x: number;
  y: number;
  arrow: ArrowDirection;
  // Offset of the arrow along its axis — see SpeechBubble Arrow props.
  arrowOffset: number;
  // origin string for transformOrigin during entrance (e.g., 'center top')
  origin: string;
};

type Props = {
  surface: WalkthroughSurface;
};

// ---------------------------------------------------------------------------
// Helpers — pure functions
// ---------------------------------------------------------------------------

function unionRect(a: Rect, b: Rect): Rect {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function flipPlacement(p: Placement): Placement {
  switch (p) {
    case 'top': return 'bottom';
    case 'bottom': return 'top';
    case 'left': return 'right';
    case 'right': return 'left';
    default: return 'center';
  }
}

function originForArrow(arrow: ArrowDirection): string {
  switch (arrow) {
    case 'top': return 'center top';
    case 'bottom': return 'center bottom';
    case 'left': return 'left center';
    case 'right': return 'right center';
    default: return 'center center';
  }
}

// Build the SpeechBubble arrow prop from a resolved placement. SpeechBubble
// uses one discriminated-union variant per direction so the consuming Arrow
// component narrows cleanly — that means we can't pass a `'top' | 'bottom'`
// direction as a single value; we have to commit to a specific literal here.
type SpeechBubbleArrowProp = React.ComponentProps<typeof SpeechBubble>['arrow'];
function resolveArrow(p: ResolvedPlacement | null): SpeechBubbleArrowProp {
  if (!p) return { direction: 'none' };
  switch (p.arrow) {
    case 'top':    return { direction: 'top', offsetX: p.arrowOffset };
    case 'bottom': return { direction: 'bottom', offsetX: p.arrowOffset };
    case 'left':   return { direction: 'left', offsetY: p.arrowOffset };
    case 'right':  return { direction: 'right', offsetY: p.arrowOffset };
    case 'none':   return { direction: 'none' };
  }
}

// Place the bubble around `target` within `frame`. Tries preferred placement,
// flips to opposite on overflow, falls back to center. Returns final x/y +
// arrow direction + arrow axis offset. Pure port of mock placeBubble() line
// 3380-3456 — only difference: frame is overlay-local (not 393×852 design grid).
function placeBubble(
  target: Rect | null,
  preferred: Placement,
  bubbleSize: { w: number; h: number },
  frame: { w: number; h: number },
): ResolvedPlacement {
  const FW = frame.w;
  const FH = frame.h;
  const bw = bubbleSize.w;
  const bh = bubbleSize.h;

  // No target → center the bubble in the frame, no arrow.
  const tx = target ? target.x : FW / 2;
  const ty = target ? target.y : FH / 2;
  const tw = target ? target.w : 0;
  const th = target ? target.h : 0;

  const tries: Placement[] = preferred === 'center'
    ? ['center']
    : [preferred, flipPlacement(preferred), 'center'];

  let chosen: Placement | null = null;
  let x = 0;
  let y = 0;
  let arrow: ArrowDirection = 'none';

  for (const p of tries) {
    if (chosen) break;
    if (p === 'top') {
      x = tx + tw / 2 - bw / 2;
      y = ty + th + BUBBLE_GAP_PX;
      if (y + bh <= FH - SAFE_BOTTOM_PX) { chosen = p; arrow = 'top'; }
    } else if (p === 'bottom') {
      x = tx + tw / 2 - bw / 2;
      y = ty - BUBBLE_GAP_PX - bh;
      if (y >= SAFE_TOP_PX) { chosen = p; arrow = 'bottom'; }
    } else if (p === 'left') {
      x = tx - BUBBLE_GAP_PX - bw;
      y = ty + th / 2 - bh / 2;
      if (x >= SAFE_HORIZ_PX) { chosen = p; arrow = 'right'; }
    } else if (p === 'right') {
      x = tx + tw + BUBBLE_GAP_PX;
      y = ty + th / 2 - bh / 2;
      if (x + bw <= FW - SAFE_HORIZ_PX) { chosen = p; arrow = 'left'; }
    } else {
      x = (FW - bw) / 2;
      y = target
        ? Math.min(FH - bh - SAFE_BOTTOM_PX, Math.max(SAFE_TOP_PX + 20, ty + th + BUBBLE_GAP_PX))
        : (FH - bh) / 2;
      chosen = 'center';
      arrow = 'none';
    }
  }

  // Edge-clamp.
  x = Math.max(SAFE_HORIZ_PX, Math.min(x, FW - bw - SAFE_HORIZ_PX));
  y = Math.max(SAFE_TOP_PX, Math.min(y, FH - bh - SAFE_BOTTOM_PX));

  // Arrow offset along its axis — keeps the tail visually connected to the
  // target's center even when the bubble is edge-clamped. Clamped 14..(size-14)
  // so the arrow doesn't escape the bubble's rounded corners.
  let arrowOffset = 0;
  if (arrow === 'top' || arrow === 'bottom') {
    arrowOffset = Math.max(14, Math.min(bw - 14, tx + tw / 2 - x));
  } else if (arrow === 'left' || arrow === 'right') {
    arrowOffset = Math.max(14, Math.min(bh - 14, ty + th / 2 - y));
  }

  return { x, y, arrow, arrowOffset, origin: originForArrow(arrow) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TodayWalkthroughOverlay({ surface }: Props) {
  const ctx = useTodayWalkthrough();
  const { active, currentStep, layerHidden, advance, skip, idx, getTargetRef } = ctx;

  // Render-gate: only the overlay whose surface matches the active step does
  // anything. Idle overlays return null (no measure, no animation, no DOM).
  const isOurStep = active && currentStep?.surface === surface && !layerHidden;

  // ---- Layout state ----
  const containerRef = useRef<View | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  // Default to (0,0) — for both root-level home overlay and modal-level
  // overlay (Modal opens its own native window starting at 0,0), the
  // measured offset is essentially zero. Defaulting avoids gating the
  // entire effect chain on the RAF measurement, which was the root cause
  // of the modal walkthrough never appearing — measureInWindow would
  // sometimes return after the dive animation had already moved on,
  // leaving containerOffset null past the entry delay.
  const [containerOffset, setContainerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // ---- Measured target rects (overlay-local coords) ----
  const [primaryRect, setPrimaryRect] = useState<Rect | null>(null);
  const [secondaryRect, setSecondaryRect] = useState<Rect | null>(null);
  // Flips true after measureAndCommit's final commit (whether rects were
  // measured successfully OR retries exhausted with null). Placement effect
  // gates on this so it doesn't commit a fallback center placement before
  // the measure attempt has finished — without this gate, the placement
  // effect runs with primaryRect=null on first render (after onLayout but
  // before the entry-delay timer fires), commits center placement, marks
  // lastPlacedIdxRef=idx, and then SKIPS the real placement when the
  // measured rect arrives 500ms later.
  const [measureAttemptDone, setMeasureAttemptDone] = useState(false);

  // ---- Bubble layout (measured via onLayout on first render) ----
  const [bubbleSize, setBubbleSize] = useState<{ w: number; h: number } | null>(null);

  // ---- Resolved placement (after placeBubble runs) ----
  const [placement, setPlacement] = useState<ResolvedPlacement | null>(null);

  const [displayed, setDisplayed] = useState<{
    step: WalkthroughStep;
    idx: number;
  } | null>(null);

  // ---- Bubble entrance shared values ----
  const bubbleOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0.9);

  // Track the previously-shown step idx — used by the showStep effect to
  // distinguish a STEP CHANGE (fade out → measure → fade in) from a
  // re-render within the same step (containerOffset settled, bubbleSize
  // updated, etc.). Without this, every dep churn fired a fresh fade-out
  // mid-bubble and the user saw a flicker as the bubble dimmed and recovered
  // multiple times during the same step.
  const lastIdxRef = useRef<number | null>(null);
  // Tracks the last surface the overlay rendered for — used to decide the
  // entry-delay length (fresh surface vs. same surface bubble-to-bubble).
  const lastSurfaceRef = useRef<WalkthroughSurface | null>(null);
  // Tracks the idx that was last committed via placeBubble + setPlacement.
  // Without this gate, the placement effect re-runs whenever bubbleSize
  // updates (e.g., because the next step's copy has a slightly different
  // height after Typewriter's sizer measures it) — that re-run would
  // commit a slightly different placement mid-entrance, teleporting the
  // bubble 1-2 frames into its fade-in. Gate ensures placement commits
  // exactly ONCE per idx; subsequent layout settle is ignored.
  const lastPlacedIdxRef = useRef<number | null>(null);
  // Tracks the idx for which measureAndCommit's commit has finished. SYNC
  // companion to measureAttemptDone state. Why both:
  //   - State (measureAttemptDone) triggers re-renders so the placement
  //     effect re-runs after measure completes.
  //   - Ref (measureDoneIdxRef) is read synchronously inside the placement
  //     effect to guard against stale-closure issues when the showStep +
  //     placement effects run in the SAME render commit (showStep schedules
  //     setMeasureAttemptDone(false), but its effect on state is deferred
  //     to the next render — placement effect in the same commit still
  //     reads the OLD state value through its closure, and would proceed
  //     to commit a placement using the previous step's stale primaryRect).
  // Refs update synchronously, so a sync invalidate in showStep is visible
  // to the placement effect immediately within the same commit.
  const measureDoneIdxRef = useRef<number | null>(null);

  // ---- onLayout: container ----
  // We need both size (for placeBubble frame + SpotlightMask viewBox) AND
  // window-space offset (for the local-coord conversion in measureTarget).
  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ w: width, h: height });
    // measureInWindow on next frame — onLayout fires before the commit is
    // fully laid out on Android, so calling it synchronously here can return
    // 0,0. The measured offset is ONLY a refinement; containerOffset starts
    // at (0,0) and the effect chain proceeds without waiting on it (see the
    // state declaration above for why this matters for the modal overlay).
    requestAnimationFrame(() => {
      containerRef.current?.measureInWindow((wx, wy) => {
        if (typeof wx === 'number' && typeof wy === 'number') {
          setContainerOffset({ x: wx, y: wy });
        }
      });
    });
  }, []);

  // ---- Measure target ref → overlay-local rect ----
  const measureTarget = useCallback(
    async (id: WalkthroughStep['target']): Promise<Rect | null> => {
      if (!id) return null;
      const ref = getTargetRef(id);
      if (!ref?.current) return null;
      return new Promise((resolve) => {
        ref.current?.measureInWindow((tx, ty, tw, th) => {
          // measureInWindow can return 0,0,0,0 if the view isn't painted yet.
          // Treat zero-size as "not ready" — caller will retry.
          if (tw === 0 && th === 0) {
            resolve(null);
            return;
          }
          resolve({
            x: tx - containerOffset.x,
            y: ty - containerOffset.y,
            w: tw,
            h: th,
          });
        });
      });
    },
    [containerOffset, getTargetRef],
  );

  // ---- Bubble onLayout ----
  // Fires once after the bubble first renders at off-screen position. We
  // store w/h and let the placement effect re-run with the real size. Mock
  // does the same trick (line 3385-3392 — set visibility:hidden + offsetW/H).
  const onBubbleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBubbleSize((prev) => {
      // Tolerance: avoid re-trigger churn if the size is essentially the same
      // (Android may re-fire onLayout 1px off after inner Typewriter typed
      // its first chars).
      if (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1) {
        return prev;
      }
      return { w: width, h: height };
    });
  }, []);

  // ---- Show step effect: fade out → measure → fade in ----
  // Critical invariant: the fade-out must ONLY fire on a real step change.
  // Earlier draft fired it whenever the effect re-ran (e.g. when measureTarget
  // identity changed because containerOffset was just measured), causing the
  // bubble to flicker out-and-in in the middle of step 1. lastIdxRef tracks
  // the previously-handled step idx; same-idx re-runs skip the fade entirely.
  useEffect(() => {
    if (!isOurStep || !currentStep || !containerSize) {
      // Tour deactivated or layer hidden — fade bubble out + collapse rects.
      const dur = safeDuration(BUBBLE_EXIT_MS);
      bubbleOpacity.value = withTiming(0, { duration: dur, easing: Easing.out(Easing.quad) });
      bubbleScale.value = withTiming(0.92, { duration: dur, easing: Easing.out(Easing.quad) });
      const t = setTimeout(() => {
        setPrimaryRect(null);
        setSecondaryRect(null);
        setPlacement(null);
        setDisplayed(null);
        setMeasureAttemptDone(false);
      }, dur);
      // Reset trackers so a fresh tour start re-runs entry + placement
      // from clean state. Without resetting lastPlacedIdxRef, REPLAY
      // could see `lastPlacedIdxRef.current === idx` and skip placement.
      lastIdxRef.current = null;
      lastPlacedIdxRef.current = null;
      measureDoneIdxRef.current = null;
      return () => clearTimeout(t);
    }

    const isStepChange = lastIdxRef.current !== null && lastIdxRef.current !== idx;
    const isFreshEntry = lastIdxRef.current === null;

    // Reset measure flag on step change OR fresh entry so the placement
    // effect waits for the upcoming measureAndCommit. Without this, the
    // flag from a prior step would still be true and placement would
    // commit immediately with the prior step's rects.
    //
    // CRITICAL — invalidate the ref SYNCHRONOUSLY so the placement effect
    // running later in this same commit (after this showStep effect) sees
    // the invalidation immediately. The setState below schedules an async
    // state update for the NEXT render; without the sync ref reset, the
    // placement effect would read the stale measureAttemptDone=true via
    // its closure and commit placement using the PREVIOUS step's rects.
    if (isStepChange || isFreshEntry) {
      measureDoneIdxRef.current = null;
      setMeasureAttemptDone(false);
    }

    // Decide entry delay. Reduced motion → skip the wait entirely.
    let delay: number;
    if (isReducedMotion()) {
      delay = ENTRY_DELAY_REDUCED_MOTION_MS;
    } else if (isFreshEntry || lastSurfaceRef.current !== surface) {
      delay = ENTRY_DELAY_FRESH_SURFACE_MS;
    } else {
      delay = ENTRY_DELAY_SAME_SURFACE_MS;
    }

    let cancelled = false;

    // Phase 1: fade out the previous bubble — ONLY on actual step change.
    // Fresh entries (first step on this overlay's surface) and within-step
    // re-renders (containerOffset settling, etc.) skip this.
    if (isStepChange && !isReducedMotion()) {
      const exitDur = safeDuration(BUBBLE_EXIT_MS);
      bubbleOpacity.value = withTiming(0, { duration: exitDur, easing: Easing.out(Easing.quad) });
      bubbleScale.value = withTiming(0.92, { duration: exitDur, easing: Easing.out(Easing.quad) });
    }

    // Phase 2: measure + commit. Placement effect picks up + drives the
    // bubble entrance. We always set measureAttemptDone=true at the end
    // (even on retry exhaustion) so the placement effect doesn't hang
    // waiting for a rect that will never arrive (e.g. step 4's s2-dots
    // when today's quest is single-video).
    const measureAndCommit = async () => {
      if (cancelled) return;
      let retries = 0;
      const attempt = async () => {
        if (cancelled) return;
        const primary = await measureTarget(currentStep.target);
        const secondary = currentStep.secondary
          ? await measureTarget(currentStep.secondary)
          : null;
        if (
          currentStep.target !== null &&
          !primary &&
          retries < 3 &&
          !cancelled
        ) {
          retries++;
          setTimeout(attempt, 200);
          return;
        }
        if (cancelled) return;
        // SYNC update first so the placement effect (will fire from the
        // setState batch below) sees an up-to-date ref through its
        // synchronous gate, regardless of when its closure was created.
        measureDoneIdxRef.current = idx;
        setPrimaryRect(primary);
        setSecondaryRect(secondary);
        // Trigger re-render — primary/secondary state changes already
        // would, but if both happen to equal previous values (e.g. step 4
        // single-video case where primary stays null), React batches and
        // bails out, never re-running the placement effect. The state
        // change below guarantees a re-render.
        setMeasureAttemptDone(true);
      };
      attempt();
    };

    const t = setTimeout(measureAndCommit, delay);
    lastIdxRef.current = idx;
    lastSurfaceRef.current = surface;

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    isOurStep,
    currentStep,
    idx,
    containerSize,
    containerOffset,
    surface,
    measureTarget,
    bubbleOpacity,
    bubbleScale,
  ]);

  // ---- Placement effect: runs when target rect + bubble size both known ----
  // Gated by lastPlacedIdxRef so it commits placement + kicks entrance
  // EXACTLY ONCE per step idx. Without the gate, every onLayout-driven
  // bubbleSize update (typewriter sizer settling on font-loaded metrics,
  // copy-length difference between steps, etc.) re-ran placeBubble and
  // produced a slightly different x/y — visible as a 1-2px teleport
  // mid-entrance. The user's "flicker" report was THIS jitter.
  useEffect(() => {
    if (!isOurStep || !currentStep || !containerSize || !bubbleSize) {
      return;
    }
    if (lastPlacedIdxRef.current === idx) {
      // Already placed for this step — ignore subsequent dep churn so the
      // bubble doesn't teleport mid-entrance.
      return;
    }
    // SYNCHRONOUS gate via ref. The state-driven measureAttemptDone is
    // unreliable when this effect runs in the SAME commit as a step
    // change: showStep schedules setMeasureAttemptDone(false), but
    // placement effect's closure still holds the prior render's
    // measureAttemptDone=true. The ref is invalidated synchronously in
    // showStep, so reading measureDoneIdxRef.current here always reflects
    // the live state — including null after a step change before measure
    // has run.
    if (measureDoneIdxRef.current !== idx) {
      return;
    }

    // Anchor at the union of primary + secondary if step has both — keeps
    // the tail pointing at the visual centre of the dual spotlight (mock
    // line 3569).
    const anchor = primaryRect && secondaryRect
      ? unionRect(primaryRect, secondaryRect)
      : primaryRect;

    const resolved = placeBubble(anchor, currentStep.placement, bubbleSize, containerSize);
    setPlacement(resolved);
    setDisplayed({ step: currentStep, idx });
    lastPlacedIdxRef.current = idx;

    // Defer the Reanimated entrance kick to next animation frame so React
    // can commit `setPlacement` and the native side can apply the new
    // left/top BEFORE opacity/scale start ramping. Without this:
    //   - setPlacement queues a React update (commit on next tick).
    //   - withTiming starts a Reanimated worklet IMMEDIATELY (UI thread).
    //   - For 1-2 frames, opacity ramps from 0 while the bubble is still
    //     at its OLD left/top (or at -9999 on first show). User sees a
    //     ghost flash at the prior position before the bubble teleports.
    // requestAnimationFrame guarantees we're past React's commit + native
    // layout pass when the entrance starts.
    const dur = safeDuration(BUBBLE_ENTER_MS);
    const easing = Easing.bezier(0.175, 0.885, 0.32, 1.275);
    requestAnimationFrame(() => {
      bubbleOpacity.value = withTiming(1, { duration: dur, easing });
      bubbleScale.value = withTiming(1, { duration: dur, easing });
    });
  }, [
    isOurStep,
    currentStep,
    idx,
    primaryRect,
    secondaryRect,
    bubbleSize,
    containerSize,
    measureAttemptDone,
    bubbleOpacity,
    bubbleScale,
  ]);

  // ---- Reset on tour deactivation ----
  useEffect(() => {
    if (!active) {
      lastSurfaceRef.current = null;
      setPrimaryRect(null);
      setSecondaryRect(null);
      setPlacement(null);
      bubbleOpacity.value = 0;
      bubbleScale.value = 0.9;
    }
  }, [active, bubbleOpacity, bubbleScale]);

  // ---- Animated style for bubble entrance + transform-origin per arrow ----
  const bubbleAnimStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ scale: bubbleScale.value }],
  }));

  // Pre-mount strategy — overlay structure is ALWAYS rendered (no early
  // return on !isOurStep) so the SVG mask, Animated.Views, and Reanimated
  // worklets pay first-mount cost ONCE at app boot, not on every tour
  // start. SpotlightMask's dim opacity is REACTIVE to cutout activity so
  // it stays at 0 (invisible) while the tour is inactive — no screen-wide
  // dim during normal app use.
  //
  // Bubble's content reads from `displayed`, NOT `currentStep`. When idx
  // advances, currentStep updates synchronously but displayed lags until
  // placement commits in the placement effect — so the bubble's copy +
  // mode + step counter never appear at a stale position. Eliminates the
  // step-transition flicker.
  const showPulse =
    !!displayed &&
    displayed.step.mode === 'action' &&
    displayed.step.pulseTarget === true;
  const passiveTapBlock = isOurStep && displayed?.step.mode === 'passive';

  return (
    <View
      ref={containerRef}
      style={StyleSheet.absoluteFill}
      pointerEvents={isOurStep ? 'box-none' : 'none'}
      onLayout={onContainerLayout}
    >
      {/* SVG mask dim with one or two rounded cutouts. Step 1 (streak+week)
          uses the secondary cutout to spotlight both elements separately —
          merging into a single union loses the visual distinction. The mask
          is wrapped in a View with pointerEvents="none" inside the
          component so action-mode targets stay tappable through the dim. */}
      {containerSize ? (
        <SpotlightMask
          width={containerSize.w}
          height={containerSize.h}
          primary={isOurStep ? primaryRect : null}
          secondary={isOurStep ? secondaryRect : null}
          // Tour activity drives dim opacity. For passive center-bubble
          // steps (7, 10) primary + secondary are both null but dim
          // should still cover the screen — `active` decouples dim
          // visibility from cutout existence.
          active={isOurStep}
        />
      ) : null}

      {/* Tap blocker — passive only. Sits on top of mask so the dim
          screen swallows touches; bubble (rendered below this in JSX) is
          ABOVE in z because absolute children paint in order. */}
      {passiveTapBlock ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => { /* swallow */ }}
        />
      ) : null}

      {/* Pulse ring — action mode only. */}
      <PulseRing rect={isOurStep ? primaryRect : null} active={showPulse} />

      {/* Speech bubble. Hidden until placement resolves to avoid the brief
          flash at (-9999, 0). Once placement lands, opacity tweens in via
          bubbleAnimStyle. */}
      <Animated.View
        onLayout={onBubbleLayout}
        style={[
          {
            position: 'absolute',
            left: placement ? placement.x : -9999,
            top: placement ? placement.y : 0,
            transformOrigin: placement?.origin ?? 'center center',
          },
          bubbleAnimStyle,
        ]}
        pointerEvents={isOurStep ? 'box-none' : 'none'}
      >
        <SpeechBubble
          copy={displayed?.step.copy ?? ''}
          stepNumber={displayed ? displayed.idx + 1 : 1}
          totalSteps={TOTAL_STEPS}
          mode={displayed?.step.mode ?? 'passive'}
          arrow={resolveArrow(placement)}
          onSkip={skip}
          onNext={advance}
        />
      </Animated.View>
    </View>
  );
}
