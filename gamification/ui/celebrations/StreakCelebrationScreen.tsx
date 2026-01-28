// Streak Celebration Screen - Full screen display of daily streak progress
// Shows streak count, week calendar, and motivational text
// Matches Figma design with cream background

import ArchivesTheme from '@/constants/ArchivesTheme';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Import Rive animation from assets (relative path)
const streakFlame = require('../../../assets/rive/flamefinal.riv');

// Import checkmark PNG
const checkmarkIcon = require('../../../assets/images/streak/check_small.png');

// Week day data structure
interface WeekDay {
  day: string;
  completed: boolean;
  missed: boolean;
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

  // Move flame + number UP from bottom (Duolingo style)
  useEffect(() => {
    if (visible && !skipped) {
      // Start from below screen (reasonable bottom position, not extreme)
      translateY.value = SCREEN_HEIGHT * 0.35;
      // Animate up to center position
      translateY.value = withSpring(SCREEN_HEIGHT * 0.25, { damping: 20, stiffness: 90 });
      // At 1.5s, move to final position
      translateY.value = withDelay(1500, withSpring(0, { damping: 20, stiffness: 90 }));
    } else if (skipped) {
      // Instant position (centered inside card)
      translateY.value = 0;
    }
  }, [visible, skipped]);

  // Animated style for the hero container (flame + number + text)
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Track analytics (no haptic on modal open)
  useEffect(() => {
    if (visible) {
      analyticsService.trackCustomEvent('streak_celebration_shown', {
        streak_count: streakCount,
        is_milestone: [3, 7, 14, 30, 50, 100].includes(streakCount),
      });
    }
  }, [visible, streakCount]);

  // Single haptic feedback when continue button appears
  useEffect(() => {
    if (visible && !skipped) {
      // Continue button appears (2.0s)
      const timer = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [visible, skipped]);

  // Play celebration sounds for checkmarks (staggered with animation)
  useEffect(() => {
    if (visible && !skipped) {
      weekData.forEach((day, index) => {
        if (day.completed) {
          const delay = 1600 + index * 50; // Match checkmark animation timing
          setTimeout(() => {
            celebrationSound.current?.replayAsync();
          }, delay);
        }
      });
    }
  }, [visible, skipped, weekData]);

  return (
    <Modal visible={visible} animationType="none" transparent={false} statusBarTranslucent>
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
            entering={skipped ? undefined : FadeIn.delay(1600).duration(300)}
            style={styles.card}
          />

          {/* Big Streak Number - Zooms in at 1.0s */}
          <Animated.Text
            entering={skipped ? undefined : ZoomIn.delay(1000).duration(400).springify()}
            style={[styles.streakNumber, heroAnimatedStyle]}
          >
            {streakCount}
          </Animated.Text>

          {/* "day streak!" text - Fades in at 1.3s (after zoom) */}
          <Animated.Text
            entering={skipped ? undefined : FadeIn.delay(1300).duration(200)}
            style={[styles.streakText, heroAnimatedStyle]}
          >
            day streak!
          </Animated.Text>

          {/* Week Calendar Widget - Fades in at final position after text moves up */}
          <Animated.View
            entering={skipped ? undefined : FadeIn.delay(1600).duration(300)}
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

            {/* Day Indicators (checkmarks/circles) - Stagger starts at 1.6s */}
            <View style={styles.dayIndicators}>
              {weekData.map(({ day, completed, missed, isToday }, index) => (
                <Animated.View
                  key={day}
                  entering={skipped ? undefined : FadeIn.delay(1600 + index * 50).duration(200)}
                >
                  {completed ? (
                    <View style={[styles.checkmark, isToday && styles.checkmarkToday]}>
                      <Image source={checkmarkIcon} style={styles.checkmarkIcon} />
                    </View>
                  ) : missed ? (
                    <View style={styles.missedCircle}>
                      <Text style={styles.missedDash}>—</Text>
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
            entering={skipped ? undefined : FadeIn.delay(1800).duration(300)}
            style={styles.motivationalText}
          >
            {getMotivationalQuote(streakCount)}
          </Animated.Text>

          {/* Continue Button - Fades in last */}
          <Animated.View
            entering={skipped ? undefined : FadeIn.delay(2000).duration(300)}
            style={styles.continueButton}
          >
            <TouchableOpacity
              style={styles.continueButtonInner}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onContinue();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>LET&apos;S LEARN</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
    </Modal>
  );
}

const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 400);
const FLAME_SIZE = Math.min(SCREEN_WIDTH * 0.55, 220);
// Card positioned to contain number and text in center
const CARD_TOP = SCREEN_HEIGHT * 0.35;
// Flame above card (overlapping slightly per Figma)
const FLAME_TOP = CARD_TOP - FLAME_SIZE * 1.0;
// Number inside card with top padding (centered in screen middle)
const NUMBER_TOP = CARD_TOP + SCREEN_HEIGHT * 0.02;
// Text close below number
const TEXT_TOP = NUMBER_TOP + SCREEN_HEIGHT * 0.14;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    zIndex: 2000, // Ensure above all other UI (matches achievement popup pattern)
    elevation: 2000, // Android layering
  },
  closeButton: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.07,
    right: 24,
    zIndex: 100, // Above all content (matches achievement close button)
    elevation: 100, // Android
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameArea: {
    position: 'absolute',
    top: FLAME_TOP,
    width: FLAME_SIZE,
    height: FLAME_SIZE,
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
    top: CARD_TOP,
    left: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    width: CARD_WIDTH,
    height: SCREEN_HEIGHT * 0.48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  streakNumber: {
    position: 'absolute',
    top: NUMBER_TOP,
    left: 0,
    right: 0,
    fontFamily: 'DM Sans',
    fontSize: Math.min(SCREEN_WIDTH * 0.25, 100),
    fontWeight: '600',
    color: '#41425E',
    lineHeight: Math.min(SCREEN_WIDTH * 0.35, 140),
    textAlign: 'center',
    zIndex: 20, // Above white card
    elevation: 20, // Android
  },
  streakText: {
    position: 'absolute',
    top: TEXT_TOP,
    left: 0,
    right: 0,
    fontFamily: 'DM Sans',
    fontSize: Math.min(SCREEN_WIDTH * 0.065, 25),
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
    top: CARD_TOP + SCREEN_HEIGHT * 0.22,
    left: (SCREEN_WIDTH - CARD_WIDTH) / 2 + CARD_WIDTH * 0.05,
    width: CARD_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.13,
    backgroundColor: '#41425E',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 18,
    zIndex: 20, // Above white card
    elevation: 20, // Android
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
  missedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#999999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedDash: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
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
    backgroundColor: '#2D3E50',
  },
  motivationalText: {
    position: 'absolute',
    top: CARD_TOP + SCREEN_HEIGHT * 0.38,
    left: (SCREEN_WIDTH - CARD_WIDTH * 0.8) / 2,
    width: CARD_WIDTH * 0.8,
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: '#C99151',
    textAlign: 'center',
    lineHeight: 21,
    zIndex: 25, // Above white card (which has elevation: 10)
    elevation: 25, // Android
  },
  continueButton: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.06,
    left: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    width: CARD_WIDTH,
    height: 52,
    zIndex: 30, // Above everything
    elevation: 30, // Android
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
