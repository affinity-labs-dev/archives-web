// Shield Used Notification - Modal notification when shield auto-protects streak
// Design matches v5.0 celebration system (card-based, Typography, DepthButton)

import { DepthButton, Typography } from '@/components/ui';
import { colors, radius, spacing } from '@/components/ui/theme';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

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

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Shield icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={40} color={colors.blueSecondary} />
          </View>

          {/* Streak number */}
          <Typography family="bounded" weight="900" size={64} color="acaiPrimary" align="center">
            {currentStreak}
          </Typography>

          {/* Label */}
          <Typography family="bounded" weight="900" size={20} color="onyx" align="center" uppercase>
            Day Streak Saved!
          </Typography>

          {/* Shield slots */}
          <View style={styles.shieldSlotsCard}>
            <View style={styles.shieldSlotsRow}>
              {[0, 1, 2].map((i) => {
                const isFilled = i < remainingShields;
                return (
                  <View
                    key={i}
                    style={[
                      styles.shieldSlot,
                      isFilled ? styles.shieldSlotFilled : styles.shieldSlotEmpty,
                    ]}
                  >
                    <Ionicons
                      name={isFilled ? 'shield-checkmark' : 'shield-half'}
                      size={24}
                      color={isFilled ? colors.acaiSecondary : 'rgba(255,255,255,0.35)'}
                    />
                  </View>
                );
              })}
            </View>
            <Typography family="onest" weight="600" size={12} extraColor="rgba(255,255,255,0.7)" align="center">
              Shields Remaining
            </Typography>
          </View>

          {/* Message */}
          <View style={styles.messageRow}>
            <Typography family="onest" weight="500" size={14} color="textMuted" align="center">
              A shield protected your progress!{'\n'}Keep learning to earn more.
            </Typography>
          </View>

          {/* Continue */}
          <View style={styles.ctaRow}>
            <DepthButton
              surfaceColor="onyx"
              shadowColor="white"
              borderColor="onyx"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onClose();
              }}
            >
              <Typography variant="label.m" color="white">
                CONTINUE
              </Typography>
            </DepthButton>
          </View>
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
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.acaiTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  shieldSlotsCard: {
    width: '100%',
    backgroundColor: colors.acaiPrimary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  shieldSlotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  shieldSlot: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldSlotFilled: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shieldSlotEmpty: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  messageRow: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  ctaRow: {
    width: '100%',
  },
});
