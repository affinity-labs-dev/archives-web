// Streak Celebration Screen - Full screen display of daily streak progress
// Shows streak count, week calendar, and motivational text
// Matches Figma design with cream background

import ArchivesTheme from '@/constants/ArchivesTheme';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';

// Import Rive animation from assets (relative path)
const streakFlame = require('../../../assets/rive/flamefinal.riv');

// Import checkmark PNG
const checkmarkIcon = require('../../../assets/images/streak/check_small.png');

// Week day data structure
interface WeekDay {
  day: string;
  completed: boolean;
  isToday: boolean;
}

interface StreakCelebrationScreenProps {
  visible: boolean;
  streakCount: number;
  weekData: WeekDay[]; // 7 days (Mo-Su) with completion status
  onContinue: () => void;
}

// Motivational quotes based on streak length
const getMotivationalQuote = (streak: number): string => {
  if (streak === 1) return "Great start! The journey of a thousand miles begins with a single step.";
  if (streak < 7) return "Keep it up! Consistency is the key to mastery.";
  if (streak === 7) return "One week strong! The scholars of old learned a little every day too.";
  if (streak < 30) return "Great scholars and travelers learned a little every day too. Just like you!";
  if (streak === 30) return "One month of dedication! You are building an incredible habit.";
  if (streak < 100) return "Your commitment is inspiring! The path to wisdom is walked daily.";
  return "Legendary dedication! You are truly embodying the spirit of lifelong learning.";
};

export default function StreakCelebrationScreen({
  visible,
  streakCount,
  weekData,
  onContinue,
}: StreakCelebrationScreenProps) {
  const riveRef = useRef<RiveRef>(null);
  const celebrationSound = useRef<Audio.Sound | null>(null);
  const tickSound = useRef<Audio.Sound | null>(null);
  const [skipped, setSkipped] = useState(false);

  // Animated value for moving flame + number upward (Duolingo style)
  const translateY = useSharedValue(0);

  // Load sounds on mount
  useEffect(() => {
    const loadSounds = async () => {
      try {
        // Load celebration sound (reuse quiz correct sound)
        const { sound: celebSound } = await Audio.Sound.createAsync(
          require('../../../assets/audio/quiz/correct.wav'),
          { volume: 0.5 }
        );
        celebrationSound.current = celebSound;

        // Load tick sound (reuse quiz tap sound)
        const { sound: tickSnd } = await Audio.Sound.createAsync(
          require('../../../assets/audio/quiz/tap.wav'),
          { volume: 0.3 }
        );
        tickSound.current = tickSnd;
      } catch (error) {
        console.log('❌ Error loading celebration sounds:', error);
      }
    };

    loadSounds();

    // Cleanup sounds on unmount
    return () => {
      celebrationSound.current?.unloadAsync();
      tickSound.current?.unloadAsync();
    };
  }, []);

  // Reset skipped state when modal closes
  useEffect(() => {
    if (!visible) {
      setSkipped(false);
      translateY.value = 0; // Reset position
    }
  }, [visible]);

  // Move flame + number UP after 3s to make room for calendar (Duolingo style)
  useEffect(() => {
    if (visible && !skipped) {
      // Start centered (200px down from normal position)
      translateY.value = 200;
      // At 3s, move to final top position
      translateY.value = withDelay(3000, withSpring(0, { damping: 20, stiffness: 90 }));
    } else if (skipped) {
      // Instant position if skipped
      translateY.value = 0;
    }
  }, [visible, skipped]);

  // Animated style for the hero container (flame + number + text)
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Track analytics, haptics, and play celebration sound
  useEffect(() => {
    if (visible) {
      analyticsService.trackCustomEvent('streak_celebration_shown', {
        streak_count: streakCount,
        is_milestone: [3, 7, 14, 30, 50, 100].includes(streakCount),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Play celebration sound when modal opens
      celebrationSound.current?.replayAsync();
    }
  }, [visible, streakCount]);

  // Haptic feedback at key animation moments
  useEffect(() => {
    if (visible && !skipped) {
      // Streak number appears (2s)
      const timer1 = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 2000);

      // Calendar appears (3.2s - after text moves up)
      const timer2 = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 3200);

      // Continue button appears (4.2s)
      const timer3 = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 4200);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [visible, skipped]);

  // Play tick sounds for checkmarks (staggered with animation)
  useEffect(() => {
    if (visible && !skipped) {
      weekData.forEach((day, index) => {
        if (day.completed) {
          const delay = 3200 + index * 100; // Match checkmark animation timing
          setTimeout(() => {
            tickSound.current?.replayAsync();
          }, delay);
        }
      });
    }
  }, [visible, skipped, weekData]);

  return (
    <Modal visible={visible} animationType="none" transparent={false} statusBarTranslucent>
      <Pressable
        style={{ flex: 1 }}
        onPress={() => setSkipped(true)}
        disabled={skipped}
      >
        <SafeAreaView style={styles.container}>
          {/* Close Button - Top Right */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onContinue();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={32} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>

          {/* Flame Area - Rive Animation - Appears immediately */}
          <Animated.View style={[styles.flameArea, heroAnimatedStyle]}>
            <Rive
              ref={riveRef}
              source={streakFlame}
              autoplay={true}
              animationName="burning_flame"
              fit={Fit.Contain}
              alignment={Alignment.Center}
              style={styles.riveAnimation}
            />
          </Animated.View>

          {/* Main Card - Fades in at final position after text moves up */}
          <Animated.View
            entering={skipped ? undefined : FadeIn.delay(3200).duration(400)}
            style={styles.card}
          />

          {/* Big Streak Number - Zooms in with bounce at 2s */}
          <Animated.Text
            entering={skipped ? undefined : ZoomIn.delay(2000).duration(500).springify()}
            style={[styles.streakNumber, heroAnimatedStyle]}
          >
            {streakCount}
          </Animated.Text>

          {/* "day streak!" text - Fades in at 2.5s */}
          <Animated.Text
            entering={skipped ? undefined : FadeIn.delay(2500).duration(300)}
            style={[styles.streakText, heroAnimatedStyle]}
          >
            day streak!
          </Animated.Text>

          {/* Week Calendar Widget - Fades in at final position after text moves up */}
          <Animated.View
            entering={skipped ? undefined : FadeIn.delay(3200).duration(400)}
            style={styles.calendarWidget}
          >
            {/* Day Labels (Mo-Su) */}
            <View style={styles.dayLabels}>
              {weekData.map(({ day, completed }) => (
                <Text
                  key={day}
                  style={[
                    styles.dayLabel,
                    !completed && styles.dayLabelFuture,
                  ]}
                >
                  {day}
                </Text>
              ))}
            </View>

            {/* Day Indicators (checkmarks/circles) - Stagger starts at 3.2s */}
            <View style={styles.dayIndicators}>
              {weekData.map(({ day, completed, isToday }, index) => (
                <Animated.View
                  key={day}
                  entering={skipped ? undefined : FadeIn.delay(3200 + index * 100).duration(300)}
                >
                  {completed ? (
                    <View style={[styles.checkmark, isToday && styles.checkmarkToday]}>
                      <Image source={checkmarkIcon} style={styles.checkmarkIcon} />
                    </View>
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Motivational Text - Fades in after calendar */}
          <Animated.Text
            entering={skipped ? undefined : FadeIn.delay(3800).duration(400)}
            style={styles.motivationalText}
          >
            {getMotivationalQuote(streakCount)}
          </Animated.Text>

          {/* Continue Button - Fades in last */}
          <Animated.View
            entering={skipped ? undefined : FadeIn.delay(4200).duration(400)}
            style={styles.continueButton}
          >
            <TouchableOpacity
              style={styles.continueButtonInner}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                tickSound.current?.replayAsync(); // Play tap sound
                onContinue();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>LET&apos;S LEARN</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameArea: {
    position: 'absolute',
    top: 80,
    width: 220,
    height: 220,
    alignSelf: 'center',
    overflow: 'visible',
    zIndex: 20, // Above white card
    elevation: 20, // Android
  },
  riveAnimation: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  card: {
    position: 'absolute',
    top: 320,
    left: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    width: 358,
    height: 390,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  streakNumber: {
    position: 'absolute',
    top: 330,
    left: 0,
    right: 0,
    fontFamily: 'DM Sans',
    fontSize: 100,
    fontWeight: '600',
    color: '#41425E',
    lineHeight: 140,
    textAlign: 'center',
    zIndex: 20, // Above white card
    elevation: 20, // Android
  },
  streakText: {
    position: 'absolute',
    top: 462,
    left: 0,
    right: 0,
    fontFamily: 'DM Sans',
    fontSize: 25,
    fontWeight: '700',
    color: '#41425E',
    lineHeight: 32,
    textAlign: 'center',
    includeFontPadding: false,
    zIndex: 20, // Above white card
    elevation: 20, // Android
  },
  calendarWidget: {
    position: 'absolute',
    top: 508,
    left: 34,
    width: 327,
    height: 106,
    backgroundColor: '#41425E',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  dayLabel: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    width: 32,
    textAlign: 'center',
  },
  dayLabelFuture: {
    color: '#C3C3C3',
  },
  dayIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C99151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkToday: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#C99151',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  checkmarkIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  emptyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
  },
  motivationalText: {
    position: 'absolute',
    top: 635,
    left: 54,
    width: 288,
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: '#C99151',
    textAlign: 'center',
    lineHeight: 21,
  },
  continueButton: {
    position: 'absolute',
    bottom: 50,
    left: 18,
    width: 358,
    height: 52,
  },
  continueButtonInner: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: '#959C00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6E7300',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.18,
  },
});
