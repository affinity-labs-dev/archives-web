// GameTimer.tsx - Visual timer display for Challenge mode
// Shows elapsed time with clean UI

import ArchivesTheme from '@/constants/ArchivesTheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface GameTimerProps {
  formattedTime: string; // "MM:SS" format
  isRunning: boolean;
  isPaused: boolean;
}

export default function GameTimer({ formattedTime, isRunning, isPaused }: GameTimerProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.timerCard, isPaused && styles.pausedCard]}>
        <Ionicons
          name={isPaused ? 'pause' : 'timer-outline'}
          size={20}
          color={isPaused ? '#E67E22' : ArchivesTheme.colors.persianOrange}
          style={styles.icon}
        />
        <Text style={[styles.time, isPaused && styles.pausedTime]}>
          {formattedTime}
        </Text>
        {isPaused && <Text style={styles.pausedLabel}>PAUSED</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pausedCard: {
    borderColor: '#E67E22',
    backgroundColor: '#FEF5E7',
  },
  icon: {
    marginRight: 8,
  },
  time: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    letterSpacing: 2,
  },
  pausedTime: {
    color: '#E67E22',
  },
  pausedLabel: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E67E22',
    marginLeft: 8,
    letterSpacing: 1,
  },
});
