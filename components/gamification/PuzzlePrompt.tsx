// PuzzlePrompt.tsx
// Non-intrusive toast prompt for puzzle engagement
// Slides up from bottom with celebration or idle messaging

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PuzzlePromptProps {
  visible: boolean;
  reason: 'celebration' | 'idle' | null;
  onAccept: () => void;
  onDismiss: () => void;
}

export default function PuzzlePrompt({ visible, reason, onAccept, onDismiss }: PuzzlePromptProps) {
  const slideAnim = useRef(new Animated.Value(200)).current; // Start below screen
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Animation on mount/visibility change
  useEffect(() => {
    if (visible) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Slide up and scale animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 200,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, scaleAnim]);

  if (!visible) return null;

  // Get messaging based on reason
  const getMessage = () => {
    if (reason === 'celebration') {
      return {
        emoji: '🎉',
        title: 'Adventure Complete!',
        subtitle: 'Try a puzzle challenge?',
        color: ArchivesTheme.colors.persianOrange,
      };
    } else {
      return {
        emoji: '🧩',
        title: 'Take a Break',
        subtitle: 'Play a quick puzzle?',
        color: ArchivesTheme.colors.shoeBrown,
      };
    }
  };

  const { emoji, title, subtitle, color } = getMessage();

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAccept();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.card, { borderLeftColor: color }]}>
        {/* Emoji Icon */}
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.dismissButton]}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton, { backgroundColor: color }]}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptText}>Play</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 28,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7F8C8D',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  button: {
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dismissButton: {
    backgroundColor: '#F0F0F0',
  },
  acceptButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
  },
  acceptText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});
