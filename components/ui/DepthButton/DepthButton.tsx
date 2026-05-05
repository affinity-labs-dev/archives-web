import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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
  surfaceBorderColor,
  shadowBorderColor,
  radius,
  shadowOffset,
  isDisabled = false,
  isFullWidth = true,
  haptic = 'light',
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
  // Border resolution — specificity beats authority. Order:
  //   layer-specific prop      (most explicit override)
  //     → layer-specific spec  (variant declared per-layer intent)
  //       → shorthand prop     (caller's blanket override)
  //         → shorthand spec   (variant blanket default)
  //
  // Why specificity-first instead of "prop always wins": if a variant
  // declares `surfaceBorder: 'bluePrimary'`, that's an explicit
  // per-layer design decision and should NOT be silently flattened by
  // a caller passing a generic `borderColor="onyx"` shorthand. The
  // caller's shorthand still applies to the OTHER layer (which has no
  // specific override), preserving the legacy "borderColor outlines
  // both layers" behavior wherever the variant doesn't disagree.
  // Concretely, this is what makes the disabled CONTINUE button show
  // a blue surface border under the white veil instead of an onyx
  // border that visually merges with the onyx surface.
  const resolveBorder = (
    specific: typeof surfaceBorderColor,
    specSpecific: typeof variantSpec.surfaceBorder,
  ) => {
    const key =
      specific ??
      specSpecific ??
      borderColor ??
      variantSpec.border;
    return key !== undefined ? colors[key] : undefined;
  };
  const resolvedSurfaceBorderColor = resolveBorder(
    surfaceBorderColor,
    variantSpec.surfaceBorder,
  );
  const resolvedShadowBorderColor = resolveBorder(
    shadowBorderColor,
    variantSpec.shadowBorder,
  );

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  // Press-feedback opacity — UI-thread driven via sharedValue. Moved
  // off the Pressable's `style={({pressed}) => ...}` function form
  // because that path forces a JS-thread re-render of the Pressable
  // subtree on each pressed flip (touchstart/touchend). When Quiz
  // re-renders due to select/unselect, the Pressable re-binds touch
  // handlers; combined with the press flip re-render, a press
  // initiated mid-cycle competed with the parent re-render for JS
  // thread time → Reanimated's worklet commits got delayed → visible
  // jitter on Android. Driving opacity via sharedValue keeps press
  // visual feedback entirely on the UI thread, no JS round-trip.
  const pressOpacity = useSharedValue(1);

  const surfaceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: pressOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Stable handler refs via useCallback. The previous inline arrow
  // functions were recreated every render, so each Quiz re-render
  // (e.g. on every option select) handed Pressable new event-handler
  // references → Pressable re-bound its native touch responders on
  // Android. Stabilizing the closures eliminates that re-bind.
  // Depending on the relevant primitives keeps the closures fresh
  // when the button's mode genuinely changes (variant swap, etc.)
  // while staying stable across orthogonal parent re-renders.
  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<DepthButtonProps['onPressIn']>>[0]) => {
      if (isDisabled) return;

      // Haptic on press-in — fired before the press animation starts so
      // the tactile feedback aligns with the visual effect. The user's
      // global haptic setting is honored automatically via the
      // monkey-patch in `services/GlobalHapticsWrapper.ts` (imported at
      // app boot in `_layout.tsx`); when off, every `Haptics.impactAsync`
      // call resolves to a no-op without us needing to read the setting
      // locally. Fire-and-forget so the button stays responsive.
      if (haptic !== 'none') {
        const style =
          haptic === 'heavy'
            ? Haptics.ImpactFeedbackStyle.Heavy
            : haptic === 'medium'
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light;
        Haptics.impactAsync(style).catch(() => {
          // Silently ignore — haptics are non-critical, and on iOS
          // simulator + some Android variants the call can reject.
        });
      }

      // Press-feedback opacity dip on the UI thread. Quick fade to
      // 0.95 — same visual the JS-thread `({pressed}) => opacity:0.95`
      // form provided, but commits via Reanimated so it doesn't
      // contend with parent re-renders.
      pressOpacity.value = withTiming(0.95, { duration: safeDuration(60) });

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
    },
    [
      isDisabled,
      haptic,
      resolvedPressEffect,
      resolvedShadowOffset,
      onPressIn,
      pressOpacity,
      translateY,
      scale,
    ],
  );

  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<DepthButtonProps['onPressOut']>>[0]) => {
      // Restore press-feedback opacity. The translateY / scale press
      // sequences are self-settling (withSequence ends at the rest
      // value) so they don't need a press-out reverse.
      pressOpacity.value = withTiming(1, { duration: safeDuration(140) });
      onPressOut?.(event);
    },
    [onPressOut, pressOpacity],
  );

  const surfaceCombined = useMemo(
    () => [
      styles.surface,
      {
        height: sizeSpec.height,
        borderRadius: resolvedRadius,
        paddingHorizontal: sizeSpec.paddingHorizontal,
        backgroundColor: resolvedSurfaceColor,
        ...(resolvedSurfaceBorderColor !== undefined && {
          borderWidth: variant === 'outline' ? 2 : 1.5,
          borderColor: resolvedSurfaceBorderColor,
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
      resolvedSurfaceBorderColor,
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
      // Note: NO `style={({pressed}) => ...}` form here. The pressed
      // visual feedback (opacity 0.95 dip) lives in `pressOpacity` /
      // `surfaceAnimatedStyle` above and runs entirely on the UI
      // thread. Using the function-style form would force a JS-thread
      // re-render of Pressable + children on every press flip — and on
      // Android, when the parent (e.g. Quiz) is also re-rendering due
      // to select/unselect state changes, those overlapping JS-thread
      // re-renders are exactly what was making press dips jittery.
      {...rest}
    >
      <Animated.View
        // `renderToHardwareTextureAndroid` is the single biggest fix for
        // Android press-animation jitter. Without it, every frame of the
        // bounce-scale tween invalidates this container → Skia re-paints
        // the surface (text shaping, border path, background fill, drop
        // shadow) from scratch — 60fps × ~4 paint ops = 240 ops/sec on a
        // press animation that should be a single GPU matrix upload per
        // frame. With it, Android bakes the container into a texture
        // once and the scale tween becomes a free matrix uniform write.
        // iOS CoreAnimation already does this layer-caching automatically
        // and ignores the prop, so this is Android-only correctness.
        renderToHardwareTextureAndroid
        style={[
          styles.container,
          {
            width: isFullWidth ? '100%' : undefined,
            alignSelf: isFullWidth ? 'stretch' : 'flex-start',
            paddingBottom: showShadow ? resolvedShadowOffset : 0,
          },
          resolvedPressEffect === 'bounce' && !isDisabled && containerAnimatedStyle,
          style,
        ]}
      >
        {/* Shadow renders first (lower in z-order) — absolute, offset down.
            Always full-opacity here; the disabled veil above handles fade. */}
        {showShadow && (
          <View
            style={[
              styles.shadow,
              {
                top: resolvedShadowOffset,
                borderRadius: resolvedRadius,
                backgroundColor: resolvedShadowColor,
                ...(resolvedShadowBorderColor !== undefined && {
                  borderWidth: 1,
                  borderColor: resolvedShadowBorderColor,
                }),
              },
            ]}
          />
        )}

        {/* Surface renders second in normal flow — establishes container
            width. Same hardware-texture treatment as the container above
            because the dip-press effect animates THIS view's translateY
            (3-segment withSequence: down → bounce up → settle). Without
            the texture cache, each segment re-rasterizes the surface
            content — most visible on dense surfaces with text + icons
            (the SUBMIT button on Quiz, e.g.) where Android stuttered
            for ~350ms during every tap. */}
        <Animated.View
          renderToHardwareTextureAndroid
          style={surfaceCombined}
        >
          {leftIcon}
          {children}
          {rightIcon}
        </Animated.View>

        {/* Disabled veil — a translucent white sheet ON TOP of the
            surface + shadow stack. Approach picked over a parent
            opacity for a few reasons:
            1. The parent-opacity approach makes Android multiply alpha
               per child, so the surface+shadow overlap region renders
               as 0.5×surface + 0.25×shadow + 0.25×bg → surface looks
               washed out and shadow bleeds through. The veil sidesteps
               that entirely: shadow + surface stay fully opaque, the
               veil is the ONLY translucent layer.
            2. The 3D depth is preserved at the same fidelity as the
               active state — only the colors get desaturated under
               the veil.
            3. Cross-platform identical: a plain absolute View with a
               solid bg and alpha is rendered the same way on iOS and
               Android, no compositor quirks involved.
            The veil covers the union of the surface and the visible
            shadow strip via `StyleSheet.absoluteFill` on the container
            (which has `paddingBottom: shadowOffset`). borderRadius
            matches the underlying shapes so the rounded corners stay
            clean. */}
        {isDisabled && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: `rgba(255, 255, 255, ${1 - DISABLED_OPACITY})`,
              },
            ]}
          />
        )}
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
