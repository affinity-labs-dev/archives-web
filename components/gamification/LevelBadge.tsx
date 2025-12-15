// LevelBadge.tsx - Display user level badge
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { Level } from '@/hooks/useLevel';

interface LevelBadgeProps {
  level: Level;
  compact?: boolean;
  showProgress?: boolean;
  progress?: number;
}

export default function LevelBadge({ level, compact = false, showProgress = false, progress = 0 }: LevelBadgeProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconContainer, { backgroundColor: level.color }]}>
        <Ionicons name="star" size={compact ? 12 : 16} color="white" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.levelText, compact && styles.compactText]}>Lv {level.level}</Text>
        {!compact && <Text style={styles.nameText}>{level.name}</Text>}
      </View>
      {showProgress && !compact && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: level.color }]} />
          </View>
        </View>
      )}
    </View>
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
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
  },
  compactText: {
    fontSize: 12,
  },
  nameText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.shoeBrown,
  },
  progressContainer: {
    marginLeft: 8,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
