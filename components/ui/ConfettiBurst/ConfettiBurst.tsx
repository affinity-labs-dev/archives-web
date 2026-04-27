import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
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
  gravity: number;
}

function ParticleView({
  particle,
  progress,
  originX,
  originY,
  gravity,
}: ParticleViewProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const dx =
      Math.cos(particle.angleRad) * particle.velocity * t +
      Math.sin(t * Math.PI * particle.driftFreq) * particle.driftAmp * t;
    const dy =
      Math.sin(particle.angleRad) * particle.velocity * t +
      0.5 * gravity * 1000 * t * t;
    const rotation = particle.rotStart + particle.rotSpeed * t;
    const fadeT =
      t < particle.fadeStart
        ? 1
        : Math.max(
            0,
            1 - (t - particle.fadeStart) / (1 - particle.fadeStart),
          );
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
}

/**
 * Reanimated-driven particle burst. Imperative `fire(origin)` API lets the
 * consumer measure a target view (option, button, etc.) and emit from its
 * center — see `Quiz.tsx` for the canonical usage.
 *
 * One shared `progress` value drives all particles via worklet math — 45
 * particles cost a single per-frame transform recompute on the UI thread,
 * so the burst stays at 60fps on iOS and mid-tier Android.
 *
 * No Skia / canvas dependency — picks up Reanimated v3 and
 * react-native-worklets which are already in the codebase.
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
    const [active, setActive] = useState(false);
    // Bumped on every fire() so consecutive bursts re-randomize particle
    // params instead of replaying the same path.
    const [seed, setSeed] = useState(0);

    // Mounted-guard for the worklet→JS callback. scheduleOnRN delivers
    // setActive(false) some time after withTiming completes; if the host
    // unmounted in the meantime (e.g. user navigated out of the quiz mid
    // burst), calling setState here would warn and leak. The guard reads
    // the latest mount status synchronously inside the JS callback.
    const isMountedRef = useRef(true);
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
        cancelAnimation(progress);
      };
    }, [progress]);

    const particles = useMemo(
      () => makeParticles(count, spread, startVelocity, palette),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [count, spread, startVelocity, palette, seed],
    );

    useImperativeHandle(ref, () => ({
      fire: (origin) => {
        // Respect the OS reduce-motion setting — confetti is decorative
        // and should be suppressed for users who opt out of animations.
        // The codebase already centralizes this via theme/motion.
        if (isReducedMotion()) {
          onDone?.();
          return;
        }
        cancelAnimation(progress);
        originX.value = origin.x;
        originY.value = origin.y;
        progress.value = 0;
        setSeed((s) => s + 1);
        setActive(true);
        progress.value = withTiming(
          1,
          { duration, easing: Easing.out(Easing.quad) },
          (finished) => {
            'worklet';
            if (finished) {
              scheduleOnRN(() => {
                if (!isMountedRef.current) return;
                setActive(false);
                onDone?.();
              });
            }
          },
        );
      },
    }));

    if (!active) return null;

    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {particles.map((p, i) => (
          <ParticleView
            key={i}
            particle={p}
            progress={progress}
            originX={originX}
            originY={originY}
            gravity={gravity}
          />
        ))}
      </View>
    );
  },
);

ConfettiBurst.displayName = 'ConfettiBurst';
