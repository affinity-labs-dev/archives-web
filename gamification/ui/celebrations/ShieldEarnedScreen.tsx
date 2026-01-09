// Shield Earned Screen - Celebration screen for earning streak shields
// Shows shield icon, streak info, and congratulatory message

import ArchivesTheme from '@/constants/ArchivesTheme';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShieldEarnedScreenProps {
  currentStreak: number;
  totalShields: number;
  onContinue?: () => void;
}

export default function ShieldEarnedScreen({ currentStreak, totalShields, onContinue }: ShieldEarnedScreenProps) {
  // Track shield earned event
  useEffect(() => {
    analyticsService.trackCustomEvent('shield_earned', {
      current_streak: currentStreak,
      total_shields: totalShields,
    });
    console.log(`📊 [Analytics] Shield Earned: ${currentStreak} day streak, ${totalShields}/3 shields`);

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentStreak, totalShields]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    analyticsService.trackCustomEvent('shield_earned_dismissed', {
      current_streak: currentStreak,
    });

    if (onContinue) {
      onContinue();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0C4A6E', '#0284C7', '#38BDF8']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleContinue}>
        <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Shield Icon */}
        <View style={styles.shieldContainer}>
          <Text style={styles.shieldEmoji}>🛡️</Text>
          <View style={styles.sparkleContainer}>
            <Text style={styles.sparkle}>✨</Text>
            <Text style={[styles.sparkle, styles.sparkleDelay1]}>✨</Text>
            <Text style={[styles.sparkle, styles.sparkleDelay2]}>✨</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Shield Earned!</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Perfect Week Complete! 🎉</Text>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Current Streak</Text>
            <Text style={styles.statValue}>{currentStreak} days 🔥</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Shields</Text>
            <Text style={styles.statValue}>{totalShields}/3 🛡️</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Shields protect your streak if you miss a day. Keep learning to earn more!
        </Text>

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C4A6E',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  closeButton: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.06,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  shieldContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  shieldEmoji: {
    fontSize: 120,
    textAlign: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 32,
    opacity: 0.8,
  },
  sparkleDelay1: {
    top: -10,
    right: -10,
  },
  sparkleDelay2: {
    bottom: -10,
    left: -10,
  },
  title: {
    fontFamily: 'Cormorant-Bold',
    fontSize: 48,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32,
  },
  statsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 12,
  },
  statLabel: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statValue: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  description: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  continueButton: {
    width: '100%',
    height: 56,
    backgroundColor: 'white',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '700',
    color: '#0C4A6E',
  },
});
