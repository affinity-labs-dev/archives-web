// GameModeSelector.tsx - Choose Practice vs Challenge mode
// Universal selector for all game types

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { GameMode } from '@/gamification/types/games';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GameModeSelectorProps {
  onSelectMode: (mode: GameMode) => void;
  onClose?: () => void;
}

export default function GameModeSelector({ onSelectMode, onClose }: GameModeSelectorProps) {
  const handleSelectMode = (mode: GameMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectMode(mode);
  };

  return (
    <View style={styles.container}>
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Mode</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
            </TouchableOpacity>
          )}
        </View>

        {/* Practice Mode */}
        <TouchableOpacity
          style={[styles.modeCard, styles.practiceCard]}
          onPress={() => handleSelectMode('practice')}
          activeOpacity={0.8}
        >
          <View style={styles.modeIcon}>
            <Ionicons name="book-outline" size={32} color="#3498DB" />
          </View>
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>📚 Practice Mode</Text>
            <Text style={styles.modeDescription}>
              • No timer - take your time{'\n'}
              • Relaxed gameplay{'\n'}
              • Earn 25 XP on completion
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#95A5A6" />
        </TouchableOpacity>

        {/* Challenge Mode */}
        <TouchableOpacity
          style={[styles.modeCard, styles.challengeCard]}
          onPress={() => handleSelectMode('challenge')}
          activeOpacity={0.8}
        >
          <View style={[styles.modeIcon, styles.challengeIcon]}>
            <Ionicons name="flash-outline" size={32} color="#E74C3C" />
          </View>
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>⚡ Challenge Mode</Text>
            <Text style={styles.modeDescription}>
              • Timed race against the clock{'\n'}
              • Compete for best time{'\n'}
              • Earn up to 100 XP + leaderboard rank
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#95A5A6" />
        </TouchableOpacity>

        {/* Tip */}
        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={16} color="#7F8C8D" />
          <Text style={styles.tipText}>
            Tip: Start with Practice mode to learn, then try Challenge for competition!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
  },
  closeButton: {
    padding: 4,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  practiceCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB',
  },
  challengeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  modeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  challengeIcon: {
    backgroundColor: '#FADBD8',
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 8,
  },
  modeDescription: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  tipText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#7F8C8D',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});
