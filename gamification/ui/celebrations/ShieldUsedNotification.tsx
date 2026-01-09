// Shield Used Notification - Duolingo-style notification when shield auto-protects streak
// Matches Duolingo's streak display design with large number, visual widgets, and green button

import { analyticsService } from '@/services/AnalyticsService';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ShieldUsedNotificationProps {
  visible: boolean;
  currentStreak: number;
  remainingShields: number;
  onClose: () => void;
}

export default function ShieldUsedNotification({
  visible,
  currentStreak,
  remainingShields,
  onClose,
}: ShieldUsedNotificationProps) {
  useEffect(() => {
    if (visible) {
      analyticsService.trackCustomEvent('shield_used_auto', {
        current_streak: currentStreak,
        remaining_shields: remainingShields,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible, currentStreak, remainingShields]);

  // Render shield slots (3 total, show filled/empty based on remaining)
  const renderShieldSlots = () => {
    const slots = [];
    for (let i = 0; i < 3; i++) {
      const isFilled = i < remainingShields;
      slots.push(
        <View key={i} style={styles.shieldSlot}>
          <Text style={[styles.shieldSlotIcon, !isFilled && styles.shieldSlotEmpty]}>
            {isFilled ? '🛡️' : '⚪'}
          </Text>
        </View>
      );
    }
    return slots;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Shield Icon at Top */}
          <Text style={styles.topIcon}>🛡️</Text>

          {/* Large Streak Number - Duolingo Style */}
          <Text style={styles.streakNumber}>{currentStreak}</Text>

          {/* "day streak saved!" Text */}
          <Text style={styles.streakText}>day streak saved!</Text>

          {/* Shield Slots Widget */}
          <View style={styles.shieldWidget}>
            <View style={styles.shieldSlotsContainer}>
              {renderShieldSlots()}
            </View>
            <Text style={styles.shieldWidgetLabel}>Shields Remaining</Text>
          </View>

          {/* Motivational Orange Text */}
          <Text style={styles.motivationalText}>
            A shield protected your progress!{'\n'}Keep learning to earn more.
          </Text>

          {/* Duolingo-style Green Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  topIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  streakNumber: {
    fontFamily: 'DM Sans',
    fontSize: 80,
    fontWeight: '800',
    color: '#2B3F6C', // Duolingo navy blue
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 88,
  },
  streakText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '600',
    color: '#2B3F6C',
    textAlign: 'center',
    marginBottom: 24,
  },
  shieldWidget: {
    width: '100%',
    backgroundColor: '#454F63', // Dark navy background like Duolingo calendar
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  shieldSlotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  shieldSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldSlotIcon: {
    fontSize: 32,
  },
  shieldSlotEmpty: {
    opacity: 0.3,
  },
  shieldWidgetLabel: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
  },
  motivationalText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9600', // Duolingo orange
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  continueButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#58A700', // Duolingo green
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
