import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { isReducedMotion } from '../theme';

export interface ConfettiBurstHandle {
  fire: (origin: { x: number; y: number }) => void;
}

export interface ConfettiBurstProps {
  /** Palette to randomly assign per particle. */
  colors: string[];
  /** Particle count. Default 45 (matches the daily-story mock). */
  count?: number;
  /** Emission cone, in degrees. Default 55. */
  spread?: number;
  /** Initial velocity (canvas-confetti units; multiplied internally). Default 28. */
  startVelocity?: number;
  /** Lifespan in ms. Default 1400. */
  duration?: number;
  /** Gravity coefficient. Default 0.6 — heavier values arc particles down faster. */
  gravity?: number;
  /** Fired once the burst finishes. */
  onDone?: () => void;
}

interface Particle {
  color: string;
  width: number;
  height: number;
  borderRadius: number;
  angleRad: number;
  velocity: number;
  rotStart: number;
  rotSpeed: number;
  driftAmp: number;
  driftFreq: number;
  fadeStart: number;
}

function makeParticles(
  count: number,
  spread: number,
  startVelocity: number,
  palette: string[],
): Particle[] {
  const halfSpread = (spread * Math.PI) / 180 / 2;
  // Emit upward (-PI/2) so the burst arcs over the origin before gravity
  // takes hold — matches `canvas-confetti` defaults and the mock spec.
  const baseAngle = -Math.PI / 2;
  return Array.from({ length: count }, () => {
    const w = 5 + Math.random() * 4;
    const isRect = Math.random() < 0.6;
    return {
      color: palette[Math.floor(Math.random() * palette.length)],
      width: w,
      height: isRect ? w * 1.6 : w,
      borderRadius: isRect ? 1 : w,
      angleRad: baseAngle + (Math.random() * 2 - 1) * halfSpread,
      // *8 maps canvas-confetti velocity units onto pixel space across a
      // 1.4s lifespan — tuned to feel identical to the mock at iPhone 14
      // viewport scale.
      velocity: startVelocity * (0.85 + Math.random() * 0.4) * 8,
      rotStart: Math.random() * 360,
      rotSpeed: (Math.random() * 2 - 1) * 720,
      driftAmp: (Math.random() * 2 - 1) * 14,
      driftFreq: 1.5 + Math.random() * 1.5,
      fadeStart: 0.7 + Math.random() * 0.15,
    };
  });
}

interface ParticleViewProps {
  particle: Particle;
  progress: SharedValue<number>;
  originX: SharedValue<number>;
  originY: SharedValue<number>;
  isFiring: SharedValue<number>;
  gravity: number;
}

/**
 * Per-particle animated wrapper.
 *
 * The worklet body intentionally captures ONLY primitive numbers in its
 * lexical scope (no `particle.X` property accesses, no plain-object
 * captures). The Reanimated babel plugin's auto-workletization is
 * sensitive to closure shape — a SIGABRT in `Function::getHostFunction`
 * inside `WorkletRuntimeDecorator::decorate $_2` (the `_scheduleOnJS`
 * trampoline) would fire on every frame's rAF flush when a complex
 * closure tripped up the worklet runtime registration. Pre-extracting
 * fields to local primitives keeps the closure shape uniform and
 * matches the patterns Reanimated tests cover.
 *
 * Wrapped in React.memo: the parent ConfettiBurst no longer re-renders
 * on fire() (no setState calls), but if a consumer re-renders for an
 * unrelated reason we don't want to re-create 45 useAnimatedStyle
 * registrations. memo + stable particle reference (no re-randomization)
 * keeps the worklets mounted across the entire host's lifetime.
 */
const ParticleView = memo(function ParticleView({
  particle,
  progress,
  originX,
  originY,
  isFiring,
  gravity,
}: ParticleViewProps) {
  // Pre-extract every per-particle param so the worklet body below
  // captures plain numbers (not object property accesses through a JS
  // closure).
  const angleRad = particle.angleRad;
  const velocity = particle.velocity;
  const rotStart = particle.rotStart;
  const rotSpeed = particle.rotSpeed;
  const driftAmp = particle.driftAmp;
  const driftFreq = particle.driftFreq;
  const fadeStart = particle.fadeStart;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Idle gate: when not firing, return opacity 0 immediately. The
    // worklet still re-runs once when isFiring transitions 1 → 0 (final
    // commit) and once when it transitions 0 → 1 (first frame of the
    // next fire). In between (animation actively running) progress is
    // changing, so the gate falls through to the math. When the burst
    // is fully idle, no sharedValue is mutating, so Reanimated doesn't
    // call the worklet at all → zero CPU cost while pre-mounted.
    if (isFiring.value === 0) {
      return { opacity: 0 };
    }
    const t = progress.value;
    const dx =
      Math.cos(angleRad) * velocity * t +
      Math.sin(t * Math.PI * driftFreq) * driftAmp * t;
    const dy =
      Math.sin(angleRad) * velocity * t + 0.5 * gravity * 1000 * t * t;
    const rotation = rotStart + rotSpeed * t;
    const fadeT =
      t < fadeStart
        ? 1
        : Math.max(0, 1 - (t - fadeStart) / (1 - fadeStart));
    return {
      opacity: fadeT,
      transform: [
        { translateX: originX.value + dx },
        { translateY: originY.value + dy },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      // Hardware texture: Android uploads each particle's tiny bitmap
      // (5–9 px square or 1.6× rect) to a GPU texture once. Per-frame
      // transforms become single matrix uniform updates instead of
      // re-rasterizing the colored rect every frame. iOS ignores this
      // prop — its compositor already does layer caching automatically.
      // Net effect on Android: 45 particles compositing as 45 GPU-cached
      // sprites instead of 45 re-rasterized rects per frame.
      renderToHardwareTextureAndroid
      style={[
        {
          position: 'absolute',
          left: -particle.width / 2,
          top: -particle.height / 2,
          width: particle.width,
          height: particle.height,
          backgroundColor: particle.color,
          borderRadius: particle.borderRadius,
        },
        animatedStyle,
      ]}
    />
  );
});

/**
 * Reanimated-driven particle burst. Imperative `fire(origin)` API lets
 * the consumer measure a target view (option, button, etc.) and emit
 * from its center — see `Quiz.tsx` for the canonical usage.
 *
 * PERFORMANCE NOTES
 * ─────────────────
 * Previous version triggered a React re-render + remount of all 45
 * `ParticleView`s on every `fire()` call (via `setSeed` + `setActive`).
 * On Android, the cumulative cost of registering 45 fresh
 * `useAnimatedStyle` worklets at fire-time produced a visible 100–200ms
 * stall right before the burst appeared — exactly the "stuck rồi pháo
 * hoa bắn ra" symptom reported on the XP milestone screen.
 *
 * This version pre-mounts all particles at component mount (cost gets
 * absorbed into the surrounding screen's entrance). `fire()` only
 * mutates shared values: zero React re-renders, zero remounts, no
 * worklet re-registration. The first frame of the burst arrives on the
 * very next vsync.
 *
 * Visibility is gated by an `isFiring` shared value the worklet checks
 * up front — when 0 the worklet returns `opacity: 0` and skips all the
 * trajectory math; when 1 the burst progresses normally. Reanimated
 * only re-runs the worklet when one of the captured shared values
 * actually changes, so an idle `ConfettiBurst` costs nothing per frame.
 *
 * Trade-off vs. the previous behaviour: particle paths are stable
 * across consecutive fires (same angles, same velocities). For
 * celebration flows (one fire per screen lifetime) this is invisible;
 * if a consumer ever needs re-randomization, expose a `seed` prop and
 * re-roll the particle ref array on change.
 */
export const ConfettiBurst = forwardRef<ConfettiBurstHandle, ConfettiBurstProps>(
  (
    {
      colors: palette,
      count = 45,
      spread = 55,
      startVelocity = 28,
      duration = 1400,
      gravity = 0.6,
      onDone,
    },
    ref,
  ) => {
    const progress = useSharedValue(0);
    const originX = useSharedValue(0);
    const originY = useSharedValue(0);
    // 0 when idle (particles invisible, worklets short-circuit);
    // 1 while a burst is in flight (worklets compute trajectories).
    const isFiring = useSharedValue(0);

    // Particles are generated ONCE per component lifetime. No `seed`
    // state, no per-fire re-randomization → no React re-render on
    // fire(). For the XP / streak / score celebrations we render this
    // component fresh per Modal anyway, so the user never sees the
    // same path twice in practice.
    const particles = useMemo(
      () => makeParticles(count, spread, startVelocity, palette),
      [count, spread, startVelocity, palette],
    );

    // Mounted-guard for the worklet→JS callback. scheduleOnRN delivers
    // the burst-end handler some time after withTiming completes; if
    // the host unmounted in the meantime (e.g. user navigated out of
    // the quiz mid-burst), calling consumer code here would warn and
    // leak. Read synchronously inside the JS callback.
    const isMountedRef = useRef(true);
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
        cancelAnimation(progress);
      };
    }, [progress]);

    // Stable JS callback for scheduleOnRN. Inline arrows captured by
    // a worklet → scheduleOnRN are fragile under the Reanimated babel
    // plugin (the inner closure can fail to register as a callable on
    // the worklet runtime, surfacing as a SIGABRT every frame). A
    // useCallback gives scheduleOnRN a stable reference that matches
    // the patterns elsewhere in the codebase.
    const handleBurstEnd = useCallback(() => {
      if (!isMountedRef.current) return;
      onDone?.();
    }, [onDone]);

    useImperativeHandle(ref, () => ({
      fire: (origin) => {
        // Respect the OS reduce-motion setting — confetti is decorative
        // and should be suppressed for users who opt out of animations.
        if (isReducedMotion()) {
          onDone?.();
          return;
        }
        cancelAnimation(progress);
        originX.value = origin.x;
        originY.value = origin.y;
        progress.value = 0;
        // Open the visibility gate first so the very first frame of the
        // tween already shows particles emerging from the origin.
        isFiring.value = 1;
        progress.value = withTiming(
          1,
          { duration, easing: Easing.out(Easing.quad) },
          (finished) => {
            'worklet';
            if (finished) {
              // Close the gate so worklets short-circuit and particles
              // disappear cleanly. Last-frame opacity from the math
              // would be 0 anyway (fadeStart fully passed), but
              // setting the gate explicitly keeps the contract clear.
              isFiring.value = 0;
              scheduleOnRN(handleBurstEnd);
            }
          },
        );
      },
    }));

    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {particles.map((p, i) => (
          <ParticleView
            key={i}
            particle={p}
            progress={progress}
            originX={originX}
            originY={originY}
            isFiring={isFiring}
            gravity={gravity}
          />
        ))}
      </View>
    );
  },
);

ConfettiBurst.displayName = 'ConfettiBurst';
