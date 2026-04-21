import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { AnimatedEntrance } from '@/components/ui/animations';
import { sizeConfigs, type ColorKey, type SizeKey } from '@/components/ui/theme';

/**
 * Bounded-Black is a wide display font — empirically each uppercase character
 * takes ~0.95× fontSize horizontally. Cap the size so the longest line always
 * fits within (screenWidth - horizontal safety padding), preventing wrap.
 */
const BOUNDED_CHAR_WIDTH_RATIO = 0.95;
const HORIZONTAL_SAFETY_PX = 40;

export interface WelcomeStackedTextProps {
  /** Text to render. Automatically uppercased. */
  text: string;

  /** Typography size. Token key or raw px. Defaults `'hero'` (50px). */
  size?: number | SizeKey;

  /**
   * Back-layer color.
   *   - Token key (`'acaiTertiary'`, ...) or hex string.
   * Default hex `'#D6BBFF'` (light purple).
   */
  backColor?: ColorKey | string;

  /** Mid-layer color. Default `'blueSecondary'` (#A2C5FF). */
  midColor?: ColorKey | string;

  /** Front-layer color. Default `'white'`. */
  frontColor?: ColorKey | string;

  /**
   * Stroke color applied as an outline around the front layer text.
   * Pass `null` or omit to disable outline. Default `'black'`.
   */
  strokeColor?: string | null;

  /** Stroke thickness in px. Default `1.5`. */
  strokeWidth?: number;

  /** Vertical offset per layer, in px. Mid shifts down by this, back by 2×. Default `7`. */
  layerOffset?: number;

  /**
   * Drop shadow color for mid + back layers. Default `rgba(0,0,0,0.25)` (Figma spec).
   * Set to `null` to disable.
   */
  dropShadowColor?: string | null;

  /** Drop shadow offset (downward). Default `3.822` (Figma spec). */
  dropShadowOffset?: number;

  /** Drop shadow blur radius. Default `3.822`. */
  dropShadowRadius?: number;

  /** Play entrance animation on mount. Default `true`. */
  autoPlay?: boolean;

  /** Change to replay entrance. */
  replayKey?: number | string;

  /** Outer wrapper style. */
  style?: StyleProp<ViewStyle>;
}

/**
 * WelcomeStackedText — 3-layer accordion text animation for Screen 4 ("Welcome, Ahmed!").
 *
 * Colors (from Figma):
 *   - Front: white  (top layer user reads)
 *   - Mid:   `#A2C5FF` (blueSecondary, peeks behind front)
 *   - Back:  `#D6BBFF` (light purple, deepest layer)
 *
 * Text border: black outline applied only to the front layer via 8-direction
 * shadow stacking. Back + mid layers render as solid fills — their exposed
 * peek-area is narrow enough that omitting their stroke saves 16 Text nodes
 * without noticeable visual loss.
 *
 * Entrance (from onboarding spec, GSAP -250ms overlap):
 *   - Front animates at delay 0, duration 600ms
 *   - Mid   animates at delay 350ms
 *   - Back  animates at delay 700ms
 * Uses `accordionLayer` preset: y 200→0, opacity 0→1, `back.out(1.4)`.
 */
export function WelcomeStackedText({
  text,
  size = 'hero',
  backColor = '#D6BBFF',
  midColor = 'blueSecondary',
  frontColor = 'white',
  strokeColor = 'black',
  strokeWidth = 1.5,
  layerOffset = 7,
  dropShadowColor = 'rgba(0,0,0,0.25)',
  dropShadowOffset = 3.822,
  dropShadowRadius = 3.822,
  autoPlay = true,
  replayKey,
  style,
}: WelcomeStackedTextProps) {
  const uppercased = text.toUpperCase();
  const { width: screenWidth } = useWindowDimensions();

  // Compute responsive size — cap the requested size so the longest line fits
  // within the viewport. All layers + outline copies use this same value so
  // they stay pixel-aligned (no per-line shrink mismatch).
  const requestedSize = typeof size === 'number' ? size : sizeConfigs[size];
  const longestLineLength = uppercased
    .split('\n')
    .reduce((max, line) => (line.length > max ? line.length : max), 0);
  const maxSizeForWidth = longestLineLength > 0
    ? Math.floor(
        (screenWidth - HORIZONTAL_SAFETY_PX) /
          (longestLineLength * BOUNDED_CHAR_WIDTH_RATIO),
      )
    : requestedSize;
  const finalSize = Math.min(requestedSize, maxSizeForWidth);

  const sharedTypographyProps = {
    family: 'bounded' as const,
    size: finalSize,
    uppercase: true,
    weight: '900' as const,
    align: 'center' as const,
  };

  const dropShadowStyle = dropShadowColor
    ? {
        textShadowColor: dropShadowColor,
        textShadowOffset: { width: 0, height: dropShadowOffset },
        textShadowRadius: dropShadowRadius,
      }
    : undefined;

  return (
    <View style={[styles.stack, style]}>
      {/* Invisible sizer — establishes stack width/height from natural text dimensions */}
      <View style={styles.sizer}>
        <Typography {...sharedTypographyProps} extraColor="transparent">
          {uppercased}
        </Typography>
      </View>

      {/* Back layer — deepest, offset 2× downward. Stroke, NO drop shadow. */}
      <View
        pointerEvents="none"
        style={[styles.layer, { transform: [{ translateY: layerOffset * 2 }] }]}
      >
        <AnimatedEntrance preset="accordionLayer" delay={700} autoPlay={autoPlay} replayKey={replayKey}>
          <OutlinedText
            text={uppercased}
            color={backColor}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            typographyProps={sharedTypographyProps}
          />
        </AnimatedEntrance>
      </View>

      {/* Mid layer — offset 1× downward. Stroke + drop shadow. */}
      <View
        pointerEvents="none"
        style={[styles.layer, { transform: [{ translateY: layerOffset }] }]}
      >
        <AnimatedEntrance preset="accordionLayer" delay={350} autoPlay={autoPlay} replayKey={replayKey}>
          <OutlinedText
            text={uppercased}
            color={midColor}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            shadowStyle={dropShadowStyle}
            typographyProps={sharedTypographyProps}
          />
        </AnimatedEntrance>
      </View>

      {/* Front layer — topmost, animates first. Stroke, no drop shadow. */}
      <View pointerEvents="none" style={styles.layer}>
        <AnimatedEntrance preset="accordionLayer" delay={0} autoPlay={autoPlay} replayKey={replayKey}>
          <OutlinedText
            text={uppercased}
            color={frontColor}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            typographyProps={sharedTypographyProps}
          />
        </AnimatedEntrance>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Internal: accepts either ColorKey or raw hex
// ─────────────────────────────────────────────

function TextWithOptionalFill({
  text,
  color,
  typographyProps,
  style,
}: {
  text: string;
  color: ColorKey | string;
  typographyProps: Omit<React.ComponentProps<typeof Typography>, 'children'>;
  style?: StyleProp<TextStyle>;
}) {
  const isHex = typeof color === 'string' && color.startsWith('#');
  return isHex ? (
    <Typography {...typographyProps} extraColor={color} style={style}>
      {text}
    </Typography>
  ) : (
    <Typography {...typographyProps} color={color as ColorKey} style={style}>
      {text}
    </Typography>
  );
}

// ─────────────────────────────────────────────
// Internal: text with a cardinal + diagonal shadow outline
// ─────────────────────────────────────────────

const OUTLINE_OFFSETS = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
] as const;

function OutlinedText({
  text,
  color,
  strokeColor,
  strokeWidth,
  shadowStyle,
  typographyProps,
}: {
  text: string;
  color: ColorKey | string;
  strokeColor: string | null;
  strokeWidth: number;
  shadowStyle?: StyleProp<TextStyle>;
  typographyProps: Omit<React.ComponentProps<typeof Typography>, 'children'>;
}) {
  if (!strokeColor) {
    return (
      <TextWithOptionalFill
        text={text}
        color={color}
        typographyProps={typographyProps}
        style={shadowStyle}
      />
    );
  }

  return (
    <View style={styles.outlineWrapper}>
      {OUTLINE_OFFSETS.map((offset, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { translateX: offset.x * strokeWidth },
                { translateY: offset.y * strokeWidth },
              ],
            },
          ]}
        >
          <Typography {...typographyProps} extraColor={strokeColor}>
            {text}
          </Typography>
        </View>
      ))}
      <TextWithOptionalFill
        text={text}
        color={color}
        typographyProps={typographyProps}
        style={shadowStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'relative',
    alignSelf: 'center',
  },
  sizer: {
    opacity: 0,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  outlineWrapper: {
    position: 'relative',
  },
});
