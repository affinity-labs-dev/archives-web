// StreakBadge.tsx - Display daily streak counter
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';
import GamificationDebug from './GamificationDebug';

interface StreakBadgeProps {
  streak: number;
  compact?: boolean;
  onRefresh?: () => void;
}

export default function StreakBadge({ streak, compact = false, onRefresh }: StreakBadgeProps) {
  const [debugVisible, setDebugVisible] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [prevStreak, setPrevStreak] = useState(streak);

  // Close debug panel when app goes to background or component unmounts
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState !== 'active') {
        setDebugVisible(false);
      }
    });

    return () => {
      subscription.remove();
      setDebugVisible(false); // Close on unmount
    };
  }, []);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animate when streak increases
  useEffect(() => {
    if (streak > prevStreak && prevStreak > 0) {
      // Haptic feedback for streak increase
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Scale pop animation
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 7,
        }),
      ]).start();

      // Continuous pulse for 2 seconds
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ).start();
    }
    setPrevStreak(streak);
  }, [streak]);

  const handleRefresh = () => {
    setDebugVisible(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  const handlePress = () => {
    if (__DEV__) {
      const newCount = tapCount + 1;
      setTapCount(newCount);

      if (newCount >= 3) {
        console.log('🎮 [Debug] Opening debug panel');
        setDebugVisible(true);
        setTapCount(0);
      }

      setTimeout(() => setTapCount(0), 1000);
    }
  };

  const getStreakColor = () => {
    if (streak >= 30) return '#E74C3C'; // Red hot
    if (streak >= 14) return '#E67E22'; // Orange
    if (streak >= 7) return '#F39C12'; // Gold
    return '#95A5A6'; // Gray
  };

  // In dev mode, show a small debug button if no streak
  if (streak === 0 && __DEV__) {
    return (
      <>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setDebugVisible(true)}
        >
          <Ionicons name="bug" size={16} color="#E74C3C" />
        </TouchableOpacity>

        <GamificationDebug
          visible={debugVisible}
          onClose={() => setDebugVisible(false)}
          onRefresh={handleRefresh}
        />
      </>
    );
  }

  if (streak === 0) return null;

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.container, compact && styles.compact]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={[styles.iconContainer, { backgroundColor: getStreakColor() }]}>
              <Ionicons name="flame" size={compact ? 12 : 16} color="white" />
            </View>
          </Animated.View>
          <Text style={[styles.text, compact && styles.compactText]}>{streak}</Text>
        </TouchableOpacity>
      </Animated.View>

      <GamificationDebug
        visible={debugVisible}
        onClose={() => setDebugVisible(false)}
        onRefresh={handleRefresh}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
  },
  compactText: {
    fontSize: 12,
  },
  debugButton: {
    backgroundColor: '#FEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
});
