// AchievementGrid.tsx - Achievement display components
// Contains: AchievementDetailModal (detail view) and AchievementUnlockAnimation (celebration)
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { Achievement } from '@/gamification/engines/GamificationOrchestrator';

// ============================================================
// SHARED UTILITIES
// ============================================================

const getRarityColor = (rarity: Achievement['rarity']) => {
  switch (rarity) {
    case 'common': return '#95A5A6';
    case 'rare': return '#3498DB';
    case 'epic': return '#9B59B6';
    case 'legendary': return '#F39C12';
    default: return '#95A5A6';
  }
};

const getRarityLabel = (rarity: Achievement['rarity']) => {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// ============================================================
// ACHIEVEMENT DETAIL MODAL
// Shows detailed info when user taps an achievement
// ============================================================

interface AchievementDetailModalProps {
  visible: boolean;
  achievement: (Achievement & { unlocked: boolean; unlockedAt?: string }) | null;
  progress: number;
  onClose: () => void;
}

export function AchievementDetailModal({
  visible,
  achievement,
  progress,
  onClose
}: AchievementDetailModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, achievement]);

  if (!visible || !achievement) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={detailStyles.overlay}>
        <TouchableOpacity style={detailStyles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[detailStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Close button */}
          <TouchableOpacity style={detailStyles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={32} color={ArchivesTheme.colors.mutedNavy} />
          </TouchableOpacity>

          {/* Rarity badge */}
          <View style={[detailStyles.rarityBadge, { backgroundColor: getRarityColor(achievement.rarity) }]}>
            <Text style={detailStyles.rarityText}>{getRarityLabel(achievement.rarity)}</Text>
          </View>

          {/* Achievement icon */}
          <View style={detailStyles.iconWrapper}>
            <View style={[
              detailStyles.iconContainer,
              { backgroundColor: achievement.unlocked ? achievement.color : '#E0E0E0' }
            ]}>
              <Ionicons
                name={achievement.icon as any}
                size={64}
                color={achievement.unlocked ? 'white' : '#95A5A6'}
              />
            </View>
          </View>

          {/* Achievement name */}
          <Text style={[
            detailStyles.achievementName,
            !achievement.unlocked && detailStyles.lockedText
          ]}>
            {achievement.name}
          </Text>

          {/* Description */}
          <Text style={detailStyles.description}>{achievement.description}</Text>

          {/* Unlock status */}
          {achievement.unlocked ? (
            <View style={detailStyles.statusContainer}>
              <View style={detailStyles.unlockedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                <Text style={detailStyles.unlockedText}>Unlocked</Text>
              </View>
              {achievement.unlockedAt && (
                <Text style={detailStyles.dateText}>
                  {formatDate(achievement.unlockedAt)}
                </Text>
              )}
            </View>
          ) : (
            <View style={detailStyles.statusContainer}>
              <View style={detailStyles.lockedBadge}>
                <Ionicons name="lock-closed" size={16} color="#95A5A6" />
                <Text style={detailStyles.lockedStatusText}>Locked</Text>
              </View>
              <View style={detailStyles.progressContainer}>
                <View style={detailStyles.progressBar}>
                  <View style={[
                    detailStyles.progressFill,
                    { width: `${progress}%`, backgroundColor: achievement.color }
                  ]} />
                </View>
                <Text style={detailStyles.progressText}>{Math.round(progress)}% complete</Text>
              </View>
            </View>
          )}

          {/* Category badge */}
          <View style={detailStyles.categoryBadge}>
            <Text style={detailStyles.categoryText}>
              {achievement.category === 'quiz' && '🎯 Quiz'}
              {achievement.category === 'streak' && '🔥 Streak'}
              {achievement.category === 'speed' && '⚡ Speed'}
              {achievement.category === 'completion' && '📚 Completion'}
              {achievement.category === 'time' && '🌙 Time-based'}
              {achievement.category === 'perfectionist' && '💯 Perfectionist'}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================
// ACHIEVEMENT UNLOCK ANIMATION
// Celebration animation when an achievement is unlocked
// ============================================================

interface AchievementUnlockAnimationProps {
  visible: boolean;
  achievement: Achievement;
  onDismiss: () => void;
}

export function AchievementUnlockAnimation({
  visible,
  achievement,
  onDismiss
}: AchievementUnlockAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  useEffect(() => {
    if (visible) {
      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Scale animation for card
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Rotate animation for particles
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // Glow pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      glowAnim.setValue(0);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={unlockStyles.container}>
        {/* Animated particles */}
        {[...Array(15)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              unlockStyles.particle,
              {
                left: `${(i * 7) % 100}%`,
                top: `${(i * 11) % 100}%`,
                opacity: scaleAnim,
                transform: [{ rotate }],
              },
            ]}
          >
            <Ionicons
              name={i % 2 === 0 ? 'star' : 'sparkles'}
              size={16}
              color={achievement.color}
            />
          </Animated.View>
        ))}

        <Animated.View style={[unlockStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Close Button */}
          <TouchableOpacity
            style={unlockStyles.closeButton}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
          </TouchableOpacity>

          {/* Rarity badge */}
          <View style={[unlockStyles.rarityBadge, { backgroundColor: getRarityColor(achievement.rarity) }]}>
            <Text style={unlockStyles.rarityText}>{getRarityLabel(achievement.rarity)}</Text>
          </View>

          {/* Achievement icon with glow */}
          <View style={unlockStyles.iconWrapper}>
            <Animated.View style={[unlockStyles.iconGlow, { backgroundColor: achievement.color, opacity: glowOpacity }]} />
            <View style={[unlockStyles.iconContainer, { backgroundColor: achievement.color }]}>
              <Ionicons name={achievement.icon as any} size={48} color="white" />
            </View>
          </View>

          <Text style={unlockStyles.title}>Achievement Unlocked!</Text>
          <Text style={unlockStyles.achievementName}>{achievement.name}</Text>
          <Text style={unlockStyles.description}>{achievement.description}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================
// DEFAULT EXPORT (backwards compatibility)
// ============================================================

export default AchievementDetailModal;

// ============================================================
// STYLES - Detail Modal
// ============================================================

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  rarityBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1,
  },
  achievementName: {
    fontFamily: 'DM Sans',
    fontSize: 26,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedText: {
    color: '#95A5A6',
  },
  description: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  statusContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginBottom: 8,
  },
  unlockedText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: '#27AE60',
  },
  dateText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: ArchivesTheme.colors.shoeBrown,
    opacity: 0.7,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginBottom: 12,
  },
  lockedStatusText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: '#95A5A6',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
  },
  categoryBadge: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  categoryText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
  },
});

// ============================================================
// STYLES - Unlock Animation
// ============================================================

const unlockStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  particle: {
    position: 'absolute',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
  },
  rarityBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 8,
  },
  achievementName: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.persianOrange,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    lineHeight: 20,
  },
});
