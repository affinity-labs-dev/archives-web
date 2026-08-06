// ScrollFade — soft fade-out overlay for the bottom of a ScrollView
// where a fixed CTA slot sits beneath. Masks the hard horizontal
// edge between the scroll content and the fixed slot's surface so
// the last visible content blends smoothly into the background.
//
// Default positioning is `position: absolute, top: -height` so the
// overlay overflows ABOVE its parent — drop it into the same
// container as the fixed CTA, and the overlay covers the bottom of
// the adjacent ScrollView. Override `style` for non-bottom fades
// (e.g. a top-of-scroll fade beneath a floating header).

import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export interface ScrollFadeProps {
  /** The opaque destination color the gradient fades into — typically
   *  the body's background color so the scroll's bottom edge blends
   *  smoothly into the surface beneath it. */
  color: string;
  /** Height of the fade region in px. Default 40. */
  height?: number;
  /** Position style override. Default sits as `position: absolute`
   *  with `top: -height` so it overlays the bottom of an adjacent
   *  ScrollView. Pass a custom style to reposition (e.g. fade at the
   *  TOP of a ScrollView for floating-header bleed). */
  style?: StyleProp<ViewStyle>;
  /** Pointer-events behavior. Defaults to `none` so taps fall
   *  through to the underlying content. */
  pointerEvents?: "auto" | "none";
}

// Color parsers — synthesize a zero-alpha endpoint that shares the
// destination's RGB hue. Critical on Android: the `transparent`
// keyword in expo-linear-gradient gets interpreted as transparent
// WHITE by the native compositor, so the gradient passes through
// white-tinted alphas near the transparent end → a visible white
// hairline where the gradient meets a solid dark sibling. Deriving
// e.g. `rgba(0, 0, 0, 0)` from `rgba(0, 0, 0, 0.6)` keeps the entire
// interpolation in the destination hue (pure alpha fade, no white).
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const RGBA_COLOR_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/;

function toZeroAlpha(color: string): string {
  if (HEX_COLOR_RE.test(color)) return `${color}00`;
  const match = color.match(RGBA_COLOR_RE);
  if (match) {
    const [, r, g, b] = match;
    return `rgba(${r}, ${g}, ${b}, 0)`;
  }
  // Last-resort fallback. Avoid `transparent` here — explicit black at
  // zero alpha is the safer cross-platform default since most fade-out
  // overlays target dark surfaces.
  return "rgba(0, 0, 0, 0)";
}

export function ScrollFade({
  color,
  height = 30,
  style,
  pointerEvents = "none",
}: ScrollFadeProps) {
  const fromColor = toZeroAlpha(color);

  return (
    <LinearGradient
      colors={[fromColor, color]}
      style={[
        {
          position: "absolute",
          top: -height,
          left: 0,
          right: 0,
          height,
        },
        style,
      ]}
      pointerEvents={pointerEvents}
    />
  );
}
