import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useROIAdventures } from '@/hooks/useROIAdventures';
import ROIEraComponent from '@/components/ROI/ROIEraComponent';
import ArchivesTheme from '@/constants/ArchivesTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBackgroundSync } from '@/context/BackgroundSyncProvider';
import { useUser } from '@clerk/clerk-expo';

// User progress type for Era 2+
interface UserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number; // Actual correct answers (for XP calculation)
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: number;
}

export default function ROIBentoScreen() {
  // Fetch adventures for Era 2 (Rise of Islam)
  const { adventures, loading, error, refreshAdventures } = useROIAdventures(2);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);

  // User sign-in detection for data reload
  const { user, isSignedIn } = useUser();

  // CRITICAL: Wait for background sync to complete before loading data on login
  const { isInitialized: syncInitialized } = useBackgroundSync();

  // Load user progress from AsyncStorage
  const loadProgress = useCallback(async () => {
    try {
      const progressData = await AsyncStorage.getItem('new_user_progress');
      if (progressData) {
        const parsedProgress: UserProgress[] = JSON.parse(progressData);
        setUserProgress(parsedProgress);
        console.log('📊 [ROI] Loaded user progress:', parsedProgress);
      } else {
        setUserProgress([]);
      }
    } catch (error) {
      console.error('❌ [ROI] Error loading progress:', error);
    } finally {
      setProgressLoading(false);
    }
  }, []);

  // Initial load - wait for sync to complete if user is signed in
  useEffect(() => {
    const loadData = async () => {
      // If not signed in, load immediately
      if (!isSignedIn) {
        console.log('📖 [ROI] No user signed in, loading local data only');
        loadProgress();
        return;
      }

      // If signed in, WAIT for background sync to complete first
      if (isSignedIn && user) {
        if (!syncInitialized) {
          console.log('⏳ [ROI] Waiting for background sync to complete...');
          return; // Don't load yet, wait for syncInitialized to become true
        }

        console.log('✅ [ROI] Background sync complete, loading data from AsyncStorage...');
        loadProgress();
      }
    };

    loadData();
  }, [isSignedIn, user?.id, syncInitialized, loadProgress]);

  // Reload progress whenever screen comes into focus (e.g., after quiz completion)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [ROI] Screen focused, reloading progress...');
      loadProgress();
    }, [loadProgress])
  );

  // Calculate progress bar based on completed ADVENTURES (only Era 2 / Rise of Islam)
  // An adventure is completed when ALL its modules are completed
  const completedAdventuresCount = adventures.filter(adventure => {
    // Get all modules for this adventure from userProgress
    const adventureModules = userProgress.filter(
      p => p.adventureId === adventure.readable_id && p.era_id === 2
    );

    // Get total modules for this adventure from content_list
    const totalModulesForAdventure = adventure.content_list?.length || 0;

    // Adventure is complete if:
    // 1. It has modules in userProgress
    // 2. Number of completed modules = total modules
    // 3. All modules are actually completed and quiz passed
    const completedModulesForAdventure = adventureModules.filter(
      p => p.isCompleted && p.quizCompleted
    ).length;

    return totalModulesForAdventure > 0 && completedModulesForAdventure === totalModulesForAdventure;
  }).length;

  const progressBarData = {
    title: 'Exploring Rise of Islam',
    subtitle: '570 - 632 CE',
    currentStep: completedAdventuresCount,
    totalSteps: adventures.length, // Total number of adventures
  };

  if (loading || progressLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
        <Text style={styles.loadingText}>Loading adventures...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load adventures</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </View>
    );
  }

  return (
    <ROIEraComponent
      progressBar={progressBarData}
      adventures={adventures}
      userProgress={userProgress}
      onProgressUpdate={loadProgress}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.creamWhite,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'DM Sans',
    color: ArchivesTheme.colors.shoeBrown,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'DM Sans',
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
  },
});
