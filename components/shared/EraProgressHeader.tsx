// Reusable Era Progress Header (v5.0 Design System)
// Uses interlocking pill design from StatsBadge + v5.0 ProgressBar

import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Typography, ProgressBar } from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { colors, spacing, safeDuration } from '@/components/ui/theme';
import { useGamificationOrchestrator, useGamifiedProgress } from '@/gamification';
import { calculateWeekData } from '@/gamification/engines/GamificationOrchestrator';
import StreakCelebrationScreen from '@/gamification/ui/celebrations/StreakCelebrationScreen';

// Streak icon (flame)
const StreakIcon = ({ size = 14, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960" fill={color}>
    <Path d="M240-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T648-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T401-690q-39 33-69 68.5t-50.5 72Q261-513 250.5-475T240-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T537-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T622-658l18-22q74 42 117 117t43 163q0 134-93 227T480-80q-134 0-227-93t-93-227q0-129 86.5-245T480-840Z" />
  </Svg>
);

// XP icon (medal/star)
const XPIcon = ({ size = 14, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960" fill={color}>
    <Path d="m387-412 35-114-92-74h114l36-112 36 112h114l-93 74 35 114-92-71-93 71ZM240-40v-309q-38-42-59-96t-21-115q0-134 93-227t227-93q134 0 227 93t93 227q0 61-21 115t-59 96v309l-240-80-240 80Zm240-280q100 0 170-70t70-170q0-100-70-170t-170-70q-100 0-170 70t-70 170q0 100 70 170t170 70ZM320-159l160-41 160 41v-124q-35 20-75.5 31.5T480-240q-44 0-84.5-11.5T320-283v124Zm160-62Z" />
  </Svg>
);

const PILL_HEIGHT = 63;

// Count-up hook — animates a number from 0 to target on the UI thread
function useCountUp(target: number, duration: number = 800, delay: number = 0): number {
  const [display, setDisplay] = useState(0);
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = 0;
    animatedValue.value = withDelay(
      safeDuration(delay),
      withTiming(target, {
        duration: safeDuration(duration),
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [target, duration, delay]);

  useAnimatedReaction(
    () => Math.round(animatedValue.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplay)(current);
      }
    },
  );

  return display;
}

interface EraProgressHeaderProps {
  title: string;
  correctAnswers: number;
  totalQuestions: number;
  totalXP?: number;
  onPress?: () => void;
}

const EraProgressHeader: React.FC<EraProgressHeaderProps> = ({
  title,
  correctAnswers,
  totalQuestions,
  totalXP = 0,
  onPress,
}) => {
  const { streak, lastActiveBeforeUpdate, streakBeforeUpdate } = useGamificationOrchestrator();
  const { getStreak } = useGamifiedProgress();
  const insets = useSafeAreaInsets();

  const [showTestCelebration, setShowTestCelebration] = useState(false);
  const cloudStreak = getStreak();

  const topPadding = insets.top + spacing.md;
  const { width: screenWidth } = Dimensions.get('window');
  const containerPadding = screenWidth * 0.034;

  const progressPercentage = totalQuestions > 0
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0;

  const xpValue = totalXP || correctAnswers * 10;

  // Count-up animations — start after slideFromTop entrance is mostly visible (~400ms)
  const COUNT_UP_DELAY = 400;
  const displayPercentage = useCountUp(progressPercentage, 800, COUNT_UP_DELAY);
  const displayStreak = useCountUp(streak, 600, COUNT_UP_DELAY);
  const displayXP = useCountUp(xpValue, 800, COUNT_UP_DELAY);

  // Independent press animations — translateY dip (like DepthButton)
  const leftDip = useSharedValue(0);
  const rightDip = useSharedValue(0);

  const makePressHandlers = (sv: typeof leftDip) => ({
    onPressIn: () => {
      sv.value = withTiming(4, {
        duration: safeDuration(140),
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      });
    },
    onPressOut: () => {
      sv.value = withSequence(
        withTiming(-2, { duration: safeDuration(100), easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: safeDuration(110), easing: Easing.out(Easing.ease) }),
      );
    },
  });

  const leftPress = makePressHandlers(leftDip);
  const rightPress = makePressHandlers(rightDip);

  const leftPressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: leftDip.value }],
  }));
  const rightPressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rightDip.value }],
  }));

  return (
    <View style={[styles.wrapper, { paddingLeft: containerPadding, paddingRight: containerPadding, paddingTop: topPadding }]}>
      <AnimatedEntrance preset="slideFromTop" delay={100} duration={500}>
        {/* Shadow behind pill */}
        <View style={styles.shadowBehind} />

        {/* Interlocking pill */}
        <View style={styles.pillContainer}>
          {/* Left pill (big) — opens Adventures Feed */}
          <Pressable
            onPressIn={leftPress.onPressIn}
            onPressOut={leftPress.onPressOut}
            onPress={onPress}
            style={styles.leftPillPressable}
          >
          <Animated.View style={[styles.leftPill, leftPressStyle]}>
            <View style={styles.leftContent}>
              <View style={styles.titleRow}>
                <Typography family="bounded" size={16} weight="600" color="onyx" uppercase>
                  {title}
                </Typography>
                <Typography family="onest" size={16} weight="700" color="onyx">
                  {displayPercentage}%
                </Typography>
              </View>

              <ProgressBar
                percent={displayPercentage}
                height={4}
                fillColor="bluePrimary"
                trackColor="snow"
                borderRadius={2}
              />
            </View>
          </Animated.View>
          </Pressable>

          {/* Right pill (small) — opens Streak Celebration */}
          <Pressable
            onPressIn={rightPress.onPressIn}
            onPressOut={rightPress.onPressOut}
            onPress={() => setShowTestCelebration(true)}
          >
          <Animated.View style={[styles.rightPill, rightPressStyle]}>
            <View style={styles.statRow}>
              <View style={styles.iconWrapper}>
                <StreakIcon size={16} color={colors.bluePrimary} />
              </View>
              <Typography family="onest" size={12} weight="600" color="bluePrimary">
                {displayStreak}{' '}
              </Typography>
              <Typography family="onest" size={11} weight="400" color="bluePrimary">
                {streak === 1 ? 'day' : 'days'}
              </Typography>
            </View>
            <View style={styles.statRow}>
              <View style={styles.iconWrapper}>
                <XPIcon size={16} color={colors.bluePrimary} />
              </View>
              <Typography family="onest" size={12} weight="600" color="bluePrimary">
                {displayXP}{' '}
              </Typography>
              <Typography family="onest" size={11} weight="400" color="bluePrimary">
                XP
              </Typography>
            </View>
          </Animated.View>
          </Pressable>
        </View>
      </AnimatedEntrance>

      <StreakCelebrationScreen
        visible={showTestCelebration}
        streakCount={cloudStreak.currentStreak}
        weekData={calculateWeekData(
          cloudStreak.currentStreak,
          cloudStreak.lastActiveDate,
          lastActiveBeforeUpdate || cloudStreak.lastActiveDate,
          streakBeforeUpdate || cloudStreak.currentStreak
        )}
        onContinue={() => setShowTestCelebration(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 22,
    backgroundColor: colors.snow,
    position: 'relative',
  },
  shadowBehind: {
    position: 'absolute',
    top: 4,
    left: 3,
    right: 3,
    height: PILL_HEIGHT,
    backgroundColor: colors.bluePrimary,
    borderRadius: 15,
  },
  // Interlocking pill — matches StatsBadge pattern
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_HEIGHT,
    gap: 2,
  },
  // Left pill pressable wrapper
  leftPillPressable: {
    flex: 1,
  },
  // Left pill: rounded-left, square-right
  leftPill: {
    height: PILL_HEIGHT,
    backgroundColor: colors.blueSecondary,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    zIndex: 1,
  },
  leftContent: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  // Right pill: square-left, rounded-right
  rightPill: {
    width: 99,
    height: PILL_HEIGHT,
    backgroundColor: colors.blueSecondary,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 16,
    height: 16,
    marginRight: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EraProgressHeader;
