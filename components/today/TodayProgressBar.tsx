import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { ProgressBar, Typography, colors } from "@/components/ui";

interface TodayProgressBarProps {
  progress: number;
  label: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Color of the "Progress today" label and the percentage text.
   * Defaults to `colors.bluePrimary` (the home-screen tone). Override
   * with `colors.white` (or any contrasting value) when the bar sits on
   * top of a dark background — e.g. inside the video modal.
   */
  labelColor?: string;
  /**
   * Color of the filled portion of the bar. Defaults to
   * `colors.bluePrimary`.
   */
  fillColor?: string;
  /**
   * Color of the bar's background track. Defaults to
   * `colors.blueSecondary`.
   */
  trackColor?: string;
}

// Today-screen progress bar. Owns the label + percent header row; the
// bar layer is delegated to the design-system `ProgressBar` primitive
// using the figma 3365:9390/9391 stack pattern (4px track behind a 6px
// fill). The component stays a thin wrapper so the today screen can
// vary tones (cream vs. dark video) without forking the bar geometry.

export default function TodayProgressBar({
  progress,
  label,
  style,
  labelColor = colors.bluePrimary,
  fillColor = colors.bluePrimary,
  trackColor = colors.blueSecondary,
}: TodayProgressBarProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Typography
          size={14}
          weight="600"
          extraColor={labelColor}
          style={styles.label}
        >
          {label}
        </Typography>
        <Typography
          size={18}
          weight="700"
          extraColor={labelColor}
          style={styles.percentage}
        >
          {`${progress}%`}
        </Typography>
      </View>
      <ProgressBar
        percent={progress}
        height={6}
        trackHeight={4}
        trackColor={trackColor}
        fillColor={fillColor}
        borderRadius={12.5}
        animateOnMount={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontFamily: "DM Sans",
  },
  percentage: {
    fontFamily: "DM Sans",
    letterSpacing: 0.18,
  },
});
