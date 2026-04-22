import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { colors, easings, durations, safeDuration } from '@/components/ui/theme';

import { variantSpecs, sizeSpecs } from './DepthButton.config';
import type { DepthButtonProps } from './DepthButton.types';

const DISABLED_OPACITY = 0.5;

export function DepthButton({
  variant = 'primary',
  size = 'large',
  pressEffect,
  surfaceColor,
  shadowColor,
  borderColor,
  radius,
  shadowOffset,
  isDisabled = false,
  isFullWidth = true,
  leftIcon,
  rightIcon,
  onPressIn,
  onPressOut,
  style,
  surfaceStyle,
  children,
  ...rest
}: DepthButtonProps) {
  const variantSpec = variantSpecs[variant];
  const sizeSpec = sizeSpecs[size];

  const resolvedRadius = radius ?? sizeSpec.radius;
  const resolvedShadowOffset = shadowOffset ?? sizeSpec.shadowOffset;
  const resolvedPressEffect = pressEffect ?? variantSpec.defaultPressEffect;
  const showShadow = variantSpec.hasShadow;

  const resolvedSurfaceColor = colors[surfaceColor ?? variantSpec.surface];
  const resolvedShadowColor =
    variantSpec.shadow === 'transparent'
      ? 'transparent'
      : colors[shadowColor ?? variantSpec.shadow];
  const resolvedBorderColor =
    borderColor !== undefined
      ? colors[borderColor]
      : variantSpec.border !== undefined
        ? colors[variantSpec.border]
        : undefined;

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const surfaceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: Parameters<NonNullable<DepthButtonProps['onPressIn']>>[0]) => {
    if (isDisabled) return;

    if (resolvedPressEffect === 'dip') {
      const total = safeDuration(durations.ctaPressTotal);
      translateY.value = withSequence(
        withTiming(resolvedShadowOffset, {
          duration: total * 0.4,
          easing: easings.ctaPress,
        }),
        withTiming(-2, { duration: total * 0.3, easing: easings.ctaPress }),
        withTiming(0, { duration: total * 0.3, easing: easings.ctaPress }),
      );
    } else if (resolvedPressEffect === 'bounce') {
      scale.value = withSequence(
        withTiming(1.04, {
          duration: safeDuration(100),
          easing: easings.power2Out,
        }),
        withTiming(1, {
          duration: safeDuration(250),
          easing: Easing.out(Easing.elastic(1)),
        }),
      );
    }

    onPressIn?.(event);
  };

  const handlePressOut = (event: Parameters<NonNullable<DepthButtonProps['onPressOut']>>[0]) => {
    // withSequence handles settle automatically
    onPressOut?.(event);
  };

  const surfaceCombined = useMemo(
    () => [
      styles.surface,
      {
        height: sizeSpec.height,
        borderRadius: resolvedRadius,
        paddingHorizontal: sizeSpec.paddingHorizontal,
        backgroundColor: resolvedSurfaceColor,
        ...(resolvedBorderColor !== undefined && {
          borderWidth: variant === 'outline' ? 2 : 1.5,
          borderColor: resolvedBorderColor,
        }),
      },
      surfaceAnimatedStyle,
      surfaceStyle,
    ],
    [
      sizeSpec.height,
      sizeSpec.paddingHorizontal,
      resolvedRadius,
      resolvedSurfaceColor,
      resolvedBorderColor,
      variant,
      surfaceAnimatedStyle,
      surfaceStyle,
    ],
  );

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        { opacity: isDisabled ? DISABLED_OPACITY : 1 },
        pressed && { opacity: isDisabled ? DISABLED_OPACITY : 0.95 },
      ]}
      {...rest}
    >
      <Animated.View
        style={[
          styles.container,
          {
            width: isFullWidth ? '100%' : undefined,
            alignSelf: isFullWidth ? 'stretch' : 'flex-start',
            paddingBottom: showShadow ? resolvedShadowOffset : 0,
          },
          resolvedPressEffect === 'bounce' && containerAnimatedStyle,
          style,
        ]}
      >
        {/* Shadow renders first (lower in z-order) — absolute, offset down */}
        {showShadow && (
          <View
            style={[
              styles.shadow,
              {
                top: resolvedShadowOffset,
                borderRadius: resolvedRadius,
                backgroundColor: resolvedShadowColor,
                ...(resolvedBorderColor !== undefined && {
                  borderWidth: 1,
                  borderColor: resolvedBorderColor,
                }),
              },
            ]}
          />
        )}

        {/* Surface renders second in normal flow — establishes container width */}
        <Animated.View style={surfaceCombined}>
          {leftIcon}
          {children}
          {rightIcon}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
