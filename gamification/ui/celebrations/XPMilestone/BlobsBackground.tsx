// Drifting yellow blob background for the XP Milestone celebration.
// Three pre-rendered PNG blob layers, each driven by a SINGLE progress
// shared value (0 → 1 → 0 → ...) that an `useAnimatedStyle` interpolates
// into translateX/translateY/rotate/scale. Keyframe values ported 1:1
// from the HTML mock's `@keyframes xp-drift-{1..3}`.
//
// PERFORMANCE NOTES — this component used to be the Android lag culprit:
//
//   1. SVG paths re-rasterized every frame (Skia can't cache a path
//      under a transforming parent). Replaced with PNGs baked at 2x
//      device resolution → native compositor handles transforms as a
//      single GPU matrix, no per-frame rasterization.
//
//   2. 12 parallel withSequence chains (3 blobs × 4 axes) → 12 worklet
//      ticks per frame. Now one progress driver per blob (3 chains
//      total) and the four axis values come from `interpolate` calls
//      inside the animated style worklet.
//
//   3. `renderToHardwareTextureAndroid` on each blob view → Android
//      uploads each blob bitmap to GPU once and reuses it for every
//      transform frame. iOS ignores the prop (its compositor already
//      does this).
//
//   4. Three coprime periods (5/6/7s) so layers desync naturally even
//      starting from the same phase 0 — no negative-delay equivalent
//      needed in Reanimated.

import { easings, safeDuration } from '@/components/ui';
import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Background container replicates the Figma "image 2603" frame: 447×852
// anchored at left:-35,top:0 of a 393×852 phone. We scale the same
// proportions to whatever the device width is so the blobs always bleed
// off the left edge by the same ratio that the mock established.
export const BG_OVERSHOOT = 35;
export const BG_HEIGHT = SCREEN_HEIGHT;
export const BG_WIDTH = SCREEN_WIDTH + BG_OVERSHOOT * 2;

// Per-blob drift config — periods + transform-origins from the mock CSS
// `xp-drift-{1..3}`. PNG sources are pre-baked exports of the SVGs in
// `Downloads/03 questions/assets/xp-blob-{1..3}.svg` at 2x resolution
// matching their on-screen footprint.
//
// The `kf` values are 5 stops (0/25/50/75/100% of the period) the
// animated style interpolates between. The 0% and 100% stops are both
// 0 (translate)/1 (scale)/0° (rotation) — that's how the loop closes.
type Stops5 = [number, number, number, number, number];
const PROGRESS_INPUT: Stops5 = [0, 0.25, 0.5, 0.75, 1];

const BLOB_CONFIG = {
  blob1: {
    period: 6000,
    source: require('../../../../assets/images/celebrations/xp-blob-1.png'),
    inset: {
      top: BG_HEIGHT * 0.1209,
      right: BG_WIDTH * 0.1186,
      bottom: 0,
      left: BG_WIDTH * 0.0045,
    },
    transformOrigin: '30% 70%' as const,
    kf: {
      tx: [0, 40, 18, -28, 0] as Stops5,
      ty: [0, -30, 36, -14, 0] as Stops5,
      rot: [0, 8, -6, 4, 0] as Stops5,
      scale: [1, 1.08, 0.95, 1.05, 1] as Stops5,
    },
  },
  blob2: {
    period: 7000,
    source: require('../../../../assets/images/celebrations/xp-blob-2.png'),
    inset: { top: BG_HEIGHT * 0.2734, right: BG_WIDTH * 0.2742, bottom: 0, left: 0 },
    transformOrigin: '60% 60%' as const,
    kf: {
      tx: [0, -44, 26, -16, 0] as Stops5,
      ty: [0, 28, -34, 18, 0] as Stops5,
      rot: [0, -9, 7, -4, 0] as Stops5,
      scale: [1, 1.07, 0.92, 1.04, 1] as Stops5,
    },
  },
  blob3: {
    period: 5000,
    source: require('../../../../assets/images/celebrations/xp-blob-3.png'),
    inset: { top: BG_HEIGHT * 0.4283, right: BG_WIDTH * 0.4487, bottom: 0, left: 0 },
    transformOrigin: '50% 40%' as const,
    kf: {
      tx: [0, 34, -30, 22, 0] as Stops5,
      ty: [0, -38, 24, 16, 0] as Stops5,
      rot: [0, 10, -7, 5, 0] as Stops5,
      scale: [1, 1.1, 0.94, 1.06, 1] as Stops5,
    },
  },
} as const;

// Container fade-in duration matches the HTML mock's
// `tl.to('.xp-bg-container', { opacity: 1, duration: 0.4 }, 0)`.
const BG_FADE_MS = 400;

interface BlobsBackgroundProps {
  /** Whether the celebration is mounted/active. Pause cancels the
   * driver loops; resume re-arms them. */
  visible?: boolean;
}

export function BlobsBackground({ visible = true }: BlobsBackgroundProps) {
  const containerOpacity = useSharedValue(0);

  // ONE progress driver per blob (was 4 before — translateX/Y/rot/scale
  // each had its own withRepeat chain). The animated style interpolates
  // 4 axis values from this single 0→1 cycle. Reanimated ticks 3
  // worklets/frame instead of 12.
  const progress1 = useSharedValue(0);
  const progress2 = useSharedValue(0);
  const progress3 = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      containerOpacity.value = 0;
      cancelAnimation(progress1);
      cancelAnimation(progress2);
      cancelAnimation(progress3);
      progress1.value = 0;
      progress2.value = 0;
      progress3.value = 0;
      return;
    }

    containerOpacity.value = withTiming(1, {
      duration: safeDuration(BG_FADE_MS),
      easing: easings.power2Out,
    });

    // Linear progress inside withRepeat — the visual ease-in-out sits
    // in the per-segment interpolate stop spacing, not in the driver.
    // (Stops are non-uniform amplitudes anyway, so a linear progress
    // already produces a varying speed feel between keyframes.)
    progress1.value = withRepeat(
      withTiming(1, { duration: BLOB_CONFIG.blob1.period, easing: Easing.linear }),
      -1,
      false,
    );
    progress2.value = withRepeat(
      withTiming(1, { duration: BLOB_CONFIG.blob2.period, easing: Easing.linear }),
      -1,
      false,
    );
    progress3.value = withRepeat(
      withTiming(1, { duration: BLOB_CONFIG.blob3.period, easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(progress1);
      cancelAnimation(progress2);
      cancelAnimation(progress3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));

  const blob1Style = useAnimatedStyle(() => {
    const p = progress1.value;
    return {
      transform: [
        { translateX: interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob1.kf.tx) },
        { translateY: interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob1.kf.ty) },
        { rotate: `${interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob1.kf.rot)}deg` },
        { scale: interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob1.kf.scale) },
      ],
    };
  });

  const blob2Style = useAnimatedStyle(() => {
    const p = progress2.value;
    return {
      transform: [
        { translateX: interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob2.kf.tx) },
        { translateY: interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob2.kf.ty) },
        { rotate: `${interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob2.kf.rot)}deg` },
        { scale: interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob2.kf.scale) },
      ],
    };
  });

  const blob3Style = useAnimatedStyle(() => {
    const p = progress3.value;
    return {
      transform: [
        { translateX: interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob3.kf.tx) },
        { translateY: interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob3.kf.ty) },
        { rotate: `${interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob3.kf.rot)}deg` },
        { scale: interpolate(p, PROGRESS_INPUT, BLOB_CONFIG.blob3.kf.scale) },
      ],
    };
  });

  // Each blob is an Animated.View wrapper (drives transforms) with a
  // static <Image> child. `renderToHardwareTextureAndroid` is a
  // View-only prop, so the wrapper is what gets baked into a GPU
  // layer — every transform frame is a single matrix uniform upload,
  // no rasterization. The child Image stays static so its bitmap stays
  // valid for the wrapper's hardware-texture cache.
  return (
    <Animated.View pointerEvents="none" style={[styles.container, containerStyle]}>
      <Animated.View
        renderToHardwareTextureAndroid
        style={[
          styles.blob,
          BLOB_CONFIG.blob1.inset,
          { transformOrigin: BLOB_CONFIG.blob1.transformOrigin },
          blob1Style,
        ]}
      >
        <Image
          source={BLOB_CONFIG.blob1.source}
          resizeMode="stretch"
          fadeDuration={0}
          style={styles.blobImage}
        />
      </Animated.View>

      <Animated.View
        renderToHardwareTextureAndroid
        style={[
          styles.blob,
          BLOB_CONFIG.blob2.inset,
          { transformOrigin: BLOB_CONFIG.blob2.transformOrigin },
          blob2Style,
        ]}
      >
        <Image
          source={BLOB_CONFIG.blob2.source}
          resizeMode="stretch"
          fadeDuration={0}
          style={styles.blobImage}
        />
      </Animated.View>

      <Animated.View
        renderToHardwareTextureAndroid
        style={[
          styles.blob,
          BLOB_CONFIG.blob3.inset,
          { transformOrigin: BLOB_CONFIG.blob3.transformOrigin },
          blob3Style,
        ]}
      >
        <Image
          source={BLOB_CONFIG.blob3.source}
          resizeMode="stretch"
          fadeDuration={0}
          style={styles.blobImage}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: -BG_OVERSHOOT,
    top: 0,
    width: BG_WIDTH,
    height: BG_HEIGHT,
  },
  blob: {
    position: 'absolute',
    // explicit width/height aren't set — top/right/bottom/left from the
    // inset object give the layout its size. The child Image with
    // resizeMode="stretch" then non-uniformly fills the wrapper rect
    // (matches the SVG `preserveAspectRatio="none"` we used to do).
  },
  blobImage: {
    width: '100%',
    height: '100%',
  },
});
