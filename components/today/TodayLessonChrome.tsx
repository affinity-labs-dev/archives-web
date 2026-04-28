// TodayLessonChrome.tsx — shared layout for the Today lesson modals
// (Watch / Explore). Owns the floating header (back button + progress bar)
// and the bottom CTA row; consumers supply their own DepthButtons via the
// `leftCta` / `rightCta` slots so each lesson keeps full control over
// labels, icons, and color overrides.

import React, { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TodayProgressBar from "@/components/today/TodayProgressBar";
import { colors, easings, safeDuration } from "@/components/ui";
import ArchivesTheme from "@/constants/ArchivesTheme";

const themeStyles = ArchivesTheme.common.today;

interface TodayLessonChromeProps {
  progress: number;
  onBack: () => void;

  /** Header background. Defaults to transparent (used by video lesson on
   *  top of the active video). Pass an opaque color (e.g. cream) for
   *  lessons whose body content shouldn't show through the header. */
  headerBackground?: string;
  backIconColor?: string;

  /** Progress-bar color overrides — forwarded straight to
   *  TodayProgressBar. Defaults to white-on-translucent-white (the video
   *  modal tone). Override for cream backdrops, etc. */
  progressLabelColor?: string;
  progressFillColor?: string;
  progressTrackColor?: string;

  /** Hide the progress bar — back button stays. Used by the today
   *  quiz once the user reaches the results screen, where a "Progress
   *  today" indicator no longer fits the surface. */
  hideProgress?: boolean;

  /** Bottom-row CTAs. `leftCta` is optional — when omitted, `rightCta`
   *  takes the entire row width via its flex:1 slot. */
  leftCta?: React.ReactNode;
  rightCta: React.ReactNode;

  /** Hide the entire bottom CTA row. Animated as an opacity tween so the
   *  buttons fade out smoothly (e.g. while a fullscreen reading sheet is
   *  active and the CTAs would just clutter the layout). Pointer events
   *  are also disabled while hidden so taps fall through to the body
   *  beneath instead of hitting invisible buttons. */
  hideBottomCtas?: boolean;

  children: React.ReactNode;
}

const CTA_FADE_DURATION_MS = 250;

export default function TodayLessonChrome({
  progress,
  onBack,
  headerBackground = "transparent",
  backIconColor = colors.white,
  progressLabelColor = colors.white,
  progressFillColor = colors.white,
  progressTrackColor = "rgba(255, 255, 255, 0.4)",
  hideProgress = false,
  leftCta,
  rightCta,
  hideBottomCtas = false,
  children,
}: TodayLessonChromeProps) {
  // Stable insets — caches the first non-zero values from
  // `useSafeAreaInsets()` so the chrome's absolute-positioned header /
  // bottom CTAs don't reflow if the SafeAreaProvider context re-fires
  // (which happens once on Android Modal open as the new window's
  // safe-area gets measured). Without caching, `paddingTop:
  // insets.top + 8` would shift mid-animation and visibly shake the
  // entire modal layout including the parent tab bar.
  const liveInsets = useSafeAreaInsets();
  const cachedInsetsRef = useRef(liveInsets);
  if (
    cachedInsetsRef.current.top === 0 &&
    cachedInsetsRef.current.bottom === 0 &&
    (liveInsets.top > 0 || liveInsets.bottom > 0)
  ) {
    // Atomic upgrade from "no insets yet" to first stable read. Mutating
    // the ref during render is safe here because we're only ever
    // upgrading from zero → real values exactly once per mount, never
    // back the other way.
    cachedInsetsRef.current = liveInsets;
  }
  const insets = cachedInsetsRef.current;

  // CTA-row visibility tween — opacity-only, runs entirely on the UI
  // thread, doesn't disturb the rest of the chrome layout. Pointer
  // events follow the boolean directly (synchronous) so a half-faded row
  // doesn't accept stray taps.
  const ctaOpacity = useSharedValue(hideBottomCtas ? 0 : 1);
  useEffect(() => {
    ctaOpacity.value = withTiming(hideBottomCtas ? 0 : 1, {
      duration: safeDuration(CTA_FADE_DURATION_MS),
      easing: easings.power2Out,
    });
  }, [hideBottomCtas, ctaOpacity]);
  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Body — fills the available space behind the floating chrome. */}
      <View style={{ flex: 1 }}>{children}</View>

      {/* Floating header — absolute over the body. Consumers whose body
          is opaque (e.g. cream-bg explore lesson) should pad their
          content's top to avoid being clipped behind it. */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: headerBackground,
          },
        ]}
      >
        <TouchableOpacity style={themeStyles.watchBackButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={backIconColor} />
        </TouchableOpacity>
        {!hideProgress && (
          <View style={{ flex: 1 }}>
            <TodayProgressBar
              progress={progress}
              label="Progress today"
              labelColor={progressLabelColor}
              fillColor={progressFillColor}
              trackColor={progressTrackColor}
            />
          </View>
        )}
      </View>

      {/* Bottom CTAs — absolute, anchored to safe-area bottom + 16px.
          `flex:1` slot wrappers ensure each button stretches to fill its
          half of the row regardless of label width. The whole row fades
          out via `hideBottomCtas` (e.g. when an immersive reading sheet
          is showing its own primary action). */}
      <Animated.View
        style={[
          styles.bottomButtons,
          { paddingBottom: insets.bottom + 16 },
          ctaAnimatedStyle,
        ]}
        pointerEvents={hideBottomCtas ? "none" : "auto"}
      >
        {leftCta != null && <View style={styles.ctaSlot}>{leftCta}</View>}
        <View style={styles.ctaSlot}>{rightCta}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 100,
  },
  bottomButtons: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
    zIndex: 100,
  },
  ctaSlot: {
    flex: 1,
  },
});
