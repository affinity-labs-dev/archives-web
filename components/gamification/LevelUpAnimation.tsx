// LevelUpAnimation.tsx - Celebration animation for leveling up
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { Level } from '@/hooks/useLevel';

interface LevelUpAnimationProps {
  visible: boolean;
  level: Level;
  onDismiss: () => void;
}

export default function LevelUpAnimation({ visible, level, onDismiss }: LevelUpAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Scale animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Rotate animation
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        {/* Simple confetti stars */}
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                left: `${(i * 5) % 100}%`,
                top: `${(i * 7) % 100}%`,
                opacity: scaleAnim,
                transform: [{ rotate }],
              },
            ]}
          >
            <Ionicons name="star" size={20} color={level.color} />
          </Animated.View>
        ))}

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.iconContainer, { backgroundColor: level.color }]}>
            <Ionicons name="star" size={48} color="white" />
          </View>

          <Text style={styles.title}>Level Up!</Text>
          <Text style={styles.levelText}>Level {level.level}</Text>
          <Text style={styles.nameText}>{level.name}</Text>

          <Text style={styles.message}>You're making great progress! Keep learning!</Text>
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
  star: {
    position: 'absolute',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 28,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 8,
  },
  levelText: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.persianOrange,
    marginBottom: 4,
  },
  nameText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 16,
  },
  message: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    lineHeight: 20,
  },
});
