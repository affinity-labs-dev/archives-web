import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Typography, colors, easings, safeDuration } from "@/components/ui";

interface TodayProgressBarProps {
  progress: number;
  label: string;
  style?: StyleProp<ViewStyle>;
}

// Mock `index.html:25-26` — entrance bar fill animates over 700ms power2.out.
// We reuse those values for both the initial mount and any later progress
// change (e.g. day-switch from 0% to 33%).
const FILL_DURATION_MS = 700;

export default function TodayProgressBar({
  progress,
  label,
  style,
}: TodayProgressBarProps) {
  const fillProgress = useSharedValue(progress);

  useEffect(() => {
    fillProgress.value = withTiming(progress, {
      duration: safeDuration(FILL_DURATION_MS),
      easing: easings.power2Out,
    });
  }, [progress, fillProgress]);

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: `${fillProgress.value}%`,
  }));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Typography
          size={14}
          weight="600"
          extraColor={colors.bluePrimary}
          style={styles.label}
        >
          {label}
        </Typography>
        <Typography
          size={18}
          weight="700"
          extraColor={colors.bluePrimary}
          style={styles.percentage}
        >
          {`${progress}%`}
        </Typography>
      </View>
      <View style={styles.barStack}>
        <View style={styles.track} />
        <Animated.View style={[styles.fill, fillAnimatedStyle]} />
      </View>
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
  barStack: {
    height: 6,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 4,
    backgroundColor: colors.blueSecondary,
    borderRadius: 12.5,
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.bluePrimary,
    borderRadius: 12.5,
  },
});
