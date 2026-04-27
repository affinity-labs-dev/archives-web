import { useEffect } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { safeDuration } from '@/components/ui/theme';

import {
  ENTRANCE_PRESETS,
  type EntranceConfig,
  type EntrancePresetKey,
} from './presets';

export interface UseEntranceOptions {
  /** Delay before animation starts, ms. Default `0`. */
  delay?: number;

  /** Play on mount. Default `true`. */
  autoPlay?: boolean;

  /** Change this value to replay the entrance. */
  replayKey?: number | string;

  /** Override duration from preset. */
  duration?: number;
}

/**
 * useEntrance — animates a view from `from` values to `to` values on mount.
 *
 * Accepts a preset name or custom `EntranceConfig`. Returns an animated style
 * object ready to spread onto an `<Animated.View>`.
 *
 * @example
 * const { animatedStyle } = useEntrance('slideFromRight', { delay: 200 });
 * return <Animated.View style={animatedStyle}>...</Animated.View>;
 */
export function useEntrance(
  presetOrConfig: EntrancePresetKey | EntranceConfig,
  options: UseEntranceOptions = {},
) {
  const { delay = 0, autoPlay = true, replayKey, duration: durationOverride } = options;

  const config: EntranceConfig =
    typeof presetOrConfig === 'string'
      ? ENTRANCE_PRESETS[presetOrConfig]
      : presetOrConfig;

  const translateX = useSharedValue(config.translateX?.from ?? 0);
  const translateY = useSharedValue(config.translateY?.from ?? 0);
  const rotate = useSharedValue(config.rotate?.from ?? 0);
  const scale = useSharedValue(config.scale?.from ?? 1);
  const opacity = useSharedValue(config.opacity?.from ?? 1);

  useEffect(() => {
    if (!autoPlay) return;

    const duration = safeDuration(durationOverride ?? config.duration ?? 400);
    const easing = config.easing;
    const safeDelay = safeDuration(delay);
    const timingOpts = { duration, easing };

    // Reset to `from` values before animating (supports replay)
    translateX.value = config.translateX?.from ?? 0;
    translateY.value = config.translateY?.from ?? 0;
    rotate.value = config.rotate?.from ?? 0;
    scale.value = config.scale?.from ?? 1;
    opacity.value = config.opacity?.from ?? 1;

    if (config.translateX) {
      translateX.value = withDelay(safeDelay, withTiming(config.translateX.to, timingOpts));
    }
    if (config.translateY) {
      translateY.value = withDelay(safeDelay, withTiming(config.translateY.to, timingOpts));
    }
    if (config.rotate) {
      rotate.value = withDelay(safeDelay, withTiming(config.rotate.to, timingOpts));
    }
    if (config.scale) {
      scale.value = withDelay(safeDelay, withTiming(config.scale.to, timingOpts));
    }
    if (config.opacity) {
      opacity.value = withDelay(safeDelay, withTiming(config.opacity.to, timingOpts));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, replayKey, delay, durationOverride]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return { animatedStyle };
}
