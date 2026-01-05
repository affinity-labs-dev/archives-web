// AchievementUnlockAnimation.tsx - Celebration animation for unlocking achievements
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { Achievement } from '@/gamification/engines/useAchievements';

interface AchievementUnlockAnimationProps {
  visible: boolean;
  achievement: Achievement;
  onDismiss: () => void;
}

export default function AchievementUnlockAnimation({
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

  // Rarity-based styling
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

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        {/* Animated particles */}
        {[...Array(15)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
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

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
          </TouchableOpacity>

          {/* Rarity badge */}
          <View style={[styles.rarityBadge, { backgroundColor: getRarityColor() }]}>
            <Text style={styles.rarityText}>{getRarityLabel()}</Text>
          </View>

          {/* Achievement icon with glow */}
          <View style={styles.iconWrapper}>
            <Animated.View style={[styles.iconGlow, { backgroundColor: achievement.color, opacity: glowOpacity }]} />
            <View style={[styles.iconContainer, { backgroundColor: achievement.color }]}>
              <Ionicons name={achievement.icon as any} size={48} color="white" />
            </View>
          </View>

          <Text style={styles.title}>Achievement Unlocked!</Text>
          <Text style={styles.achievementName}>{achievement.name}</Text>
          <Text style={styles.description}>{achievement.description}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
