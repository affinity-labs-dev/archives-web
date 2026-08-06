// Shield Earned Screen - Full-screen celebration when user earns a streak shield
// Design matches v5.0 celebration system (StreakCelebrationScreen pattern)

import { DepthButton, Typography } from '@/components/ui';
import { colors, radius, spacing } from '@/components/ui/theme';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ShieldEarnedScreenProps {
  currentStreak: number;
  totalShields: number;
  onContinue?: () => void;
}

export default function ShieldEarnedScreen({ currentStreak, totalShields, onContinue }: ShieldEarnedScreenProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    analyticsService.trackCustomEvent('shield_earned', {
      current_streak: currentStreak,
      total_shields: totalShields,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentStreak, totalShields]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analyticsService.trackCustomEvent('shield_earned_dismissed', {
      current_streak: currentStreak,
    });
    onContinue?.();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.acaiPrimary, colors.acaiDeep, colors.acaiSecondary]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Close button */}
        <Pressable style={styles.closeButton} hitSlop={16} onPress={handleContinue}>
          <Ionicons name="close" size={28} color={colors.white} />
        </Pressable>

        {/* Center content */}
        <View style={styles.contentColumn}>
          <View style={styles.card}>
            {/* Shield icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={56} color={colors.acaiSecondary} />
              </View>
            </View>

            {/* Title */}
            <Typography
              family="bounded"
              weight="900"
              size={28}
              align="center"
              uppercase
              extraColor={colors.onyx}
            >
              Shield Earned!
            </Typography>

            {/* Subtitle */}
            <View style={styles.subtitleRow}>
              <Typography family="onest" weight="600" size={16} color="textMuted" align="center">
                Perfect week complete
              </Typography>
            </View>

            {/* Shield slots */}
            <View style={styles.shieldSlotsRow}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.shieldSlot,
                    i < totalShields ? styles.shieldSlotFilled : styles.shieldSlotEmpty,
                  ]}
                >
                  <Ionicons
                    name={i < totalShields ? 'shield-checkmark' : 'shield-half'}
                    size={28}
                    color={i < totalShields ? colors.acaiSecondary : colors.concreteGrey}
                  />
                </View>
              ))}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Typography family="onest" weight="700" size={28} color="acaiPrimary" align="center">
                  {currentStreak}
                </Typography>
                <Typography family="onest" weight="500" size={12} color="textMuted" align="center">
                  Day Streak
                </Typography>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Typography family="onest" weight="700" size={28} color="acaiPrimary" align="center">
                  {totalShields}/3
                </Typography>
                <Typography family="onest" weight="500" size={12} color="textMuted" align="center">
                  Shields
                </Typography>
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionRow}>
              <Typography family="onest" weight="500" size={14} color="textMuted" align="center">
                Shields protect your streak if you miss a day. Keep learning to earn more!
              </Typography>
            </View>
          </View>
        </View>

        {/* CTA button */}
        <View style={styles.ctaSlot}>
          <DepthButton
            surfaceColor="onyx"
            shadowColor="white"
            borderColor="onyx"
            onPress={handleContinue}
          >
            <Typography variant="label.m" color="white">
              CONTINUE
            </Typography>
          </DepthButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.acaiPrimary,
  },
  safe: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 100,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    paddingTop: 40,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.acaiTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleRow: {
    marginTop: spacing.xxs,
    marginBottom: spacing.lg,
  },
  shieldSlotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  shieldSlot: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldSlotFilled: {
    backgroundColor: colors.acaiTertiary,
  },
  shieldSlotEmpty: {
    backgroundColor: '#F0F0F0',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  descriptionRow: {
    paddingHorizontal: spacing.sm,
  },
  ctaSlot: {
    paddingHorizontal: 20,
    paddingBottom: spacing.md,
  },
});
