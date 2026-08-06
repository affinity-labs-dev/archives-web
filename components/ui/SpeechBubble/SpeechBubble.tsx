import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Svg, Polygon, Polyline } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import {
  colors,
  radius,
  spacing,
  easings,
  durations,
  safeDuration,
} from '@/components/ui/theme';
import type { ColorKey } from '@/components/ui/theme';

import { buildTailGeometry, type BubbleTailDirection } from './bubblePath';

export type TailDirection = BubbleTailDirection;

export interface TailConfig {
  direction: TailDirection;
  /** Base length of the triangle, in px. Default `18`. */
  size?: number;
  /** How far the tail protrudes, in px. Default `14`. */
  depth?: number;
  /** Position along the edge (0 = start, 1 = end). Default `0.4`. */
  offset?: number;
}

export interface SpeechBubbleHandle {
  shrink: (duration?: number) => Promise<void>;
  grow: (duration?: number) => Promise<void>;
}

export interface SpeechBubbleProps {
  children: ReactNode;
  backgroundColor?: ColorKey;
  borderColor?: ColorKey;
  borderWidth?: number;
  borderRadius?: number;
  autoPlay?: boolean;
  onEntranceComplete?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  tail?: TailDirection | TailConfig;
  /**
   * When `true`, bubble stretches to full parent width (cross-axis) and keeps
   * constant width as content grows — useful for typewriter content where you
   * want stable layout instead of the bubble expanding character-by-character.
   * Defaults to `false` (content-hugging).
   */
  fullWidth?: boolean;
}

const DEFAULT_TAIL_SIZE = 18;
const DEFAULT_TAIL_DEPTH = 14;
const DEFAULT_TAIL_OFFSET = 0.4;

/**
 * SpeechBubble — animated speech bubble with optional tail.
 *
 * Architecture:
 *   - Bubble body: native `<View>` with `borderWidth` / `borderRadius` /
 *     `backgroundColor`. Sizes naturally to content via flex. NO measurement
 *     needed; layout is fully governed by the platform.
 *   - Tail: separate absolute `<Svg>` overlay. Its fill overlaps the bubble's
 *     native border by `borderWidth + 0.5` px so the border is hidden where
 *     the tail attaches (seamless seam). Stroke is drawn only on the two
 *     non-attach slopes (Polyline) so there's no visible seam line.
 *
 * This separation means the tail does NOT re-render on content size changes —
 * it's pinned by percentage offset on the bubble's edge and keeps fixed SVG
 * dimensions regardless of bubble height/width.
 *
 * Entrance: scale 0.9 → 1, opacity 0 → 1, rotation -5° → 0° (400ms back.out(2)).
 */
export const SpeechBubble = forwardRef<SpeechBubbleHandle, SpeechBubbleProps>(
  (
    {
      children,
      backgroundColor = 'white',
      borderColor = 'onyx',
      borderWidth = 2,
      borderRadius: br = radius.xl,
      autoPlay = true,
      onEntranceComplete,
      style,
      padding = spacing.md,
      tail,
      fullWidth = false,
    },
    ref,
  ) => {
    const tailConfig: Required<TailConfig> | undefined = tail
      ? {
          direction: typeof tail === 'string' ? tail : tail.direction,
          size: typeof tail === 'object' && tail.size !== undefined ? tail.size : DEFAULT_TAIL_SIZE,
          depth:
            typeof tail === 'object' && tail.depth !== undefined ? tail.depth : DEFAULT_TAIL_DEPTH,
          offset:
            typeof tail === 'object' && tail.offset !== undefined
              ? tail.offset
              : DEFAULT_TAIL_OFFSET,
        }
      : undefined;

    const tailMargin = (() => {
      if (!tailConfig) return { left: 0, right: 0, top: 0, bottom: 0 };
      const d = tailConfig.depth;
      switch (tailConfig.direction) {
        case 'left':
          return { left: d, right: 0, top: 0, bottom: 0 };
        case 'right':
          return { left: 0, right: d, top: 0, bottom: 0 };
        case 'top':
          return { left: 0, right: 0, top: d, bottom: 0 };
        case 'bottom':
          return { left: 0, right: 0, top: 0, bottom: d };
      }
    })();

    const scale = useSharedValue(autoPlay ? 0.9 : 1);
    const opacity = useSharedValue(autoPlay ? 0 : 1);
    const rotation = useSharedValue(autoPlay ? -5 : 0);

    useEffect(() => {
      if (!autoPlay) return;
      const dur = safeDuration(durations.bubbleEntrance);
      const ease = easings.backOut2;
      scale.value = withTiming(1, { duration: dur, easing: ease });
      opacity.value = withTiming(1, { duration: dur, easing: ease });
      rotation.value = withTiming(0, { duration: dur, easing: ease });

      const t = setTimeout(() => onEntranceComplete?.(), dur);
      return () => clearTimeout(t);
    }, [autoPlay, scale, opacity, rotation, onEntranceComplete]);

    useImperativeHandle(
      ref,
      () => ({
        shrink: (duration?: number) =>
          new Promise<void>((resolve) => {
            const dur = safeDuration(duration ?? 300);
            scale.value = withTiming(0.9, { duration: dur, easing: easings.power2InOut });
            opacity.value = withTiming(0, { duration: dur, easing: easings.power2InOut });
            setTimeout(resolve, dur);
          }),
        grow: (duration?: number) =>
          new Promise<void>((resolve) => {
            const dur = safeDuration(duration ?? durations.bubbleEntrance);
            scale.value = withTiming(1, { duration: dur, easing: easings.backOut2 });
            opacity.value = withTiming(1, { duration: dur, easing: easings.backOut2 });
            setTimeout(resolve, dur);
          }),
      }),
      [scale, opacity],
    );

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
    }));

    const fillColor = colors[backgroundColor];
    const strokeColor = colors[borderColor];

    return (
      <Animated.View
        style={[
          styles.wrapper,
          {
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
            marginLeft: tailMargin.left,
            marginRight: tailMargin.right,
            marginTop: tailMargin.top,
            marginBottom: tailMargin.bottom,
          },
          animatedStyle,
          style,
        ]}
      >
        {/* Bubble body — native border, sizes via flex, no measurement */}
        <View
          style={{
            backgroundColor: fillColor,
            borderColor: strokeColor,
            borderWidth,
            borderRadius: br,
            padding,
          }}
        >
          {children}
        </View>

        {/* Tail overlay — fixed SVG size, positioned by percentage on bubble edge */}
        {tailConfig && (
          <TailOverlay
            tail={tailConfig}
            fillColor={fillColor}
            strokeColor={strokeColor}
            strokeWidth={borderWidth}
          />
        )}
      </Animated.View>
    );
  },
);

SpeechBubble.displayName = 'SpeechBubble';

// ─────────────────────────────────────────────
// Tail overlay — decoupled from bubble content size
// ─────────────────────────────────────────────

function TailOverlay({
  tail,
  fillColor,
  strokeColor,
  strokeWidth,
}: {
  tail: Required<TailConfig>;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}) {
  const geom = buildTailGeometry({
    direction: tail.direction,
    size: tail.size,
    depth: tail.depth,
    borderWidth: strokeWidth,
  });

  const positionStyle = getTailPosition(tail, strokeWidth);

  return (
    <Svg
      pointerEvents="none"
      width={geom.svgWidth}
      height={geom.svgHeight}
      style={[styles.tailSvg, positionStyle]}
    >
      <Polygon points={geom.fillPoints} fill={fillColor} />
      <Polyline
        points={geom.strokePoints}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function getTailPosition(
  tail: Required<TailConfig>,
  borderWidth: number,
): ViewStyle {
  const { direction, depth, size, offset } = tail;
  const strokePad = borderWidth / 2 + 0.5;
  const percentOffset = `${offset * 100}%` as `${number}%`;

  switch (direction) {
    case 'left':
      return {
        left: -(depth + strokePad),
        top: percentOffset,
        marginTop: -(size / 2 + strokePad),
      };
    case 'right':
      return {
        right: -(depth + strokePad),
        top: percentOffset,
        marginTop: -(size / 2 + strokePad),
      };
    case 'top':
      return {
        top: -(depth + strokePad),
        left: percentOffset,
        marginLeft: -(size / 2 + strokePad),
      };
    case 'bottom':
      return {
        bottom: -(depth + strokePad),
        left: percentOffset,
        marginLeft: -(size / 2 + strokePad),
      };
  }
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  tailSvg: {
    position: 'absolute',
  },
});
