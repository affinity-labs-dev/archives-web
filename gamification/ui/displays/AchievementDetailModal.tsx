// AchievementDetailModal.tsx - Shows detailed info about an achievement
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { Achievement } from '@/gamification/engines/useAchievements';

interface AchievementDetailModalProps {
  visible: boolean;
  achievement: (Achievement & { unlocked: boolean; unlockedAt?: string }) | null;
  progress: number;
  onClose: () => void;
}

export default function AchievementDetailModal({
  visible,
  achievement,
  progress,
  onClose
}: AchievementDetailModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  // const glowAnim = useRef(new Animated.Value(0)).current; // Commented out - glow effect disabled

  useEffect(() => {
    if (visible && achievement) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Scale animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Glow pulse animation - commented out
      // if (achievement.unlocked) {
      //   Animated.loop(
      //     Animated.sequence([
      //       Animated.timing(glowAnim, {
      //         toValue: 1,
      //         duration: 1500,
      //         useNativeDriver: true,
      //       }),
      //       Animated.timing(glowAnim, {
      //         toValue: 0,
      //         duration: 1500,
      //         useNativeDriver: true,
      //       }),
      //     ])
      //   ).start();
      // }
    } else {
      scaleAnim.setValue(0);
      // glowAnim.setValue(0);
    }
  }, [visible, achievement]);

  if (!visible || !achievement) return null;

  // const glowOpacity = glowAnim.interpolate({
  //   inputRange: [0, 1],
  //   outputRange: [0.2, 0.6],
  // });

  const getRarityColor = () => {
    switch (achievement.rarity) {
      case 'common': return '#95A5A6';
      case 'rare': return '#3498DB';
      case 'epic': return '#9B59B6';
      case 'legendary': return '#F39C12';
      default: return '#95A5A6';
    }
  };

  const getRarityLabel = () => {
    return achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={32} color={ArchivesTheme.colors.mutedNavy} />
          </TouchableOpacity>

          {/* Rarity badge */}
          <View style={[styles.rarityBadge, { backgroundColor: getRarityColor() }]}>
            <Text style={styles.rarityText}>{getRarityLabel()}</Text>
          </View>

          {/* Achievement icon */}
          <View style={styles.iconWrapper}>
            {/* Glow effect - commented out */}
            {/* {achievement.unlocked && (
              <Animated.View style={[
                styles.iconGlow,
                { backgroundColor: achievement.color, opacity: glowOpacity }
              ]} />
            )} */}
            <View style={[
              styles.iconContainer,
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
            styles.achievementName,
            !achievement.unlocked && styles.lockedText
          ]}>
            {achievement.name}
          </Text>

          {/* Description */}
          <Text style={styles.description}>{achievement.description}</Text>

          {/* Unlock status */}
          {achievement.unlocked ? (
            <View style={styles.statusContainer}>
              <View style={styles.unlockedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                <Text style={styles.unlockedText}>Unlocked</Text>
              </View>
              {achievement.unlockedAt && (
                <Text style={styles.dateText}>
                  {formatDate(achievement.unlockedAt)}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed" size={16} color="#95A5A6" />
                <Text style={styles.lockedStatusText}>Locked</Text>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    { width: `${progress}%`, backgroundColor: achievement.color }
                  ]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}% complete</Text>
              </View>
            </View>
          )}

          {/* Category badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
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

const styles = StyleSheet.create({
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
  iconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: '50%',
    left: '50%',
    marginTop: -80,
    marginLeft: -80,
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
