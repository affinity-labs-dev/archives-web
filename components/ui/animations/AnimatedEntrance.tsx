import React from 'react';
import Animated from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useEntrance, type UseEntranceOptions } from './useEntrance';
import type { EntranceConfig, EntrancePresetKey } from './presets';

export interface AnimatedEntranceProps extends UseEntranceOptions {
  /** Preset name or custom entrance config. */
  preset: EntrancePresetKey | EntranceConfig;

  /** Content to animate. */
  children: ReactNode;

  /** Additional style for the animated wrapper. */
  style?: StyleProp<ViewStyle>;
}

/**
 * AnimatedEntrance — declarative wrapper that applies an entrance animation
 * to its children on mount.
 *
 * @example
 * <AnimatedEntrance preset="slideFromBottom" delay={500}>
 *   <Button />
 * </AnimatedEntrance>
 */
export function AnimatedEntrance({
  preset,
  children,
  style,
  ...options
}: AnimatedEntranceProps) {
  const { animatedStyle } = useEntrance(preset, options);
  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
