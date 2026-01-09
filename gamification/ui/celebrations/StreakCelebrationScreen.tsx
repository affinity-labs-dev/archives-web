// Streak Celebration Screen - Full screen display of daily streak progress
// Shows streak count, week calendar, and motivational text
// Matches Figma design with cream background

import ArchivesTheme from '@/constants/ArchivesTheme';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import Rive, { RiveRef } from 'rive-react-native'; // TEMPORARILY DISABLED
import Animated, { FadeIn } from 'react-native-reanimated';
// import { useRef } from 'react'; // TEMPORARILY DISABLED

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
  // const riveRef = useRef<RiveRef>(null); // TEMPORARILY DISABLED

  // Track analytics and haptics on mount
  useEffect(() => {
    if (visible) {
      analyticsService.trackCustomEvent('streak_celebration_shown', {
        streak_count: streakCount,
        is_milestone: [3, 7, 14, 30, 50, 100].includes(streakCount),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible, streakCount]);

  // TEMPORARILY DISABLED: Change Rive flame colors to orange when animation loads
  /* const handleRivePlay = () => {
    if (riveRef.current) {
      try {
        console.log('🔥 Rive animation loaded - attempting to change colors...');
        const shapeNames = ['flame', 'fire', 'Flame', 'Fire', 'glow', 'Glow', 'base', 'Base', 'core', 'Core'];
        shapeNames.forEach(name => {
          try {
            riveRef.current?.setColor(name, '#FF6B35'); // Bright orange
            console.log(`✅ Changed color for shape: ${name}`);
          } catch (e) {
            // Shape doesn't exist, skip silently
          }
        });
      } catch (error) {
        console.log('❌ Rive color change error:', error);
      }
    }
  }; */

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

        {/* Flame Area - Rive Animation */}
        {/* TEMPORARILY DISABLED: Requires dev build with Rive native module */}
        {/* <View style={styles.flameArea}>
          <Rive
            ref={riveRef}
            resourceName="streak_flame"
            autoplay={true}
            onPlay={handleRivePlay}
            style={{ width: 140, height: 140 }}
          />
        </View> */}

        {/* Main Card - Absolutely positioned */}
        <View style={styles.card} />

        {/* Big Streak Number - Absolutely positioned (above card) */}
        <Text style={styles.streakNumber}>{streakCount}</Text>

        {/* "day streak!" text - Absolutely positioned */}
        <Text style={styles.streakText}>day streak!</Text>

        {/* Week Calendar Widget - Absolutely positioned */}
        <View style={styles.calendarWidget}>
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

          {/* Day Indicators (checkmarks/circles) - Animated stagger */}
          <View style={styles.dayIndicators}>
            {weekData.map(({ day, completed, isToday }, index) => (
              <Animated.View
                key={day}
                entering={FadeIn.delay(index * 100).duration(300)}
              >
                {completed ? (
                  <View style={[styles.checkmark, isToday && styles.checkmarkToday]}>
                    <Text style={styles.checkmarkIcon}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Motivational Text - Absolutely positioned */}
        <Text style={styles.motivationalText}>
          {getMotivationalQuote(streakCount)}
        </Text>

        {/* Continue Button - Absolutely positioned at bottom */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onContinue();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>LET&apos;S LEARN</Text>
        </TouchableOpacity>
      </SafeAreaView>
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
    top: 110,
    height: 140,
    alignSelf: 'center',
    // Placeholder for flame animation
  },
  card: {
    position: 'absolute',
    top: 308,
    left: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    width: 358,
    height: 372,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  streakNumber: {
    position: 'absolute',
    top: 310,
    left: 0,
    right: 0,
    fontFamily: 'DM Sans',
    fontSize: 100,
    fontWeight: '600',
    color: '#41425E',
    lineHeight: 140,
    // includeFontPadding: false,
    textAlign: 'center',
  },
  streakText: {
    position: 'absolute',
    top: 437,
    left: 0,
    right: 0,
    fontFamily: 'DM Sans',
    fontSize: 25,
    fontWeight: '700',
    color: '#41425E',
    lineHeight: 25,
    textAlign: 'center',
    includeFontPadding: false,
  },
  calendarWidget: {
    position: 'absolute',
    top: 483,
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
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    top: 610,
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
