import React, { useEffect, useMemo, useRef } from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import {
  Typography,
  colors,
  easings,
  radius,
  safeDuration,
  spacing,
} from "@/components/ui";
import { useEntrance } from "@/components/ui/animations";
import { toLocalDateString } from "@/utils/dateUtils";

// ──────────────────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────────────────

const CheckmarkIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="none"
      stroke={colors.white}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 12.5 10 17.5 19 7.5"
    />
  </Svg>
);

const CalendarLockIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path
      fill={colors.acaiPrimary}
      d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"
    />
  </Svg>
);

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface TodayCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  completedDates: Set<string>;
  isSubscribed: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * If set, animates each day cell in with a staggered entrance.
   * Per mock `index.html:1875-1877`: y -10→0, opacity 0→1, 400ms back.out(2),
   * 50ms stagger between days.
   */
  entranceDelay?: number;
}

// Mock `index.html:1875-1877` — week-row day stagger
const DAY_ENTRANCE_STAGGER_MS = 50;
const DAY_ENTRANCE_DURATION_MS = 400;
const DAY_ENTRANCE_PRESET = {
  translateY: { from: -10, to: 0 },
  opacity: { from: 0, to: 1 },
  duration: DAY_ENTRANCE_DURATION_MS,
  easing: easings.backOut2,
};

interface WeekDay {
  day: string;
  date: number;
  dateObj: Date;
  isToday: boolean;
  isCompleted: boolean;
  isMissed: boolean;
  isFuture: boolean;
}

const WEEKDAY_LABELS_MONDAY_FIRST = [
  "Mo",
  "Tu",
  "We",
  "Th",
  "Fr",
  "Sa",
  "Su",
];

const PAST_LABEL_COLOR = "#595959";

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export default function TodayCalendar({
  selectedDate,
  onSelectDate,
  completedDates,
  isSubscribed,
  style,
  entranceDelay,
}: TodayCalendarProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // Responsive dimensions — 7 cells + 6 gaps fit inside containerWidth
  const dimensions = useMemo(() => {
    const containerWidth = Math.min(Math.max(SCREEN_WIDTH * 0.95, 280), 370);
    const containerPadding = spacing.md;
    const innerWidth = containerWidth;
    const dayWidth = Math.floor(innerWidth / 8.8);
    const dayMargin = Math.floor((innerWidth - 7 * dayWidth) / 6);
    const weekWidth = dayWidth * 7 + dayMargin * 6;
    const scrollDistance = weekWidth + dayMargin;
    return {
      containerWidth,
      containerPadding,
      dayWidth,
      dayMargin,
      weekWidth,
      scrollDistance,
    };
  }, [SCREEN_WIDTH]);

  // Monday-first week generation — 14 days total for continuous swipe
  const weekDates = useMemo<WeekDay[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);

    // Monday-first index: 0 = Monday, 6 = Sunday
    const mondayIndex = (today.getDay() + 6) % 7;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - mondayIndex - 7);

    const dates: WeekDay[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStart = new Date(date.setHours(0, 0, 0, 0));
      const dateString = toLocalDateString(dateStart);

      const isToday = dateStart.getTime() === todayStart.getTime();
      const isPast = dateStart < todayStart;
      const isFuture = dateStart > todayStart;
      const isCompleted = completedDates.has(dateString);
      const isMissed = isPast && !isCompleted;

      const labelIndex = (dateStart.getDay() + 6) % 7;

      dates.push({
        day: WEEKDAY_LABELS_MONDAY_FIRST[labelIndex],
        date: dateStart.getDate(),
        dateObj: dateStart,
        isToday,
        isCompleted,
        isMissed,
        isFuture,
      });
    }
    return dates;
  }, [completedDates]);

  // Horizontal pan — two-week viewport with spring snap
  const translateX = useSharedValue(-dimensions.scrollDistance);
  const startX = useSharedValue(0);

  useEffect(() => {
    translateX.value = -dimensions.scrollDistance;
  }, [dimensions.scrollDistance, translateX]);

  const POSITION_PREV_WEEK = 0;
  const POSITION_CURRENT_WEEK = -dimensions.scrollDistance;
  const RUBBER_BAND_FACTOR = 0.3;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newX = startX.value + event.translationX;
      if (newX > POSITION_PREV_WEEK) {
        const overscroll = newX - POSITION_PREV_WEEK;
        translateX.value = POSITION_PREV_WEEK + overscroll * RUBBER_BAND_FACTOR;
      } else if (newX < POSITION_CURRENT_WEEK) {
        const overscroll = POSITION_CURRENT_WEEK - newX;
        translateX.value =
          POSITION_CURRENT_WEEK - overscroll * RUBBER_BAND_FACTOR;
      } else {
        translateX.value = newX;
      }
    })
    .onEnd((event) => {
      const velocityThreshold = 500;
      const midPoint = POSITION_CURRENT_WEEK / 2;
      let targetPosition: number;
      if (translateX.value > POSITION_PREV_WEEK) {
        targetPosition = POSITION_PREV_WEEK;
      } else if (translateX.value < POSITION_CURRENT_WEEK) {
        targetPosition = POSITION_CURRENT_WEEK;
      } else if (Math.abs(event.velocityX) > velocityThreshold) {
        targetPosition =
          event.velocityX > 0 ? POSITION_PREV_WEEK : POSITION_CURRENT_WEEK;
      } else {
        targetPosition =
          translateX.value > midPoint
            ? POSITION_PREV_WEEK
            : POSITION_CURRENT_WEEK;
      }
      translateX.value = withSpring(targetPosition, {
        damping: 20,
        stiffness: 150,
        mass: 0.8,
        overshootClamping: false,
      });
    });

  const calendarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { width: dimensions.containerWidth }, style]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.weekRow, calendarAnimatedStyle]}>
          {weekDates.map((item, index) => {
            const isSelected =
              toLocalDateString(selectedDate) ===
              toLocalDateString(item.dateObj);

            return (
              <DayCell
                key={toLocalDateString(item.dateObj)}
                item={item}
                index={index}
                dimensions={dimensions}
                isSelected={isSelected}
                isSubscribed={isSubscribed}
                onSelectDate={onSelectDate}
                entranceDelay={entranceDelay}
              />
            );
          })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Day cell — encapsulates one day's column with optional staggered entrance
// ──────────────────────────────────────────────────────────

interface DayCellProps {
  item: WeekDay;
  index: number;
  dimensions: {
    dayWidth: number;
    dayMargin: number;
    [key: string]: number;
  };
  isSelected: boolean;
  isSubscribed: boolean;
  onSelectDate: (date: Date) => void;
  entranceDelay?: number;
}

function DayCell({
  item,
  index,
  dimensions,
  isSelected,
  isSubscribed,
  onSelectDate,
  entranceDelay,
}: DayCellProps) {
  const enableEntrance = entranceDelay !== undefined;
  // `i % 7`: both halves of the 14-day window (current + previous week) share
  // the same per-day-of-week stagger pattern. The visible week's Monday animates
  // first regardless of which week is centered.
  const staggerDelay = enableEntrance
    ? entranceDelay! + (index % 7) * DAY_ENTRANCE_STAGGER_MS
    : 0;

  const { animatedStyle: entranceStyle } = useEntrance(DAY_ENTRANCE_PRESET, {
    delay: staggerDelay,
    autoPlay: enableEntrance,
  });

  return (
    <Animated.View
      style={[
        styles.dayColumn,
        {
          width: dimensions.dayWidth,
          marginRight: index < 13 ? dimensions.dayMargin : 0,
          zIndex: isSelected ? 1000 : 1,
          elevation: isSelected ? 1000 : 1,
        },
        enableEntrance && entranceStyle,
      ]}
    >
      <Typography
        variant="label.xs"
        extraColor={item.isFuture ? colors.concreteGrey : PAST_LABEL_COLOR}
        align="center"
        style={styles.dayLabel}
      >
        {item.day}
      </Typography>

      <TouchableOpacity
        onPress={() => !item.isFuture && onSelectDate(item.dateObj)}
        disabled={item.isFuture}
        activeOpacity={0.7}
        style={styles.dayTouchable}
      >
        <DayCircle item={item} isSelected={isSelected} />

        {item.isMissed && !isSubscribed && (
          <View style={styles.lockIconWrapper}>
            <CalendarLockIcon size={14} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────
// Day circle — encapsulates the 5 visual states from Figma
// ──────────────────────────────────────────────────────────

interface DayCircleProps {
  item: WeekDay;
  isSelected: boolean;
}

// Tap-interaction animation (ports `02 daily story/index.html:1917-1931`)
//   Scale pop:   gsap.fromTo({scale: 0.85}, {scale: 1, duration: 0.45, ease: 'back.out(2.2)'})
//   Ring fade:   CSS transition: box-shadow 0.28s ease
const POP_DURATION_MS = 450;
const RING_FADE_MS = 280;
const POP_EASING = Easing.out(Easing.back(2.2));
const TODAY_RING_COLOR = "#89003B";

function DayCircle({ item, isSelected }: DayCircleProps) {
  const ringColor = item.isToday ? TODAY_RING_COLOR : colors.onyx;

  const scale = useSharedValue(1);
  const ringProgress = useSharedValue(isSelected ? 1 : 0);
  const prevSelectedRef = useRef(isSelected);

  useEffect(() => {
    const wasSelected = prevSelectedRef.current;

    // Pop only on false → true transition — mirrors the mock's
    // `if (day.classList.contains('selected')) return` early-out.
    if (isSelected && !wasSelected) {
      scale.value = withSequence(
        withTiming(0.85, { duration: 0 }),
        withTiming(1, {
          duration: safeDuration(POP_DURATION_MS),
          easing: POP_EASING,
        })
      );
    }

    ringProgress.value = withTiming(isSelected ? 1 : 0, {
      duration: safeDuration(RING_FADE_MS),
    });

    prevSelectedRef.current = isSelected;
  }, [isSelected, scale, ringProgress]);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      ringProgress.value,
      [0, 1],
      [colors.transparent, ringColor]
    ),
  }));

  // Completed — solid Acai Secondary with white checkmark
  if (item.isCompleted) {
    return (
      <Animated.View
        style={[
          styles.baseCircle,
          { backgroundColor: colors.acaiSecondary },
          animatedCircleStyle,
        ]}
      >
        <CheckmarkIcon size={16} />
      </Animated.View>
    );
  }

  // Today — pink fill; ring color is the dark-red #89003B from the mock
  if (item.isToday) {
    return (
      <View style={styles.todayWrapper}>
        <Animated.View
          style={[
            styles.baseCircle,
            { backgroundColor: colors.pinkSecondary },
            animatedCircleStyle,
          ]}
        >
          <Typography
            extraColor={colors.white}
            align="center"
            size={12}
            weight="600"
          >
            {String(item.date)}
          </Typography>
        </Animated.View>
      </View>
    );
  }

  // Missed past day — pink accent + lock icon overlay (rendered by parent)
  if (item.isMissed) {
    return (
      <Animated.View
        style={[
          styles.baseCircle,
          { backgroundColor: "#D6BBFF" },
          animatedCircleStyle,
        ]}
      >
        <Typography
          extraColor={colors.acaiSecondary}
          align="center"
          size={12}
          weight="600"
        >
          {String(item.date)}
        </Typography>
      </Animated.View>
    );
  }

  // Future — light Acai Tertiary fill with white number; not tappable so ring stays 0
  return (
    <Animated.View
      style={[
        styles.baseCircle,
        { backgroundColor: colors.acaiTertiary },
        animatedCircleStyle,
      ]}
    >
      <Typography
        align="center"
        size={12}
        weight="600"
        extraColor={colors.white}
      >
        {String(item.date)}
      </Typography>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    overflow: "hidden",
  },
  weekRow: {
    flexDirection: "row",
    paddingBottom: spacing.sm,
  },
  dayColumn: {
    alignItems: "center",
    overflow: "visible",
  },
  dayLabel: {
    marginBottom: spacing.sm,
    fontFamily: "DM Sans",
  },
  dayTouchable: {
    alignItems: "center",
  },
  lockIconWrapper: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    zIndex: 10,
  },
  baseCircle: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: radius.pill,
    borderColor: colors.transparent,
    alignItems: "center",
    justifyContent: "center",
  },
  todayWrapper: {
    alignItems: "center",
  },
});
