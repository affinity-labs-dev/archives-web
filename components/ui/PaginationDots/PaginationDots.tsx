// PaginationDots — horizontal pagination indicator. Inactive items render
// as 6px circles in `inactiveColor`; the active item expands to an
// 18px-wide pill in `activeColor` via a 300ms ease-in-out transition
// (mock `index.html:459-470`). Used across the home-screen card deck and
// any in-modal carousels (e.g. the watch-card multi-image variant).

import React, { useEffect } from "react";
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/components/ui/theme";
import { safeDuration } from "@/components/ui/theme/motion";

const DOT_INACTIVE_WIDTH = 6;
const DOT_ACTIVE_WIDTH = 18;
const DOT_HEIGHT = 6;
const DOT_TRANSITION_MS = 300;

export interface PaginationDotsProps {
  count: number;
  activeIndex: number;
  /**
   * Tap-to-jump handler. Optional — when omitted the dots are display-only
   * (e.g. a video carousel where only swipe drives the index).
   */
  onSelect?: (index: number) => void;
  /** Default `colors.bluePrimary` (home-screen tone). Override with white
   *  for use over a dark video background. */
  activeColor?: string;
  /** Default `colors.concreteGrey`. Override with translucent white for
   *  dark backgrounds. */
  inactiveColor?: string;
  style?: StyleProp<ViewStyle>;
}

export default function PaginationDots({
  count,
  activeIndex,
  onSelect,
  activeColor = colors.bluePrimary,
  inactiveColor = colors.concreteGrey,
  style,
}: PaginationDotsProps) {
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot
          key={i}
          isActive={i === activeIndex}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          onPress={onSelect ? () => onSelect(i) : undefined}
        />
      ))}
    </View>
  );
}

interface DotProps {
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress?: () => void;
}

function Dot({ isActive, activeColor, inactiveColor, onPress }: DotProps) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: safeDuration(DOT_TRANSITION_MS),
      easing: Easing.inOut(Easing.ease),
    });
  }, [isActive, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0, 1],
      [DOT_INACTIVE_WIDTH, DOT_ACTIVE_WIDTH],
    ),
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, activeColor],
    ),
  }));

  // Display-only dots (no `onPress`) skip the wrapping TouchableOpacity
  // so they don't interfere with parent gesture detectors (e.g. the
  // video carousel ScrollView).
  if (!onPress) {
    return <Animated.View style={[styles.dot, animatedStyle]} />;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
    >
      <Animated.View style={[styles.dot, animatedStyle]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: DOT_HEIGHT,
    borderRadius: 3,
  },
});
