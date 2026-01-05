// GameResults.tsx - Universal completion screen for all games
// Shows XP reward, time, and performance stats

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { GameResult } from '@/types/games';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GameResultsProps {
  result: GameResult;
  onNextPuzzle?: () => void;
  onClose: () => void;
  puzzlesCompleted?: number;
  gridSize?: number;
}

export default function GameResults({
  result,
  onNextPuzzle,
  onClose,
  puzzlesCompleted = 0,
  gridSize = 3
}: GameResultsProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('🎉 [GameResults] Rendering with result:', result);

    // Celebration haptics
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getTimeBadge = () => {
    if (!result.timeElapsed || result.mode === 'practice') return null;

    if (result.timeElapsed <= 30) {
      return { emoji: '🔥', label: 'LEGENDARY', color: '#E74C3C' };
    }
    if (result.timeElapsed <= 45) {
      return { emoji: '⚡', label: 'EXCELLENT', color: '#E67E22' };
    }
    if (result.timeElapsed <= 60) {
      return { emoji: '⭐', label: 'GOOD', color: '#F39C12' };
    }
    return { emoji: '✅', label: 'COMPLETED', color: '#27AE60' };
  };

  const timeBadge = getTimeBadge();

  const formatTime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyText = () => {
    const totalPieces = gridSize * gridSize;
    const stars = totalPieces <= 16 ? '⭐' : totalPieces <= 36 ? '⭐⭐' : '⭐⭐⭐';
    return `${stars} ${totalPieces} Pieces`;
  };

  const getNextDifficultyText = () => {
    // Never-ending game - always show encouragement
    return 'Keep solving - puzzles get bigger as you improve!';
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.modal,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Celebration Icon */}
        <View style={styles.celebrationIcon}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Puzzle Completed!</Text>

        {/* Difficulty Badge */}
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{getDifficultyText()}</Text>
          <Text style={styles.nextDifficultyText}>{getNextDifficultyText()}</Text>
        </View>

        {/* Time Badge (Challenge Mode Only) */}
        {timeBadge !== null && (
          <View style={[styles.timeBadge, { backgroundColor: timeBadge.color }]}>
            <Text style={styles.timeBadgeEmoji}>{timeBadge.emoji}</Text>
            <Text style={styles.timeBadgeLabel}>{timeBadge.label}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          {/* XP Earned */}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>XP Earned</Text>
            <View style={styles.xpRow}>
              <Text style={styles.statValue}>{result.xpEarned || 0}</Text>
              {(result.bonusXP ?? 0) > 0 && (
                <Text style={styles.bonusXP}>+{result.bonusXP}</Text>
              )}
            </View>
            {(result.bonusXP ?? 0) > 0 && (
              <Text style={styles.bonusLabel}>Time Bonus!</Text>
            )}
          </View>

          {/* Time (if challenge mode) */}
          {(result.timeElapsed ?? 0) > 0 && result.mode === 'challenge' && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={styles.statValue}>{formatTime(result.timeElapsed)}</Text>
            </View>
          )}

          {/* Mode */}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Mode</Text>
            <Text style={styles.statValue}>
              {result.mode === 'practice' ? '📚 Practice' : '⚡ Challenge'}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {!!onNextPuzzle && (
            <TouchableOpacity
              style={[styles.button, styles.nextPuzzleButton]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onNextPuzzle();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.nextPuzzleText}>Next Puzzle</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modal: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrationEmoji: {
    fontSize: 48,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 28,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 8,
    textAlign: 'center',
  },
  difficultyBadge: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  difficultyText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 4,
  },
  nextDifficultyText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.persianOrange,
    fontWeight: '600',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  timeBadgeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  timeBadgeLabel: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  statsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'DM Sans',
    fontSize: 32,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
  },
  bonusXP: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.persianOrange,
    marginLeft: 8,
  },
  bonusLabel: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.persianOrange,
    marginTop: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  nextPuzzleButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },
  nextPuzzleText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    backgroundColor: '#ECF0F1',
  },
  closeText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
  },
});
