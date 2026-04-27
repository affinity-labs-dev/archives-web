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

// 6-char hex matcher — when the destination is `#RRGGBB`, we can
// synthesize the transparent endpoint as `#RRGGBB00` (same hue, 0
// alpha) so the gradient stays on one tone. For other formats
// (rgba, named, 8-char hex), fall back to the `transparent` keyword
// which interpolates through black — slight grey tint at midpoint
// but cross-platform safe.
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function ScrollFade({
  color,
  height = 40,
  style,
  pointerEvents = "none",
}: ScrollFadeProps) {
  const fromColor = HEX_COLOR_RE.test(color) ? `${color}00` : "transparent";

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
