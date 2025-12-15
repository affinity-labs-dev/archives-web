// GamificationDebug.tsx - Testing panel for gamification features
// Triple-tap the streak badge to open this panel
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { useAchievements } from '@/hooks/useAchievements';

interface GamificationDebugProps {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function GamificationDebug({ visible, onClose, onRefresh }: GamificationDebugProps) {
  const [xpToAdd, setXpToAdd] = useState('100');
  const [streakToSet, setStreakToSet] = useState('7');
  const { unlockAchievement, checkAchievements } = useAchievements();

  const addTestXP = async () => {
    try {
      const progress = await AsyncStorage.getItem('new_user_progress');
      const parsed = progress ? JSON.parse(progress) : [];

      // Add a fake completed module with XP
      const xp = parseInt(xpToAdd) || 100;
      // Each correct answer = 10 XP, so calculate how many correct answers needed
      const correctAnswers = Math.floor(xp / 10);

      const fakeModule = {
        adventureId: 999,
        moduleId: Date.now(),
        isCompleted: true,
        lessonsCompleted: ['lesson1', 'lesson2'],
        quizCompleted: true,
        quizScore: Math.min(correctAnswers, 5), // Cap at 5 for display
        quizCorrectAnswers: correctAnswers, // This is what determines XP
        completedAt: new Date().toISOString(),
        era_id: 'test',
      };

      parsed.push(fakeModule);
      await AsyncStorage.setItem('new_user_progress', JSON.stringify(parsed));

      // Clear totalXP cache to force recalculation in profile screen
      await AsyncStorage.removeItem('totalXP');

      console.log(`✅ [Debug] Added ${xp} XP (${correctAnswers} correct answers) and cleared XP cache`);
      alert(`Added ${xp} XP! Check profile tab to see changes.`);
      onRefresh();
    } catch (error) {
      console.error('❌ [Debug] Error adding XP:', error);
    }
  };

  const clearTestXP = async () => {
    try {
      const progress = await AsyncStorage.getItem('new_user_progress');
      const parsed = progress ? JSON.parse(progress) : [];

      // Remove all fake modules (adventureId 999)
      const cleaned = parsed.filter((m: any) => m.adventureId !== 999);

      await AsyncStorage.setItem('new_user_progress', JSON.stringify(cleaned));
      await AsyncStorage.removeItem('totalXP');

      console.log('✅ [Debug] Cleared all test XP');
      alert('All test XP cleared!');
      onRefresh();
    } catch (error) {
      console.error('❌ [Debug] Error clearing test XP:', error);
    }
  };

  const setTestStreak = async () => {
    try {
      const streak = parseInt(streakToSet) || 7;
      const streakData = {
        currentStreak: streak,
        longestStreak: streak,
        lastActiveDate: new Date().toDateString(),
      };

      await AsyncStorage.setItem('daily_streak', JSON.stringify(streakData));
      await AsyncStorage.setItem('last_active_date', new Date().toDateString());

      console.log(`✅ [Debug] Set streak to ${streak}`);
      alert(`Streak set to ${streak}! Refresh to see changes.`);
      onRefresh();
    } catch (error) {
      console.error('❌ [Debug] Error setting streak:', error);
    }
  };

  const resetStreak = async () => {
    try {
      await AsyncStorage.removeItem('daily_streak');
      await AsyncStorage.removeItem('last_active_date');
      console.log('✅ [Debug] Streak reset');
      alert('Streak reset to 0!');
      onRefresh();
    } catch (error) {
      console.error('❌ [Debug] Error resetting streak:', error);
    }
  };

  const simulateYesterday = async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await AsyncStorage.setItem('last_active_date', yesterday.toDateString());
      console.log('✅ [Debug] Last active set to yesterday');
      alert('Last active set to yesterday! Reopen app to increment streak.');
      onRefresh();
    } catch (error) {
      console.error('❌ [Debug] Error setting yesterday:', error);
    }
  };

  const triggerLevelUp = async () => {
    try {
      // Set last level to 0 so next level will trigger animation
      await AsyncStorage.setItem('last_user_level', '0');
      console.log('✅ [Debug] Reset last level - next load will show level-up!');
      alert('Level-up will trigger on next XP gain! Add XP to see animation.');
      onRefresh();
    } catch (error) {
      console.error('❌ [Debug] Error triggering level-up:', error);
    }
  };

  const clearAllGamification = async () => {
    try {
      await AsyncStorage.removeItem('daily_streak');
      await AsyncStorage.removeItem('last_active_date');
      await AsyncStorage.removeItem('last_user_level');
      console.log('✅ [Debug] All gamification data cleared');
      alert('All gamification data cleared!');
      onRefresh();
    } catch (error) {
      console.error('❌ [Debug] Error clearing data:', error);
    }
  };

  const triggerTestAchievement = async () => {
    try {
      // Unlock the "First Steps" achievement as a test
      await unlockAchievement('first_perfect');
      console.log('✅ [Debug] Triggered test achievement');
      alert('Achievement unlocked! Go to Profile tab to see it.');
      onRefresh();
    } catch (error) {
      console.error('❌ [Debug] Error triggering achievement:', error);
    }
  };

  const checkAllAchievements = async () => {
    try {
      await checkAchievements();
      console.log('✅ [Debug] Checked all achievements');
      alert('Checked achievements! If you earned any, go to Profile tab to see them.');
      onRefresh();
    } catch (error) {
      console.error('❌ [Debug] Error checking achievements:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>🎮 Gamification Debug</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={ArchivesTheme.colors.shoeBrown} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test XP / Levels</Text>
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                value={xpToAdd}
                onChangeText={setXpToAdd}
                keyboardType="number-pad"
                placeholder="XP to add"
              />
              <TouchableOpacity style={styles.button} onPress={addTestXP}>
                <Text style={styles.buttonText}>Add XP</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginRight: 4 }]} onPress={triggerLevelUp}>
                <Text style={styles.buttonTextSecondary}>Trigger Level-Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginLeft: 4 }]} onPress={clearTestXP}>
                <Text style={styles.buttonTextSecondary}>Clear Test XP</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Daily Streak</Text>
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                value={streakToSet}
                onChangeText={setStreakToSet}
                keyboardType="number-pad"
                placeholder="Streak number"
              />
              <TouchableOpacity style={styles.button} onPress={setTestStreak}>
                <Text style={styles.buttonText}>Set Streak</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.buttonSecondary, { flex: 1 }]} onPress={simulateYesterday}>
                <Text style={styles.buttonTextSecondary}>Set to Yesterday</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginLeft: 8 }]} onPress={resetStreak}>
                <Text style={styles.buttonTextSecondary}>Reset Streak</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Achievements</Text>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginRight: 4 }]} onPress={triggerTestAchievement}>
                <Text style={styles.buttonTextSecondary}>Unlock Test Achievement</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginLeft: 4 }]} onPress={checkAllAchievements}>
                <Text style={styles.buttonTextSecondary}>Check All</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.dangerButton} onPress={clearAllGamification}>
              <Text style={styles.dangerButtonText}>Clear All Gamification Data</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.note}>💡 Tip: Close and reopen the screen to see changes</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: 'DM Sans',
    fontSize: 14,
  },
  button: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  buttonSecondary: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonTextSecondary: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
  },
  dangerButton: {
    backgroundColor: '#FEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  dangerButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
    textAlign: 'center',
  },
  note: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    marginTop: 12,
  },
});
