import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  cancelAnimation,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';

import { easings, durations, safeDuration } from '@/components/ui/theme';

import { ibuFaceSvg } from './ibuFaceSvg';

export interface MascotProps {
  /**
   * Square size — applies to both width and height unless one of `width` /
   * `height` is provided explicitly. Defaults to 120.
   */
  size?: number;

  /** Explicit width override. Falls back to `size` when omitted. */
  width?: number;

  /** Explicit height override. Falls back to `size` when omitted. */
  height?: number;

  /** Play slide-in entrance on mount. Default `true`. */
  autoPlayEntrance?: boolean;

  /** Play idle body animations (breathe, sway). Default `true`. */
  enableIdleLoops?: boolean;

  /** Container style override. */
  style?: StyleProp<ViewStyle>;

  /** Custom renderer for mascot artwork. Defaults to placeholder box. */
  renderArtwork?: () => React.ReactNode;
}

/**
 * Mascot — Ibu character wrapper with entrance + idle animations.
 *
 * Entrance: x -120 → 0, rotate -8° → 0°, opacity 0 → 1 (600ms back.out(2)).
 *
 * Idle loops (run continuously when mounted, UI thread):
 *   - breathe 3.5s — subtle body scale
 *   - sway 11s — slow body rotate
 *
 * Note: The full 9-loop spec (blink, ear wiggle, brow raise, nose twitch) requires
 * animating individual SVG elements. For now this renders the mascot as a single
 * unit with two body-level loops. Detail-level loops will be added once the
 * SVG body parts are imported and composed (screen 2 pattern).
 *
 * `renderArtwork` prop lets callers supply custom SVG / Image content. Default
 * is a placeholder View — replace in screens 3/5/8/9/10.
 */
export function Mascot({
  size = 120,
  width,
  height,
  autoPlayEntrance = true,
  enableIdleLoops = true,
  style,
  renderArtwork,
}: MascotProps) {
  // Resolve final dimensions. When explicit width/height are omitted, fall
  // back to the square `size` so existing `<Mascot size={N} />` callers keep
  // working without changes.
  const resolvedWidth = width ?? size;
  const resolvedHeight = height ?? size;
  // Entrance
  const entranceX = useSharedValue(autoPlayEntrance ? -120 : 0);
  const entranceRotate = useSharedValue(autoPlayEntrance ? -8 : 0);
  const entranceOpacity = useSharedValue(autoPlayEntrance ? 0 : 1);

  // Idle: breathe (vertical scale) + sway (rotation)
  const breatheScale = useSharedValue(1);
  const swayRotate = useSharedValue(0);

  useEffect(() => {
    if (!autoPlayEntrance) return;
    const dur = safeDuration(durations.mascotEntrance);
    entranceX.value = withTiming(0, { duration: dur, easing: easings.backOut2 });
    entranceRotate.value = withTiming(0, { duration: dur, easing: easings.backOut2 });
    entranceOpacity.value = withTiming(1, { duration: dur, easing: easings.backOut2 });
  }, [autoPlayEntrance, entranceX, entranceRotate, entranceOpacity]);

  useEffect(() => {
    if (!enableIdleLoops) return;

    // Breathe: 1 → 1.018 → 1 over 3.5s loop
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.018, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    // Sway: 0 → 0.3 → 0 → -0.3 → 0 over 11s loop
    swayRotate.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 2750, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2750, easing: Easing.inOut(Easing.sin) }),
        withTiming(-0.3, { duration: 2750, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2750, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    // Cancel on unmount so the infinite breathe + sway loops don't
    // chase a freed ShadowNodeFamily during navigation tear-downs
    // (e.g. onboarding screen pop, sign-out cascade) on New Arch.
    return () => {
      cancelAnimation(breatheScale);
      cancelAnimation(swayRotate);
    };
  }, [enableIdleLoops, breatheScale, swayRotate]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [
      { translateX: entranceX.value },
      { rotate: `${entranceRotate.value}deg` },
    ],
  }));

  const idleStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: breatheScale.value },
      { rotate: `${swayRotate.value}deg` },
    ],
  }));

  const artwork =
    renderArtwork !== undefined
      ? renderArtwork()
      : <SvgXml xml={ibuFaceSvg} width={resolvedWidth} height={resolvedHeight} />;

  return (
    <Animated.View
      style={[
        styles.container,
        { width: resolvedWidth, height: resolvedHeight },
        entranceStyle,
        style,
      ]}
    >
      <Animated.View style={[styles.inner, idleStyle]}>{artwork}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
